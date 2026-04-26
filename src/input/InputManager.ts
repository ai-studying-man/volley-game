import type { PlayerInput } from "../game/types";

const keyMap = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  skill: ["Space", "Enter", "KeyJ"],
};

export class InputManager {
  private keys = new Set<string>();
  private touchLeft = false;
  private touchRight = false;
  private touchSkill = false;
  private skillQueued = false;
  private touchJump = false;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
    this.bindHoldButton("left-button", (held) => {
      this.touchLeft = held;
    });
    this.bindHoldButton("right-button", (held) => {
      this.touchRight = held;
    });
    this.bindHoldButton("jump-button", (held) => {
      this.touchJump = held;
    });
    this.bindHoldButton("skill-button", (held) => {
      this.touchSkill = held;
    });
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  queueSkill() {
    this.skillQueued = true;
  }

  getInput(): PlayerInput {
    const touchX = this.touchLeft === this.touchRight ? 0 : this.touchLeft ? -1 : 1;
    const x = this.isPressed("left") ? -1 : this.isPressed("right") ? 1 : touchX;
    const keyboardY = this.isPressed("up") ? -1 : this.isPressed("down") ? 1 : 0;
    const y = keyboardY !== 0 ? keyboardY : this.touchJump ? -1 : 0;
    const skill = this.skillQueued || this.isPressed("skill") || this.touchSkill;
    this.skillQueued = false;
    return {
      x: x as -1 | 0 | 1,
      y: y as -1 | 0 | 1,
      skill,
    };
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (Object.values(keyMap).some((keys) => keys.includes(event.code))) {
      event.preventDefault();
      this.keys.add(event.code);
      if (keyMap.skill.includes(event.code)) {
        this.skillQueued = true;
      }
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (Object.values(keyMap).some((keys) => keys.includes(event.code))) {
      event.preventDefault();
      this.keys.delete(event.code);
    }
  };

  private isPressed(action: keyof typeof keyMap) {
    return keyMap[action].some((code) => this.keys.has(code));
  }

  private bindHoldButton(id: string, setHeld: (held: boolean) => void) {
    const element = requiredElement(id);
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setHeld(true);
      if (id === "skill-button") {
        this.skillQueued = true;
      }
      element.setPointerCapture(event.pointerId);
    });
    const release = () => setHeld(false);
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("pointerleave", release);
    if (id === "skill-button") {
      element.addEventListener("click", () => {
        this.skillQueued = true;
      });
    }
  }
}

function requiredElement(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element;
}
