import { BALL, PLAYER, WORLD } from "./constants";
import { getCharacter } from "./characters";
import type {
  BallSimState,
  MatchSnapshot,
  PlayerInput,
  PlayerSide,
  PlayerSimState,
} from "./types";

const emptyInput: PlayerInput = { x: 0, y: 0, skill: false };
const SKILL_COOLDOWN_FRAMES = WORLD.fixedFps * 5;

export class VolleySimulation {
  private players: [PlayerSimState, PlayerSimState];
  private ball: BallSimState;
  private score: [number, number] = [0, 0];
  private servingSide: PlayerSide = "left";
  private phase: MatchSnapshot["phase"] = "ready";
  private phaseFrames = 0;
  private previousSkillInputs: [boolean, boolean] = [false, false];

  constructor(leftCharacterId: string, rightCharacterId: string) {
    this.players = [
      this.createPlayer("left", leftCharacterId),
      this.createPlayer("right", rightCharacterId),
    ];
    this.ball = this.createBall();
    this.resetRound();
  }

  setCharacters(leftCharacterId: string, rightCharacterId: string) {
    this.players[0].characterId = leftCharacterId;
    this.players[1].characterId = rightCharacterId;
  }

  resetMatch() {
    this.score = [0, 0];
    this.servingSide = "left";
    this.phase = "ready";
    this.phaseFrames = 0;
    this.resetRound();
  }

  activateSkill(playerIndex: 0 | 1) {
    if (this.phase === "gameOver") {
      return;
    }
    this.activateSkillFor(this.players[playerIndex]);
  }

  step(inputLeft: PlayerInput = emptyInput, inputRight: PlayerInput = emptyInput) {
    this.phaseFrames += 1;

    if (this.phase === "ready") {
      if (this.phaseFrames > 30) {
        this.phase = "playing";
        this.phaseFrames = 0;
      }
      return;
    }

    if (this.phase === "point") {
      if (this.phaseFrames > 32) {
        this.phase = "ready";
        this.phaseFrames = 0;
        this.resetRound();
      }
      return;
    }

    if (this.phase === "gameOver") {
      return;
    }

    const inputs = [inputLeft, inputRight] as const;
    this.updateBallWorld();
    this.updatePlayer(this.players[0], inputs[0], 0);
    this.updatePlayer(this.players[1], inputs[1], 1);
    this.tryUseSkill(this.players[0], inputs[0], 0);
    this.tryUseSkill(this.players[1], inputs[1], 1);
    this.collidePlayer(this.players[0], inputs[0]);
    this.collidePlayer(this.players[1], inputs[1]);
  }

  snapshot(): MatchSnapshot {
    return {
      players: [structuredClone(this.players[0]), structuredClone(this.players[1])],
      ball: structuredClone(this.ball),
      score: [...this.score],
      servingSide: this.servingSide,
      phase: this.phase,
      phaseFrames: this.phaseFrames,
      message: this.getMessage(),
    };
  }

  makeAiInput(playerIndex: 0 | 1): PlayerInput {
    const player = this.players[playerIndex];
    const ball = this.ball;
    const ownLeft = player.side === "left" ? 0 : WORLD.netX;
    const ownRight = player.side === "left" ? WORLD.netX : WORLD.width;
    const targetX =
      ball.x > ownLeft && ball.x < ownRight ? ball.x : (ownLeft + ownRight) / 2;
    const x = Math.abs(targetX - player.x) < 8 ? 0 : player.x < targetX ? 1 : -1;
    const close = Math.abs(ball.x - player.x) < 44 && Math.abs(ball.y - player.y) < 58;
    const shouldJump =
      player.state === "idle" &&
      ball.vy > 0 &&
      ball.y > 72 &&
      ball.y < 190 &&
      Math.abs(ball.x - player.x) < 50;
    return {
      x: x as -1 | 0 | 1,
      y: shouldJump ? -1 : close && ball.y < player.y ? -1 : 0,
      skill: false,
    };
  }

  private createPlayer(side: PlayerSide, characterId: string): PlayerSimState {
    return {
      side,
      x: side === "left" ? 42 : WORLD.width - 42,
      y: PLAYER.groundY,
      vy: 0,
      state: "idle",
      frame: 0,
      didCollideBall: false,
      characterId,
      shieldFrames: 0,
      doubleHopAvailable: true,
      skillCooldownFrames: 0,
      skillFlashFrames: 0,
    };
  }

