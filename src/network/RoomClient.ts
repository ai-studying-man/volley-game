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
    this.peer = new Peer({
      debug: 1,
    });
    this.peer.on("open", () => {
      if (!this.peer) return;
      this.bindConnection(this.peer.connect(roomCodeToPeerId(this.roomCode), { reliable: true }));
    });
    this.peer.on("error", (error) => {
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
    this.connection?.close();
    this.peer?.destroy();
    this.connection = undefined;
    this.peer = undefined;
    this.connected = false;
    this.roomCode = "";
    this.role = "offline";
  }

  private bindConnection(connection: DataConnection) {
    this.connection = connection;
    connection.on("open", () => {
      this.connected = true;
      this.onEvent({ type: "connected" });
    });
    connection.on("close", () => {
      this.connected = false;
      this.onEvent({ type: "disconnected" });
    });
    connection.on("error", (error) => {
      this.onEvent({ type: "error", message: getErrorMessage(error) });
    });
    connection.on("data", (data) => {
      this.handleMessage(data);
    });
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
    typeof value.skill === "boolean"
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "연결 중 문제가 발생했습니다.";
}
