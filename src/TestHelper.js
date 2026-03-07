/**
 * TestHelper.js - Console commands for automated testing
 * 
 * Usage: Open browser console and use test.<command>()
 * Or via browser automation: evaluate("test.castSpell('Lightning Bolt', 5, 3)")
 */

class TestHelper {
    constructor() {
        this.game = null;
        this.scene = null;
    }

    /**
     * Initialize the test helper with game reference
     * Call this when game is loaded
     */
    init(game, scene) {
        this.game = game;
        this.scene = scene;
        console.log('🎮 TestHelper initialized. Available commands:');
        console.log('  test.getState()          - Get current game state');
        console.log('  test.listEnemies()       - List all enemies with positions');
        console.log('  test.listAllies()        - List all allies with positions');
        console.log('  test.selectSpell(name)   - Select spell (use spell ID like "lightning_bolt")');
        console.log('  test.castAt(x, y)        - Cast selected spell at position');
        console.log('  test.quickCast(name)     - Cast spell on nearest enemy');
        console.log('  test.attack(x, y)        - Attack enemy at position');
        console.log('  test.move(x, y)          - Move current unit to position');
        console.log('  test.endTurn()           - End current turn');
        console.log('  test.openSpellBook()     - Open spell book UI');
        console.log('  test.closeSpellBook()    - Close spell book UI');
        return 'TestHelper ready!';
    }

    /**
     * Get the current battle scene
     */
    getScene() {
        if (this.scene && this.scene.sys && this.scene.sys.active) {
            return this.scene;
        }
        
        if (window.game && window.game.scene) {
            // Try to find any active battle scene
            const scenes = window.game.scene.getScenes(true);
            const battleScene = scenes.find(s => 
                s && s.entityManager && s.initiativeSystem
            );
            if (battleScene) {
                this.scene = battleScene;
                return battleScene;
            }
        }
        
        // Fallback to window.gameScene if set
        if (window.gameScene && window.gameScene.entityManager) {
            this.scene = window.gameScene;
            return window.gameScene;
        }
        
        return null;
    }

    /**
     * Get current game state summary
     */
    getState() {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        const currentUnit = scene.unitManager?.currentUnit;
        const turnOrder = scene.initiativeSystem?.getOrder?.() || 
                         scene.initiativeSystem?.turnOrder || [];
        
        return {
            round: scene.round || 1,
            mana: scene.mana || 0,
            spellsCastThisRound: scene.spellsCastThisRound || 0,
            currentUnit: currentUnit ? {
                type: currentUnit.type,
                name: currentUnit.name,
                hp: currentUnit.hp,
                maxHp: currentUnit.maxHp,
                position: { x: currentUnit.gridX, y: currentUnit.gridY },
                isPlayer: currentUnit.isPlayer
            } : null,
            turnOrder: turnOrder.map(u => ({
                name: u.name,
                faction: u.isPlayer ? 'player' : 'enemy',
                init: u.initiative || u.stats?.initiative
            })) || []
        };
    }

    /**
     * List all enemy units with positions
     */
    listEnemies() {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        const enemies = scene.unitManager?.getAllUnits()
            ?.filter(u => !u.isPlayer)
            ?.map(u => ({
                id: u.id,
                name: u.name,
                hp: `${u.hp}/${u.maxHp}`,
                position: { x: u.gridX, y: u.gridY },
                passives: u.passives || []
            })) || [];

        console.table(enemies);
        return enemies;
    }

    /**
     * List all allied units with positions
     */
    listAllies() {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        const allies = scene.unitManager?.getAllUnits()
            ?.filter(u => u.isPlayer)
            ?.map(u => ({
                id: u.id,
                name: u.name,
                hp: `${u.hp}/${u.maxHp}`,
                position: { x: u.gridX, y: u.gridY }
            })) || [];

        console.table(allies);
        return allies;
    }

    /**
     * Open the spell book UI
     */
    openSpellBook() {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };
        
