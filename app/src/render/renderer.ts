import { BALANCE_V1 } from '../domain/balance.js';
import type { ArtAssets, FaceId } from '../platform/assets.js';
import type { GameEvent, RoundState } from '../domain/types.js';
import { drawCat } from './art.js';
import type { CatTransform } from './art.js';
import { PresentationState } from './presentation.js';
import { drawBackdrop, drawFloor } from './scene.js';
import {
  cameraBottomTarget,
  catHeightPx,
  catWidthPx,
  createProjection,
  screenX,
  screenY
} from './projection.js';
import type { Projection } from './projection.js';

const COLLAPSE_SECONDS = 1.2;
const MAX_VISIBLE_CATS = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Canvas presentation only. It reads frozen engine snapshots and event IDs;
 * it never mutates simulation state or derives collision geometry from art.
 */
export class GameRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly assets: ArtAssets;
  private reducedMotion: boolean;
  private projection: Projection;
  private cameraBottom: number | null = null;
  private readonly presentation = new PresentationState();
  private lastState: Readonly<RoundState> | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    assets: ArtAssets,
    reducedMotion: boolean
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.canvas = canvas;
    this.context = context;
    this.assets = assets;
    this.reducedMotion = reducedMotion;
    this.projection = createProjection(canvas.clientWidth || 320, canvas.clientHeight || 480, -0.8);
  }

  resize(availableWidth: number, availableHeight: number, devicePixelRatio: number): void {
    const width = Math.max(1, availableWidth);
    const height = Math.max(1, availableHeight);
    const worldHeightAtWidth = height / (width / 10);
    const cssWidth = worldHeightAtWidth < 10 ? height : width;
    const cssHeight = height;
    const maxScaleForPixels = Math.sqrt(2_000_000 / Math.max(1, cssWidth * cssHeight));
    const backingScale = Math.max(
      0.1,
      Math.min(devicePixelRatio, 2, maxScaleForPixels)
    );

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    let backingWidth = Math.max(1, Math.round(cssWidth * backingScale));
    let backingHeight = Math.max(1, Math.round(cssHeight * backingScale));
    if (backingWidth * backingHeight > 2_000_000) {
      const capScale = Math.sqrt(2_000_000 / (backingWidth * backingHeight));
      backingWidth = Math.max(1, Math.floor(backingWidth * capScale));
      backingHeight = Math.max(1, Math.floor(backingHeight * capScale));
      while (backingWidth * backingHeight > 2_000_000) {
        if (backingWidth >= backingHeight) backingWidth -= 1;
        else backingHeight -= 1;
      }
    }
    this.canvas.width = backingWidth;
    this.canvas.height = backingHeight;
    this.context.setTransform(backingScale, 0, 0, backingScale, 0, 0);
    this.context.imageSmoothingEnabled = true;

    const oldWorldHeight = this.projection.cssHeight / this.projection.scale;
    this.projection = createProjection(cssWidth, cssHeight, this.cameraBottom ?? -0.8);
    const newWorldHeight = this.projection.worldHeight;
    const supportTop = this.lastState ? this.lastState.cats.length * BALANCE_V1.height : 0;
    const target = cameraBottomTarget(supportTop, newWorldHeight);
    if (this.cameraBottom === null || this.reducedMotion || Math.abs(oldWorldHeight - newWorldHeight) > 0.01) {
      this.cameraBottom = target;
    }
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  getView(): { cameraBottom: number | null; worldHeight: number; cssWidth: number; cssHeight: number } {
    return {
      cameraBottom: this.cameraBottom,
      worldHeight: this.projection.worldHeight,
      cssWidth: this.projection.cssWidth,
      cssHeight: this.projection.cssHeight
    };
  }

  clearEffects(): void {
    this.presentation.clearEffects();
  }

  resetView(): void {
    this.cameraBottom = null;
    this.presentation.reset();
  }

  onEvents(events: readonly GameEvent[]): void {
    this.presentation.onEvents(events);
  }

  getPresentationProbe(): {
    time: number;
    landing: { ordinal: number; elapsed: number; perfect: boolean } | null;
    squash: { scaleX: number; scaleY: number } | null;
    face: FaceId | null;
    reducedMotion: boolean;
  } {
    const landing = this.presentation.landingEffect;
    const state = this.lastState;
    if (landing === null || state === null) {
      return {
        time: this.presentation.now,
        landing: null,
        squash: null,
        face: null,
        reducedMotion: this.reducedMotion
      };
    }
    const ordinal = landing.ordinal;
    const isTop = ordinal === state.cats.length;
    return {
      time: this.presentation.now,
      landing: {
        ordinal,
        elapsed: this.presentation.now - landing.at,
        perfect: landing.perfect
      },
      squash: this.presentation.squashFor(ordinal, this.reducedMotion),
      face: this.faceForCat(state, ordinal, isTop, false),
      reducedMotion: this.reducedMotion
    };
  }

  render(state: Readonly<RoundState>, dtSeconds: number): void {
    this.lastState = state;
    this.presentation.advance(dtSeconds);
    const V = this.projection.worldHeight;
    const supportTop = state.cats.length * BALANCE_V1.height;
    const target = cameraBottomTarget(supportTop, V);
    if (this.cameraBottom === null) {
      this.cameraBottom = target;
    } else if (this.reducedMotion) {
      this.cameraBottom = target;
    } else {
      const blend = 1 - Math.exp(-Math.max(0, dtSeconds) / 0.08);
      this.cameraBottom += (target - this.cameraBottom) * blend;
    }
    this.projection = createProjection(
      this.projection.cssWidth,
      this.projection.cssHeight,
      this.cameraBottom
    );

    const ctx = this.context;
    ctx.clearRect(0, 0, this.projection.cssWidth, this.projection.cssHeight);
    drawBackdrop(ctx, this.assets, this.projection.cssWidth, this.projection.cssHeight);

    const shake = this.cameraShake();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawFloor(ctx, this.assets, this.projection);
    this.drawTargetGuide(state);
    this.drawTower(state);
    this.drawIncoming(state);
    this.drawFailureCue(state);
    this.drawLandingStars(state);
    ctx.restore();
  }

  private cameraShake(): { x: number; y: number } {
    const collapse = this.presentation.collapseEffect;
    if (this.reducedMotion || !collapse) return { x: 0, y: 0 };
    const elapsed = this.presentation.now - collapse.at;
    if (elapsed < 0 || elapsed > 0.12) return { x: 0, y: 0 };
    const fade = 1 - elapsed / 0.12;
    return {
      x: Math.sin(elapsed * 100) * 3 * fade,
      y: Math.cos(elapsed * 80) * 2 * fade
    };
  }

  private drawTargetGuide(state: Readonly<RoundState>): void {
    const incoming = state.incoming;
    if (!incoming || state.phase === 'COLLAPSING' || state.phase === 'RESULTS') return;
    const supportTop = state.cats.length * BALANCE_V1.height;
    const x = screenX(this.projection, incoming.x);
    const y = screenY(this.projection, supportTop);
    const width = catWidthPx(this.projection);
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = 'rgba(78, 88, 74, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, screenY(this.projection, incoming.bottom));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(64, 72, 60, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.42, Math.max(3, width * 0.07), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTower(state: Readonly<RoundState>): void {
    const ctx = this.context;
    const H = BALANCE_V1.height;
    const V = this.projection.worldHeight;
    const cameraBottom = this.cameraBottom ?? -0.8;
    let first = Math.max(0, Math.floor((cameraBottom - H) / H));
    let last = Math.min(state.cats.length - 1, Math.ceil((cameraBottom + V) / H));
    if (last < first) return;
    if (last - first + 1 > MAX_VISIBLE_CATS) first = last - MAX_VISIBLE_CATS + 1;

    const collapse = this.presentation.collapseEffect;
    const collapseStart = collapse
      ? Math.max(collapse.joint - 1, state.cats.length - 20)
      : Number.POSITIVE_INFINITY;
    const topOrdinal = state.cats.length;

    for (let index = first; index <= last; index += 1) {
      const cat = state.cats[index];
      if (!cat) continue;
      const ordinal = index + 1;
      const isTop = ordinal === topOrdinal;
      const collapsed = collapse !== null && index >= collapseStart;
      const transform: CatTransform & { xOffsetPx?: number; yOffsetPx?: number } = collapsed
        ? this.collapseTransform(ordinal - (collapse?.joint ?? ordinal) + 1)
        : this.towerTransform(state, ordinal, isTop);
      const face = this.faceForCat(state, ordinal, isTop, collapsed);
      const x = screenX(this.projection, cat.x) + (transform.xOffsetPx ?? 0);
      const bottom = screenY(this.projection, cat.bottom) + (transform.yOffsetPx ?? 0);
      drawCat(ctx, this.assets, {
        bodyId: state.skinId,
        faceId: face,
        xPx: x,
        bottomPx: bottom,
        logicalWidthPx: catWidthPx(this.projection),
        transform: {
          ...(transform.tiltDeg === undefined ? {} : { tiltDeg: transform.tiltDeg }),
          ...(transform.scaleX === undefined ? {} : { scaleX: transform.scaleX }),
          ...(transform.scaleY === undefined ? {} : { scaleY: transform.scaleY }),
          ...(transform.alpha === undefined ? {} : { alpha: transform.alpha })
        }
      });
    }
  }

  private towerTransform(
    state: Readonly<RoundState>,
    ordinal: number,
    isTop: boolean
  ): CatTransform & { xOffsetPx?: number } {
    if (this.reducedMotion) return {};
    const safety = clamp(state.safety, 0, 1);
    const danger = safety < 0.35;
    const topOffset = state.cats.length - ordinal;
    if (!danger && !isTop) return {};
    if (topOffset > 2) return {};

    const amplitudeWorld = BALANCE_V1.width * (0.006 + 0.024 * (1 - safety));
    const amplitudePx = Math.min(
      this.projection.scale * BALANCE_V1.width * 0.04,
      this.projection.scale * amplitudeWorld
    );
    const phase = this.presentation.now * Math.PI * 2 * 1.2 + topOffset * 0.7;
    const sway = Math.sin(phase);
    let xOffsetPx = sway * amplitudePx;
    let tilt = sway * Math.min(2, 0.5 + (1 - safety) * 1.5);

    const landing = this.presentation.landingEffect;
    if (landing && ordinal === landing.ordinal) {
      const elapsed = this.presentation.now - landing.at;
      if (elapsed >= 0 && elapsed < 0.24) {
        const impulse = 1 - elapsed / 0.24;
        xOffsetPx += sway * amplitudePx * impulse * 0.5;
        tilt += sway * 1.5 * impulse;
      }
    }
    const maxOffset = this.projection.scale * BALANCE_V1.width * 0.04;
    const squash = this.presentation.squashFor(ordinal, this.reducedMotion);
    return {
      xOffsetPx: clamp(xOffsetPx, -maxOffset, maxOffset),
      tiltDeg: clamp(tilt, -2, 2),
      ...(squash.scaleX === 1 ? {} : { scaleX: squash.scaleX, scaleY: squash.scaleY })
    };
  }

  private collapseTransform(localOrdinal: number): CatTransform & {
    xOffsetPx?: number;
    yOffsetPx?: number;
  } {
    const collapse = this.presentation.collapseEffect;
    if (!collapse) return {};
    const elapsed = clamp(this.presentation.now - collapse.at, 0, COLLAPSE_SECONDS);
    if (this.reducedMotion) {
      return { tiltDeg: collapse.direction * 2 };
    }
    const ordinal = Math.max(1, localOrdinal);
    const vx = collapse.direction * (1 + 0.08 * ordinal);
    const vy = 2 + 0.1 * ordinal;
    const xOffsetWorld = vx * elapsed;
    const yOffsetWorld = vy * elapsed - 0.5 * 18 * elapsed * elapsed;
    const spin = Math.min(120, 45 + ordinal * 8) * collapse.direction;
    return {
      xOffsetPx: this.projection.scale * xOffsetWorld,
      yOffsetPx: -this.projection.scale * Math.max(-1.5, yOffsetWorld),
      tiltDeg: spin * elapsed
    };
  }

  private faceForCat(
    state: Readonly<RoundState>,
    ordinal: number,
    isTop: boolean,
    collapsed: boolean
  ): FaceId {
    return this.presentation.towerFace({
      collapsed,
      phase: state.phase,
      isTop,
      ordinal,
      danger: state.safety < 0.15 && ordinal > state.cats.length - 3
    });
  }

  private drawIncoming(state: Readonly<RoundState>): void {
    const incoming = state.incoming;
    if (!incoming) return;
    const ctx = this.context;
    let x = incoming.x;
    let bottom = incoming.bottom;
    let tilt = 0;
    const collapse = this.presentation.collapseEffect;
    const collapsing = collapse !== null &&
      (state.phase === 'COLLAPSING' || state.phase === 'RESULTS');
    const expression = this.presentation.incomingFace({
      collapsed: collapsing,
      phase: state.phase,
      danger: state.safety < 0.15
    });

    if (collapse && collapsing) {
      const elapsed = clamp(this.presentation.now - collapse.at, 0, COLLAPSE_SECONDS);
      if (!this.reducedMotion) {
        x += collapse.direction * (0.8 + 0.08) * elapsed;
        bottom += 2.8 * elapsed - 0.5 * 20 * elapsed * elapsed;
        tilt = collapse.direction * 70 * elapsed;
      } else {
        tilt = collapse.direction * 2;
      }
    }

    drawCat(ctx, this.assets, {
      bodyId: state.skinId,
      faceId: expression,
      xPx: screenX(this.projection, x),
      bottomPx: screenY(this.projection, bottom),
      logicalWidthPx: catWidthPx(this.projection),
      transform: { tiltDeg: tilt }
    });
  }

  private drawFailureCue(state: Readonly<RoundState>): void {
    const joint = state.failure?.joint ?? state.weakestJoint;
    if (joint === undefined) return;
    const warning = state.failure !== undefined || state.safety < 0.15;
    if (!warning) return;
    const y = screenY(this.projection, (joint - 1) * BALANCE_V1.height);
    const x = screenX(this.projection, 0);
    const width = catWidthPx(this.projection) * 0.95;
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = state.failure ? 'rgba(178, 67, 48, 0.95)' : 'rgba(190, 122, 42, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.lineTo(x + width / 2, y);
    ctx.stroke();
    ctx.restore();
  }

  private drawLandingStars(state: Readonly<RoundState>): void {
    const landing = this.presentation.landingEffect;
    if (!landing || this.reducedMotion) return;
    if (!landing.perfect) return;
    const elapsed = this.presentation.now - landing.at;
    if (elapsed < 0 || elapsed > 0.4) return;
    const cat = state.cats[landing.ordinal - 1];
    if (!cat) return;
    const ctx = this.context;
    const x = screenX(this.projection, cat.x);
    const y = screenY(this.projection, cat.bottom) - catHeightPx(this.projection) * 0.55;
    const fade = 1 - elapsed / 0.4;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#f0b94b';
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6 + 0.2;
      const radius = 10 + elapsed * 28;
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius * 0.7;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
