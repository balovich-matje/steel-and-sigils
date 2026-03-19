// ============================================
// DEBUG MODULE - Steel and Sigils
// Only active when URL contains ?debug=1
// Usage: open index.html?debug=1 in browser
// ============================================

export function initDebug(scene) {
    if (!new URLSearchParams(window.location.search).has('debug')) return;

    window.debug = {
        // Print a snapshot of current game state
        state() {
            const s = window.gameScene;
            return {
                battleNumber: s.battleNumber,
                faction: s.currentEnemyFaction,
                lastBoss: s.lastBossSpawned,
                isBossWave: s.battleNumber % 5 === 0,
                nextBossWave: Math.ceil(s.battleNumber / 5) * 5,
                mana: `${s.mana}/${s.maxMana}`,
                units: s.unitManager.units.map(u => ({
                    type: u.type,
                    hp: `${u.health}/${u.maxHealth}`,
                    pos: `(${u.gridX},${u.gridY})`,
                    isPlayer: u.isPlayer
                }))
            };
        },

        // Kill all enemy units instantly (to reach victory screen fast)
        wipeEnemies() {
            const s = window.gameScene;
            const enemies = s.unitManager.units.filter(u => !u.isPlayer);
            enemies.forEach(u => u.takeDamage(999999));
            console.log(`[debug] Wiped ${enemies.length} enemies`);
        },

        // Force-spawn a specific boss in the current battle.
        // Call with no args to let the game pick naturally (respects anti-repeat logic).
        // Example: debug.spawnBoss('SUMMONER_LICH')
        spawnBoss(bossKey) {
            const s = window.gameScene;
            if (!bossKey) {
                s.createBossWave();
                return;
            }
            if (!UNIT_TYPES[bossKey]) {
                console.error(`[debug] Unknown unit key: ${bossKey}`);
                console.log('[debug] Available bosses:', Object.keys(UNIT_TYPES).filter(k => UNIT_TYPES[k].isBoss));
                return;
            }
            const positions = s.getEnemySpawnPositions();
            const size = UNIT_TYPES[bossKey].bossSize || 1;
            const validPos = positions.find(pos =>
                s.unitManager.isValidPlacement(pos.x, pos.y, size) &&
                !Array.from({ length: size }, (_, dy) =>
                    Array.from({ length: size }, (_, dx) => s.gridSystem.isObstacle(pos.x + dx, pos.y + dy))
                ).flat().some(Boolean)
            );
            if (!validPos) {
                console.warn('[debug] No valid position found for', bossKey);
                return;
            }
            const boss = s.unitManager.addUnit(bossKey, validPos.x, validPos.y);
            if (boss) {
                s.lastBossSpawned = bossKey;
                console.log(`[debug] Spawned ${bossKey} at (${validPos.x},${validPos.y})`);
            }
        },

        // Restart the scene at a specific battle number, preserving player army and faction.
        // Example: debug.restartAtRound(5)  → immediately goes to the boss wave
        restartAtRound(n) {
            const s = window.gameScene;
            const playerUnits = s.unitManager.getPlayerUnits().map(u => ({
                type: u.type,
                x: u.gridX,
                y: u.gridY,
                health: u.health
            }));
            s.scene.restart({
                battleNumber: n,
                placedUnits: playerUnits,
                magicBuffs: s.magicBuffs,
                selectedEnemyFaction: s.currentEnemyFaction,
                stageId: s.currentStage.id,
                lastBossSpawned: s.lastBossSpawned
            });
            console.log(`[debug] Restarting at round ${n}`);
        },

        // Skip to the next boss wave (next multiple of 5)
        skipToBossWave() {
            const s = window.gameScene;
            const next = Math.ceil((s.battleNumber + 1) / 5) * 5;
            window.debug.restartAtRound(next);
        },

        // Print available boss keys per faction
        bosses() {
            return {
                GREENSKIN_HORDE: ['OGRE_CHIEFTAIN', 'ORC_SHAMAN_KING', 'LOOT_GOBLIN'],
                DUNGEON_DWELLERS: ['SUMMONER_LICH'],
                OLD_GOD_WORSHIPPERS: ['OCTOTH_HROARATH', 'THE_SILENCE', 'VOID_HERALD']
            };
        }
    };

    console.log(
        '%c[DEBUG MODE ACTIVE]',
        'background:#1a1a2e;color:#FFD700;font-weight:bold;padding:4px 8px;border-radius:4px',
        '\nCommands: debug.state() | debug.wipeEnemies() | debug.spawnBoss(key) | debug.restartAtRound(n) | debug.skipToBossWave() | debug.bosses()'
    );
}
