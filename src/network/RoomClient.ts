import Peer, { DataConnection } from "peerjs";
import type { MatchSnapshot, PlayerInput } from "../game/types";

export type NetworkRole = "offline" | "host" | "guest";

export type RoomEvent =
  | { type: "open"; roomCode: string }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "error"; message: string }
  | { type: "guest-character"; characterId: string }
  | { type: "start"; hostCharacterId: string; guestCharacterId: string }
  | { type: "input"; input: PlayerInput }
  | { type: "snapshot"; snapshot: MatchSnapshot };

type HostMessage =
  | { type: "start"; hostCharacterId: string; guestCharacterId: string }
  | { type: "snapshot"; snapshot: MatchSnapshot };

type GuestMessage =
  | { type: "character"; characterId: string }
  | { type: "input"; input: PlayerInput };

export class RoomClient {
  role: NetworkRole = "offline";
  roomCode = "";
  connected = false;
  private peer?: Peer;
  private connection?: DataConnection;
  private joinRetryTimer?: number;
  private joinAttempt = 0;
  private pendingJoinPeerId = "";
  private onEvent: (event: RoomEvent) => void;

  constructor(onEvent: (event: RoomEvent) => void) {
    this.onEvent = onEvent;
  }

  createRoom() {
    this.destroy();
    this.role = "host";
    this.roomCode = createRoomCode();
    this.peer = new Peer(roomCodeToPeerId(this.roomCode), {
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });
    this.peer.on("open", () => {
      this.onEvent({ type: "open", roomCode: this.roomCode });
    });
    this.peer.on("connection", (connection) => {
      if (this.connection?.open) {
        connection.close();
        return;
      }
      this.bindConnection(connection);
    });
    this.peer.on("error", (error) => {
      this.onEvent({ type: "error", message: getErrorMessage(error) });
    });
  }

  joinRoom(roomCode: string) {
    this.destroy();
    this.role = "guest";
    this.roomCode = normalizeRoomCode(roomCode);
    this.pendingJoinPeerId = roomCodeToPeerId(this.roomCode);
    this.peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });
    this.peer.on("open", () => {
      this.connectToHost();
    });
    this.peer.on("error", (error) => {
      if (this.shouldRetryJoin(error)) {
        this.scheduleJoinRetry();
        return;
      }
      this.onEvent({ type: "error", message: getErrorMessage(error) });
    });
  }

  sendGuestCharacter(characterId: string) {
    this.sendGuestMessage({ type: "character", characterId });
  }

  sendInput(input: PlayerInput) {
    this.sendGuestMessage({ type: "input", input });
  }

  sendStart(hostCharacterId: string, guestCharacterId: string) {
    this.sendHostMessage({ type: "start", hostCharacterId, guestCharacterId });
  }

  sendSnapshot(snapshot: MatchSnapshot) {
    this.sendHostMessage({ type: "snapshot", snapshot });
  }

  destroy() {
    if (this.joinRetryTimer !== undefined) {
      window.clearTimeout(this.joinRetryTimer);
      this.joinRetryTimer = undefined;
    }
    this.connection?.close();
    this.peer?.destroy();
    this.connection = undefined;
    this.peer = undefined;
    this.connected = false;
    this.roomCode = "";
    this.role = "offline";
    this.joinAttempt = 0;
    this.pendingJoinPeerId = "";
  }

  private bindConnection(connection: DataConnection) {
    this.connection = connection;
    connection.on("open", () => {
      if (this.joinRetryTimer !== undefined) {
        window.clearTimeout(this.joinRetryTimer);
        this.joinRetryTimer = undefined;
      }
      this.connected = true;
      this.onEvent({ type: "connected" });
    });
    connection.on("close", () => {
      const wasConnected = this.connected;
      this.connected = false;
      if (!wasConnected && this.role === "guest") {
        this.scheduleJoinRetry();
        return;
      }
      this.onEvent({ type: "disconnected" });
    });
    connection.on("error", (error) => {
      if (this.shouldRetryJoin(error)) {
        this.scheduleJoinRetry();
        return;
      }
      this.onEvent({ type: "error", message: getErrorMessage(error) });
    });
    connection.on("data", (data) => {
      this.handleMessage(data);
    });
  }

  private connectToHost() {
    if (!this.peer || this.role !== "guest" || this.connected || !this.pendingJoinPeerId) return;
    this.joinAttempt += 1;
    this.connection?.close();
    this.bindConnection(this.peer.connect(this.pendingJoinPeerId, { reliable: true }));
  }

  private scheduleJoinRetry() {
    if (this.role !== "guest" || this.connected || this.joinRetryTimer !== undefined) return;
    if (this.joinAttempt >= 6) {
      this.onEvent({
        type: "error",
        message: "방을 찾지 못했습니다. 방장이 같은 화면을 켜 둔 상태인지 확인한 뒤 다시 참가해 주세요.",
      });
      return;
    }
    this.onEvent({ type: "error", message: "방을 찾는 중입니다. 잠시 후 다시 연결합니다..." });
    const delay = 700 + this.joinAttempt * 450;
    this.joinRetryTimer = window.setTimeout(() => {
      this.joinRetryTimer = undefined;
      this.connectToHost();
    }, delay);
  }

  private shouldRetryJoin(error: unknown) {
    if (this.role !== "guest" || this.connected) return false;
    const message = getErrorMessage(error).toLowerCase();
    return (
      message.includes("could not connect") ||
      message.includes("peer-unavailable") ||
      message.includes("not found") ||
      message.includes("lost connection")
    );
  }

  private handleMessage(data: unknown) {
    if (!isRecord(data)) return;

    if (this.role === "host") {
      const message = data as GuestMessage;
      if (message.type === "character" && typeof message.characterId === "string") {
        this.onEvent({ type: "guest-character", characterId: message.characterId });
      } else if (message.type === "input" && isPlayerInput(message.input)) {
        this.onEvent({ type: "input", input: message.input });
      }
      return;
    }

    if (this.role === "guest") {
      const message = data as HostMessage;
      if (
        message.type === "start" &&
        typeof message.hostCharacterId === "string" &&
        typeof message.guestCharacterId === "string"
      ) {
        this.onEvent({
          type: "start",
          hostCharacterId: message.hostCharacterId,
          guestCharacterId: message.guestCharacterId,
        });
      } else if (message.type === "snapshot" && isRecord(message.snapshot)) {
        this.onEvent({ type: "snapshot", snapshot: message.snapshot as MatchSnapshot });
      }
    }
  }

  private sendHostMessage(message: HostMessage) {
    if (this.role === "host" && this.connection?.open) {
      this.connection.send(message);
    }
  }

  private sendGuestMessage(message: GuestMessage) {
    if (this.role === "guest" && this.connection?.open) {
      this.connection.send(message);
    }
  }
}

export function normalizeRoomCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  for (const value of values) {
    code += alphabet[value % alphabet.length];
  }
  return code;
}

function roomCodeToPeerId(roomCode: string) {
  return `volley-game-${normalizeRoomCode(roomCode).toLowerCase()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayerInput(value: unknown): value is PlayerInput {
  if (!isRecord(value)) return false;
  return (
    (value.x === -1 || value.x === 0 || value.x === 1) &&
    (value.y === -1 || value.y === 0 || value.y === 1) &&
    typeof value.skill === "boolean" &&
    (value.dive === -1 || value.dive === 0 || value.dive === 1)
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "연결 중 문제가 발생했습니다.";
}
