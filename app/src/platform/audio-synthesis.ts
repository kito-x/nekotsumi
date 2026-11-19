import type { AudioCue } from '../app/audio-policy.js';

export interface CueSpec {
  readonly durationSeconds: number;
  readonly sources: number;
  readonly priority: number;
}

export const CUE_SPECS: Readonly<Record<AudioCue, CueSpec>> = Object.freeze({
  'land.ordinary': Object.freeze({ durationSeconds: 0.14, sources: 2, priority: 3 }),
  'land.perfect': Object.freeze({ durationSeconds: 0.24, sources: 2, priority: 3 }),
  'warning.caution': Object.freeze({ durationSeconds: 0.17, sources: 2, priority: 4 }),
  'warning.danger': Object.freeze({ durationSeconds: 0.22, sources: 2, priority: 4 }),
  'fail.miss': Object.freeze({ durationSeconds: 0.24, sources: 2, priority: 1 }),
  'fail.tumble': Object.freeze({ durationSeconds: 0.6, sources: 4, priority: 1 }),
  reward: Object.freeze({ durationSeconds: 0.32, sources: 3, priority: 2 })
});

export interface ScheduledCue {
  readonly sources: number;
  readonly cancel: () => void;
}

/** Every node a cue creates is owned by that cue and disconnected on cleanup. */
type OwnedNodes = AudioNode[];

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(context);
  if (cached !== undefined) return cached;
  const length = Math.ceil(context.sampleRate);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x51f15e;
  for (let i = 0; i < data.length; i += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[i] = (state / 0x80000000) * 0.7;
  }
  noiseBuffers.set(context, buffer);
  return buffer;
}

function envelope(
  context: BaseAudioContext,
  when: number,
  duration: number,
  peak: number,
  owned: OwnedNodes,
  attack = 0.008,
  release = 0.05
): GainNode {
  const gain = context.createGain();
  owned.push(gain);
  const end = when + duration;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, when + Math.min(attack, duration * 0.4));
  gain.gain.setValueAtTime(peak, Math.max(when + attack, end - release));
  gain.gain.linearRampToValueAtTime(0, end);
  return gain;
}

function oscillator(
  context: BaseAudioContext,
  destination: AudioNode,
  when: number,
  duration: number,
  peak: number,
  fromHz: number,
  toHz: number,
  owned: OwnedNodes,
  sources: AudioScheduledSourceNode[]
): OscillatorNode {
  const osc = context.createOscillator();
  owned.push(osc);
  // Register immediately: a later configuration/connect/start/stop throw must
  // still see this source for stop and handler rollback.
  sources.push(osc);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(fromHz, when);
  osc.frequency.linearRampToValueAtTime(toHz, when + duration);
  const gain = envelope(context, when, duration, peak, owned);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.01);
  return osc;
}

function noise(
  context: BaseAudioContext,
  destination: AudioNode,
  when: number,
  duration: number,
  peak: number,
  cutoffHz: number,
  offset: number,
  owned: OwnedNodes,
  sources: AudioScheduledSourceNode[]
): AudioBufferSourceNode {
  const source = context.createBufferSource();
  owned.push(source);
  sources.push(source);
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  owned.push(filter);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoffHz, when);
  const gain = envelope(context, when, duration, peak, owned, 0.012, 0.06);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(when, offset, duration);
  source.stop(when + duration + 0.01);
  return source;
}

/**
 * Schedule one cue group on a real or offline context. The caller owns the
 * destination/master gain. Every created source, envelope gain and filter is
 * tracked immediately. Natural completion and cancellation both disarm end
 * handlers and disconnect that complete graph exactly once. A failure while
 * building the graph tears down everything already created before rethrowing.
 */
