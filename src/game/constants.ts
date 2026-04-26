export const WORLD = {
  width: 360,
  height: 360,
  groundY: 316,
  netX: 180,
  netTopY: 210,
  netWidth: 12,
  playerSize: 64,
  playerHalf: 32,
  ballRadius: 20,
  winScore: 7,
  fixedFps: 25,
  fixedStepMs: 1000 / 25,
} as const;

export const PLAYER = {
  groundY: 306,
  moveSpeed: 5.6,
  jumpVelocity: -17,
  gravity: 1,
} as const;

export const BALL = {
  gravity: 1,
  minHitVelocityY: -15,
  serveY: 24,
  floorY: 316,
} as const;
