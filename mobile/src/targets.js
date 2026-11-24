/** Range presets and scoring rings for air archery. */

export const RANGES = [
  {
    id: 'near',
    label: '近靶',
    short: '近',
    distance: 1.0,
    wind: 0,
    drop: 0.08,
    color: '#6fbf73',
    description: '稳、少风',
  },
  {
    id: 'mid',
    label: '中靶',
    short: '中',
    distance: 1.55,
    wind: 0.12,
    drop: 0.16,
    color: '#d4a017',
    description: '有落差',
  },
  {
    id: 'far',
    label: '远靶',
    short: '远',
    distance: 2.2,
    wind: 0.22,
    drop: 0.28,
    color: '#c45c26',
    description: '侧风大',
  },
];

export const SCORING = {
  rings: [
    { radius: 0.08, points: 10, label: '红心', fill: '#c62828' },
    { radius: 0.18, points: 8, label: '内环', fill: '#f5f0e6' },
    { radius: 0.32, points: 5, label: '中环', fill: '#1e88e5' },
    { radius: 0.48, points: 2, label: '外环', fill: '#f5f0e6' },
  ],
  miss: 0,
};

export const ROUND = {
  arrows: 6,
  maxDraw: 1,
  drawRate: 0.85,
  minReleasePower: 0.18,
};

/**
 * Score a hit given normalized distance from target center (0 = bullseye).
 * @param {number} dist
 */
export function scoreHit(dist) {
  for (const ring of SCORING.rings) {
    if (dist <= ring.radius) {
      return { points: ring.points, label: ring.label, ring };
    }
  }
  return { points: SCORING.miss, label: '脱靶', ring: null };
}

export function wrap(i, n) {
  return ((i % n) + n) % n;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
