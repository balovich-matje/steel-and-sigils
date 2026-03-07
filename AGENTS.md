# Steel and Sigils: Agent Overview

## Project Structure

The project is a web-based tactical combat game built with HTML, CSS, and JavaScript. It uses Phaser for game rendering and Firebase/WebRTC for multiplayer functionality. Understanding the file structure is crucial for effective development and debugging.

*   `index.html`: Main HTML file, defines the structure of the web page, UI elements, and includes links to CSS and JavaScript files.
*   `style.css`: CSS stylesheet, controls the visual appearance of the game and UI.
*   `src/`: Contains the core JavaScript modules.
    *   `src/main.js`: The main entry point for the game. It initializes Phaser and sets up the game configuration.
    *   `src/units.js`: Defines the data structures for different unit types in the game, including their stats and abilities.
    *   `src/GameConfig.js`: Configuration constants, including STAGES with map definitions.
    *   `src/SceneManager.js`, `src/EntityManager.js`, `src/UIHandler.js`, `src/InputHandler.js`, etc.: Modular game components handling different aspects of game logic.
*   `images/`: Contains image assets used in the game.
    *   `images/player/`: Player unit sprites
    *   `images/enemy/greenskin/`: Greenskin Horde faction
    *   `images/enemy/dungeon/`: Dungeon Dwellers faction
    *   `images/enemy/cultist/`: Old God Worshippers faction
    *   `images/obstacles/`: Obstacle/wall sprites

## Game Mechanics and Logic

The game revolves around turn-based tactical battles. Key mechanics include:

*   **Game Modes:** Features PVE mode (Player vs AI).
*   **Unit Management:** Players build armies by selecting units with different stats and abilities, each costing a certain number of points.
*   **Placement Phase:** Before the battle, players strategically place their units on the battlefield.
*   **Turn-Based Combat:** Units take turns based on their initiative, moving and attacking according to their stats and abilities.
*   **Resource Management:** Mana is used to cast spells, which can affect the battlefield or individual units.
*   **Perks and Upgrades:** Post-battle rewards introduce a rarity tier scaling from Common > Epic > Legendary > Mythic. Certain heroes feature uniquely tailored mechanics (like Paladin's Divine Retribution or Sorcerer's Arcane Pierce path logic).
*   **Victory Conditions:** The game ends when one player eliminates all of the opponent's units.
*   **Stage Selection:** Players can choose between different maps:
    *   **Whispering Woods** (10×8): 1000 starting points, grass terrain
    *   **Ruins of a Castle** (15×15): 1700 starting points, dirt terrain with obstacles

## Key Architecture and Variables

*   `GAME_VERSION`: Tracks the current version of the game.
*   `UNIT_TYPES`: (in `src/units.js`) An object containing definitions for all unit types, including their stats, abilities, and cost.
*   `STAGES`: (in `src/GameConfig.js`) Map definitions with dimensions, player areas, terrain colors, and starting points.
*   **Modular Architecture:** The game uses ES6 modules (e.g., `SceneManager`, `EntityManager`, `UIHandler`) instead of global state functions, encapsulating logic into specific domains.
*   **Phaser Scenes:** The game flow is managed through distinct Phaser scenes (e.g., `PreGameScene`, `BattleScene`).

## Sprite Generation

### How to Generate Unit Sprites

To generate new unit sprites, use the `generate-sprites.js` script in the `src/` folder:

```bash
cd src
node generate-sprites.js
```

This script will:
1. Read `src/units.js` to find all unit image paths
2. Check which images are missing
3. Generate only missing images using the Pollinations.ai API

### Model Selection

**Recommended Model: `zimage`**
- Best results for pixel art sprites
- Consistent chunky pixel style
- Good prompt adherence

**Models to AVOID:**
- `flux`: Generates images with backgrounds (not transparent)
- `gptimage`: Produces black/blank images when used with `transparent=true` parameter
- `gptimage-large`: Same issues as gptimage
- `klein`: Inconsistent front-facing vs side view

### API Details

- **Base URL:** `https://gen.pollinations.ai`
- **Endpoint:** `GET /image/{prompt}`
- **Key Parameters:** `model`, `width=64`, `height=64`, `seed=42`
- **API Key:** Passed via `?key=` query parameter

### Prompt Format

All prompts should include:
- "pixel art game sprite"
- "chunky large pixels"
- "low resolution pixel art"
- "facing left to right, side view"
- "simple flat colors"
- "grim dark fantasy game asset"
- "64x64"

Example:
```
pixel art game sprite, chunky large pixels, low resolution pixel art, medieval knight in plate armor with sword and shield, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64
```

## Key UI Elements

*   **Initiative Bar:** Displays the turn order of units in the game.
*   **UI Panel:** Contains controls for ending the turn, opening the spellbook, and displaying mana.
*   **Unit Info Panel:** Shows detailed information about selected units.
*   **Pregame Screen:** Allows players to select their army and choose the stage.
*   **Spellbook Modal:** Displays available spells and their mana costs.

## Notes

*   The code uses comments to explain complex logic.
*   The project is structured in a modular way, making it easy to add new features and units.
*   All units face left-to-right in their sprite images. Enemies are flipped programmatically via `sprite.setFlipX()`.
*   The game canvas is fixed at 640×512 pixels. Maps stretch to fill this area (smaller maps = larger tiles).

## Further Improvements

*   Implement a more robust AI for PVE mode.
*   Add more unit types and spells to increase strategic depth.
*   Implement a more sophisticated combat system with more complex unit abilities.
*   Optimize the game loop for better performance, especially in multiplayer mode.
*   Improve the UI/UX based on user feedback.

This overview should serve as a solid foundation for understanding the project and contributing to its development. Remember to consult the code and documentation for more specific information.
