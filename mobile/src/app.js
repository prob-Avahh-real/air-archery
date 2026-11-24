import { RANGES, ROUND, wrap, clamp } from './targets.js';
import { ArcheryPhysics } from './physics.js';
import { AudioEngine } from './audio-engine.js';
import { WearableInput } from './wearable-input.js';

const $ = (id) => document.getElementById(id);

const audio = new AudioEngine();
const state = {
  rangeIndex: 0,
  muted: false,
  best: Number(localStorage.getItem('air-archery-best') || 0),
  holdingDraw: false,
  resultShown: false,
};

const physics = new ArcheryPhysics(RANGES[0]);
const canvas = $('field');
const ctx = canvas.getContext('2d');
let lastTs = 0;

function currentRange() {
  return RANGES[state.rangeIndex];
}

function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 1300);
}

function haptic(ms = 14) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

function applyTheme() {
  const r = currentRange();
  document.documentElement.style.setProperty('--accent', r.color);
  document.body.dataset.range = r.id;
}

function renderChrome() {
  applyTheme();
  const r = currentRange();
  $('range-name').textContent = r.label;
  $('range-hint').textContent = r.description;

  $('range-tabs').innerHTML = RANGES.map(
    (item, i) => `
    <button type="button" class="range-tab ${i === state.rangeIndex ? 'active' : ''}" data-i="${i}">
      ${item.label}
    </button>`
  ).join('');

  $('mute-btn').classList.toggle('on', state.muted);
  $('mute-btn').textContent = state.muted ? '已静音' : '静音';
  $('best-score').textContent = String(Math.max(state.best, physics.score));
}

