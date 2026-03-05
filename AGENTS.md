# Steel and Sigils: Agent Overview

## Project Structure

The project is a web-based tactical combat game built with HTML, CSS, and JavaScript. It uses Phaser for game rendering and Firebase/WebRTC for multiplayer functionality. Understanding the file structure is crucial for effective development and debugging.

*   `index.html`: Main HTML file, defines the structure of the web page, UI elements, and includes links to CSS and JavaScript files.
*   `style.css`: CSS stylesheet, controls the visual appearance of the game and UI.
*   `src/`: Contains the core JavaScript modules.
    *   `src/main.js`: The main entry point for the game. It initializes Phaser and sets up the game configuration.
    *   `src/units.js`: Defines the data structures for different unit types in the game, including their stats and abilities.
    *   `src/SceneManager.js`, `src/EntityManager.js`, `src/UIHandler.js`, `src/InputHandler.js`, etc.: Modular game components handling different aspects of game logic.
    *   `src/network/`: Contains networking adapters (`FirebaseAdapter.js`, `WebRTCAdapter.js`, `NetworkAdapter.js`) for multiplayer functionality.
*   `images/`: Contains image assets used in the game.

## Game Mechanics and Logic

The game revolves around turn-based tactical battles. Key mechanics include:

*   **Game Modes:** Features PVE mode and PVP mode (with a 5-round tournament phase before a final battle).
*   **Unit Management:** Players build armies by selecting units with different stats and abilities, each costing a certain number of points.
*   **Placement Phase:** Before the battle, players strategically place their units on the battlefield.
*   **Turn-Based Combat:** Units take turns based on their initiative, moving and attacking according to their stats and abilities.
*   **Resource Management:** Mana is used to cast spells, which can affect the battlefield or individual units.
*   **Perks and Upgrades:** Post-battle rewards introduce a rarity tier scaling from Common > Epic > Legendary > Mythic. Certain heroes feature uniquely tailored mechanics (like Paladin's Divine Retribution or Sorcerer's Arcane Pierce path logic).
*   **Victory Conditions:** The game ends when one player eliminates all of the opponent's units. In PVP, the first to win 6 rounds (5 PVE + 1 PVP) is victorious.

## Key Architecture and Variables

*   `GAME_VERSION`: Tracks the current version of the game.
*   `UNIT_TYPES`: (in `src/units.js`) An object containing definitions for all unit types, including their stats, abilities, and cost.
*   **Modular Architecture:** The game uses ES6 modules (e.g., `SceneManager`, `EntityManager`, `UIHandler`) instead of global state functions, encapsulating logic into specific domains.
*   **Phaser Scenes:** The game flow is managed through distinct Phaser scenes (e.g., `PreGameScene`, `BattleScene`, `PVPBattleScene`).

## Key UI Elements

*   **Initiative Bar:** Displays the turn order of units in the game.
*   **UI Panel:** Contains controls for ending the turn, opening the spellbook, and displaying mana.
*   **Unit Info Panel:** Shows detailed information about selected units.
*   **Pregame Screen:** Allows players to select their game mode, army, and join/create PVP sessions.
*   **Spellbook Modal:** Displays available spells and their mana costs.

## Multiplayer Considerations (Firebase & WebRTC)

The game uses Firebase and WebRTC for multiplayer functionality:

*   **Session Management:** Firebase is used for signaling and handling the creation/joining of game sessions.
*   **WebRTC P2P:** Real-time gameplay and state synchronization are handled via peer-to-peer WebRTC connections (managed in `src/network/`).
*   **PVP Tournament:** Players fight through 5 PVE rounds simultaneously before facing each other in a final PVP matchup.

## Notes

*   The code uses comments to explain complex logic.
*   The project is structured in a modular way, making it easy to add new features and units.

## Further Improvements

*   Implement a more robust AI for PVE mode.
*   Add more unit types and spells to increase strategic depth.
*   Implement a more sophisticated combat system with more complex unit abilities.
*   Optimize the game loop for better performance, especially in multiplayer mode.
*   Improve the UI/UX based on user feedback.

This overview should serve as a solid foundation for understanding the project and contributing to its development. Remember to consult the code and documentation for more specific information.