export function scheduleCue(
  context: BaseAudioContext,
  destination: AudioNode,
  cue: AudioCue,
  when: number,
  onEnded: () => void
): ScheduledCue {
  const owned: OwnedNodes = [];
  const sources: AudioScheduledSourceNode[] = [];

  let finished = false;
  let cancelled = false;

  const disarm = (): void => {
    for (const source of sources) source.onended = null;
  };
  const stopSources = (): void => {
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // Already stopped, ended or not started; the graph is still disconnected.
      }
    }
  };
  const disconnectOwned = (): void => {
    for (const node of owned) {
      try {
        node.disconnect();
      } catch {
        // One broken node must not leave the rest of the graph connected.
      }
    }
  };
  const cleanup = (): void => {
    disarm();
    stopSources();
    disconnectOwned();
  };

  try {
    switch (cue) {
      case 'land.ordinary':
        oscillator(context, destination, when, 0.13, 0.085, 95, 72, owned, sources);
        noise(context, destination, when, 0.13, 0.028, 340, 0.13, owned, sources);
        break;
      case 'land.perfect':
        oscillator(context, destination, when, 0.13, 0.045, 660, 660, owned, sources);
        oscillator(context, destination, when + 0.065, 0.16, 0.042, 880, 880, owned, sources);
        break;
      case 'warning.caution':
        noise(context, destination, when, 0.16, 0.024, 620, 0.42, owned, sources);
        oscillator(context, destination, when, 0.16, 0.018, 220, 160, owned, sources);
        break;
      case 'warning.danger':
        noise(context, destination, when, 0.21, 0.034, 520, 0.55, owned, sources);
        oscillator(context, destination, when, 0.21, 0.026, 155, 98, owned, sources);
        break;
      case 'fail.miss':
        oscillator(context, destination, when, 0.22, 0.038, 420, 150, owned, sources);
        noise(context, destination, when, 0.22, 0.024, 700, 0.2, owned, sources);
        break;
      case 'fail.tumble':
        oscillator(context, destination, when, 0.17, 0.032, 82, 64, owned, sources);
        oscillator(context, destination, when + 0.12, 0.17, 0.03, 70, 56, owned, sources);
        oscillator(context, destination, when + 0.24, 0.18, 0.028, 60, 48, owned, sources);
        noise(context, destination, when, 0.56, 0.03, 260, 0.1, owned, sources);
        break;
      case 'reward':
        oscillator(context, destination, when, 0.13, 0.035, 523, 523, owned, sources);
        oscillator(context, destination, when + 0.07, 0.13, 0.033, 659, 659, owned, sources);
        oscillator(context, destination, when + 0.14, 0.18, 0.031, 784, 784, owned, sources);
        break;
    }
  } catch (error) {
    cleanup();
    throw error;
  }

  let remaining = sources.length;
  const complete = (): void => {
    if (finished || cancelled) return;
    finished = true;
    cleanup();
    onEnded();
  };
  for (const source of sources) {
    source.onended = () => {
      if (finished || cancelled) return;
      remaining -= 1;
      if (remaining <= 0) complete();
    };
  }

  return {
    sources: sources.length,
    cancel: () => {
      if (cancelled || finished) return;
      cancelled = true;
      cleanup();
      onEnded();
    }
  };
}

export async function renderCueOffline(
  cue: AudioCue,
  options: { readonly volume?: number; readonly sampleRate?: number } = {}
): Promise<AudioBuffer> {
  const sampleRate = options.sampleRate ?? 44100;
  const volume = options.volume ?? 1;
  const spec = CUE_SPECS[cue];
  const context = new OfflineAudioContext(1, Math.ceil(sampleRate * (spec.durationSeconds + 0.12)), sampleRate);
  const master = context.createGain();
  master.gain.value = volume;
  master.connect(context.destination);
  scheduleCue(context, master, cue, 0, () => undefined);
  return context.startRendering();
}

/** Small deterministic mono 16-bit WAV encoder for the audition artefact. */
export function encodeWav(buffer: AudioBuffer): Uint8Array {
  const channels = 1;
  const samples = buffer.length;
  const bytesPerSample = 2;
  const dataSize = samples * channels * bytesPerSample;
  const output = new Uint8Array(44 + dataSize);
  const view = new DataView(output.buffer);
  const writeText = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i += 1) output[offset + i] = text.charCodeAt(i);
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i += 1) {
    const sample = Math.max(-1, Math.min(1, data[i] ?? 0));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return output;
}

export function cueRecipe(): readonly { cue: AudioCue; durationMs: number; sources: number; priority: number }[] {
  return (Object.entries(CUE_SPECS) as [AudioCue, CueSpec][]).map(([cue, spec]) => ({
    cue,
    durationMs: Math.round(spec.durationSeconds * 1000),
    sources: spec.sources,
    priority: spec.priority
  }));
}
