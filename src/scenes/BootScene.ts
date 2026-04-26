import Phaser from "phaser";
import { characters, type CharacterDefinition } from "../game/characters";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.createCourtTextures();
    for (const character of characters) {
      this.createCharacterTexture(character);
    }
    this.createBallTexture();
    this.scene.start("MatchScene");
  }

  private createCourtTextures() {
    const ground = this.make.graphics({ x: 0, y: 0 }, false);
    ground.fillStyle(0xf2d36b, 1);
    ground.fillRect(0, 0, 16, 16);
    ground.lineStyle(2, 0xd4a44a, 1);
    ground.lineBetween(0, 2, 16, 2);
    ground.generateTexture("tile-ground", 16, 16);
    ground.destroy();
  }

  private createCharacterTexture(character: CharacterDefinition) {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const { primary, secondary, accent } = character;
    graphics.clear();
    graphics.fillStyle(0x1b2024, 0.2);
    graphics.fillEllipse(32, 58, 44, 8);

    graphics.fillStyle(0xf3c77a, 1);
    graphics.fillRoundedRect(10, 35, 9, 10, 4);
    graphics.fillRoundedRect(45, 35, 9, 10, 4);

    graphics.fillStyle(secondary, 1);
    graphics.fillRoundedRect(14, 28, 36, 25, 5);
    graphics.fillStyle(primary, 1);
    graphics.fillRoundedRect(17, 30, 30, 20, 3);
    graphics.fillStyle(accent, 1);
    graphics.fillRect(29, 31, 6, 19);
    graphics.fillRect(21, 39, 22, 4);

    this.drawHeadShape(graphics, character);

    if (character.accessory === "glasses") {
      graphics.lineStyle(2, 0x252a30, 1);
      graphics.strokeCircle(26, 22, 5);
      graphics.strokeCircle(38, 22, 5);
      graphics.lineBetween(31, 22, 33, 22);
      graphics.fillStyle(accent, 1);
      graphics.fillRect(19, 45, 26, 4);
    } else if (character.accessory === "anger") {
      graphics.lineStyle(3, accent, 1);
      graphics.lineBetween(22, 18, 30, 20);
      graphics.lineBetween(42, 18, 34, 20);
      graphics.fillStyle(accent, 1);
      graphics.fillTriangle(48, 10, 54, 17, 46, 17);
    } else if (character.accessory === "munch") {
      graphics.fillStyle(accent, 1);
      graphics.fillCircle(14, 41, 7);
      graphics.fillCircle(50, 41, 7);
      graphics.fillStyle(0xfff0c8, 1);
      graphics.fillRoundedRect(24, 43, 16, 5, 2);
    } else if (character.accessory === "genius") {
      graphics.lineStyle(2, accent, 1);
      graphics.lineBetween(18, 36, 47, 31);
      graphics.fillStyle(secondary, 1);
      graphics.fillCircle(45, 16, 4);
    } else if (character.accessory === "spark") {
      graphics.fillStyle(accent, 1);
      graphics.fillTriangle(50, 11, 57, 18, 48, 19);
      graphics.fillTriangle(14, 11, 7, 18, 16, 19);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(21, 44, 22, 3);
    } else if (character.accessory === "spin") {
      graphics.lineStyle(3, accent, 1);
      graphics.strokeCircle(50, 18, 6);
      graphics.strokeCircle(13, 37, 5);
      graphics.fillStyle(0x252a30, 1);
      graphics.fillRoundedRect(45, 7, 8, 4, 2);
    }

    this.drawFaceDetails(graphics, character);

    graphics.fillStyle(primary, 1);
    graphics.fillRoundedRect(14, 50, 14, 8, 2);
    graphics.fillRoundedRect(36, 50, 14, 8, 2);
    graphics.fillStyle(0x182629, 1);
    graphics.fillRect(14, 56, 14, 3);
    graphics.fillRect(36, 56, 14, 3);
    graphics.generateTexture(`character-${character.id}`, 64, 64);
    graphics.destroy();
  }

  private drawHeadShape(graphics: Phaser.GameObjects.Graphics, character: CharacterDefinition) {
    const { accessory, hair } = character;
    graphics.fillStyle(0xf3c77a, 1);
    if (accessory === "munch") {
      graphics.fillRoundedRect(16, 10, 32, 25, 8);
    } else if (accessory === "spark") {
      graphics.fillRoundedRect(20, 13, 24, 20, 6);
    } else if (accessory === "anger") {
      graphics.fillRoundedRect(18, 11, 28, 22, 4);
    } else if (accessory === "spin") {
      graphics.fillRoundedRect(17, 10, 30, 24, 6);
    } else {
      graphics.fillRoundedRect(18, 11, 28, 22, 5);
    }

    graphics.fillStyle(hair, 1);
    if (accessory === "glasses") {
      graphics.fillRoundedRect(18, 8, 28, 7, 4);
      graphics.fillRect(18, 15, 4, 5);
      graphics.fillRect(42, 15, 4, 5);
    } else if (accessory === "anger") {
      graphics.fillRoundedRect(17, 8, 31, 9, 2);
      graphics.fillRect(18, 16, 6, 4);
    } else if (accessory === "munch") {
      graphics.fillRoundedRect(17, 7, 30, 10, 5);
      graphics.fillRect(17, 16, 5, 5);
      graphics.fillRect(43, 16, 5, 5);
    } else if (accessory === "genius") {
      graphics.fillRoundedRect(18, 8, 29, 8, 4);
      graphics.fillRect(39, 14, 7, 8);
    } else if (accessory === "spin") {
      graphics.fillRoundedRect(16, 6, 32, 10, 4);
      graphics.fillRect(13, 13, 8, 15);
      graphics.fillRect(43, 13, 8, 16);
      graphics.fillTriangle(20, 8, 25, 3, 30, 10);
      graphics.fillTriangle(31, 7, 37, 2, 42, 10);
    } else if (accessory === "spark") {
      graphics.fillRoundedRect(19, 9, 26, 7, 4);
      graphics.fillTriangle(22, 10, 18, 17, 25, 16);
      graphics.fillTriangle(39, 10, 47, 17, 40, 16);
    }
  }

  private drawFaceDetails(graphics: Phaser.GameObjects.Graphics, character: CharacterDefinition) {
    const ink = 0x182629;
    const cheek = 0xff786b;
    const { accessory, accent } = character;
    graphics.fillStyle(ink, 1);

    if (accessory === "glasses") {
      graphics.fillCircle(26, 22, 2);
      graphics.fillCircle(38, 22, 2);
      graphics.fillStyle(cheek, 1);
      graphics.fillCircle(22, 27, 3);
      graphics.fillCircle(42, 27, 3);
      graphics.lineStyle(2, ink, 1);
      graphics.lineBetween(28, 28, 36, 28);
      graphics.fillRect(31, 30, 3, 2);
    } else if (accessory === "anger") {
      graphics.lineStyle(2, ink, 1);
      graphics.lineBetween(23, 20, 29, 22);
      graphics.lineBetween(41, 20, 35, 22);
      graphics.fillStyle(ink, 1);
      graphics.fillRect(25, 23, 3, 2);
      graphics.fillRect(37, 23, 3, 2);
      graphics.fillStyle(accent, 1);
      graphics.fillRect(29, 29, 7, 2);
    } else if (accessory === "munch") {
      graphics.fillCircle(26, 23, 2);
      graphics.fillCircle(39, 23, 2);
      graphics.fillStyle(cheek, 1);
      graphics.fillCircle(22, 28, 4);
      graphics.fillCircle(43, 28, 4);
      graphics.fillStyle(ink, 1);
      graphics.fillRoundedRect(29, 29, 8, 3, 1);
    } else if (accessory === "genius") {
      graphics.fillRect(25, 23, 4, 2);
      graphics.fillRect(37, 23, 4, 2);
      graphics.lineStyle(2, ink, 1);
      graphics.lineBetween(29, 29, 35, 30);
      graphics.fillStyle(cheek, 1);
      graphics.fillCircle(42, 28, 2);
    } else if (accessory === "spin") {
      graphics.fillCircle(25, 22, 3);
      graphics.fillCircle(39, 22, 3);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(24, 21, 1);
      graphics.fillCircle(38, 21, 1);
      graphics.lineStyle(2, ink, 1);
      graphics.lineBetween(27, 29, 36, 27);
      graphics.lineBetween(36, 27, 40, 30);
    } else if (accessory === "spark") {
      graphics.lineStyle(2, ink, 1);
      graphics.lineBetween(24, 23, 29, 23);
      graphics.lineBetween(36, 23, 41, 23);
      graphics.fillStyle(cheek, 1);
      graphics.fillCircle(23, 28, 3);
      graphics.fillCircle(42, 28, 3);
      graphics.lineStyle(2, ink, 1);
      graphics.lineBetween(29, 29, 35, 29);
      graphics.lineBetween(35, 29, 38, 27);
    }
  }

  private createBallTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xfff8db, 1);
    graphics.fillCircle(20, 20, 19);
    graphics.lineStyle(3, 0xe94338, 1);
    graphics.strokeCircle(20, 20, 18);
    graphics.lineBetween(3, 20, 37, 20);
    graphics.fillStyle(0xe94338, 1);
    graphics.fillCircle(20, 20, 5);
    graphics.generateTexture("ball", 40, 40);
    graphics.destroy();
  }
}