        if (scene.uiHandler) {
            scene.uiHandler.openSpellBook();
            return 'Spell book opened';
        }
        return { error: 'UI handler not found' };
    }

    /**
     * Close the spell book UI
     */
    closeSpellBook() {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };
        
        if (scene.uiHandler) {
            scene.uiHandler.closeSpellBook();
            return 'Spell book closed';
        }
        return { error: 'UI handler not found' };
    }

    /**
     * Select a spell from the spell book by name or ID
     */
    selectSpell(spellName) {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };
        
        const currentUnit = scene.unitManager?.currentUnit;
        if (!currentUnit) return { error: 'No unit selected' };
        if (!currentUnit.isPlayer) return { error: 'Enemy unit turn' };

        // Try to find spell by name in CONFIG.SPELLS
        let spellId = null;
        
        // Access SPELLS from GameConfig via the scene or window
        const spells = scene.game?.registry?.get('SPELLS') || 
                      (typeof SPELLS !== 'undefined' ? SPELLS : null);
        
        if (spells) {
            for (const [id, spell] of Object.entries(spells)) {
                if (spell.name === spellName || id === spellName) {
                    spellId = id;
                    break;
                }
            }
        }
        
        // Fallback: try direct ID
        if (!spellId && scene.spellSystem) {
            // Try casting directly - spellSystem will validate
            spellId = spellName.toLowerCase().replace(/\s+/g, '_');
        }
        
        if (!spellId) return { error: `Spell "${spellName}" not found` };

        // Cast the spell (this sets it as active and waits for target)
        scene.spellSystem?.castSpell(spellId);
        
        const activeSpell = scene.spellSystem?.activeSpell;
        if (activeSpell) {
            return { success: `Selected "${spellName}" (${activeSpell}). Now use test.castAt(x, y) to target.` };
        }
        return { error: 'Failed to select spell. Check mana or spell limit.' };
    }

    /**
     * Cast the selected spell at target position
     */
    castAt(x, y) {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };
        
        if (!scene.spellSystem?.activeSpell) {
            return { error: 'No spell selected. Use test.selectSpell(name) first.' };
        }

        try {
            scene.spellSystem.executeSpellAt(x, y);
            const spellName = scene.spellSystem.activeSpell;
            scene.spellSystem.activeSpell = null;
            document.body.style.cursor = 'default';
            return { success: true, message: `Cast ${spellName} at (${x}, ${y})` };
        } catch (e) {
            return { error: e.message };
        }
    }

    /**
     * Cast spell by name directly at target (convenience method)
     */
    async castSpell(spellName, x, y) {
        const selectResult = await this.selectSpell(spellName);
        if (selectResult.error) return selectResult;
        
        // Small delay to let spell system initialize
        await new Promise(r => setTimeout(r, 100));
        
        return this.castAt(x, y);
    }

    /**
     * Attack enemy at position with current unit
     */
    attack(x, y) {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        const currentUnit = scene.unitManager?.currentUnit;
        if (!currentUnit) return { error: 'No unit selected' };
        if (!currentUnit.isPlayer) return { error: 'Enemy unit turn' };

        // Find target at position
        const target = scene.unitManager?.getUnitAt(x, y);
        if (!target) return { error: `No unit at position (${x}, ${y})` };
        if (target.isPlayer) return { error: 'Cannot attack ally' };

        // Check range
        const dx = Math.abs(currentUnit.gridX - x);
        const dy = Math.abs(currentUnit.gridY - y);
        const distance = Math.max(dx, dy); // Chebyshev distance for diagonal attacks
        const attackRange = currentUnit.attackRange || 1;
        
        if (distance > attackRange) {
            return { error: `Target out of range. Distance: ${distance}, Range: ${attackRange}` };
        }

        // Execute attack
        try {
            const result = scene.combatManager?.performAttack(currentUnit, target);
            return { success: true, damage: result?.damage, message: `Attacked ${target.name} for ${result?.damage || 0} damage` };
        } catch (e) {
            return { error: e.message };
        }
    }

    /**
     * Move current unit to position
     */
    move(x, y) {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        const currentUnit = scene.unitManager?.currentUnit;
        if (!currentUnit) return { error: 'No unit selected' };
        if (!currentUnit.isPlayer) return { error: 'Enemy unit turn' };

        // Check if position is valid
        if (!scene.grid?.isValid?.(x, y)) {
            return { error: `Invalid position (${x}, ${y})` };
        }

        // Check if position is occupied
        if (scene.unitManager?.getUnitAt(x, y)) {
            return { error: `Position (${x}, ${y}) is occupied` };
        }

        // Check movement range
        const distance = Math.abs(currentUnit.gridX - x) + Math.abs(currentUnit.gridY - y);
        const movement = currentUnit.movement || currentUnit.stats?.movement || 2;
        if (distance > movement) {
            return { error: `Position out of range. Distance: ${distance}, Movement: ${movement}` };
        }

        // Move unit
        try {
            scene.unitManager?.moveUnit(currentUnit, x, y);
            return { success: true, message: `Moved to (${x}, ${y})` };
        } catch (e) {
            return { error: e.message };
        }
    }

    /**
     * End current turn
     */
    endTurn() {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        try {
            scene.endTurn();
            return { success: true, message: 'Turn ended' };
        } catch (e) {
            return { error: e.message };
        }
    }

    /**
     * Quick test: Cast spell on nearest enemy
     */
    quickCast(spellName = 'lightning_bolt') {
        const scene = this.getScene();
        if (!scene) return { error: 'No battle scene active' };

        const currentUnit = scene.unitManager?.currentUnit;
        if (!currentUnit) return { error: 'No unit selected' };
        if (!currentUnit.isPlayer) return { error: 'Enemy unit turn' };

        // Find nearest enemy
        const enemies = scene.unitManager?.getAllUnits()?.filter(u => !u.isPlayer);
        if (!enemies || enemies.length === 0) return { error: 'No enemies found' };

        let nearest = enemies[0];
        let minDist = Math.abs(currentUnit.gridX - nearest.gridX) + Math.abs(currentUnit.gridY - nearest.gridY);

        for (const enemy of enemies) {
            const dist = Math.abs(currentUnit.gridX - enemy.gridX) + Math.abs(currentUnit.gridY - enemy.gridY);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        // Select and cast in one go
        const selectResult = this.selectSpell(spellName);
        if (selectResult.error) return selectResult;
        
        return this.castAt(nearest.gridX, nearest.gridY);
    }
}

// Create global instance
window.test = new TestHelper();

// Auto-initialize if game is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.game) {
            window.test.init(window.game);
        }
    }, 1000);
});

console.log('🧪 TestHelper loaded. Use test.init(game, scene) to connect to game.');
