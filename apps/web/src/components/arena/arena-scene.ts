import Phaser from "phaser";

import type { Character, GameState } from "@agentpit-gg/api/arena";

type CharacterDisplay = {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  hpFill: Phaser.GameObjects.Rectangle;
  maxHp: number;
  currentHp: number;
  name: string;
};

export class ArenaScene extends Phaser.Scene {
  private characters = new Map<string, CharacterDisplay>();
  private turnText?: Phaser.GameObjects.Text;
  private lastLogMessage?: string;

  constructor() {
    super({ key: "arena" });
  }

  create() {
    const { width } = this.scale;
    this.add.rectangle(width / 2, 40, width - 80, 48, 0x0f172a).setStrokeStyle(2, 0x38bdf8);
    this.turnText = this.add
      .text(width / 2, 40, "Awaiting match...", {
        fontFamily: "Space Mono, monospace",
        fontSize: "18px",
        color: "#e2e8f0",
      })
      .setOrigin(0.5, 0.5);

    this.add.rectangle(width / 2, 250, width - 80, 380, 0x0b1120).setStrokeStyle(2, 0x1f2937);
  }

  updateState(state: GameState, log: { turn: number; message: string }[] = []) {
    const { width } = this.scale;
    const leftX = 180;
    const rightX = width - 180;
    const frontYs = [170, 250, 330];
    const backYs = [120, 250, 380];

    state.parties.forEach((party, partyIndex) => {
      const sideX = partyIndex === 0 ? leftX : rightX;
      const front = party.characters.filter((character) => character.row === "front");
      const back = party.characters.filter((character) => character.row === "back");

      front.forEach((character, index) => {
        const y = frontYs[index] ?? frontYs[frontYs.length - 1];
        this.renderCharacter(character, sideX, y, partyIndex === 0 ? -1 : 1);
      });

      back.forEach((character, index) => {
        const y = backYs[index] ?? backYs[backYs.length - 1];
        const offsetX = partyIndex === 0 ? sideX + 80 : sideX - 80;
        this.renderCharacter(character, offsetX, y, partyIndex === 0 ? -1 : 1);
      });
    });

    const activeLabel = state.activeAgentId ? `Agent ${state.activeAgentId}` : "Pending";
    this.turnText?.setText(`Turn: ${activeLabel} • Round ${state.round}`);

    const lastEntry = log[log.length - 1];
    if (lastEntry && lastEntry.message !== this.lastLogMessage) {
      this.lastLogMessage = lastEntry.message;
      this.playLogEffect(lastEntry.message);
    }

    for (const [characterId, display] of this.characters.entries()) {
      if (!state.parties.some((party) => party.characters.some((character) => character.id === characterId))) {
        display.container.destroy();
        this.characters.delete(characterId);
      }
    }
  }

  private renderCharacter(character: Character, x: number, y: number, facing: number) {
    const existing = this.characters.get(character.id);
    if (!existing) {
      const body = this.add.rectangle(0, 0, 90, 50, 0x1e293b, 0.9).setStrokeStyle(2, 0x38bdf8);
      const nameText = this.add.text(0, -26, character.name, {
        fontFamily: "Space Mono, monospace",
        fontSize: "12px",
        color: "#e2e8f0",
      });
      nameText.setOrigin(0.5, 0.5);

      const hpFill = this.add.rectangle(-34, 28, 68, 6, 0x22c55e);
      const hpText = this.add.text(0, 28, "", {
        fontFamily: "Space Mono, monospace",
        fontSize: "10px",
        color: "#e2e8f0",
      });
      hpText.setOrigin(0.5, 0.5);

      const container = this.add.container(x, y, [body, nameText, hpFill, hpText]);
      container.setScale(facing, 1);

      this.characters.set(character.id, {
        container,
        body,
        nameText,
        hpText,
        hpFill,
        maxHp: character.stats.maxHp,
        currentHp: character.stats.currentHp,
        name: character.name,
      });
    }

    const display = this.characters.get(character.id);
    if (!display) {
      return;
    }

    display.container.setPosition(x, y);
    display.nameText.setText(character.name);
    display.name = character.name;
    display.hpText.setText(`${character.stats.currentHp}/${character.stats.maxHp}`);

    const hpRatio = character.stats.maxHp === 0 ? 0 : character.stats.currentHp / character.stats.maxHp;
    display.hpFill.setScale(Math.max(0.1, hpRatio), 1);
    display.hpFill.setFillStyle(hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xf97316 : 0xef4444);

    if (character.defeated) {
      display.body.setFillStyle(0x0f172a, 0.4);
      display.container.setAlpha(0.5);
    } else {
      display.body.setFillStyle(0x1e293b, 0.9);
      display.container.setAlpha(1);
    }

    if (display.currentHp !== character.stats.currentHp) {
      const flashColor =
        character.stats.currentHp < display.currentHp ? 0xef4444 : 0x22c55e;
      this.tweens.add({
        targets: display.body,
        duration: 200,
        yoyo: true,
        repeat: 1,
        onStart: () => {
          display.body.setStrokeStyle(2, flashColor);
        },
        onComplete: () => {
          display.body.setStrokeStyle(2, 0x38bdf8);
        },
      });
      display.currentHp = character.stats.currentHp;
      display.maxHp = character.stats.maxHp;
    }
  }

  private playLogEffect(message: string) {
    const attackMatch = message.match(/^(.*) attacks (.*) for/);
    if (attackMatch) {
      const [, attacker, target] = attackMatch;
      this.animateStrike(attacker?.trim(), target?.trim(), 0xf97316);
      return;
    }

    const spellMatch = message.match(/^(.*) casts a spell at (.*) for/);
    if (spellMatch) {
      const [, caster, target] = spellMatch;
      this.animateStrike(caster?.trim(), target?.trim(), 0x38bdf8);
      return;
    }

    const defendMatch = message.match(/^(.*) braces for impact/);
    if (defendMatch) {
      const [, defender] = defendMatch;
      this.animateShield(defender?.trim());
    }
  }

  private findByName(name?: string) {
    if (!name) {
      return null;
    }
    for (const display of this.characters.values()) {
      if (display.name === name) {
        return display;
      }
    }
    return null;
  }

  private animateStrike(attackerName?: string, targetName?: string, color?: number) {
    const attacker = this.findByName(attackerName);
    const target = this.findByName(targetName);
    if (!attacker || !target) {
      return;
    }

    const line = this.add.line(
      0,
      0,
      attacker.container.x,
      attacker.container.y,
      target.container.x,
      target.container.y,
      color ?? 0xf97316,
    );
    line.setLineWidth(2, 2);

    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 300,
      onComplete: () => line.destroy(),
    });

    const burst = this.add.circle(target.container.x, target.container.y, 12, color ?? 0xf97316);
    this.tweens.add({
      targets: burst,
      scale: 2,
      alpha: 0,
      duration: 350,
      onComplete: () => burst.destroy(),
    });
  }

  private animateShield(defenderName?: string) {
    const defender = this.findByName(defenderName);
    if (!defender) {
      return;
    }

    const shield = this.add.rectangle(
      defender.container.x,
      defender.container.y,
      120,
      70,
      0x22c55e,
      0.15,
    );
    shield.setStrokeStyle(2, 0x22c55e);

    this.tweens.add({
      targets: shield,
      alpha: 0,
      duration: 400,
      onComplete: () => shield.destroy(),
    });
  }
}
