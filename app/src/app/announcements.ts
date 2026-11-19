import type { SkinId } from '../domain/types.js';

export const SKIN_LABELS: Readonly<Record<SkinId, string>> = Object.freeze({
  default: 'Default',
  ginger: 'Ginger',
  tuxedo: 'Tuxedo',
  calico: 'Calico'
});

export function unlockSentence(ids: readonly SkinId[]): string {
  const names: string[] = [];
  for (const id of ids) {
    const label = SKIN_LABELS[id];
    if (!names.includes(label)) names.push(label);
  }
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} cat unlocked.`;
  const last = names[names.length - 1];
  const head = names.slice(0, -1).join(', ');
  return `${head} and ${last} cats unlocked.`;
}

export interface LandingAnnouncementInput {
  readonly grade: 'perfect' | 'ordinary';
  readonly points: number;
  readonly ordinal: number;
  readonly totalScore: number;
  readonly unlocked: readonly SkinId[];
}

export function landingAnnouncement(input: LandingAnnouncementInput): string {
  const grade = input.grade === 'perfect' ? 'Perfect' : 'Landed';
  const base = `${grade}. Plus ${input.points} points. Stacked ${input.ordinal}. Score ${input.totalScore}.`;
  const unlock = unlockSentence(input.unlocked);
  return unlock.length === 0 ? base : `${base} ${unlock}`;
}
