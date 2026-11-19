import { CatTowerEngine } from './domain/engine.js';
import type { GameEvent, Mode, PauseReason, RoundState, SkinId } from './domain/types.js';
import { GameSession } from './app/session.js';
import { FixedStepLoop } from './app/loop.js';
import { InputRouter } from './app/input.js';
import {
  assistPrediction,
  computeAssistPreview,
  formatOffset,
  safetyBand,
  safetyLabel
} from './app/assist.js';
import type { AssistPreview } from './app/assist.js';
import { emptyArtAssets, loadArtAssets } from './platform/assets.js';
import type { AssetFault, ArtAssets } from './platform/assets.js';
import { GameRenderer } from './render/renderer.js';
import { drawCat } from './render/art.js';
import { browserStorageAdapter } from './platform/storage.js';
import {
  ProfileService,
  SKIN_IDS,
  UNLOCK_THRESHOLDS,
  createDefaultProfile,
  deriveUnlocked
} from './platform/profile.js';
import type { ProfileView, ProfileRecord, SaveMode } from './platform/profile.js';
import { LiveAnnouncer } from './app/announcer.js';
import { ToastQueue } from './app/toast-queue.js';
import { LeadingTrailingThrottle } from './app/throttle.js';
import { landingAnnouncement, SKIN_LABELS } from './app/announcements.js';
import { AudioService, WebAudioBackend } from './platform/audio.js';
import type { AudioStatus } from './platform/audio.js';