  private createBall(): BallSimState {
    return {
      x: 56,
      y: BALL.serveY,
      vx: 0,
      vy: 1,
      rotation: 0,
      power: false,
      previousX: 56,
      previousY: BALL.serveY,
      trailX: 56,
      trailY: BALL.serveY,
      impactX: 56,
      impactY: BALL.serveY,
      impactRadius: 0,
      effectFrames: 0,
    };
  }

  private resetRound() {
    this.players[0] = this.createPlayer("left", this.players[0].characterId);
    this.players[1] = this.createPlayer("right", this.players[1].characterId);
    this.ball = this.createBall();
    if (this.servingSide === "right") {
      this.ball.x = WORLD.width - 56;
      this.ball.previousX = this.ball.x;
      this.ball.trailX = this.ball.x;
    }
  }

  private updateBallWorld() {
    const ball = this.ball;
    ball.trailX = ball.previousX;
    ball.trailY = ball.previousY;
    ball.previousX = ball.x;
    ball.previousY = ball.y;
    ball.rotation = (ball.rotation + Math.sign(ball.vx || 1) + 6) % 6;

    if (ball.x + ball.vx < WORLD.ballRadius || ball.x + ball.vx > WORLD.width) {
      ball.vx = -ball.vx;
    }

    if (ball.y + ball.vy < 0) {
      ball.vy = 1;
    }

    const insideNetX = Math.abs(ball.x - WORLD.netX) < WORLD.netWidth + WORLD.ballRadius / 2;
    if (insideNetX && ball.y > WORLD.netTopY) {
      if (ball.y < WORLD.netTopY + 18 && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy);
      } else {
        ball.vx = ball.x < WORLD.netX ? -Math.abs(ball.vx || 2) : Math.abs(ball.vx || 2);
      }
    }

    if (ball.y + ball.vy > BALL.floorY) {
      const scorer = ball.x < WORLD.netX ? 1 : 0;
      this.score[scorer] += 1;
      this.servingSide = scorer === 0 ? "left" : "right";
      ball.y = BALL.floorY;
      ball.vy = -Math.abs(ball.vy);
      ball.impactX = ball.x;
      ball.impactY = BALL.floorY + WORLD.ballRadius;
      ball.impactRadius = WORLD.ballRadius;
      this.phase = this.score[scorer] >= WORLD.winScore ? "gameOver" : "point";
      this.phaseFrames = 0;
      this.players[0].state = scorer === 0 ? "win" : "lose";
      this.players[1].state = scorer === 1 ? "win" : "lose";
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy += BALL.gravity;
    ball.impactRadius = Math.max(0, ball.impactRadius - 2);
    ball.effectFrames = Math.max(0, ball.effectFrames - 1);
  }

  private updatePlayer(player: PlayerSimState, input: PlayerInput, index: 0 | 1) {
    void index;
    player.shieldFrames = Math.max(0, player.shieldFrames - 1);
    player.skillCooldownFrames = Math.max(0, player.skillCooldownFrames - 1);
    player.skillFlashFrames = Math.max(0, player.skillFlashFrames - 1);

    const character = getCharacter(player.characterId);
    const speedBonus = (character.stats.speed - 3) * 0.7;
    const jumpBonus = (character.stats.jump - 3) * 1.5;
    let vx = input.x * (PLAYER.moveSpeed + speedBonus);
    player.x += vx;

    const minX = player.side === "left" ? WORLD.playerHalf : WORLD.netX + WORLD.playerHalf;
    const maxX = player.side === "left" ? WORLD.netX - WORLD.playerHalf : WORLD.width - WORLD.playerHalf;
    player.x = clamp(player.x, minX, maxX);

    if (input.y === -1 && player.y === PLAYER.groundY) {
      player.vy = PLAYER.jumpVelocity - jumpBonus;
      player.state = "jump";
      player.frame = 0;
      player.doubleHopAvailable = true;
    }

    player.y += player.vy;
    if (player.y < PLAYER.groundY) {
      player.vy += PLAYER.gravity;
    } else {
      player.y = PLAYER.groundY;
      player.vy = 0;
      if (player.state !== "win" && player.state !== "lose") {
        player.state = "idle";
      }
      player.doubleHopAvailable = true;
    }

    player.frame = (player.frame + 1) % 20;
  }

  private tryUseSkill(player: PlayerSimState, input: PlayerInput, index: 0 | 1) {
    const pressedSkill = input.skill && !this.previousSkillInputs[index];
    this.previousSkillInputs[index] = input.skill;
    if (!pressedSkill) {
      return;
    }

    const character = getCharacter(player.characterId);
    const airborne = player.y < PLAYER.groundY;
    const wantsDirectionalPowerHit = airborne && input.x !== 0;
    const wantsDoubleJump = airborne && character.skill.id === "double-jump" && input.x === 0;
    if (wantsDirectionalPowerHit && !wantsDoubleJump) {
      player.state = "power";
      player.frame = 0;
      player.skillFlashFrames = 8;
      return;
    }

    this.activateSkillFor(player);
  }

