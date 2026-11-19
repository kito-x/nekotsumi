import {
  CUE_SPECS,
  cueRecipe,
  encodeWav,
  renderCueOffline,
  scheduleCue
} from '../../src/platform/audio-synthesis.js';
import type { AudioCue } from '../../src/app/audio-policy.js';

interface CueMeasurement {
  readonly cue: AudioCue;
  readonly durationMs: number;
  readonly bufferMs: number;
  readonly peak: number;
  readonly rms: number;
  readonly nonzero: number;
  readonly finite: boolean;
  readonly tailPeak: number;
  readonly sources: number;
}

const cues = Object.keys(CUE_SPECS) as AudioCue[];
const sampleRate = 44100;
const status = document.querySelector<HTMLElement>('#status');

declare global {
  interface Window {
    __audioAuditResults?: {
      readonly measurements: readonly CueMeasurement[];
      readonly overlap: { readonly peak: number; readonly finite: boolean; readonly sources: number };
      readonly cancellation: { readonly peak: number; readonly finite: boolean; readonly endedCallbacks: number; readonly sources: number };
      readonly wavBytes: number;
      readonly writeStatus: string;
    };
    __audioAuditError?: string;
  }
}

function measure(buffer: AudioBuffer, cue: AudioCue): CueMeasurement {
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let nonzero = 0;
  let finite = true;
  for (const sample of data) {
    if (!Number.isFinite(sample)) finite = false;
    peak = Math.max(peak, Math.abs(sample));
    sum += sample * sample;
    if (sample !== 0) nonzero += 1;
  }
  const cueSamples = Math.ceil(CUE_SPECS[cue].durationSeconds * sampleRate);
  let tailPeak = 0;
  for (let i = cueSamples; i < data.length; i += 1) {
    tailPeak = Math.max(tailPeak, Math.abs(data[i] ?? 0));
  }
  return {
    cue,
    durationMs: Math.round(CUE_SPECS[cue].durationSeconds * 1000),
    bufferMs: Math.round((data.length / sampleRate) * 1000),
    peak: Number(peak.toFixed(4)),
    rms: Number(Math.sqrt(sum / data.length).toFixed(4)),
    nonzero,
    finite,
    tailPeak: Number(tailPeak.toFixed(4)),
    sources: CUE_SPECS[cue].sources
  };
}

async function worstOverlap(): Promise<{ peak: number; finite: boolean; sources: number }> {
  const context = new OfflineAudioContext(1, Math.ceil(sampleRate * 0.4), sampleRate);
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);
  for (let i = 0; i < 3; i += 1) scheduleCue(context, master, 'land.ordinary', 0, () => undefined);
  const buffer = await context.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0;
  let finite = true;
  for (const sample of data) {
    if (!Number.isFinite(sample)) finite = false;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { peak: Number(peak.toFixed(4)), finite, sources: 6 };
}

async function cancellationBoundary(): Promise<{
  peak: number;
  finite: boolean;
  endedCallbacks: number;
  sources: number;
}> {
  const context = new OfflineAudioContext(1, Math.ceil(sampleRate * 0.4), sampleRate);
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);
  let ended = 0;
  const group = scheduleCue(context, master, 'fail.tumble', 0, () => {
    ended += 1;
  });
  group.cancel();
  group.cancel();
  const buffer = await context.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0;
  let finite = true;
  for (const sample of data) {
    if (!Number.isFinite(sample)) finite = false;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { peak: Number(peak.toFixed(4)), finite, endedCallbacks: ended, sources: group.sources };
}

async function buildReel(buffers: readonly AudioBuffer[]): Promise<{ wav: Uint8Array; index: string }> {
  const gap = 0.3;
  const parts: number[] = [];
  const lines: string[] = [];
  let cursor = 0;
  for (let i = 0; i < cues.length; i += 1) {
    const cue = cues[i];
    const buffer = buffers[i];
    if (cue === undefined || buffer === undefined) continue;
    lines.push(`${cursor.toFixed(2)}s  ${cue}  ${CUE_SPECS[cue].durationSeconds * 1000}ms at 0.6 user volume`);
    const data = buffer.getChannelData(0);
    for (const sample of data) parts.push(sample * 0.6);
    cursor += data.length / sampleRate;
    const silence = Math.ceil(sampleRate * gap);
    for (let j = 0; j < silence; j += 1) parts.push(0);
    cursor += gap;
  }
  const context = new OfflineAudioContext(1, parts.length, sampleRate);
  const reel = context.createBuffer(1, parts.length, sampleRate);
  reel.copyToChannel(new Float32Array(parts), 0);
  return {
    wav: encodeWav(reel),
    index: [
      'Cat Tower M4D audition reel — non-autoplay evidence only',
      'No spoken labels, music, voices or runtime asset; generated from src/platform/audio-synthesis.ts',
      'Each cue is separated by 300 ms silence and rendered at 0.6 user volume; offline measurements use 1.0.',
      '',
      ...lines
    ].join('\n')
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function main(): Promise<void> {
  try {
    const buffers: AudioBuffer[] = [];
    for (const cue of cues) buffers.push(await renderCueOffline(cue, { volume: 1, sampleRate }));
    const measurements = buffers.map((buffer, index) => {
      const cue = cues[index];
      if (cue === undefined) throw new Error('cue index mismatch');
      return measure(buffer, cue);
    });
    const overlap = await worstOverlap();
    const cancellation = await cancellationBoundary();
    const reel = await buildReel(buffers);
    const payload = {
      measurements,
      overlap,
      cancellation,
      recipe: cueRecipe(),
      wavBase64: toBase64(reel.wav),
      index: reel.index,
      note: 'OfflineAudioContext render, not listening/device/phone evidence.'
    };
    const response = await fetch('/__audio-write', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const writeStatus = response.ok ? 'written' : `HTTP ${response.status}`;
    window.__audioAuditResults = { measurements, overlap, cancellation, wavBytes: reel.wav.length, writeStatus };
    if (status !== null) status.textContent = JSON.stringify({ measurements, overlap, cancellation, wavBytes: reel.wav.length, writeStatus }, null, 2);
  } catch (error) {
    window.__audioAuditError = String(error);
    if (status !== null) status.textContent = `AUDIO AUDIT ERROR\n${String(error)}`;
    console.error('M4D audio audit failed', error);
  }
}

void main();