declare global {
  interface Window {
    __catTowerDebug?: {
      readonly engineObjects: number;
      readonly sessionObjects: number;
      readonly loopObjects: number;
      readonly resizeObserverObjects: number;
      readonly listenerRegistrations: Readonly<Record<'window' | 'document' | 'canvas' | 'motion', number>>;
      readonly listenerMeasurement: string;
      restarts: number;
      readonly generation: () => number;
      readonly active: () => boolean;
      readonly snapshot: () => unknown;
      readonly resources: () => readonly string[];
      readonly artReady: boolean;
      readonly assetErrors: readonly string[];
      readonly assetDeadlineHit: boolean;
      readonly profile: () => unknown;
      readonly lockRequests: () => number;
      readonly reducedMotion: () => boolean;
      readonly announcements: () => { readonly pending: boolean; readonly failurePending: boolean };
      readonly toasts: () => { readonly displaying: boolean; readonly queued: number; readonly pendingHandoff: boolean };
      readonly audio: () => unknown;
      presentation?: () => unknown;
      advance?: (ticks: number) => void;
      camera?: () => unknown;
    };
  }
}

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element ${selector}`);
  return found;
}

const homeScreen = element<HTMLElement>('#home-screen');
const gameScreen = element<HTMLElement>('#game-screen');
const resultsScreen = element<HTMLElement>('#results-screen');
const errorScreen = element<HTMLElement>('#error-screen');
const shell = element<HTMLElement>('#shell');
const liveRegion = element<HTMLElement>('#live-region');
const startButton = element<HTMLButtonElement>('#start-button');
const modeClassicButton = element<HTMLButtonElement>('#mode-classic');
const modeAssistButton = element<HTMLButtonElement>('#mode-assist');
const modeClassicSelected = element<HTMLElement>('#mode-classic-selected');
const modeAssistSelected = element<HTMLElement>('#mode-assist-selected');
const homeInstruction = element<HTMLElement>('#home-instruction');
const gameCanvas = element<HTMLCanvasElement>('#game-canvas');
const playfieldWrap = element<HTMLElement>('#playfield-wrap');
const hudScore = element<HTMLElement>('#hud-score');
const hudHeight = element<HTMLElement>('#hud-height');
const hudMode = element<HTMLElement>('#hud-mode');
const hudChain = element<HTMLElement>('#hud-chain');
const hudSafety = element<HTMLElement>('#hud-safety');
const hudSafetyText = element<HTMLElement>('#hud-safety-text');
const pauseButton = element<HTMLButtonElement>('#pause-button');
const dropButton = element<HTMLButtonElement>('#drop-button');
const leftButton = element<HTMLButtonElement>('#left-button');
const rightButton = element<HTMLButtonElement>('#right-button');
const skipButton = element<HTMLButtonElement>('#skip-button');
const assistReadout = element<HTMLElement>('#assist-readout');
const gameStatus = element<HTMLElement>('#game-status');
const resultsTitle = element<HTMLElement>('#results-title');
const resultsReason = element<HTMLElement>('#results-reason');
const resultsScore = element<HTMLElement>('#results-score');
const resultsHeight = element<HTMLElement>('#results-height');
const replayButton = element<HTMLButtonElement>('#replay-button');
const changeModeButton = element<HTMLButtonElement>('#change-mode-button');
const resultsHomeButton = element<HTMLButtonElement>('#results-home-button');
const errorMessage = element<HTMLElement>('#error-message');
const errorReloadButton = element<HTMLButtonElement>('#error-reload-button');
const pauseDialog = element<HTMLDialogElement>('#pause-dialog');
const pauseReason = element<HTMLElement>('#pause-reason');
const resumeButton = element<HTMLButtonElement>('#resume-button');
const restartButton = element<HTMLButtonElement>('#restart-button');
const pauseHomeButton = element<HTMLButtonElement>('#pause-home-button');
const confirmDialog = element<HTMLDialogElement>('#confirm-dialog');
const confirmTitle = element<HTMLElement>('#confirm-title');
const confirmMessage = element<HTMLElement>('#confirm-message');
const confirmCancelButton = element<HTMLButtonElement>('#confirm-cancel-button');
const confirmAcceptButton = element<HTMLButtonElement>('#confirm-accept-button');
const homeSaveNotice = element<HTMLElement>('#home-save-notice');
const homeProfileRow = element<HTMLElement>('#home-profile-row');
const homeCatPreview = element<HTMLCanvasElement>('#home-cat-preview');
const homeSkinName = element<HTMLElement>('#home-skin-name');
const homeBest = element<HTMLElement>('#home-best');
const homeCollection = element<HTMLElement>('#home-collection');
const collectionButton = element<HTMLButtonElement>('#collection-button');
const howToButton = element<HTMLButtonElement>('#how-to-button');
const homeSettingsButton = element<HTMLButtonElement>('#home-settings-button');
const otherTabActions = element<HTMLElement>('#other-tab-actions');
const retryAccessButton = element<HTMLButtonElement>('#retry-access-button');
const playTemporaryButton = element<HTMLButtonElement>('#play-temporary-button');
const homeSaveAction = element<HTMLElement>('#home-save-action');
const gameSaveNotice = element<HTMLElement>('#game-save-notice');
const pauseSettingsButton = element<HTMLButtonElement>('#pause-settings-button');
const resultsBest = element<HTMLElement>('#results-best');
const resultsBadges = element<HTMLElement>('#results-badges');
const resultsSaveNotice = element<HTMLElement>('#results-save-notice');
const resultsUnlocks = element<HTMLElement>('#results-unlocks');
const resultsCollectionButton = element<HTMLButtonElement>('#results-collection-button');
const tutorialDialog = element<HTMLDialogElement>('#tutorial-dialog');
const tutorialTitle = element<HTMLElement>('#tutorial-title');
const tutorialProgress = element<HTMLElement>('#tutorial-progress');
const tutorialCopy = element<HTMLElement>('#tutorial-copy');
const tutorialBack = element<HTMLButtonElement>('#tutorial-back-button');
const tutorialNext = element<HTMLButtonElement>('#tutorial-next-button');
const tutorialSkip = element<HTMLButtonElement>('#tutorial-skip-button');
const tutorialStart = element<HTMLButtonElement>('#tutorial-start-button');
const settingsDialog = element<HTMLDialogElement>('#settings-dialog');
const settingsTitle = element<HTMLElement>('#settings-title');
const highContrastCheckbox = element<HTMLInputElement>('#high-contrast-checkbox');
const soundEnabledCheckbox = element<HTMLInputElement>('#sound-enabled-checkbox');
const volumeSlider = element<HTMLInputElement>('#volume-slider');
const volumeValue = element<HTMLElement>('#volume-value');
const soundStatus = element<HTMLElement>('#sound-status');
const settingsCloseButton = element<HTMLButtonElement>('#settings-close-button');
const collectionDialog = element<HTMLDialogElement>('#collection-dialog');
const collectionTitle = element<HTMLElement>('#collection-title');
const collectionCards = element<HTMLElement>('#collection-cards');
const collectionCloseButton = element<HTMLButtonElement>('#collection-close-button');
const howToDialog = element<HTMLDialogElement>('#howto-dialog');
const howToTitle = element<HTMLElement>('#howto-title');
const howToCloseButton = element<HTMLButtonElement>('#howto-close-button');
const unlockToast = element<HTMLElement>('#unlock-toast');

const audio = new AudioService({
  backend: new WebAudioBackend(),
  onStatus: updateSoundStatus
});

function isDropKey(key: string): boolean {
  return key === ' ' || key === 'Enter';
}

const FAULTS: readonly AssetFault[] = [
  'invalid-manifest',
  'missing-body',
  'missing-face',
  'missing-background',
  'decode-body',
  'stall-manifest',
  'stall-image',
  'late-manifest'
];

type Screen = 'home' | 'game' | 'results' | 'error';

let screen: Screen = 'home';
let selectedMode: Mode = 'classic';
let replacingRun = false;
let assistPreview: AssistPreview | null = null;
let assistPreviewKey = '';
let pendingNudgeAnnouncement = false;
let confirmAction: ((trusted: boolean) => void) | null = null;
let dropKeyHeld = false;
let dropKeyArmed = false;
let dropKeyUsed = false;
let lastSize: { width: number; height: number } | null = null;
let loop: FixedStepLoop;
let renderer: GameRenderer;
let session: GameSession;
let input: InputRouter;
let profileService: ProfileService | null = null;
let profileView: ProfileView | null = null;
let artAssets: ArtAssets | null = null;
let runBaseline: ProfileRecord = { bestHeight: 0, bestScore: 0 };
let runUnlocked: SkinId[] = [];
let otherTabDismissed = false;
let settingsOpener: HTMLElement | null = null;
let settingsFromPause = false;
let collectionOpener: HTMLElement | null = null;
let tutorialStep = 1;
let readyAnnouncedRunId: string | null = null;
let lastSaveMode: SaveMode | null = null;

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const fault = params ? parseFault(params.get('fault')) : null;
// Local screenshot aid only: CDP captures can create >250 ms frame gaps.
// Normal play (no query) keeps the required interruption pause.
const captureMode = params?.get('capture') === '1';

const announcementTimers = {
  setTimeout: (callback: () => void, milliseconds: number): number =>
    window.setTimeout(callback, milliseconds),
  clearTimeout: (handle: number): void => window.clearTimeout(handle)
};

const announcer = new LiveAnnouncer({
  write: (text) => {
    liveRegion.textContent = text;
  },
  timers: announcementTimers
});

const nudgeThrottle = new LeadingTrailingThrottle(
  {
    ...announcementTimers,
    now: () => performance.now()
  },
  300
);

const unlockToasts = new ToastQueue<SkinId>({
  show: (id) => {
    unlockToast.textContent = `${SKIN_LABELS[id]} cat unlocked`;
    unlockToast.hidden = false;
  },
  hide: () => {
    unlockToast.hidden = true;
  },
  timers: {
    ...announcementTimers,
    now: () => performance.now()
  },
  displayMs: 3000,
  handoffMs: 180
});

function parseFault(value: string | null): AssetFault | null {
  return FAULTS.includes(value as AssetFault) ? (value as AssetFault) : null;
}

function announce(text: string): void {
  announcer.request(text);
}

function setInert(value: boolean): void {
  shell.inert = value;
}

function closeDialogs(): void {
  if (pauseDialog.open) pauseDialog.close();
  if (confirmDialog.open) confirmDialog.close();
  setInert(false);
}

function showOnly(target: Screen): void {
  screen = target;
  homeScreen.hidden = target !== 'home';
  gameScreen.hidden = target !== 'game';
  resultsScreen.hidden = target !== 'results';
  errorScreen.hidden = target !== 'error';
}

function setMode(mode: Mode): void {
  selectedMode = mode;
  const classic = mode === 'classic';
  modeClassicButton.setAttribute('aria-pressed', String(classic));
  modeAssistButton.setAttribute('aria-pressed', String(!classic));
  modeClassicSelected.hidden = !classic;
  modeAssistSelected.hidden = classic;
  startButton.textContent = classic ? 'Start Classic' : 'Start Assist';
  homeInstruction.textContent = classic
    ? 'Tap the playfield, press Space/Enter, or use Drop. Aim for the platform, then the top cat.'
    : 'Use Left/Right to position the cat, then Drop. Aim for the platform, then the top cat.';
  leftButton.hidden = classic;
  rightButton.hidden = classic;
  assistReadout.hidden = classic;
}

function recordNamespace(mode: Mode): string {
  return `${mode}@1`;
}

function saveNoticeText(mode: SaveMode): string {
  switch (mode) {
    case 'owner':
      return '';
    case 'other-tab':
      return 'This profile is open in another tab.';
    case 'temporary-unsupported':
      return 'Temporary session — progress will not be saved.';
    case 'temporary-unreadable':
      return 'Saved progress could not be read, so this session is temporary. Your saved data was left unchanged.';
    case 'temporary-write-failed':
      return 'Progress is saved only for this session.';
  }
}

function setSaveAction(text: string): void {
  homeSaveAction.textContent = text;
  homeSaveAction.hidden = text === '';
}

function effectiveReducedMotion(): boolean {
  const setting = profileView?.settings.reducedMotion ?? 'system';
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return motionQuery.matches;
}

function applyMotionPreference(): void {
  const reduced = effectiveReducedMotion();
  renderer?.setReducedMotion(reduced);
  if (screen === 'game' && session?.hasStarted) {
    renderer.render(session.snapshot(), 0);
  }
}

function updateSoundStatus(status: AudioStatus): void {
  const text = status === 'unavailable'
    ? 'Sound is unavailable here. You can keep playing.'
    : status === 'pending'
      ? 'Sound may need a tap to start.'
      : '';
  soundStatus.textContent = text;
  soundStatus.hidden = text === '' || !soundEnabledCheckbox.checked;
}

function syncSettingsControls(view: ProfileView): void {
  for (const radio of Array.from(
    settingsDialog.querySelectorAll<HTMLInputElement>('input[name="motion"]')
  )) {
    radio.checked = radio.value === view.settings.reducedMotion;
  }
  highContrastCheckbox.checked = view.settings.highContrast;
  soundEnabledCheckbox.checked = view.settings.soundEnabled;
  volumeSlider.value = String(Math.round(view.settings.volume * 100));
  volumeValue.textContent = `${Math.round(view.settings.volume * 100)}%`;
  updateSoundStatus(audio.status);
}

function applyHighContrast(view: ProfileView): void {
  if (view.settings.highContrast) {
    document.documentElement.dataset.contrast = 'high';
  } else {
    delete document.documentElement.dataset.contrast;
  }
}

function applyProfilePresentation(view: ProfileView): void {
  applyHighContrast(view);
  syncSettingsControls(view);
  applyMotionPreference();
  audio.setEnabled(view.settings.soundEnabled);
  audio.setVolume(view.settings.volume);
}

function drawHomePreview(skin: SkinId): void {
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = homeCatPreview.getContext('2d');
  } catch {
    context = null;
  }
  if (!context) return;
  context.clearRect(0, 0, homeCatPreview.width, homeCatPreview.height);
  try {
    drawCat(context, artAssets ?? emptyArtAssets([]), {
      bodyId: skin,
      faceId: 'idle',
      xPx: homeCatPreview.width / 2,
      bottomPx: homeCatPreview.height - 7,
      logicalWidthPx: 54
    });
  } catch (error) {
    console.debug('Home preview could not be drawn', error);
  }
}

function renderHomeSummary(): void {
  if (!profileView) return;
  const record = profileView.records[recordNamespace(selectedMode)] ?? {
    bestHeight: 0,
    bestScore: 0
  };
  const modeLabel = selectedMode === 'classic' ? 'Classic' : 'Assist';
  homeBest.textContent = `Best (${modeLabel}): score ${record.bestScore} · height ${record.bestHeight}`;
  homeCollection.textContent =
    `Cats collected ${profileView.unlocked.length}/4 · ${profileView.stats.totalPlacements} stacked in total`;
  homeSkinName.textContent = SKIN_LABELS[profileView.selectedSkin];
  homeProfileRow.setAttribute(
    'aria-label',
    `Profile summary. ${SKIN_LABELS[profileView.selectedSkin]} selected. ${profileView.unlocked.length} of 4 cats collected.`
  );
  drawHomePreview(profileView.selectedSkin);
}

function applySaveState(): void {
  const mode = profileView?.saveMode ?? 'temporary-unsupported';
  const displayMode = mode === 'other-tab' && otherTabDismissed ? 'temporary-unsupported' : mode;
  const text = saveNoticeText(displayMode);
  for (const notice of [homeSaveNotice, gameSaveNotice, resultsSaveNotice]) {
    notice.textContent = text;
    notice.hidden = text === '';
  }
  otherTabActions.hidden = !(mode === 'other-tab' && !otherTabDismissed && screen === 'home');
  if (lastSaveMode !== mode && mode === 'temporary-write-failed') {
    announcer.setFailure(text);
  }
  lastSaveMode = mode;
}

function handleProfileChange(view: ProfileView): void {
  profileView = view;
  applyProfilePresentation(view);
  renderHomeSummary();
  applySaveState();
}

function chooseMode(mode: Mode): void {
  setMode(mode);
  profileService?.updateSettings({ preferredMode: mode });
  renderHomeSummary();
}

function openSettings(opener: HTMLElement, fromPause: boolean): void {
  settingsOpener = opener;
  settingsFromPause = fromPause;
  if (profileView) syncSettingsControls(profileView);
  updateSoundStatus(audio.status);
  if (fromPause && pauseDialog.open) pauseDialog.close();
  setInert(true);
  settingsDialog.showModal();
  settingsTitle.focus({ preventScroll: true });
}

function closeSettings(): void {
  if (!settingsDialog.open) return;
  settingsDialog.close();
  if (settingsFromPause) {
    settingsFromPause = false;
    settingsOpener = null;
    setInert(true);
    pauseDialog.showModal();
    pauseSettingsButton.focus({ preventScroll: true });
    return;
  }
  const opener = settingsOpener;
  settingsOpener = null;
  setInert(false);
  opener?.focus({ preventScroll: true });
}

function drawCollectionCat(canvas: HTMLCanvasElement, skin: SkinId): void {
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext('2d');
  } catch {
    context = null;
  }
  if (!context) return;
  try {
    drawCat(context, artAssets ?? emptyArtAssets([]), {
      bodyId: skin,
      faceId: 'idle',
      xPx: canvas.width / 2,
      bottomPx: canvas.height - 6,
      logicalWidthPx: 54
    });
  } catch (error) {
    console.debug('Collection preview could not be drawn', error);
  }
}

function renderCollection(): void {
  if (!profileView) return;
  collectionCards.textContent = '';
  for (const id of SKIN_IDS) {
    const unlocked = profileView.unlocked.includes(id);
    const selected = profileView.selectedSkin === id;
    const card: HTMLElement = unlocked
      ? document.createElement('button')
      : document.createElement('div');
    card.className = unlocked ? 'collection-card' : 'collection-card collection-locked';
    if (unlocked) {
      const button = card as HTMLButtonElement;
      button.type = 'button';
      button.dataset.skin = id;
      button.setAttribute('aria-pressed', String(selected));
      button.addEventListener('click', () => {
        profileService?.selectSkin(id);
        renderCollection();
        collectionCards.querySelector<HTMLButtonElement>(`[data-skin="${id}"]`)?.focus({
          preventScroll: true
        });
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    canvas.setAttribute('aria-hidden', 'true');
    drawCollectionCat(canvas, id);

    const name = document.createElement('strong');
    name.textContent = SKIN_LABELS[id];
    card.append(canvas, name);

    if (unlocked) {
      const state = document.createElement('span');
      state.className = 'collection-selected';
      state.textContent = selected ? '✓ Selected' : 'Select';
      card.append(state);
    } else {
      const threshold = UNLOCK_THRESHOLDS[id as 'ginger' | 'tuxedo' | 'calico'];
      const note = document.createElement('small');
      note.textContent =
        `Locked — unlock at ${threshold} cats stacked in total (${profileView.stats.totalPlacements} so far)`;
      card.append(note);
    }
    collectionCards.append(card);
  }
}

function openCollection(opener: HTMLElement): void {
  collectionOpener = opener;
  renderCollection();
  setInert(true);
  collectionDialog.showModal();
  collectionTitle.focus({ preventScroll: true });
}

function closeCollection(): void {
  if (!collectionDialog.open) return;
  collectionDialog.close();
  const opener = collectionOpener;
  collectionOpener = null;
  setInert(false);
  opener?.focus({ preventScroll: true });
}

function openHowTo(): void {
  setInert(true);
  howToDialog.showModal();
  howToTitle.focus({ preventScroll: true });
}

function closeHowTo(): void {
  if (!howToDialog.open) return;
  howToDialog.close();
  setInert(false);
  howToButton.focus({ preventScroll: true });
}

function renderTutorialStep(): void {
  tutorialProgress.textContent = `Tutorial ${tutorialStep} of 2`;
  tutorialBack.hidden = tutorialStep === 1;
  tutorialNext.hidden = tutorialStep === 2;
  tutorialStart.hidden = tutorialStep === 1;
  if (tutorialStep === 1) {
    tutorialTitle.textContent = 'Drop cats onto the top of your tower';
    tutorialCopy.textContent =
      'Tap the playfield, press Space or Enter, or use Drop.';
  } else {
    tutorialTitle.textContent = 'Keep the tower steady';
    tutorialCopy.textContent = selectedMode === 'assist'
      ? "Keep the tower's weight over each cat below. A wobble means danger. Use Left/Right to position, then Drop."
      : "Keep the tower's weight over each cat below. A wobble means danger.";
  }
}

function openTutorial(): void {
  tutorialStep = 1;
  renderTutorialStep();
  setInert(true);
  tutorialDialog.showModal();
  tutorialTitle.focus({ preventScroll: true });
}

function completeTutorial(trusted: boolean): void {
  if (!tutorialDialog.open) return;
  tutorialDialog.close();
  setInert(false);
  profileService?.updateSettings({ tutorialSeen: true });
  startRun(selectedMode, trusted);
}

function clearToasts(): void {
  unlockToasts.clear();
}

function queueUnlockToasts(ids: readonly SkinId[]): void {
  unlockToasts.push(ids);
}

function renderResultsExtras(state: Readonly<RoundState>): void {
  if (!profileView) return;
  const record = profileView.records[recordNamespace(state.mode)] ?? {
    bestHeight: 0,
    bestScore: 0
  };
  resultsBest.textContent = `Best score ${record.bestScore} · Best height ${record.bestHeight}`;

  const newScore = state.score > runBaseline.bestScore;
  const newHeight = state.cats.length > runBaseline.bestHeight;
  resultsBadges.textContent = '';
  resultsBadges.hidden = !newScore && !newHeight;
  if (newScore) {
    const badge = document.createElement('span');
    badge.className = 'results-badge';
    badge.textContent = 'New best score';
    resultsBadges.append(badge);
  }
  if (newHeight) {
    const badge = document.createElement('span');
    badge.className = 'results-badge';
    badge.textContent = 'New best height';
    resultsBadges.append(badge);
  }

  resultsUnlocks.textContent = '';
  for (const id of runUnlocked) {
    const card = document.createElement('div');
    card.className = 'unlock-card';
    const title = document.createElement('strong');
    title.textContent = `${SKIN_LABELS[id]} cat unlocked.`;
    const note = document.createElement('span');
    note.className = 'unlock-note';
    note.textContent = 'Now available in Collection.';
    card.append(title, document.createTextNode(' '), note);
    resultsUnlocks.append(card);
  }
}

async function performRetry(): Promise<void> {
  const service = profileService;
  if (!service) return;
  const result = await service.retrySaveAccess();
  profileView = service.view();
  renderHomeSummary();
  applySaveState();
  if (result === 'ok') {
    otherTabDismissed = false;
    setSaveAction('Save access restored.');
    announce('Save access restored.');
  } else if (result === 'other-tab') {
    setSaveAction('Still open in another tab.');
  } else {
    setSaveAction(saveNoticeText(service.saveMode));
  }
}

function openRetryConfirm(): void {
  const service = profileService;
  if (!service) return;
  if (!service.hasTemporaryProgress) {
    void performRetry();
    return;
  }
  confirmAction = () => {
    void performRetry();
  };
  confirmTitle.textContent = 'Retry save access?';
  confirmMessage.textContent =
    "Saving will reload your saved progress. This session's temporary progress won't be added. Continue?";
  confirmAcceptButton.textContent = 'Continue';
  setInert(true);
  confirmDialog.showModal();
  confirmTitle.focus({ preventScroll: true });
}

function currentPhase(): RoundState['phase'] | null {
  if (!session?.hasStarted) return null;
  return session.snapshot().phase;
}

function updateSafety(state: Readonly<RoundState>): void {
  const failure = state.failure;
  const band = failure ? 'danger' : safetyBand(state.safety);
  const label = failure
    ? 'Tipping'
    : state.phase === 'RESULTS'
      ? safetyLabel(state.safety)
      : safetyLabel(state.safety);
  hudSafety.dataset.level = band;
  hudSafety.classList.remove('safety-steady', 'safety-caution', 'safety-danger');
  hudSafety.classList.add(`safety-${band}`);
  hudSafetyText.textContent = label;
}

function updateHud(state: Readonly<RoundState>): void {
  hudScore.textContent = String(state.score);
  hudHeight.textContent = String(state.cats.length);
  hudMode.textContent = state.mode === 'assist' ? 'Assist' : 'Classic';
  hudMode.setAttribute('aria-label', state.mode === 'assist' ? 'Mode: Assist' : 'Mode: Classic');
  if (state.perfectChain >= 2) {
    hudChain.hidden = false;
    hudChain.textContent = `Perfect ×${state.perfectChain}`;
  } else {
    hudChain.hidden = true;
  }
  updateSafety(state);

  const livePhase = state.phase === 'SPAWN_CUE' || state.phase === 'AIMING' ||
    state.phase === 'FALLING' || state.phase === 'SETTLING' || state.phase === 'COLLAPSING';
  const collapsing = state.phase === 'COLLAPSING';
  dropButton.disabled = state.phase !== 'AIMING' || screen !== 'game';
  dropButton.hidden = collapsing;
  leftButton.hidden = collapsing || state.mode !== 'assist';
  rightButton.hidden = collapsing || state.mode !== 'assist';
  leftButton.disabled = state.phase !== 'AIMING';
  rightButton.disabled = state.phase !== 'AIMING';
  pauseButton.disabled = !livePhase || screen !== 'game';
  skipButton.hidden = !collapsing;
  skipButton.disabled = !collapsing;

  if (state.phase === 'SPAWN_CUE') {
    gameStatus.textContent = 'Get ready…';
  } else if (state.phase === 'AIMING') {
    gameStatus.textContent = state.mode === 'assist'
      ? 'Ready — adjust with Left/Right, then drop.'
      : 'Ready — drop!';
  } else if (state.phase === 'FALLING') {
    gameStatus.textContent = 'Falling…';
  } else if (state.phase === 'SETTLING') {
    gameStatus.textContent = 'Landed!';
  } else if (state.phase === 'COLLAPSING') {
    gameStatus.textContent = state.failure?.reason === 'MISS_TOP'
      ? state.cats.length === 0 ? 'Missed the platform' : 'Missed the top cat'
      : 'The tower tipped';
  } else if (state.phase === 'PAUSED') {
    gameStatus.textContent = 'Paused';
  } else {
    gameStatus.textContent = 'Round over';
  }

  renderAssistReadout(state);
}

function renderAssistReadout(state: Readonly<RoundState>): void {
  if (state.mode !== 'assist') {
    if (state.phase === 'AIMING' || state.phase === 'SPAWN_CUE' || state.phase === 'PAUSED') {
      assistReadout.textContent = 'Classic timing — drop when the cat is over the platform.';
      assistReadout.hidden = false;
    } else {
      assistReadout.hidden = true;
    }
    return;
  }
  if (assistPreview === null) {
    assistReadout.hidden = true;
    return;
  }
  if (state.phase !== 'AIMING' && state.phase !== 'SPAWN_CUE' && state.phase !== 'PAUSED') {
    assistReadout.hidden = true;
    return;
  }
  const overlap = Math.round(assistPreview.overlapRatio * 100);
  assistReadout.textContent =
    `${formatOffset(assistPreview.offset, assistPreview.onFloor)} · overlap ${overlap}% · ${assistPrediction(assistPreview)}`;
  assistReadout.hidden = false;
}

function updateAssistPreview(force = false): boolean {
  if (!session?.hasStarted || session.mode !== 'assist') {
    assistPreview = null;
    assistPreviewKey = '';
    return false;
  }
  const state = session.snapshot();
  if (state.incoming === undefined || state.phase === 'RESULTS') {
    assistPreview = null;
    assistPreviewKey = '';
    pendingNudgeAnnouncement = false;
    return false;
  }
  const key = `${state.runId}:${state.incoming.spawnId}:${state.incoming.x}`;
  if (!force && key === assistPreviewKey) return false;
  assistPreviewKey = key;
  assistPreview = computeAssistPreview(state.cats, state.incoming.x);
  return true;
}

function afterAssistTick(): void {
  if (session?.hasStarted && session.mode === 'assist') {
    const changed = updateAssistPreview();
    if (changed && pendingNudgeAnnouncement) {
      pendingNudgeAnnouncement = false;
      scheduleAssistNudge();
    }
  }
}

function scheduleAssistNudge(): void {
  nudgeThrottle.request(() => {
    if (!assistPreview || screen !== 'game') return;
    const overlap = Math.round(assistPreview.overlapRatio * 100);
    announce(`${formatOffset(assistPreview.offset, assistPreview.onFloor)}; overlap ${overlap}%; ${assistPrediction(assistPreview)}`);
  });
}

function handleEvents(events: readonly GameEvent[], state: Readonly<RoundState>): void {
  renderer?.onEvents(events);
  for (const event of events) {
    if (event.type === 'spawned') {
      nudgeThrottle.cancel();
      pendingNudgeAnnouncement = false;
      updateAssistPreview();
    } else if (event.type === 'placementCommitted') {
      assistPreview = null;
      assistPreviewKey = '';
      pendingNudgeAnnouncement = false;
      nudgeThrottle.cancel();
      audio.landing({
        runId: event.runId,
        ordinal: event.ordinal,
        grade: event.grade,
        safety: event.safety
      });
      const newlyUnlocked = profileService?.commitPlacement({
        runId: event.runId,
        ordinal: event.ordinal,
        grade: event.grade,
        totalScore: event.totalScore,
        perfectCount: event.perfectCount,
        mode: event.mode,
        balanceVersion: event.balanceVersion
      }) ?? [];
      for (const id of newlyUnlocked) {
        if (!runUnlocked.includes(id)) runUnlocked.push(id);
      }
      queueUnlockToasts(newlyUnlocked);
      announce(landingAnnouncement({
        grade: event.grade,
        points: event.points,
        ordinal: event.ordinal,
        totalScore: event.totalScore,
        unlocked: newlyUnlocked
      }));
    } else if (event.type === 'phaseChanged') {
      if (
        !replacingRun &&
        event.to === 'AIMING' &&
        state.cats.length === 0 &&
        readyAnnouncedRunId !== state.runId
      ) {
        readyAnnouncedRunId = state.runId;
        announce(state.mode === 'assist'
          ? 'Assist round started. Ready — use Left/Right to position, then Drop.'
          : 'Classic round started. Ready — drop onto the platform.');
      }
    } else if (event.type === 'roundFailed') {
      audio.failure(event.runId, event.reason);
      nudgeThrottle.cancel();
      pendingNudgeAnnouncement = false;
      clearToasts();
      const reason = event.reason === 'MISS_TOP'
        ? state.cats.length === 0 ? 'Missed the platform.' : 'Missed the top cat.'
        : `The tower tipped at joint ${event.joint}.`;
      announce(`${reason} Press Skip to see results.`);
    } else if (event.type === 'resultsReady') {
      if (!replacingRun && screen === 'game') {
        showResults(state);
        return;
      }
    }
  }
  if (screen === 'game') updateHud(state);
}

function resizePlayfield(): void {
  if (!renderer) return;
  const width = playfieldWrap.clientWidth;
  const height = playfieldWrap.clientHeight;
  if (width < 2 || height < 2) return;
  renderer.resize(width, height, window.devicePixelRatio || 1);
  if (session?.hasStarted && screen === 'game') {
    renderer.render(session.snapshot(), 0);
  }
}

function showHome(): void {
  loop?.stop();
  audio.resetSession();
  announcer.resetContext();
  nudgeThrottle.cancel();
  pendingNudgeAnnouncement = false;
  clearToasts();
  closeDialogs();
  showOnly('home');
  setMode(selectedMode);
  renderHomeSummary();
  applySaveState();
  updateHudIfStarted();
  window.scrollTo(0, 0);
  startButton.focus({ preventScroll: true });
}

function showGame(): void {
  showOnly('game');
  applySaveState();
  window.scrollTo(0, 0);
  lastSize = null;
  resizePlayfield();
  lastSize = { width: playfieldWrap.clientWidth, height: playfieldWrap.clientHeight };
  loop.start();
  window.requestAnimationFrame(() => {
    gameCanvas.focus({ preventScroll: true });
  });
}

function showResults(state: Readonly<RoundState>): void {
  if (screen !== 'game' || replacingRun) return;
  loop.stop();
  announcer.resetContext();
  nudgeThrottle.cancel();
  pendingNudgeAnnouncement = false;
  closeDialogs();
  showOnly('results');
  const failure = state.failure;
  resultsTitle.textContent = 'Nice stacking!';
  resultsReason.textContent = failure
    ? failure.reason === 'MISS_TOP'
      ? state.cats.length === 0 ? 'Missed the platform.' : 'Missed the top cat.'
      : 'The tower tipped.'
    : 'Round complete.';
  resultsScore.textContent = String(state.score);
  resultsHeight.textContent = String(state.cats.length);
  renderResultsExtras(state);
  audio.results({
    runId: state.runId,
    score: state.score,
    height: state.cats.length,
    baseline: runBaseline,
    unlocked: runUnlocked.length
  });
  clearToasts();
  applySaveState();
  announce(`Round over. Score ${state.score}. Cats stacked ${state.cats.length}.`);
  window.scrollTo(0, 0);
  replayButton.focus({ preventScroll: true });
}

function startRun(mode: Mode, trusted: boolean): void {
  selectedMode = mode;
  replacingRun = true;
  announcer.resetContext();
  nudgeThrottle.cancel();
  pendingNudgeAnnouncement = false;
  readyAnnouncedRunId = null;
  clearToasts();
  let initialState: Readonly<RoundState>;
  try {
    initialState = session.start({
      mode,
      skinId: profileView?.selectedSkin ?? 'default',
      reducedMotion: effectiveReducedMotion()
    });
  } catch (error) {
    replacingRun = false;
    fatal(error);
    return;
  }
  replacingRun = false;
  audio.startRun(initialState.runId);
  audio.unlockFromGesture(trusted);
  profileService?.startRun(initialState.runId, mode);
  if (profileService) profileView = profileService.view();
  runBaseline = profileView?.records[recordNamespace(mode)] ?? { bestHeight: 0, bestScore: 0 };
  runUnlocked = [];
  renderer.setReducedMotion(effectiveReducedMotion());
  renderer.resetView();
  assistPreview = null;
  assistPreviewKey = '';
  pendingNudgeAnnouncement = false;
  updateAssistPreview(true);
  showGame();
  updateHud(session.snapshot());
  if (import.meta.env.DEV && window.__catTowerDebug) window.__catTowerDebug.restarts += 1;
  loop.resetClock();
}

function updateHudIfStarted(): void {
  if (session?.hasStarted) updateHud(session.snapshot());
}

function pauseGame(reason: PauseReason): void {
  if (screen !== 'game' || !session?.hasStarted) return;
  const state = session.snapshot();
  if (state.phase === 'PAUSED' || state.phase === 'RESULTS') return;
  nudgeThrottle.cancel();
  pendingNudgeAnnouncement = false;
  announcer.cancelPending();
  audio.pause();
  session.pause(reason);
  loop.resetClock();
  unlockToasts.pause();
  updateHud(session.snapshot());
  openPauseDialog(reason);
  announce(reason === 'user' ? 'Paused.' : `Paused. ${pauseReasonText(reason)}`);
}

function pauseReasonText(reason: PauseReason): string {
  switch (reason) {
    case 'hidden':
      return 'The game paused when this tab was hidden.';
    case 'blur':
      return 'The game paused when the window lost focus.';
    case 'resize':
      return 'The layout changed — resume when you are ready.';
    case 'interrupted':
      return 'The frame rate paused. Resume when you are ready.';
    case 'user':
    default:
      return 'Take your time. The tower is waiting.';
  }
}

function openPauseDialog(reason: PauseReason): void {
  pauseReason.textContent = pauseReasonText(reason);
  if (!pauseDialog.open) {
    setInert(true);
    pauseDialog.showModal();
    resumeButton.focus({ preventScroll: true });
  }
}

function openConfirm(kind: 'restart' | 'home'): void {
  confirmAction = (trusted) => {
    if (kind === 'restart') startRun(session.mode, trusted);
    else showHome();
  };
  confirmTitle.textContent = kind === 'restart' ? 'Start a new round?' : 'Return home?';
  confirmMessage.textContent = kind === 'restart'
    ? 'Keep your earned progress and start a new round?'
    : 'Keep your earned progress and return home?';
  confirmAcceptButton.textContent = 'Confirm';
  if (pauseDialog.open) pauseDialog.close();
  setInert(true);
  confirmDialog.showModal();
  confirmTitle.focus({ preventScroll: true });
}

function cancelConfirm(): void {
  if (confirmDialog.open) confirmDialog.close();
  setInert(true);
  if (session?.hasStarted && currentPhase() === 'PAUSED') {
    pauseDialog.showModal();
    restartButton.focus({ preventScroll: true });
  } else {
    setInert(false);
  }
}

function resumeGame(trusted: boolean): void {
  if (!pauseDialog.open) return;
  pauseDialog.close();
  setInert(false);
  announcer.cancelPending();
  nudgeThrottle.cancel();
  pendingNudgeAnnouncement = false;
  audio.resumeFromGesture(trusted);
  session.resume();
  loop.resetClock();
  unlockToasts.resume();
  updateHud(session.snapshot());
  announce('Resumed. Drop when ready.');
  gameCanvas.focus({ preventScroll: true });
}

function fatal(error: unknown): void {
  loop?.stop();
  audio.resetSession();
  announcer.resetContext();
  nudgeThrottle.cancel();
  clearToasts();
  closeDialogs();
  showOnly('error');
  errorMessage.textContent = 'Something went wrong while running the game. Reload to try again.';
  console.error('Nekotsumi stopped:', error);
}

function trapFocus(dialog: HTMLDialogElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((node) => node.offsetParent !== null);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

const measurementCounts = {
  engine: 0,
  session: 0,
  loop: 0,
  resizeObserver: 0
};
const listenerCounts: Record<'window' | 'document' | 'canvas' | 'motion', number> = {
  window: 0,
  document: 0,
  canvas: 0,
  motion: 0
};

function trackWindow(type: string, handler: (event: any) => void, options?: boolean | AddEventListenerOptions): void {
  window.addEventListener(type, handler as EventListener, options);
  if (import.meta.env.DEV) listenerCounts.window += 1;
}
function trackDocument(type: string, handler: (event: any) => void, options?: boolean | AddEventListenerOptions): void {
  document.addEventListener(type, handler as EventListener, options);
  if (import.meta.env.DEV) listenerCounts.document += 1;
}
function trackCanvas(type: string, handler: (event: any) => void, options?: boolean | AddEventListenerOptions): void {
  gameCanvas.addEventListener(type, handler as EventListener, options);
  if (import.meta.env.DEV) listenerCounts.canvas += 1;
}
function trackMotion(type: string, handler: (event: any) => void, options?: boolean | AddEventListenerOptions): void {
  motionQuery.addEventListener(type, handler as EventListener, options);
  if (import.meta.env.DEV) listenerCounts.motion += 1;
}

async function init(): Promise<void> {
  if (import.meta.env.DEV && window.__catTowerDebug) {
    throw new Error('Duplicate application bootstrap');
  }
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = gameCanvas.getContext('2d');
  } catch {
    context = null;
  }
  if (!context) {
    showOnly('error');
    errorMessage.textContent = 'This browser could not create a Canvas 2D playfield.';
    startButton.disabled = true;
    return;
  }

  startButton.disabled = true;
  startButton.textContent = 'Loading art…';
  const baseHref = new URL('assets/production-02/', document.baseURI).href;
  const assetAbort = new AbortController();
  let assetDeadlineHit = false;
  let deadlineTimer: number | undefined;
  const deadline = new Promise<ArtAssets>((resolve) => {
    deadlineTimer = window.setTimeout(() => {
      if (import.meta.env.DEV) assetDeadlineHit = true;
      assetAbort.abort();
      resolve(emptyArtAssets(['Art startup deadline 1500 ms; placeholder assets active']));
    }, 1500);
  });
  const loaded = loadArtAssets(baseHref, {
    fault,
    signal: assetAbort.signal
  }).catch((error: unknown) => emptyArtAssets([String(error)]));
  const assets = await Promise.race([loaded, deadline]);
  if (deadlineTimer !== undefined) window.clearTimeout(deadlineTimer);
  artAssets = assets;

  try {
    const locks = 'locks' in navigator && navigator.locks ? navigator.locks : null;
    profileService = await ProfileService.create({
      storage: browserStorageAdapter(),
      locks,
      onChange: handleProfileChange
    });
    profileView = profileService.view();
  } catch (error) {
    console.error('Profile could not be opened; continuing temporarily.', error);
    const fallback = createDefaultProfile();
    profileView = {
      saveMode: 'temporary-unsupported',
      revision: 0,
      stats: fallback.stats,
      records: fallback.records,
      selectedSkin: fallback.selectedSkin,
      settings: fallback.settings,
      unlocked: deriveUnlocked(0)
    };
  }
  applyProfilePresentation(profileView);
  renderHomeSummary();
  applySaveState();

  startButton.disabled = false;
  startButton.textContent = selectedMode === 'classic' ? 'Start Classic' : 'Start Assist';

  renderer = new GameRenderer(gameCanvas, assets, effectiveReducedMotion());
  const engine = new CatTowerEngine();
  if (import.meta.env.DEV) measurementCounts.engine += 1;
  session = new GameSession({ engine, onEvents: handleEvents });
  if (import.meta.env.DEV) measurementCounts.session += 1;
  input = new InputRouter({
    snapshot: () => session.snapshot(),
    enqueue: (command) => session.enqueue(command)
  });

  if (import.meta.env.DEV) measurementCounts.loop += 1;
  loop = new FixedStepLoop(
    {
      tick: () => {
        try {
          session.tick();
          afterAssistTick();
          updateHud(session.snapshot());
        } catch (error) {
          fatal(error);
        }
      },
      render: (dtSeconds) => {
        if (screen !== 'game' || !session.hasStarted) return;
        try {
          const state = session.snapshot();
          const paused = state.phase === 'PAUSED';
          renderer.render(state, paused ? 0 : dtSeconds);
        } catch (error) {
          fatal(error);
        }
      },
      interrupted: () => {
        if (captureMode) {
          loop.resetClock();
          return;
        }
        if (screen === 'game') pauseGame('interrupted');
      }
    },
    (callback) => window.requestAnimationFrame(callback),
    (handle) => window.cancelAnimationFrame(handle)
  );

  let resizeScheduled = false;
  const schedulePlayfieldSize = (): void => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    window.setTimeout(() => {
      resizeScheduled = false;
      resizePlayfield();
    }, 0);
  };
  const handleViewportChange = (): void => {
    const width = playfieldWrap.clientWidth;
    const height = playfieldWrap.clientHeight;
    if (width < 2 || height < 2) return;
    const previous = lastSize;
    if (previous === null) {
      lastSize = { width, height };
      schedulePlayfieldSize();
      return;
    }
    if (Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1) return;
    lastSize = { width, height };
    // Pause at the event, before the next frame. Canvas sizing is deferred so
    // changing the canvas box cannot feed a ResizeObserver loop.
    const phase = currentPhase();
    if (
      !captureMode &&
      screen === 'game' &&
      phase !== null &&
      phase !== 'PAUSED' &&
      phase !== 'RESULTS'
    ) {
      pauseGame('resize');
    }
    schedulePlayfieldSize();
  };
  const resizeObserver = new ResizeObserver(handleViewportChange);
  if (import.meta.env.DEV) measurementCounts.resizeObserver += 1;
  resizeObserver.observe(playfieldWrap);
  trackWindow('resize', handleViewportChange);

  startButton.addEventListener('click', (event) => {
    if (profileView && !profileView.settings.tutorialSeen) openTutorial();
    else startRun(selectedMode, event.isTrusted);
  });
  modeClassicButton.addEventListener('click', () => chooseMode('classic'));
  modeAssistButton.addEventListener('click', () => chooseMode('assist'));
  collectionButton.addEventListener('click', () => openCollection(collectionButton));
  resultsCollectionButton.addEventListener('click', () => openCollection(resultsCollectionButton));
  howToButton.addEventListener('click', openHowTo);
  homeSettingsButton.addEventListener('click', () => openSettings(homeSettingsButton, false));
  pauseSettingsButton.addEventListener('click', () => openSettings(pauseSettingsButton, true));
  retryAccessButton.addEventListener('click', openRetryConfirm);
  playTemporaryButton.addEventListener('click', () => {
    otherTabDismissed = true;
    setSaveAction('');
    applySaveState();
    startButton.focus({ preventScroll: true });
  });

  tutorialBack.addEventListener('click', () => {
    tutorialStep = 1;
    renderTutorialStep();
    tutorialTitle.focus({ preventScroll: true });
  });
  tutorialNext.addEventListener('click', () => {
    tutorialStep = 2;
    renderTutorialStep();
    tutorialTitle.focus({ preventScroll: true });
  });
  tutorialSkip.addEventListener('click', (event) => completeTutorial(event.isTrusted));
  tutorialStart.addEventListener('click', (event) => completeTutorial(event.isTrusted));
  settingsCloseButton.addEventListener('click', closeSettings);
  collectionCloseButton.addEventListener('click', closeCollection);
  howToCloseButton.addEventListener('click', closeHowTo);

  for (const radio of Array.from(
    settingsDialog.querySelectorAll<HTMLInputElement>('input[name="motion"]')
  )) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const value = radio.value === 'on' || radio.value === 'off' ? radio.value : 'system';
      profileService?.updateSettings({ reducedMotion: value });
      applyMotionPreference();
    });
  }
  highContrastCheckbox.addEventListener('change', () => {
    profileService?.updateSettings({ highContrast: highContrastCheckbox.checked });
    if (profileView) applyHighContrast(profileView);
  });

  soundEnabledCheckbox.addEventListener('change', () => {
    const enabled = soundEnabledCheckbox.checked;
    audio.setEnabled(enabled);
    profileService?.updateSettings({ soundEnabled: enabled });
    updateSoundStatus(audio.status);
  });

  const volumeFromSlider = (): number => Number(volumeSlider.value) / 100;
  volumeSlider.addEventListener('input', () => {
    const volume = volumeFromSlider();
    volumeValue.textContent = `${Math.round(volume * 100)}%`;
    audio.setVolume(volume);
  });
  volumeSlider.addEventListener('change', () => {
    profileService?.updateSettings({ volume: volumeFromSlider() });
  });
  replayButton.addEventListener('click', (event) => startRun(session.mode, event.isTrusted));
  changeModeButton.addEventListener('click', () => {
    selectedMode = session.mode;
    showHome();
  });
  resultsHomeButton.addEventListener('click', showHome);
  pauseButton.addEventListener('click', () => pauseGame('user'));
  resumeButton.addEventListener('click', (event) => resumeGame(event.isTrusted));
  restartButton.addEventListener('click', () => openConfirm('restart'));
  pauseHomeButton.addEventListener('click', () => openConfirm('home'));
  confirmCancelButton.addEventListener('click', cancelConfirm);
  confirmAcceptButton.addEventListener('click', (event) => {
    const action = confirmAction;
    confirmAction = null;
    if (confirmDialog.open) confirmDialog.close();
    setInert(false);
    action?.(event.isTrusted);
  });
  errorReloadButton.addEventListener('click', () => window.location.reload());

  pauseDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    // Escape on Pause stays paused.
  });
  confirmDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancelConfirm();
  });
  tutorialDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    completeTutorial(event.isTrusted);
  });
  settingsDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeSettings();
  });
  collectionDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCollection();
  });
  howToDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeHowTo();
  });
  pauseDialog.addEventListener('keydown', (event) => trapFocus(pauseDialog, event));
  confirmDialog.addEventListener('keydown', (event) => trapFocus(confirmDialog, event));
  tutorialDialog.addEventListener('keydown', (event) => trapFocus(tutorialDialog, event));
  settingsDialog.addEventListener('keydown', (event) => trapFocus(settingsDialog, event));
  collectionDialog.addEventListener('keydown', (event) => trapFocus(collectionDialog, event));
  howToDialog.addEventListener('keydown', (event) => trapFocus(howToDialog, event));

  trackCanvas('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    audio.unlockFromGesture(event.isTrusted);
    pendingNudgeAnnouncement = false;
    input.drop();
  });

  dropButton.addEventListener('click', (event) => {
    audio.unlockFromGesture(event.isTrusted);
    // Native Enter fires click on keydown and can repeat while held. Only the
    // first keyboard activation from the same keydown may drop; pointer clicks
    // (detail > 0) retain normal behavior. A keydown outside AIMING disarms it.
    if (dropKeyHeld && event.detail === 0) {
      if (!dropKeyArmed || dropKeyUsed) return;
      dropKeyUsed = true;
    }
    pendingNudgeAnnouncement = false;
    input.drop();
  });

  leftButton.addEventListener('click', () => {
    if (input.nudge(-1)) pendingNudgeAnnouncement = true;
  });
  rightButton.addEventListener('click', () => {
    if (input.nudge(1)) pendingNudgeAnnouncement = true;
  });

  skipButton.addEventListener('click', () => {
    if (screen === 'game' && session.snapshot().phase === 'COLLAPSING') {
      session.skipCollapse();
      updateHud(session.snapshot());
    }
  });

  trackCanvas('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      if (event.repeat) return;
      event.preventDefault();
      audio.unlockFromGesture(event.isTrusted);
      dropKeyUsed = true;
      input.drop();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (session.snapshot().mode !== 'assist') return;
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      if (input.nudge(direction)) pendingNudgeAnnouncement = true;
    }
  });

  trackDocument('keydown', (event) => {
    if (!isDropKey(event.key)) return;
    const target = event.target;
    const activationTarget = target === dropButton || target === gameCanvas;
    if (!event.repeat) {
      dropKeyHeld = true;
      dropKeyUsed = false;
      dropKeyArmed = activationTarget && currentPhase() === 'AIMING';
    } else if (!dropKeyHeld) {
      dropKeyHeld = true;
      dropKeyArmed = false;
    }
  }, true);
  trackDocument('keyup', (event) => {
    if (!isDropKey(event.key)) return;
    dropKeyHeld = false;
    dropKeyArmed = false;
    dropKeyUsed = false;
  }, true);

  trackWindow('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (confirmDialog.open || pauseDialog.open) return;
    if (settingsDialog.open || collectionDialog.open || tutorialDialog.open || howToDialog.open) return;
    if (screen === 'game') {
      event.preventDefault();
      pauseGame('user');
    }
  });

  trackDocument('visibilitychange', () => {
    if (document.hidden && !captureMode) pauseGame('hidden');
  });
  trackWindow('blur', () => {
    if (!captureMode) pauseGame('blur');
  });

  const handleMotionChange = (): void => {
    applyMotionPreference();
  };
  trackMotion('change', handleMotionChange);

  if (import.meta.env.DEV) {
    window.__catTowerDebug = {
      engineObjects: measurementCounts.engine,
      sessionObjects: measurementCounts.session,
      loopObjects: measurementCounts.loop,
      resizeObserverObjects: measurementCounts.resizeObserver,
      listenerRegistrations: Object.freeze({ ...listenerCounts }),
      listenerMeasurement: 'counts lifecycle/global/canvas listener registrations made by this bootstrap; button/dialog handlers are static and uncounted',
      restarts: 0,
      generation: () => session.generation,
      active: () => loop.isActive,
      snapshot: () => (session.hasStarted ? session.snapshot() : null),
      resources: () =>
        performance.getEntriesByType('resource').map((entry) => entry.name),
      artReady: assets.artReady,
      assetErrors: assets.errors,
      assetDeadlineHit,
      profile: () => profileView === null ? null : ({
        saveMode: profileView.saveMode,
        revision: profileView.revision,
        stats: profileView.stats,
        records: profileView.records,
        selectedSkin: profileView.selectedSkin,
        unlocked: profileView.unlocked
      }),
      lockRequests: () => profileService?.lockRequestCount ?? 0,
      reducedMotion: () => effectiveReducedMotion(),
      announcements: () => ({
        pending: announcer.hasPending,
        failurePending: announcer.failurePending
      }),
      toasts: () => ({
        displaying: unlockToasts.displaying,
        queued: unlockToasts.queued,
        pendingHandoff: unlockToasts.pendingHandoff
      }),
      audio: () => audio.debug()
    };
    if (captureMode) {
      window.__catTowerDebug.camera = () => renderer.getView();
      window.__catTowerDebug.presentation = () => renderer.getPresentationProbe();
      window.__catTowerDebug.advance = (ticks: number) => {
        if (screen !== 'game' || !session.hasStarted) return;
        for (let i = 0; i < ticks; i += 1) {
          session.tick();
          afterAssistTick();
          const state = session.snapshot();
          updateHud(state);
          renderer.render(state, 1 / 60);
          if (screen !== 'game') break;
        }
      };
    }
  }

  setMode(profileView.settings.preferredMode);
  applyProfilePresentation(profileView);
  renderHomeSummary();
  applySaveState();
  showOnly('home');
  startButton.focus({ preventScroll: true });
}

void init().catch((error) => {
  fatal(error);
});
