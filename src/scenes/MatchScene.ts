import Phaser from "phaser";
import { characters, getCharacter } from "../game/characters";
import { WORLD } from "../game/constants";
import { VolleySimulation } from "../game/VolleySimulation";
import { InputManager } from "../input/InputManager";
import { normalizeRoomCode, RoomClient, type RoomEvent } from "../network/RoomClient";
import type { MatchSnapshot, PlayerInput, PlayerSimState } from "../game/types";

const emptyInput: PlayerInput = { x: 0, y: 0, skill: false };

export class MatchScene extends Phaser.Scene {
  private simulation!: VolleySimulation;
  private inputManager!: InputManager;
  private network = new RoomClient((event) => this.handleRoomEvent(event));
  private accumulator = 0;
  private leftSprite!: Phaser.GameObjects.Sprite;
  private rightSprite!: Phaser.GameObjects.Sprite;
  private ballSprite!: Phaser.GameObjects.Sprite;
  private trailSprite!: Phaser.GameObjects.Sprite;
  private impact!: Phaser.GameObjects.Arc;
  private message!: Phaser.GameObjects.Text;
  private selectedCharacterId = characters[0].id;
  private remoteCharacterId = characters[1].id;
  private remoteInput: PlayerInput = emptyInput;
  private latestRemoteSnapshot?: MatchSnapshot;
  private onlineMatchStarted = false;
  private scoreElement!: HTMLElement;
  private p1NameElement!: HTMLElement;
  private p2NameElement!: HTMLElement;
  private skillButton!: HTMLButtonElement;
  private selectPanel!: HTMLElement;
  private detailPanel!: HTMLElement;
  private startButton!: HTMLButtonElement;
  private onlineStatus!: HTMLElement;
  private roomCodeValue!: HTMLElement;
  private roomCodeInput!: HTMLInputElement;
  private createRoomButton!: HTMLButtonElement;
  private joinRoomButton!: HTMLButtonElement;
  private copyRoomButton!: HTMLButtonElement;
  private queuedSkill = false;

  constructor() {
    super("MatchScene");
  }

