# ⚔️ Steel and Sigils v1.11

A tactical combat roguelite inspired by Heroes of Might and Magic. Built with Phaser 3 + vanilla JS. No build step — open `index.html` in a browser.

**Play:** Open `index.html` directly, or via Live Server on port 5501.
**Debug:** Append `?debug=1` to URL for dev tools.

---

## Game Overview

- **Turn-based tactical combat** on a grid with initiative-based turn order
- **9 player unit types** across 3 tiers (common, specialist, legendary)
- **3 enemy factions** (Greenskin Horde, Dungeon Dwellers, Old God Worshippers) with unique bosses
- **12 spells** in 4 schools (Destructo, Restoratio, Benedictio, Utilitas)
- **Rogue-lite meta-progression** — persistent currency and power-ups across runs (localStorage)
- **Legendary + Mythic perks** — unit-specific upgrade trees
- **Boss waves** every 5th battle with 2x2 bosses and unique mechanics
- **Diagonal attacks** via Chebyshev distance

---

## Tech Stack

| Tech | Purpose |
|------|---------|
| Phaser 3.70 | Game engine (WebGL + Web Audio) |
| Vanilla JS (ES6 modules) | All game logic, no build step |
| CSS3 | UI styling |
| localStorage | Save system (meta-progression) via SaveManager |

### File Structure
```
src/
  main.js           — Phaser bootstrap, GAME_VERSION
  units.js          — UNIT_TYPES (all unit stat/passive definitions)
  GameConfig.js     — CONFIG, STAGES, SPELLS
  SceneManager.js   — PreGameScene + BattleScene (~4500 lines, main hub)
  EntityManager.js  — Unit class, UnitManager, TurnSystem, AI
  SpellSystem.js    — Spell casting, AoE, visual effects
  InputHandler.js   — GridSystem, pathfinding, click routing
  UIHandler.js      — All DOM/HUD updates, floating text
  SaveManager.js    — Meta-progression persistence (regular script, not ES6)
  i18n.js           — EN + RU translations
  debug.js          — Debug tools (loaded with ?debug=1)
images/             — Sprites (256x256 RGBA PNG)
utils/              — Asset generation scripts + docs
```

---

## Roadmap

### Completed (v1.00 - v1.10)
- [x] Core combat system (9 units, 12 spells, 3 factions)
- [x] 3 battle maps (Forest, Mountain Pass, Ruins — Ruins disabled for rework)
- [x] Boss system (10 bosses across 3 factions including Bone Behemoth)
- [x] Legendary + Mythic perk trees (5 legendary, 4 mythic)
- [x] Rogue-lite meta-progression (SaveManager, power-up shop)
- [x] Diagonal attacks (Chebyshev distance)
- [x] 7 common buffs, 8 epic buffs, 9 magic rewards including Spell Echo
- [x] i18n (English + Russian)
- [x] AI-generated sprite pipeline (Pollinations API + background removal)
- [x] Local SFX generation pipeline (Meta AudioGen — quality insufficient, parked)

### Phase 1: Steam Playtest Prep
- [ ] Electron wrapper + Steam overlay integration
- [ ] steamworks.js basic init (app ID, overlay)
- [ ] Store page assets (capsule images, screenshots, description)
- [ ] Settings menu (volume slider, resolution, controls)
- [ ] Controller support (gamepad input mapping)
- [ ] Tutorial / first-run guidance
- [ ] Ruins map rework and re-enable

### Phase 2: Content + Polish (Pre-Early Access)
- [ ] Replace AI sprites with hand-cleaned or commissioned pixel art
- [ ] Unit animations (idle sway, attack poses, hit flinch, death — Darkest Dungeon style)
- [ ] Professional SFX (commission or better AI model)
- [ ] Background music (per-map themes)
- [ ] Difficulty modes (Easy / Normal / Hard)
- [ ] Daily challenge / seeded runs
- [ ] 15+ hours of varied content (more enemy types, events, map variety)
- [ ] Balance pass on all units, spells, and buffs

### Phase 3: Early Access Launch ($14.99)
- [ ] Steam achievements
- [ ] Cloud saves via Steamworks
- [ ] Biweekly update cadence
- [ ] Community Discord
- [ ] Demo build (2-3 hours of content)

### Phase 4: Post-Launch (if revenue justifies)
- [ ] Engine migration evaluation (GameMaker or Godot)
- [ ] Mobile port (iOS / Android)
- [ ] New factions + units
- [ ] Campaign / exploration mode (HoMM overworld)
- [ ] Co-op multiplayer (stretch goal)

### Asset Pipeline (separate project)
- [ ] Standalone macOS sprite generation app
- [ ] Multi-model support (local Stable Diffusion, Pollinations API, etc.)
- [ ] Automated quality checks (dimensions, palette, centering)
- [ ] LLM vision review (compare output to description + reference)
- [ ] Multi-frame sprite sheets (idle, attack, hit, death poses)

---

## Development Notes

- **Versioning:** Every behavior change bumps version +0.01 in `src/main.js` and `README.md`
- **i18n:** Use `t('key')` everywhere, add keys to both `en` and `ru` in `i18n.js`
- **Buff persistence:** Only `statModifiers` survives across battles. Scene values reset in `create()`
- **See `utils/AGENTS.md`** for full operating manual (unit rosters, damage system, footguns)

---

*Steel and Sigils — Tactical combat roguelite*
