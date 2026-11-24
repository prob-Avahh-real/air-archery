import { ROUND, SCORING, clamp, scoreHit } from './targets.js';

/**
 * Archery aim / draw / flight physics.
 * Aim and hit positions are in normalized target space (−1…1).
 */
export class ArcheryPhysics {
  constructor(range) {
    this.applyRange(range);
    this.resetRound();
  }

  applyRange(range) {
    this.range = range;
  }

  resetRound() {
    this.aimX = 0;
    this.aimY = 0;
    this.draw = 0;
    this.drawing = false;
    this.flying = false;
    this.arrow = null;
    this.hits = [];
    this.arrowsLeft = ROUND.arrows;
    this.score = 0;
    this.lastResult = null;
    this.windPhase = Math.random() * Math.PI * 2;
    this.windDir = Math.random() > 0.5 ? 1 : -1;
  }

  setAim(x, y) {
    if (this.flying) return;
    this.aimX = clamp(x, -1, 1);
    this.aimY = clamp(y, -1, 1);
  }

  nudgeAim(dx, dy) {
    this.setAim(this.aimX + dx, this.aimY + dy);
  }

  startDraw() {
    if (this.flying || this.arrowsLeft <= 0) return false;
    this.drawing = true;
    return true;
  }

  /**
   * @param {number} amount 0–1 incremental power
   */
  addDraw(amount = 0.12) {
    if (this.flying || this.arrowsLeft <= 0) return;
    this.drawing = true;
    this.draw = clamp(this.draw + amount, 0, ROUND.maxDraw);
  }

  cancelDraw() {
    this.drawing = false;
    this.draw = 0;
  }

  /**
   * Release the arrow if power is enough.
   * @param {number} [velocity]
   */
  release(velocity = 1) {
    if (this.flying || this.arrowsLeft <= 0) return null;
    if (this.draw < ROUND.minReleasePower) {
      this.cancelDraw();
      return null;
    }

    const power = clamp(this.draw * clamp(velocity, 0.55, 1.25), 0.2, 1);
    const wind = this.currentWind();
    const drop = this.range.drop * (1.15 - power * 0.55);
    const drift = wind * (1.1 - power * 0.4);

    const hitX = clamp(this.aimX + drift, -1.4, 1.4);
    const hitY = clamp(this.aimY + drop, -1.4, 1.4);
    const dist = Math.hypot(hitX, hitY);
    const scored = scoreHit(dist);

    this.arrow = {
      t: 0,
      duration: 0.55 + this.range.distance * 0.22,
      fromX: this.aimX * 0.15,
      fromY: 0.85,
      toX: hitX,
      toY: hitY,
      power,
      result: scored,
    };

    this.flying = true;
    this.drawing = false;
    this.draw = 0;
    this.arrowsLeft -= 1;
    this.score += scored.points;
    this.lastResult = scored;
    this.hits.push({ x: hitX, y: hitY, ...scored });
    return this.arrow;
  }

  currentWind() {
    const base = this.range.wind * this.windDir;
    const gust = Math.sin(this.windPhase) * this.range.wind * 0.35;
    return base + gust;
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    this.windPhase += dt * 1.4;

    if (!this.flying || !this.arrow) {
      if (this.drawing) {
        this.draw = clamp(this.draw + ROUND.drawRate * dt, 0, ROUND.maxDraw);
      }
      return this.snapshot();
    }

    this.arrow.t += dt;
    if (this.arrow.t >= this.arrow.duration) {
      this.flying = false;
      this.arrow.t = this.arrow.duration;
      if (!this.arrow.reported) {
        this.arrow.landed = true;
        this.arrow.reported = true;
      }
    }
    return this.snapshot();
  }

  /** Clear landed arrow after UI consumes the impact event. */
  clearLanded() {
    if (this.arrow && this.arrow.landed) {
      this.arrow.landed = false;
      this.arrow = null;
    }
  }

  arrowPos() {
    if (!this.arrow) return null;
    const u = clamp(this.arrow.t / this.arrow.duration, 0, 1);
    // Ease-out flight with slight arc
    const ease = 1 - Math.pow(1 - u, 2.2);
    const arc = Math.sin(u * Math.PI) * 0.18 * (1.2 - this.arrow.power);
    return {
      x: this.arrow.fromX + (this.arrow.toX - this.arrow.fromX) * ease,
      y: this.arrow.fromY + (this.arrow.toY - this.arrow.fromY) * ease - arc,
      u,
      landed: !!this.arrow.landed,
    };
  }

  snapshot() {
    return {
      aimX: this.aimX,
      aimY: this.aimY,
      draw: this.draw,
      drawing: this.drawing,
      flying: this.flying,
      arrowsLeft: this.arrowsLeft,
      score: this.score,
      hits: this.hits,
      lastResult: this.lastResult,
      wind: this.currentWind(),
      roundOver: this.arrowsLeft <= 0 && !this.flying,
      arrowPos: this.arrowPos(),
      pendingResult: this.arrow && this.arrow.landed ? this.arrow.result : null,
    };
  }
}

export { ROUND, SCORING, clamp, scoreHit };
