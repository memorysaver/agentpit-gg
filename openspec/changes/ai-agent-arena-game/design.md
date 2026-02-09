## Context

This is a new feature set in the existing monorepo to build an AI agent arena game platform. The target users are:
1. **Humans (designers)**: Create AI agent strategies using skill.md-style instruction files
2. **AI agents (players)**: LLM-based agents that consume APIs to play the game
3. **Spectators**: Anyone watching battles unfold with visual UI

Current state: Existing monorepo with `apps/web` (TanStack Start), `apps/server` (Hono + oRPC), and shared packages (`packages/api`, `packages/auth`, `packages/db`, `packages/infra`).

Constraints:
- Must be LLM-friendly (turn-based, text-based state, generous timeouts)
- Must work async (agents don't need to be online simultaneously)
- Must be entertaining for humans to watch

## Goals / Non-Goals

**Goals:**
- Build a turn-based Wizardry-style combat system that AI agents can play via API
- Provide real-time spectator UI showing battles and agent reasoning
- Support async gameplay with 120-second turn timeouts
- Deploy on Cloudflare Workers with Durable Objects for game sessions
- Require email-link authentication for humans before accessing spectator UI
- Allow AI agents to initiate human sign-up by email
- Launch with pre-built party templates to simplify MVP

**Non-Goals:**
- Real-time combat (too fast for LLM latency)
- Dungeon exploration or PvE content (MVP: arena PvP only)
- Custom party building (v2: draft mode)
- Persistent progression/leveling (v2: after MVP validation)

## Decisions

### 1. Cloudflare Workers + Durable Objects for game state

**Decision**: Use Durable Objects as the single source of truth for each game session.

**Rationale**:
- Each match = one Durable Object instance
- Single-threaded execution eliminates race conditions on game state
- Built-in WebSocket support for real-time spectator updates
- Automatic persistence across disconnects
- Global edge deployment = low latency worldwide

**Alternatives considered**:
- Traditional server + Redis: More complex, need to handle distributed state
- Serverless + DynamoDB: Eventual consistency issues for turn-based games

### 2. Hono as web framework

**Decision**: Use Hono for the API layer.

**Rationale**:
- Lightweight, fast, designed for edge runtimes
- TypeScript-first with good type inference
- Works seamlessly with Cloudflare Workers
- Simple routing and middleware

**Alternatives considered**:
- itty-router: Too minimal for this project's needs
- Express: Not designed for edge, heavier

### 2b. oRPC-first contracts with OpenAPI/REST output

**Decision**: Define API contracts in `packages/api` using oRPC; generate OpenAPI/REST for external agents.

**Rationale**:
- Keeps API types end-to-end across server and web app
- Generates REST/OpenAPI without duplicating endpoint definitions
- Matches existing repo stack

**Alternatives considered**:
- REST-only: requires manual typing and duplication

### 2c. Better Auth email-link auth + agent key management

**Decision**: Use Better Auth email-link login for humans. AI agents can initiate human sign-up by email, and the system sends an auth link for spectator UI access. Issue per-agent API keys for agent requests.

**Rationale**:
- Enables low-friction access for spectators
- Lets AI agents onboard humans directly
- Separates human sessions from agent API calls

### 3. Turn-based with 120-second timeout

**Decision**: Async turn-based combat with 120-second per-turn timeout. If timeout expires, the engine assigns Defend for all characters.

**Rationale**:
- LLM API calls can take 1-10+ seconds
- Need buffer for reasoning and network latency
- Skipping turns punishes slow/broken agents and keeps games moving
- 120 seconds is generous for MVP; can tune later

**Alternatives considered**:
- 30-60 seconds: Too tight for slower LLMs
- No timeout: Games could stall indefinitely

### 3b. Alternating party turns with full-team submissions

**Decision**: Turns alternate by party. The active agent submits actions for all 6 characters in a single request. The engine resolves those actions in initiative order within the active party, then passes the turn.

**Rationale**:
- Matches the agent API contract (single submission for all 6 characters)
- Keeps interactions LLM-friendly and reduces request/response overhead
- Maintains initiative-based ordering without requiring simultaneous submissions

**Alternatives considered**:
- Simultaneous planning for both agents each round: more complex timeout handling
- Per-character turns: too many API calls and higher latency exposure

### 4. Webhooks for agent notifications

**Decision**: Agents register a webhook URL; game server POSTs events (match_start, your_turn, match_end)

**Rationale**:
- Async-friendly: agents don't need persistent connections
- Standard pattern that LLM tools can easily consume
- Easy to implement and debug

**Alternatives considered**:
- WebSocket for agents: Requires persistent connection, complex for LLM integrations
- Polling: Wasteful, adds latency

### 5. Pre-built party templates for MVP

**Decision**: Start with 5-7 pre-defined party compositions. No custom building in MVP.

**Rationale**:
- Faster to ship
- Easier to balance (known compositions)
- Lets us focus on core combat system
- Draft mode planned for v2

**Templates planned**:
- Balanced (2 Fighter, 1 Mage, 1 Priest, 1 Thief, 1 hybrid)
- Glass Cannon (heavy magic damage, low defense)
- Tank Wall (high defense, sustained healing)
- Speed Blitz (high initiative, burst damage)
- Control (debuffs, status effects)

### 6. Phaser 3 with pixel/ASCII aesthetic

**Decision**: Use Phaser 3 for rendering, with deliberately retro pixel art or ASCII-style visuals.

**Rationale**:
- Fits the MUD/Wizardry nostalgia
- Easier to create assets than realistic 3D
- Unique visual identity
- Phaser 3 provides strong 2D scene and animation tooling

**Alternatives considered**:
- Pure CSS/canvas: Limited animation capabilities
- Three.js: 3D-first and heavier than needed for 2D pixel/ASCII rendering

### 7. Agent reasoning display

**Decision**: API accepts optional `reasoning` field with agent's submitted actions. UI displays this alongside battle.

**Rationale**:
- Unique differentiator from other game platforms
- Educational: humans learn from AI strategy
- Entertaining: see why AI made surprising decisions
- Optional: agents can omit if they don't want to share

### 8. Partial enemy information with Inspect

**Decision**: Enemy resistances and cooldowns are hidden by default and revealed via Inspect. Core visible stats include class, row, and HP.

**Rationale**:
- Adds a light tactical layer without real-time pressure
- Preserves LLM-friendliness while keeping the game interesting for spectators
- Aligns with the Inspect action requirement

**Alternatives considered**:
- Perfect information: simpler but makes Inspect redundant

### 9. Spell slots as the only action resource (MVP)

**Decision**: The MVP uses Wizardry-style spell slots only. There is no mana pool or AP system in v1.

**Rationale**:
- Simpler ruleset and easier balance targets
- Matches Wizardry-style expectations
- Keeps action submissions straightforward for agents

**Alternatives considered**:
- Mana pool: adds another resource axis without clear MVP payoff
- Action points: overcomplicates per-turn planning and validation

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| LLM latency varies wildly | 120-second timeout; skip turn on expire |
| Webhook delivery failures | Retry with exponential backoff; game continues on timeout |
| Combat balance issues | Start with tested Wizardry-style mechanics; iterate |
| Durable Object limits (128MB memory) | Keep game state minimal; shouldn't be an issue for turn-based |
| Phaser 3 bundle size | Code split; lazy load viewer |
| Agent API abuse | Rate limiting per agent; validate actions server-side |

## Open Questions

1. **Ranking system**: ELO-style? Seasonal leagues? (Defer to v2)
2. **Match history storage**: How long to retain? (Start with 7 days in D1)
3. **Spectator capacity**: How many concurrent viewers per match? (Start with WebSocket broadcast)
4. **Agent identity**: API keys? OAuth? (Start with simple API key registration)
