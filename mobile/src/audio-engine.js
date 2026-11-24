/**
 * Web Audio for draw hum, release whoosh, and target impact.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.drawOsc = null;
    this.drawGain = null;
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    if (muted) this.stopDraw();
  }

  async startDraw(power = 0.2) {
    await this.ensure();
    if (this.muted) return;
    if (!this.drawOsc) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 70;
      gain.gain.value = 0.0001;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.drawOsc = osc;
      this.drawGain = gain;
    }
    this.updateDraw(power);
  }

  updateDraw(power) {
    if (!this.drawOsc || !this.ctx || this.muted) return;
    const p = Math.max(0, Math.min(1, power));
    const now = this.ctx.currentTime;
    this.drawOsc.frequency.setTargetAtTime(70 + p * 90, now, 0.05);
    this.drawGain.gain.setTargetAtTime(0.02 + p * 0.07, now, 0.05);
  }

  stopDraw() {
    if (!this.drawGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      this.drawGain.gain.setTargetAtTime(0.0001, now, 0.04);
    } catch {
      /* ignore */
    }
  }

  async release(power = 0.7) {
    await this.ensure();
    this.stopDraw();
    if (this.muted) return;

    const now = this.ctx.currentTime;
    const p = Math.max(0.3, Math.min(1.2, power));

    // Whoosh noise burst
    const len = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900 + p * 800;
    filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35 * p, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(now);
    noise.stop(now + 0.22);

    // String twang
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + p * 80, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
    og.gain.setValueAtTime(0.18 * p, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(og);
    og.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  async impact(points = 0) {
    await this.ensure();
    if (this.muted) return;
    const now = this.ctx.currentTime;
    const hit = points > 0;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = hit ? 'sine' : 'square';
    osc.frequency.value = hit ? 180 + points * 28 : 70;
    gain.gain.setValueAtTime(hit ? 0.22 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (hit ? 0.28 : 0.12));
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);

    if (points >= 8) {
      const chime = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.value = 880;
      cg.gain.setValueAtTime(0.12, now + 0.02);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      chime.connect(cg);
      cg.connect(this.master);
      chime.start(now + 0.02);
      chime.stop(now + 0.42);
    }
  }
}
