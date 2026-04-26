export type PlayerSide = "left" | "right";

export type PlayerActionState =
  | "idle"
  | "jump"
  | "power"
  | "win"
  | "lose";

export type PlayerInput = {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  skill: boolean;
};

export type PlayerSimState = {
  side: PlayerSide;
  x: number;
  y: number;
  vy: number;
  state: PlayerActionState;
  frame: number;
  didCollideBall: boolean;
  characterId: string;
  shieldFrames: number;
  doubleHopAvailable: boolean;
  skillCooldownFrames: number;
  skillFlashFrames: number;
};

export type BallSimState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  power: boolean;
  previousX: number;
  previousY: number;
  trailX: number;
  trailY: number;
  impactX: number;
  impactY: number;
  impactRadius: number;
  effectFrames: number;
};

export type MatchSnapshot = {
  players: [PlayerSimState, PlayerSimState];
  ball: BallSimState;
  score: [number, number];
  servingSide: PlayerSide;
  phase: "ready" | "playing" | "point" | "gameOver";
  phaseFrames: number;
  message: string;
};
