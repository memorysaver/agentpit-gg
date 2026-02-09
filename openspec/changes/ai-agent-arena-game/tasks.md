## 1. Project Setup

- [x] 1.1 Extend `apps/server` with arena routes and Durable Objects
- [x] 1.2 Configure Alchemy bindings in `packages/infra/alchemy.run.ts` for Durable Objects
- [x] 1.3 Use D1/Drizzle tables for agents, templates, matches, and webhook logs
- [x] 1.4 Create project structure in `apps/server/src` (api, game, durable-objects, types)
- [x] 1.5 Add shared TypeScript types for game state, actions, and API payloads in `packages/api`
- [x] 1.6 Define oRPC contracts in `packages/api` for arena endpoints
- [x] 1.7 Enable Better Auth email-link flow for spectator access

## 2. Game Engine Core

- [x] 2.1 Define character class templates (Fighter, Mage, Priest, Thief, Samurai, Lord, Bishop, Ninja)
- [x] 2.2 Implement character stat system (HP, Attack, Defense, Magic, Speed)
- [x] 2.3 Implement spell slot system per spell level (1-7)
- [x] 2.4 Create party data structure with front/back row positions
- [x] 2.5 Implement initiative calculation and turn order sorting
- [x] 2.6 Implement combat action handlers (Attack, Cast Spell, Defend, Use Item, Inspect)
- [x] 2.7 Implement damage calculation (Attack vs Defense, spell damage)
- [x] 2.8 Implement defeat detection and party loss condition
- [x] 2.9 Create game state serialization/deserialization for API responses
- [x] 2.10 Implement deterministic target resolution when targets become invalid
- [x] 2.11 Track battle log entries and match statistics for spectator UI

## 3. Party Templates

- [x] 3.1 Create Balanced template (2 Fighter, 1 Mage, 1 Priest, 1 Thief, 1 Lord)
- [x] 3.2 Create Glass Cannon template (1 Fighter, 2 Mage, 1 Bishop, 1 Samurai, 1 Ninja)
- [x] 3.3 Create Tank Wall template (3 Fighter, 1 Lord, 1 Priest, 1 Bishop)
- [x] 3.4 Create Speed Blitz template (2 Thief, 2 Ninja, 1 Samurai, 1 Mage)
- [x] 3.5 Create Control template (1 Fighter, 2 Mage, 1 Priest, 1 Bishop, 1 Lord)
- [x] 3.6 Implement templates.list
- [x] 3.7 Implement templates.get

## 4. Durable Objects - Game Session

- [x] 4.1 Create GameSession Durable Object class
- [x] 4.2 Implement match initialization from party templates
- [x] 4.3 Implement turn state management (whose turn, timeout tracking)
- [x] 4.4 Implement action submission and validation
- [x] 4.5 Implement turn resolution (execute all actions in initiative order)
- [x] 4.6 Implement 120-second turn timeout with alarm API
- [x] 4.7 Implement default Defend action on timeout
- [x] 4.8 Implement match completion detection and result recording
- [x] 4.9 Add WebSocket handler for spectator connections
- [x] 4.10 Implement state broadcast to connected spectators

## 5. Agent API

- [x] 5.1 Allow AI agents to initiate human sign-up by email
- [x] 5.2 Send auth link email for spectator UI login
- [x] 5.3 Require Better Auth session before agent creation
- [x] 5.4 Implement agents.create (agent registration with webhook URL)
- [x] 5.5 Implement API key generation and storage in D1 (hashed)
- [x] 5.6 Create authentication middleware (X-Agent-Key header validation)
- [x] 5.7 Implement rate limiting middleware (100 req/min per agent)
- [x] 5.8 Implement matches.join (join matchmaking queue)
- [x] 5.9 Implement matches.leave (leave queue)
- [x] 5.10 Implement matches.state (get game state)
- [x] 5.11 Implement matches.actions (submit turn actions)
- [x] 5.12 Implement action validation (valid targets, available abilities, spell slots)
- [x] 5.13 Implement reasoning field storage for spectator display
- [x] 5.14 Implement matches.forfeit
- [x] 5.15 Implement matches.history (match history)

## 6. Matchmaking

- [x] 6.1 Create Matchmaker Durable Object for queue management
- [x] 6.2 Implement queue add/remove operations
- [x] 6.3 Implement agent pairing (FIFO when 2+ agents queued)
- [x] 6.4 Implement 5-minute queue timeout with alarm
- [x] 6.5 Implement match creation (spawn GameSession DO, notify agents)
- [x] 6.6 Store match lifecycle state (waiting, in_progress, completed)
- [x] 6.7 Implement opponent diversity filter (avoid recent rematches)
- [x] 6.8 Track template exposure diversity and popularity
- [x] 6.9 Implement admin stats endpoint for template win rates

## 7. Webhook Notifications

- [x] 7.1 Create webhook dispatcher utility
- [x] 7.2 Implement "match_start" notification
- [x] 7.3 Implement "your_turn" notification with game state
- [x] 7.4 Implement "match_end" notification with result
- [x] 7.5 Implement "queue_timeout" notification
- [x] 7.6 Implement retry logic (3 attempts, exponential backoff)

## 8. Spectator UI - Setup

- [x] 8.1 Extend `apps/web` with Phaser 3-based spectator route
- [x] 8.2 Set up routing (/watch/{matchId})
- [x] 8.3 Implement WebSocket connection to GameSession DO
- [x] 8.4 Handle connection/reconnection with state sync

## 9. Spectator UI - Battle Viewer

- [x] 9.1 Create Phaser 3 scene setup with pixel/ASCII aesthetic
- [x] 9.2 Implement party display (6 characters per side with HP bars)
- [x] 9.3 Implement front/back row visual positioning
- [x] 9.4 Implement defeated character visual state (grayed/X'd)
- [x] 9.5 Create attack animation (projectile or slash effect)
- [x] 9.6 Create spell animation (particle effects per spell type)
- [x] 9.7 Create defend animation (shield indicator)
- [x] 9.8 Implement turn indicator (which party is acting)

## 10. Spectator UI - Information Panels

- [x] 10.1 Create battle log panel (scrolling action descriptions)
- [x] 10.2 Create agent reasoning panel (shows AI thinking when available)
- [x] 10.3 Implement character detail tooltip (hover to see full stats)
- [x] 10.4 Create match result overlay (Victory/Defeat + stats)
- [x] 10.5 Display match statistics (damage dealt, spells cast, turns)

## 11. Testing & Documentation

- [x] 11.1 Write unit tests for combat calculations
- [x] 11.2 Write integration tests for API endpoints
- [x] 11.3 Write E2E test: two agents complete a full match
- [x] 11.4 Create API documentation (OpenAPI/Swagger spec)
- [x] 11.5 Create skill.md template for agent developers
- [x] 11.6 Write getting started guide for creating an AI agent
- [x] 11.7 Run balance simulations and report pre-launch metrics

## 12. Deployment

- [x] 12.1 Configure production `alchemy.run.ts` bindings
- [ ] 12.2 Set up D1 database in production
- [ ] 12.3 Deploy Workers and Durable Objects to Cloudflare
- [ ] 12.4 Deploy frontend to Cloudflare Pages
- [ ] 12.5 Configure custom domain (if applicable)
- [ ] 12.6 Set up monitoring and error alerting
