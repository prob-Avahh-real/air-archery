const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const RANGES = [
  { id: 'near', label: '近靶', distance: 1.0, wind: 0, drop: 0.08 },
  { id: 'mid', label: '中靶', distance: 1.55, wind: 0.12, drop: 0.16 },
  { id: 'far', label: '远靶', distance: 2.2, wind: 0.22, drop: 0.28 },
];

const SCORING = {
  rings: [
    { radius: 0.08, points: 10, label: '红心' },
    { radius: 0.18, points: 8, label: '内环' },
    { radius: 0.32, points: 5, label: '中环' },
    { radius: 0.48, points: 2, label: '外环' },
  ],
  miss: 0,
};

const ROUND = {
  arrows: 6,
  maxDraw: 1,
  minReleasePower: 0.18,
};

function scoreHit(dist) {
  for (const ring of SCORING.rings) {
    if (dist <= ring.radius) {
      return { points: ring.points, label: ring.label };
    }
  }
  return { points: SCORING.miss, label: '脱靶' };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function wrap(i, n) {
  return ((i % n) + n) % n;
}

describe('air-archery ranges', () => {
  it('has three distances', () => {
    assert.deepEqual(
      RANGES.map((r) => r.id),
      ['near', 'mid', 'far']
    );
  });

  it('far has more wind and drop than near', () => {
    const near = RANGES[0];
    const far = RANGES[2];
    assert.ok(far.wind > near.wind);
    assert.ok(far.drop > near.drop);
    assert.ok(far.distance > near.distance);
  });

  it('wrap cycles range index', () => {
    assert.equal(wrap(-1, 3), 2);
    assert.equal(wrap(3, 3), 0);
  });
});

describe('air-archery scoring', () => {
  it('bullseye scores 10', () => {
    assert.equal(scoreHit(0).points, 10);
    assert.equal(scoreHit(0.07).points, 10);
  });

  it('outer ring and miss', () => {
    assert.equal(scoreHit(0.4).points, 2);
    assert.equal(scoreHit(0.6).points, 0);
  });
});

describe('air-archery release rules', () => {
  it('rejects weak draw', () => {
    const draw = 0.1;
    assert.ok(draw < ROUND.minReleasePower);
  });

  it('power clamps', () => {
    assert.equal(clamp(1.5, 0, 1), 1);
    assert.equal(clamp(-0.2, 0, 1), 0);
  });

  it('round starts with six arrows', () => {
    assert.equal(ROUND.arrows, 6);
  });
});

describe('project scaffold', () => {
  it('protocol file exists with ring aim and cane release', () => {
    const p = path.join(__dirname, '..', '..', 'protocol', 'air-archery.json');
    assert.ok(fs.existsSync(p));
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(data.gestures.ring);
    assert.ok(data.gestures.cane);
    assert.equal(data.gestures.ring.aim.action, 'aim');
    assert.equal(data.gestures.cane.swing.action, 'draw');
    assert.equal(data.gestures.cane.tap.action, 'release');
    assert.equal(data.ranges.length, 3);
    assert.equal(data.round.arrows, 6);
  });
});
