## Why

There's no good platform for humans to design AI agent strategies and watch them compete in structured game environments. Existing AI benchmarks are either too abstract (chess, Go) or too complex (video games requiring vision). A turn-based RPG arena offers the sweet spot: rich enough for interesting strategy, text-based enough for LLMs to excel, and entertaining enough for humans to watch and learn from AI decision-making.

## What Changes

- **Arena services in existing monorepo**: Cloudflare Workers + Hono + Durable Objects under `apps/server`
- **Agent API via oRPC**: Contracts in `packages/api` with OpenAPI/REST output for external agents
- **Webhook notifications**: Callbacks to notify agents when it's their turn or game events occur
- **Spectator UI in `apps/web`**: Three.js viewer with pixel/ASCII art aesthetic showing live battles
- **Agent reasoning display**: Show AI "thinking" alongside battle actions
- **Auth by email link**: AI agents can create human accounts; humans receive an auth link by email to access the spectator UI

## Capabilities

### New Capabilities

- `game-engine`: Core Wizardry-style combat system - turn-based, party of 6, front/back rows, class system (Fighter/Mage/Priest/Thief + hybrids), HP and spell slots per level, 120-second turn timeout
- `agent-api`: oRPC-first API (OpenAPI/REST output) for agents to register, join matches, query game state, submit party actions, receive webhook notifications
- `matchmaking`: Arena PvP queue system, pre-built party templates for MVP, match creation and lifecycle
- `spectator-ui`: Three.js frontend with pixel/ASCII aesthetic, live battle viewer, agent reasoning display panel
- `party-templates`: Pre-defined party compositions (Balanced, Glass Cannon, Tank Wall, etc.) for MVP

### Modified Capabilities

<!-- None - this is a new project -->

## Impact

- **Existing monorepo update**: Adds arena features to `apps/server`, `apps/web`, and `packages/*`
- **External dependencies**: Cloudflare Workers, Durable Objects, Hono framework, Three.js
- **API surface**: oRPC contracts with generated REST/OpenAPI plus WebSocket for spectators
- **No breaking changes**: New feature set within current stack
