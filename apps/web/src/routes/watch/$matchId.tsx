import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { GameState, MatchStats } from "@agentpit-gg/api/arena";
import { env } from "@agentpit-gg/env/web";

import BattleViewer from "@/components/arena/battle-viewer";
import { authClient } from "@/lib/auth-client";

type SpectatorMessage = {
  type: "state";
  state: GameState;
  log: { turn: number; message: string }[];
  stats: MatchStats;
  reasoningByParty: Record<string, string | null>;
};

export const Route = createFileRoute("/watch/$matchId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { matchId } = Route.useParams();
  const { data: session, isPending } = authClient.useSession();
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "closed"
  >("idle");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [battleLog, setBattleLog] = useState<SpectatorMessage["log"]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [reasoningByParty, setReasoningByParty] = useState<
    SpectatorMessage["reasoningByParty"]
  >({});

  const logRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  const socketUrl = useMemo(() => {
    const base = env.VITE_SERVER_URL.replace(/^http/, "ws");
    return `${base}/arena/watch/${matchId}`;
  }, [matchId]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }

      setConnectionStatus(retryRef.current === 0 ? "connecting" : "reconnecting");
      const socket = new WebSocket(socketUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        retryRef.current = 0;
        setConnectionStatus("connected");
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as SpectatorMessage;
        if (message.type !== "state") {
          return;
        }

        setGameState(message.state);
        setBattleLog(message.log);
        setStats(message.stats);
        setReasoningByParty(message.reasoningByParty);
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }
        setConnectionStatus("reconnecting");
        retryRef.current += 1;
        const delay = Math.min(5000, 800 * 2 ** retryRef.current);
        window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      setConnectionStatus("closed");
      wsRef.current?.close();
    };
  }, [session, socketUrl]);

  useEffect(() => {
    if (!logRef.current) {
      return;
    }
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  if (isPending) {
    return <div className="grid h-full place-items-center text-slate-400">Loading...</div>;
  }

  if (!session) {
    return <SpectatorLogin matchId={matchId} />;
  }

  return (
    <div className="flex h-full flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Spectator Mode</p>
          <h1 className="text-3xl font-semibold text-slate-100">Arena Match {matchId}</h1>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
          Status: <span className="text-emerald-400">{connectionStatus}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <BattleViewer state={gameState} log={battleLog} />

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="mb-3 text-sm uppercase tracking-[0.3em] text-slate-400">
              Agent Reasoning
            </h2>
            {gameState ? (
              <div className="space-y-3 text-sm text-slate-200">
                {gameState.parties.map((party) => (
                  <div key={party.id} className="rounded-xl border border-slate-800 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {party.name}
                    </p>
                    <p className="mt-2 text-slate-100">
                      {reasoningByParty[party.id] ?? "No reasoning provided."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Waiting for match state...</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="mb-3 text-sm uppercase tracking-[0.3em] text-slate-400">
              Party Roster
            </h2>
            {gameState ? (
              <div className="space-y-4 text-sm text-slate-200">
                {gameState.parties.map((party) => (
                  <div key={party.id}>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {party.name}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {party.characters.map((character) => (
                        <div
                          key={character.id}
                          title={`Class: ${character.class}\nHP: ${character.stats.currentHp}/${character.stats.maxHp}\nAtk: ${character.stats.attack}\nDef: ${character.stats.defense}\nMag: ${character.stats.magic}\nSpd: ${character.stats.speed}`}
                          className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-100"
                        >
                          <p className="font-semibold">{character.name}</p>
                          <p className="text-slate-400">{character.class}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Waiting for party data...</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="mb-3 text-sm uppercase tracking-[0.3em] text-slate-400">Battle Log</h2>
            <div
              ref={logRef}
              className="max-h-[320px] space-y-2 overflow-y-auto pr-2 text-sm text-slate-200"
            >
              {battleLog.length === 0 && (
                <p className="text-slate-500">Awaiting first actions...</p>
              )}
              {battleLog.map((entry, index) => (
                <div key={`${entry.turn}-${index}`} className="flex gap-2">
                  <span className="text-slate-500">T{entry.turn}</span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {gameState?.state === "completed" && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-6 text-slate-100">
          <h2 className="text-lg font-semibold">Match Complete</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <StatCard label="Turns" value={stats?.turnsTaken.partyA ?? 0} />
            <StatCard label="Damage" value={stats?.damageDealt.partyA ?? 0} />
            <StatCard label="Spells" value={stats?.spellsCast.partyA ?? 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-emerald-300">{value}</p>
    </div>
  );
}

function SpectatorLogin({ matchId }: { matchId: string }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Enter a valid email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authClient.signIn.magicLink(
        {
          email,
          callbackURL: `${window.location.origin}/watch/${matchId}`,
        },
        {
          onSuccess: () => {
            toast.success("Check your inbox for the login link.");
          },
          onError: (error) => {
            toast.error(error.error.message || "Failed to send login link.");
          },
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid h-full place-items-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Spectator Access</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-100">
          Enter your email to watch
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          We’ll send a secure login link to access match {matchId}.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Login Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