  private activateSkillFor(player: PlayerSimState) {
    if (player.skillCooldownFrames > 0) {
      return;
    }

    const character = getCharacter(player.characterId);
    const ball = this.ball;
    const direction = player.side === "left" ? 1 : -1;
    const ownLeft = player.side === "left" ? 0 : WORLD.netX;
    const ownRight = player.side === "left" ? WORLD.netX : WORLD.width;
    const ballOnOwnSide = ball.x > ownLeft && ball.x < ownRight;

    player.skillCooldownFrames = SKILL_COOLDOWN_FRAMES;
    player.skillFlashFrames = 12;

    if (character.skill.id === "timing-hit") {
      if (ballOnOwnSide) {
        ball.vx = direction * 7;
      }
      ball.vy = -17;
      ball.effectFrames = 24;
    } else if (character.skill.id === "rage-smash") {
      ball.vx = direction * 17;
      ball.vy = ballOnOwnSide ? -10 : 10;
      ball.effectFrames = 18;
    } else if (character.skill.id === "wall-receive") {
      player.shieldFrames = 90;
    } else if (character.skill.id === "fake-shot") {
      ball.vx = clampVelocity(-ball.vx + direction * 4, 14);
      ball.vy = clampVelocity(ball.vy > 0 ? -12 : 10, 14);
      ball.effectFrames = 20;
    } else if (character.skill.id === "double-jump") {
      if (player.y < PLAYER.groundY && player.doubleHopAvailable) {
        player.vy = PLAYER.jumpVelocity * 0.78;
        player.doubleHopAvailable = false;
      } else {
        player.vy = Math.min(player.vy, -9);
      }
    } else if (character.skill.id === "random-bounce") {
      const deterministicSwing = (Math.trunc(ball.x + ball.y + this.phaseFrames) % 2 === 0 ? 1 : -1) * 5;
      ball.vx = clampVelocity(ball.vx + direction * 7 + deterministicSwing, 16);
      ball.vy = clampVelocity(ball.vy - 4 + deterministicSwing * 0.35, 16);
      ball.effectFrames = 18;
    }
  }

  private collidePlayer(player: PlayerSimState, input: PlayerInput) {
    const character = getCharacter(player.characterId);
    const powerBonus = (character.stats.power - 3) * 1.6;
    const defenseBonus = (character.stats.defense - 3) * 3;
    const ball = this.ball;
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const shieldBonus = player.shieldFrames > 0 ? 16 : 0;
    const hitHalf = WORLD.playerHalf + defenseBonus + shieldBonus;
    const colliding = Math.abs(dx) <= hitHalf && Math.abs(dy) <= hitHalf;

    if (!colliding) {
      player.didCollideBall = false;
      return;
    }

    if (player.didCollideBall) {
      return;
    }

    player.didCollideBall = true;
    ball.vx = dx === 0 ? (player.side === "left" ? 2 : -2) : Math.trunc(dx / 3);
    ball.vy = Math.min(BALL.minHitVelocityY, -Math.abs(ball.vy));
    ball.power = false;

    if (player.state === "jump" || player.state === "power" || player.shieldFrames > 0) {
      const direction = ball.x < WORLD.netX ? 1 : -1;
      const shieldPowerBonus = player.shieldFrames > 0 ? 5 : 0;
      const isDirectionalPowerHit = player.state === "power";
      ball.vx = direction * ((Math.abs(input.x) + 1) * (isDirectionalPowerHit ? 10 : 8) + powerBonus + shieldPowerBonus);
      if (isDirectionalPowerHit) {
        ball.vy = input.y === 1 ? 16 : input.x !== 0 ? 8 : -10;
      } else {
        ball.vy = input.y === 1 ? 13 : input.y === -1 ? -14 : -12;
      }
      ball.power = true;
      ball.impactX = ball.x;
      ball.impactY = ball.y;
      ball.impactRadius = WORLD.ballRadius;
      player.shieldFrames = 0;
    }
  }

  private getMessage() {
    if (this.phase === "ready") return "READY";
    if (this.phase === "point") return "POINT";
    if (this.phase === "gameOver") {
      return this.score[0] > this.score[1] ? "LEFT WINS" : "RIGHT WINS";
    }
    return "";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampVelocity(value: number, maxAbs: number) {
  return Math.max(-maxAbs, Math.min(maxAbs, value));
}
