import Phaser from "phaser";
import { useEffect, useRef } from "react";

import type { GameState } from "@agentpit-gg/api/arena";

import { ArenaScene } from "./arena-scene";

type BattleViewerProps = {
  state: GameState | null;
  log?: { turn: number; message: string }[];
};

export default function BattleViewer({ state, log = [] }: BattleViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: 900,
      height: 520,
      parent: containerRef.current,
      backgroundColor: "#0b1120",
      scene: [ArenaScene],
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!state || !gameRef.current) {
      return;
    }

    const scene = gameRef.current.scene.getScene("arena") as ArenaScene | undefined;
    scene?.updateState(state, log);
  }, [state, log]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-[0_0_40px_rgba(15,23,42,0.6)]">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>Battle Viewer</span>
        <span className="text-emerald-400">Live</span>
      </div>
      <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-xl" />
    </div>
  );
}
