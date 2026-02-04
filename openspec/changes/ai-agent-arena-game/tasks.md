## 1. Project Setup

- [ ] 1.1 Extend `apps/server` with arena routes and Durable Objects
- [ ] 1.2 Configure Alchemy bindings in `packages/infra/alchemy.run.ts` for Durable Objects
- [ ] 1.3 Use D1/Drizzle tables for agents, templates, matches, and webhook logs
- [ ] 1.4 Create project structure in `apps/server/src` (api, game, durable-objects, types)
- [ ] 1.5 Add shared TypeScript types for game state, actions, and API payloads in `packages/api`
- [ ] 1.6 Define oRPC contracts in `packages/api` for arena endpoints
- [ ] 1.7 Enable Better Auth email-link flow for spectator access

## 2. Game Engine Core

- [ ] 2.1 Define character class templates (Fighter, Mage, Priest, Thief, Samurai, Lord, Bishop, Ninja)
- [ ] 2.2 Implement character stat system (HP, Attack, Defense, Magic, Speed)
- [ ] 2.3 Implement spell slot system per spell level (1-7)
- [ ] 2.4 Create party data structure with front/back row positions
- [ ] 2.5 Implement initiative calculation and turn order sorting
- [ ] 2.6 Implement combat action handlers (Attack, Cast Spell, Defend, Use Item, Inspect)
- [ ] 2.7 Implement damage calculation (Attack vs Defense, spell damage)
- [ ] 2.8 Implement defeat detection and party loss condition
- [ ] 2.9 Create game state serialization/deserialization for API responses

## 3. Party Templates

- [ ] 3.1 Create Balanced template (2 Fighter, 1 Mage, 1 Priest, 1 Thief, 1 Lord)
- [ ] 3.2 Create Glass Cannon template (1 Fighter, 2 Mage, 1 Bishop, 1 Samurai, 1 Ninja)
- [ ] 3.3 Create Tank Wall template (3 Fighter, 1 Lord, 1 Priest, 1 Bishop)
- [ ] 3.4 Create Speed Blitz template (2 Thief, 2 Ninja, 1 Samurai, 1 Mage)
- [ ] 3.5 Create Control template (1 Fighter, 2 Mage, 1 Priest, 1 Bishop, 1 Lord)
- [ ] 3.6 Implement templates.list
- [ ] 3.7 Implement templates.get

## 4. Durable Objects - Game Session

- [ ] 4.1 Create GameSession Durable Object class
- [ ] 4.2 Implement match initialization from party templates
- [ ] 4.3 Implement turn state management (whose turn, timeout tracking)
- [ ] 4.4 Implement action submission and validation
- [ ] 4.5 Implement turn resolution (execute all actions in initiative order)
- [ ] 4.6 Implement 120-second turn timeout with alarm API
- [ ] 4.7 Implement default Defend action on timeout
- [ ] 4.8 Implement match completion detection and result recording
- [ ] 4.9 Add WebSocket handler for spectator connections
- [ ] 4.10 Implement state broadcast to connected spectators

## 5. Agent API

- [ ] 5.1 Allow AI agents to initiate human sign-up by email
- [ ] 5.2 Send auth link email for spectator UI login
- [ ] 5.3 Require Better Auth session before agent creation
- [ ] 5.4 Implement agents.create (agent registration with webhook URL)
- [ ] 5.5 Implement API key generation and storage in D1 (hashed)
- [ ] 5.6 Create authentication middleware (X-Agent-Key header validation)
- [ ] 5.7 Implement rate limiting middleware (100 req/min per agent)
- [ ] 5.8 Implement matches.join (join matchmaking queue)
- [ ] 5.9 Implement matches.leave (leave queue)
- [ ] 5.10 Implement matches.state (get game state)
- [ ] 5.11 Implement matches.actions (submit turn actions)
- [ ] 5.12 Implement action validation (valid targets, available abilities, spell slots)
- [ ] 5.13 Implement reasoning field storage for spectator display
- [ ] 5.14 Implement matches.forfeit
- [ ] 5.15 Implement matches.history (match history)

## 6. Matchmaking

- [ ] 6.1 Create Matchmaker Durable Object for queue management
- [ ] 6.2 Implement queue add/remove operations
- [ ] 6.3 Implement agent pairing (FIFO when 2+ agents queued)
- [ ] 6.4 Implement 5-minute queue timeout with alarm
- [ ] 6.5 Implement match creation (spawn GameSession DO, notify agents)
- [ ] 6.6 Store match lifecycle state (waiting, in_progress, completed)

## 7. Webhook Notifications

- [ ] 7.1 Create webhook dispatcher utility
- [ ] 7.2 Implement "match_start" notification
- [ ] 7.3 Implement "your_turn" notification with game state
- [ ] 7.4 Implement "match_end" notification with result
- [ ] 7.5 Implement "queue_timeout" notification
- [ ] 7.6 Implement retry logic (3 attempts, exponential backoff)

## 8. Spectator UI - Setup

- [ ] 8.1 Extend `apps/web` with Three.js-based spectator route
- [ ] 8.2 Set up routing (/watch/{matchId})
- [ ] 8.3 Implement WebSocket connection to GameSession DO
- [ ] 8.4 Handle connection/reconnection with state sync

## 9. Spectator UI - Battle Viewer

- [ ] 9.1 Create Three.js scene setup with pixel/ASCII aesthetic
- [ ] 9.2 Implement party display (6 characters per side with HP bars)
- [ ] 9.3 Implement front/back row visual positioning
- [ ] 9.4 Implement defeated character visual state (grayed/X'd)
- [ ] 9.5 Create attack animation (projectile or slash effect)
- [ ] 9.6 Create spell animation (particle effects per spell type)
- [ ] 9.7 Create defend animation (shield indicator)
- [ ] 9.8 Implement turn indicator (which party is acting)

## 10. Spectator UI - Information Panels

- [ ] 10.1 Create battle log panel (scrolling action descriptions)
- [ ] 10.2 Create agent reasoning panel (shows AI thinking when available)
- [ ] 10.3 Implement character detail tooltip (hover to see full stats)
- [ ] 10.4 Create match result overlay (Victory/Defeat + stats)
- [ ] 10.5 Display match statistics (damage dealt, spells cast, turns)

## 11. Testing & Documentation

- [ ] 11.1 Write unit tests for combat calculations
- [ ] 11.2 Write integration tests for API endpoints
- [ ] 11.3 Write E2E test: two agents complete a full match
- [ ] 11.4 Create API documentation (OpenAPI/Swagger spec)
- [ ] 11.5 Create skill.md template for agent developers
- [ ] 11.6 Write getting started guide for creating an AI agent

## 12. Deployment

- [ ] 12.1 Configure production `alchemy.run.ts` bindings
- [ ] 12.2 Set up D1 database in production
- [ ] 12.3 Deploy Workers and Durable Objects to Cloudflare
- [ ] 12.4 Deploy frontend to Cloudflare Pages
- [ ] 12.5 Configure custom domain (if applicable)
- [ ] 12.6 Set up monitoring and error alerting