  create() {
    this.scoreElement = requiredElement("score");
    this.p1NameElement = requiredElement("p1-name");
    this.p2NameElement = requiredElement("p2-name");
    this.skillButton = requiredElement("skill-button") as HTMLButtonElement;
    this.selectPanel = requiredElement("character-select");
    this.detailPanel = requiredElement("character-detail");
    this.startButton = requiredElement("start-button") as HTMLButtonElement;
    this.onlineStatus = requiredElement("online-status");
    this.roomCodeValue = requiredElement("room-code-value");
    this.roomCodeInput = requiredElement("room-code-input") as HTMLInputElement;
    this.createRoomButton = requiredElement("create-room-button") as HTMLButtonElement;
    this.joinRoomButton = requiredElement("join-room-button") as HTMLButtonElement;
    this.copyRoomButton = requiredElement("copy-room-button") as HTMLButtonElement;

    this.setupCharacterSelect();
    this.setupOnlineControls();
    this.inputManager = new InputManager();
    this.skillButton.addEventListener("click", () => {
      if (this.skillButton.disabled) return;
      this.queuedSkill = true;
      this.inputManager.queueSkill();
    });
    this.simulation = new VolleySimulation(this.selectedCharacterId, this.remoteCharacterId);
    this.createCourt();
    this.leftSprite = this.add.sprite(0, 0, `character-${this.selectedCharacterId}`).setDepth(4);
    this.rightSprite = this.add.sprite(0, 0, `character-${this.remoteCharacterId}`).setDepth(4).setFlipX(true);
    this.trailSprite = this.add.sprite(0, 0, "ball").setDepth(3).setAlpha(0.34).setVisible(false);
    this.ballSprite = this.add.sprite(0, 0, "ball").setDepth(6);
    this.impact = this.add.circle(0, 0, 4).setStrokeStyle(2, 0xffffff, 0.8).setDepth(5).setVisible(false);
    this.message = this.add
      .text(WORLD.width / 2, 68, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        fontStyle: "800",
        color: "#ffffff",
        stroke: "#182629",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(9);
    requiredElement("pause-button").addEventListener("click", () => {
      this.scene.isPaused() ? this.scene.resume() : this.scene.pause();
    });
  }

  override update(_time: number, delta: number) {
    this.accumulator += delta;
    while (this.accumulator >= WORLD.fixedStepMs) {
      this.accumulator -= WORLD.fixedStepMs;
      const playerInput = this.inputManager.getInput();
      if (this.queuedSkill) {
        playerInput.skill = true;
        this.queuedSkill = false;
      }

      if (this.network.role === "guest" && this.onlineMatchStarted) {
        this.network.sendInput(playerInput);
        continue;
      }

      const rightInput =
        this.network.role === "host" && this.onlineMatchStarted
          ? this.remoteInput
          : this.simulation.makeAiInput(1);
      this.simulation.step(playerInput, rightInput);
      if (this.network.role === "host" && this.onlineMatchStarted) {
        this.network.sendSnapshot(this.simulation.snapshot());
      }
    }

    if (this.network.role === "guest" && this.onlineMatchStarted && this.latestRemoteSnapshot) {
      this.renderSnapshot(this.latestRemoteSnapshot);
    } else {
      this.renderSnapshot(this.simulation.snapshot());
    }
  }

  private setupCharacterSelect() {
    const grid = requiredElement("character-grid");
    grid.innerHTML = "";
    for (const character of characters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `character-card${character.id === this.selectedCharacterId ? " selected" : ""}`;
      button.dataset.characterId = character.id;
      button.innerHTML = `
        <div class="character-swatch swatch-${character.accessory}" style="--primary:#${toHex(character.primary)}; --secondary:#${toHex(character.secondary)}; --accent:#${toHex(character.accent)}; --hair:#${toHex(character.hair)}"></div>
        <div class="character-copy">
          <strong>${character.name}</strong>
          <span>${character.trait}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        this.selectedCharacterId = character.id;
        for (const child of grid.children) child.classList.remove("selected");
        button.classList.add("selected");
        this.renderCharacterDetail(character.id);
        if (this.network.role === "guest") {
          this.remoteCharacterId = character.id;
          this.network.sendGuestCharacter(character.id);
        }
        this.updateNames();
      });
      grid.appendChild(button);
    }
    this.startButton.addEventListener("click", () => {
      if (this.network.role === "host") {
        this.startOnlineMatchAsHost();
      } else if (this.network.role === "offline") {
        this.startOfflineMatch();
      }
    });
    this.renderCharacterDetail(this.selectedCharacterId);
    this.updateNames();
  }

  private setupOnlineControls() {
    this.createRoomButton.addEventListener("click", () => {
      this.network.createRoom();
      this.onlineStatus.textContent = "방을 준비하는 중입니다...";
      this.startButton.textContent = "친구 대기 중";
      this.startButton.disabled = true;
    });
    this.joinRoomButton.addEventListener("click", () => {
      const roomCode = normalizeRoomCode(this.roomCodeInput.value);
      if (roomCode.length !== 6) {
        this.onlineStatus.textContent = "6자리 방 코드를 입력하세요.";
        return;
      }
      this.network.joinRoom(roomCode);
      this.onlineStatus.textContent = "방에 접속하는 중입니다...";
      this.startButton.textContent = "방장 대기";
      this.startButton.disabled = true;
    });
    this.roomCodeInput.addEventListener("input", () => {
      this.roomCodeInput.value = normalizeRoomCode(this.roomCodeInput.value);
    });
    this.copyRoomButton.addEventListener("click", async () => {
      if (!this.network.roomCode) return;
      await navigator.clipboard?.writeText(this.network.roomCode);
      this.onlineStatus.textContent = "방 코드를 복사했습니다.";
    });
  }

  private renderCharacterDetail(characterId: string) {
    const character = getCharacter(characterId);
    this.detailPanel.innerHTML = `
      <div class="detail-portrait portrait-${character.accessory}" style="--primary:#${toHex(character.primary)}; --secondary:#${toHex(character.secondary)}; --accent:#${toHex(character.accent)}; --hair:#${toHex(character.hair)}">
        <div class="portrait-head"></div>
        <div class="portrait-face"></div>
        <div class="portrait-body"></div>
      </div>
      <div class="detail-copy">
        <span class="detail-tag">${character.trait}</span>
        <h2>${character.name}</h2>
        <p>${character.description}</p>
        <p>${character.detail}</p>
      </div>
      <div class="detail-skill">
        <strong>${character.skill.name}</strong>
        <span>${getSkillDescription(character.skill.id)}</span>
      </div>
      <div class="detail-stats">
        <span>속도 ${formatStars(character.stats.speed)}</span>
        <span>파워 ${formatStars(character.stats.power)}</span>
        <span>점프 ${formatStars(character.stats.jump)}</span>
        <span>방어 ${formatStars(character.stats.defense)}</span>
        <span>트릭 ${formatStars(character.stats.trick)}</span>
      </div>
    `;
  }

  private startOfflineMatch() {
    this.onlineMatchStarted = false;
    this.remoteInput = emptyInput;
    this.remoteCharacterId = characters[1].id;
    this.selectPanel.classList.add("hidden");
    this.simulation.setCharacters(this.selectedCharacterId, this.remoteCharacterId);
    this.leftSprite.setTexture(`character-${this.selectedCharacterId}`);
    this.rightSprite.setTexture(`character-${this.remoteCharacterId}`);
    this.updateNames();
    this.simulation.resetMatch();
  }

  private startOnlineMatchAsHost() {
    if (!this.network.connected) {
      this.onlineStatus.textContent = "친구가 접속하면 시작할 수 있습니다.";
      return;
    }
    this.onlineMatchStarted = true;
    this.selectPanel.classList.add("hidden");
    this.simulation.setCharacters(this.selectedCharacterId, this.remoteCharacterId);
    this.leftSprite.setTexture(`character-${this.selectedCharacterId}`);
    this.rightSprite.setTexture(`character-${this.remoteCharacterId}`);
    this.updateNames();
    this.simulation.resetMatch();
    this.network.sendStart(this.selectedCharacterId, this.remoteCharacterId);
  }

  private startOnlineMatchAsGuest(hostCharacterId: string, guestCharacterId: string) {
    this.onlineMatchStarted = true;
    this.selectedCharacterId = guestCharacterId;
    this.remoteCharacterId = hostCharacterId;
    this.selectPanel.classList.add("hidden");
    this.simulation.setCharacters(hostCharacterId, guestCharacterId);
    this.leftSprite.setTexture(`character-${hostCharacterId}`);
    this.rightSprite.setTexture(`character-${guestCharacterId}`);
    this.updateNames(hostCharacterId, guestCharacterId);
    this.simulation.resetMatch();
  }

  private handleRoomEvent(event: RoomEvent) {
    if (event.type === "open") {
      this.roomCodeValue.textContent = event.roomCode;
      this.copyRoomButton.disabled = false;
      this.onlineStatus.textContent = "방 코드를 친구에게 공유하세요.";
    } else if (event.type === "connected") {
      if (this.network.role === "host") {
        this.onlineStatus.textContent = "친구가 접속했습니다. 온라인 경기를 시작하세요.";
        this.startButton.textContent = "온라인 경기 시작";
        this.startButton.disabled = false;
      } else {
        this.onlineStatus.textContent = "방에 접속했습니다. 방장이 시작할 때까지 기다리세요.";
        this.startButton.textContent = "방장 대기";
        this.startButton.disabled = true;
        this.network.sendGuestCharacter(this.selectedCharacterId);
      }
    } else if (event.type === "disconnected") {
      this.onlineStatus.textContent = "연결이 끊겼습니다.";
      this.onlineMatchStarted = false;
    } else if (event.type === "error") {
      this.onlineStatus.textContent = event.message;
    } else if (event.type === "guest-character") {
      this.remoteCharacterId = event.characterId;
      this.updateNames();
    } else if (event.type === "input") {
      this.remoteInput = event.input;
    } else if (event.type === "start") {
      this.startOnlineMatchAsGuest(event.hostCharacterId, event.guestCharacterId);
    } else if (event.type === "snapshot") {
      this.latestRemoteSnapshot = event.snapshot;
    }
  }

  private createCourt() {
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x78cdd0).setDepth(0);
    this.add.rectangle(WORLD.width / 2, 228, WORLD.width, 42, 0x7ba7b2).setDepth(1);
    this.add.rectangle(WORLD.width / 2, 280, WORLD.width, 56, 0x57b6b8).setDepth(1);
    for (let x = 0; x < WORLD.width; x += 16) {
      this.add.image(x + 8, 332, "tile-ground").setDepth(2);
      this.add.image(x + 8, 348, "tile-ground").setDepth(2);
    }
    this.add.rectangle(WORLD.netX, 270, 8, 120, 0xf7f1cc).setDepth(2);
    this.add.rectangle(WORLD.netX, WORLD.netTopY, 16, 10, 0xffffff).setDepth(3);
    this.add.line(0, 0, 0, 318, WORLD.width, 318, 0xffffff, 0.55).setOrigin(0).setDepth(3);
    for (let i = 0; i < 7; i += 1) {
      this.add.ellipse(30 + i * 52, 284 - i * 9, 48, 17, 0xffffff, 0.35).setDepth(1);
    }
  }

  private renderSnapshot(snapshot: MatchSnapshot) {
    this.renderPlayer(this.leftSprite, snapshot.players[0]);
    this.renderPlayer(this.rightSprite, snapshot.players[1]);
    this.ballSprite.setPosition(snapshot.ball.x, snapshot.ball.y);
    this.ballSprite.setAngle(snapshot.ball.rotation * 45);
    this.trailSprite
      .setVisible(snapshot.ball.power)
      .setPosition(snapshot.ball.trailX, snapshot.ball.trailY)
      .setScale(0.82);
    this.impact
      .setVisible(snapshot.ball.impactRadius > 0)
      .setPosition(snapshot.ball.impactX, snapshot.ball.impactY)
      .setRadius(snapshot.ball.impactRadius);
    this.scoreElement.textContent = `${snapshot.score[0]} : ${snapshot.score[1]}`;
    this.message.setText(snapshot.message);
    this.message.setVisible(snapshot.message.length > 0);
    const localIndex = this.network.role === "guest" && this.onlineMatchStarted ? 1 : 0;
    const localCharacter = getCharacter(snapshot.players[localIndex].characterId);
    const cooldownSeconds = Math.ceil(snapshot.players[localIndex].skillCooldownFrames / WORLD.fixedFps);
    this.skillButton.textContent = cooldownSeconds > 0 ? `${cooldownSeconds}s` : localCharacter.skill.name;
    this.skillButton.disabled = cooldownSeconds > 0;
  }

  private renderPlayer(sprite: Phaser.GameObjects.Sprite, player: PlayerSimState) {
    sprite.setPosition(player.x, player.y);
    sprite.setTexture(`character-${player.characterId}`);
    sprite.setScale(player.shieldFrames > 0 ? 1.08 : 1);
    sprite.setAngle(0);
    sprite.setFlipX(player.side === "right");
    if (player.skillFlashFrames > 0) {
      sprite.setTint(0xfff0a8);
    } else if (player.state === "lose") {
      sprite.setTint(0xb2bdc2);
    } else {
      sprite.clearTint();
    }
  }

  private updateNames(leftCharacterId = this.selectedCharacterId, rightCharacterId = this.remoteCharacterId) {
    this.p1NameElement.textContent = getCharacter(leftCharacterId).name;
    this.p2NameElement.textContent = getCharacter(rightCharacterId).name;
    this.skillButton.textContent = getCharacter(this.selectedCharacterId).skill.name;
  }
}

function requiredElement(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element;
}

function toHex(value: number) {
  return value.toString(16).padStart(6, "0");
}

function formatStars(value: number) {
  return "★".repeat(value) + "☆".repeat(5 - value);
}

function getSkillDescription(skillId: string) {
  if (skillId === "timing-hit") {
    return "정확한 타이밍으로 맞추면 공을 빠르게 띄워 안정적인 반격 각도를 만듭니다.";
  }
  if (skillId === "rage-smash") {
    return "공을 낮고 빠르게 밀어 넣는 강한 직선 스매시를 날립니다.";
  }
  if (skillId === "wall-receive") {
    return "잠깐 동안 리시브 범위가 커져 공을 안정적으로 받아냅니다.";
  }
  if (skillId === "fake-shot") {
    return "공의 각도를 엇박자로 바꿔 상대의 리듬을 흔듭니다.";
  }
  if (skillId === "random-bounce") {
    return "공에 변칙 바운드를 걸어 예상 밖의 궤적으로 보냅니다.";
  }
  if (skillId === "double-jump") {
    return "공중에서 한 번 더 점프해 놓친 공을 따라갑니다.";
  }
  return "공 궤적을 살짝 바꾸는 특수 기술입니다.";
}