function renderHud(snap) {
  $('score').textContent = String(snap.score);
  $('arrows-left').textContent = String(snap.arrowsLeft);
  $('draw-val').textContent = `${Math.round(snap.draw * 100)}%`;
  $('wind-val').textContent = `${snap.wind >= 0 ? '→' : '←'} ${Math.abs(snap.wind).toFixed(2)}`;
  $('status').textContent = snap.flying
    ? '飞行中'
    : snap.drawing
      ? '拉弓中'
      : snap.roundOver
        ? '本轮结束'
        : '待命';
  $('status').dataset.state = snap.flying
    ? 'fly'
    : snap.drawing
      ? 'draw'
      : snap.roundOver
        ? 'over'
        : 'idle';

  $('draw-btn').textContent = snap.drawing ? '蓄力中…' : '拉弓';
  $('draw-btn').disabled = snap.flying || snap.arrowsLeft <= 0;
  $('release-btn').disabled = snap.flying || snap.arrowsLeft <= 0 || snap.draw < ROUND.minReleasePower;

  const fill = $('power-fill');
  if (fill) fill.style.width = `${snap.draw * 100}%`;
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function targetLayout(w, h) {
  const cx = w * 0.5;
  const cy = h * 0.42;
  const scale = Math.min(w, h) * (0.28 / currentRange().distance);
  return { cx, cy, scale };
}

function drawField(snap) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;

  // Sky → grass
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#7eb8d4');
  sky.addColorStop(0.55, '#c5d9a8');
  sky.addColorStop(1, '#4a7a45');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft sun
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.14, Math.min(w, h) * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 236, 170, 0.85)';
  ctx.fill();

  const { cx, cy, scale } = targetLayout(w, h);

  // Ground shadow under target
  ctx.beginPath();
  ctx.ellipse(cx, cy + scale * 0.55, scale * 0.55, scale * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 40, 20, 0.25)';
  ctx.fill();

  // Target stand
  ctx.strokeStyle = '#5c3a1e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy + scale * 0.5);
  ctx.lineTo(cx, cy + scale * 1.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - scale * 0.28, cy + scale * 1.15);
  ctx.lineTo(cx + scale * 0.28, cy + scale * 1.15);
  ctx.stroke();

  // Rings (outer → inner)
  const rings = [
    { r: 0.48, fill: '#f5f0e6' },
    { r: 0.4, fill: '#1e88e5' },
    { r: 0.32, fill: '#f5f0e6' },
    { r: 0.25, fill: '#1e88e5' },
    { r: 0.18, fill: '#f5f0e6' },
    { r: 0.12, fill: '#c62828' },
    { r: 0.08, fill: '#f5f0e6' },
    { r: 0.04, fill: '#c62828' },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r * scale * 2, 0, Math.PI * 2);
    ctx.fillStyle = ring.fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Past hits
  for (const hit of snap.hits) {
    const hx = cx + hit.x * scale * 2;
    const hy = cy + hit.y * scale * 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = hit.points >= 8 ? '#1a1a1a' : '#333';
    ctx.fill();
  }

  // Flying arrow
  if (snap.arrowPos && !snap.arrowPos.landed) {
    const ax = cx + snap.arrowPos.x * scale * 2;
    const ay = cy + snap.arrowPos.y * scale * 2;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-0.35 + snap.arrowPos.u * 0.5);
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.fillStyle = '#c45c26';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Aim reticle
  if (!snap.flying) {
    const rx = cx + snap.aimX * scale * 2;
    const ry = cy + snap.aimY * scale * 2;
    ctx.strokeStyle = 'rgba(26, 40, 24, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx - 14, ry);
    ctx.lineTo(rx + 14, ry);
    ctx.moveTo(rx, ry - 14);
    ctx.lineTo(rx, ry + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Wind ribbon
  const windX = w * 0.1;
  const windY = h * 0.12;
  ctx.fillStyle = 'rgba(20, 40, 20, 0.45)';
  ctx.fillRect(windX - 6, windY - 10, 70, 22);
  ctx.fillStyle = '#e8f0df';
  ctx.font = '600 11px "Noto Sans SC", sans-serif';
  ctx.fillText(`风 ${snap.wind >= 0 ? '→' : '←'}${Math.abs(snap.wind).toFixed(2)}`, windX, windY + 5);
}

function selectRange(i) {
  if (physics.flying || physics.drawing) return;
  state.rangeIndex = wrap(i, RANGES.length);
  physics.applyRange(currentRange());
  // Fresh wind direction when changing range
  physics.windDir = Math.random() > 0.5 ? 1 : -1;
  renderChrome();
  showToast(`靶距 · ${currentRange().label}`);
  haptic();
}

async function beginDraw(boost = 0.1) {
  if (physics.flying || physics.arrowsLeft <= 0) return;
  physics.startDraw();
  physics.addDraw(boost);
  await audio.ensure();
  await audio.startDraw(physics.draw);
  haptic(10);
}

async function doRelease(velocity = 1) {
  if (physics.flying || physics.arrowsLeft <= 0) return;
  const arrow = physics.release(velocity);
  state.holdingDraw = false;
  if (!arrow) {
    showToast('蓄力不足');
    audio.stopDraw();
    return;
  }
  await audio.release(arrow.power);
  haptic(22);
  showToast('放箭！');
}

function cancelDraw() {
  if (!physics.drawing && physics.draw <= 0) return;
  physics.cancelDraw();
  state.holdingDraw = false;
  audio.stopDraw();
  showToast('取消拉弓');
}

function setMuted(muted) {
  state.muted = muted;
  audio.setMuted(muted);
  renderChrome();
  showToast(muted ? '已静音' : '取消静音');
}

function newRound() {
  physics.resetRound();
  physics.applyRange(currentRange());
  state.resultShown = false;
  $('result').classList.remove('show');
  renderChrome();
  showToast('新一轮 · 6 箭');
  haptic();
}

function maybeShowResult(snap) {
  if (!snap.roundOver || state.resultShown) return;
  state.resultShown = true;
  if (snap.score > state.best) {
    state.best = snap.score;
    localStorage.setItem('air-archery-best', String(state.best));
  }
  $('result-score').textContent = String(snap.score);
  $('result-best').textContent = String(state.best);
  const breakdown = snap.hits.map((h) => h.points).join(' · ') || '—';
  $('result-detail').textContent = breakdown;
  $('result').classList.add('show');
}

async function handleGesture(gesture, detail = {}) {
  switch (gesture) {
    case 'aim':
      physics.setAim(detail.x ?? 0, detail.y ?? 0);
      break;
    case 'draw':
      await beginDraw(0.1 + (detail.velocity || 0.7) * 0.12);
      break;
    case 'release':
      await doRelease(detail.velocity || 1);
      break;
    case 'cancel_draw':
      cancelDraw();
      break;
    case 'toggle_mute':
      setMuted(!state.muted);
      break;
    case 'prev_range':
      selectRange(state.rangeIndex - 1);
      break;
    case 'next_range':
      selectRange(state.rangeIndex + 1);
      break;
    default:
      break;
  }
}

function canvasToAim(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const { cx, cy, scale } = targetLayout(w, h);
  const x = (clientX - rect.left - cx) / (scale * 2);
  const y = (clientY - rect.top - cy) / (scale * 2);
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
}

function bindUi() {
  $('range-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    selectRange(Number(btn.dataset.i));
  });

  $('draw-btn').addEventListener('pointerdown', async (e) => {
    e.preventDefault();
    state.holdingDraw = true;
    await beginDraw(0.08);
  });
  const stopHold = () => {
    state.holdingDraw = false;
  };
  $('draw-btn').addEventListener('pointerup', stopHold);
  $('draw-btn').addEventListener('pointerleave', stopHold);
  $('draw-btn').addEventListener('pointercancel', stopHold);

  $('release-btn').addEventListener('click', () => doRelease(1));
  $('cancel-btn').addEventListener('click', cancelDraw);
  $('mute-btn').addEventListener('click', () => setMuted(!state.muted));
  $('again-btn').addEventListener('click', newRound);

  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    const a = canvasToAim(e.clientX, e.clientY);
    physics.setAim(a.x, a.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = canvasToAim(e.clientX, e.clientY);
    physics.setAim(a.x, a.y);
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });
  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });

  window.addEventListener('keydown', async (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) {
        state.holdingDraw = true;
        await beginDraw(0.08);
      }
    } else if (e.key === '1') selectRange(0);
    else if (e.key === '2') selectRange(1);
    else if (e.key === '3') selectRange(2);
    else if (e.key === 'm' || e.key === 'M') setMuted(!state.muted);
    else if (e.key === 'r' || e.key === 'R') newRound();
    else if (e.key === 'Escape') cancelDraw();
    else if (e.key === 'ArrowLeft') physics.nudgeAim(-0.05, 0);
    else if (e.key === 'ArrowRight') physics.nudgeAim(0.05, 0);
    else if (e.key === 'ArrowUp') physics.nudgeAim(0, -0.05);
    else if (e.key === 'ArrowDown') physics.nudgeAim(0, 0.05);
  });
  window.addEventListener('keyup', async (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      state.holdingDraw = false;
      await doRelease(1);
    }
  });

  window.addEventListener('resize', resize);
}

function tick(ts) {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
  lastTs = ts;

  if (state.holdingDraw && !physics.flying) {
    physics.addDraw(ROUND.drawRate * dt);
    audio.updateDraw(physics.draw);
  }

  const snap = physics.update(dt);

  if (snap.pendingResult) {
    const result = snap.pendingResult;
    physics.clearLanded();
    audio.impact(result.points);
    haptic(result.points >= 8 ? 30 : 16);
    showToast(result.points > 0 ? `${result.label} +${result.points}` : '脱靶');
  }

  renderHud(snap);
  drawField(snap);
  maybeShowResult(snap);
  requestAnimationFrame(tick);
}

const wearable = new WearableInput({
  onGesture: handleGesture,
  onBadge: (kind, text, active) => {
    const el = $(`${kind}-badge`);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('active', active);
  },
});

renderChrome();
bindUi();
resize();
wearable.setupRing();
wearable.setupCane();
requestAnimationFrame(tick);
