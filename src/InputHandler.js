// ============================================
// INPUT HANDLER - Grid System & Input Management
// ============================================

import { CONFIG } from './GameConfig.js';
import { SPELLS } from './GameConfig.js';

// ============================================
// GRID SYSTEM
// ============================================
export class GridSystem {
    constructor(scene) {
        this.scene = scene;
        this.tiles = [];
        this.highlightGraphics = null;
        this.aoePreviewGraphics = null;
        this.selectedUnit = null;
        this.validMoves = [];
    }

    create() {
        // Create tile graphics
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                const color = (x + y) % 2 === 0 ? CONFIG.COLORS.GRASS : CONFIG.COLORS.GRASS_DARK;
                const tile = this.scene.add.rectangle(
                    x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    CONFIG.TILE_SIZE - 2,
                    CONFIG.TILE_SIZE - 2,
                    color
                );
                tile.setInteractive();
                tile.gridX = x;
                tile.gridY = y;
                this.tiles[y][x] = tile;
            }
        }

        this.highlightGraphics = this.scene.add.graphics();
        this.aoePreviewGraphics = this.scene.add.graphics();

        this.scene.input.on('gameobjectdown', (pointer, gameObject) => {
            this.handleTileClick(gameObject);
        });
        
        this.scene.input.on('gameobjectover', (pointer, gameObject) => {
            this.handleTileHover(gameObject);
        });
        
        this.scene.input.on('gameobjectout', (pointer, gameObject) => {
            this.clearAoePreview();
        });
    }

    handleTileClick(tile) {
        const { gridX, gridY } = tile;
        const clickedUnit = this.scene.unitManager.getUnitAt(gridX, gridY);

        // Handle spell targeting
        if (this.scene.spellSystem.activeSpell) {
            const spell = SPELLS[this.scene.spellSystem.activeSpell];
            if (spell) {
                if (spell.targetType === 'tile' || spell.targetType === 'enemy' || spell.targetType === 'ally') {
                    this.scene.spellSystem.executeSpellAt(gridX, gridY);
                    return;
                } else if (spell.targetType === 'ally_then_tile' && this.scene.spellSystem.teleportUnit && !clickedUnit) {
                    this.scene.spellSystem.executeSpellAt(gridX, gridY);
                    return;
                }
            }
        }

        // If clicking on an enemy unit - check for ranged attack first, then melee
        if (clickedUnit && !clickedUnit.isDead && !clickedUnit.isPlayer) {
            const currentUnit = this.scene.turnSystem.currentUnit;
            if (currentUnit && currentUnit.isPlayer && currentUnit.canAttack()) {
                const dist = Math.abs(clickedUnit.gridX - currentUnit.gridX) + 
                             Math.abs(clickedUnit.gridY - currentUnit.gridY);
                
                if (dist > 1 && dist <= currentUnit.rangedRange && currentUnit.rangedRange > 0) {
                    this.scene.performRangedAttack(currentUnit, clickedUnit);
                    return;
                }
                if (dist === 1) {
                    this.scene.performAttack(currentUnit, clickedUnit);
                    return;
                }
            }
            this.scene.selectUnit(clickedUnit);
            return;
        }

        // If clicking on a friendly unit
        if (clickedUnit && !clickedUnit.isDead && clickedUnit.isPlayer) {
            this.scene.selectUnit(clickedUnit);
            return;
        }

        // If we have a selected unit and clicked an empty tile
        if (this.selectedUnit && this.selectedUnit.canMove()) {
            if (this.isValidMove(gridX, gridY)) {
                this.scene.moveUnit(this.selectedUnit, gridX, gridY);
            }
        }
    }

    handleTileHover(tile) {
        const activeSpell = this.scene.spellSystem.activeSpell;
        if (!activeSpell) return;
        
        const spell = SPELLS[activeSpell];
        if (!spell) return;
        
        if (spell.effect !== 'aoeDamage' && spell.effect !== 'iceStorm' && spell.effect !== 'meteor') return;
        
        const { gridX, gridY } = tile;
        const radius = spell.effect === 'meteor' ? 2 : 1;
        
        this.drawAoePreview(gridX, gridY, radius);
    }

    drawAoePreview(centerX, centerY, radius) {
        this.clearAoePreview();
        
        this.aoePreviewGraphics.fillStyle(0xff6600, 0.3);
        this.aoePreviewGraphics.lineStyle(2, 0xff6600, 0.6);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < CONFIG.GRID_WIDTH && y >= 0 && y < CONFIG.GRID_HEIGHT) {
                    const px = x * CONFIG.TILE_SIZE + 1;
                    const py = y * CONFIG.TILE_SIZE + 1;
                    this.aoePreviewGraphics.fillRect(px, py, CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE - 2);
                    this.aoePreviewGraphics.strokeRect(px, py, CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE - 2);
                }
            }
        }
    }

    clearAoePreview() {
        if (this.aoePreviewGraphics) {
            this.aoePreviewGraphics.clear();
        }
    }

    highlightValidMoves(unit) {
        this.highlightGraphics.clear();
        this.validMoves = [];
        this.selectedUnit = unit;

        // Highlight selected unit tile
        this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_SELECTED, 0.5);
        this.highlightGraphics.fillRect(
            unit.gridX * CONFIG.TILE_SIZE + 2,
            unit.gridY * CONFIG.TILE_SIZE + 2,
            CONFIG.TILE_SIZE - 4,
            CONFIG.TILE_SIZE - 4
        );

        if (!unit.canMove()) return;

        // Calculate valid movement positions (BFS)
        const queue = [{ x: unit.gridX, y: unit.gridY, dist: 0 }];
        const visited = new Set([`${unit.gridX},${unit.gridY}`]);

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();

            if (dist > 0 && dist <= unit.moveRange) {
                const targetUnit = this.scene.unitManager.getUnitAt(x, y);
                if (!targetUnit) {
                    this.validMoves.push({ x, y });
                    this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_MOVE, 0.4);
                    this.highlightGraphics.fillRect(
                        x * CONFIG.TILE_SIZE + 4,
                        y * CONFIG.TILE_SIZE + 4,
                        CONFIG.TILE_SIZE - 8,
                        CONFIG.TILE_SIZE - 8
                    );
                }
            }

            if (dist < unit.moveRange) {
                const neighbors = [
                    { x: x + 1, y }, { x: x - 1, y },
                    { x, y: y + 1 }, { x, y: y - 1 }
                ];

                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < CONFIG.GRID_WIDTH &&
                        n.y >= 0 && n.y < CONFIG.GRID_HEIGHT &&
                        !visited.has(`${n.x},${n.y}`)) {
                        visited.add(`${n.x},${n.y}`);
                        queue.push({ x: n.x, y: n.y, dist: dist + 1 });
                    }
                }
            }
        }

        // Highlight attackable enemies
        const enemies = this.scene.unitManager.getEnemyUnits();
        for (const enemy of enemies) {
            const dist = Math.abs(enemy.gridX - unit.gridX) + Math.abs(enemy.gridY - unit.gridY);
            if (dist === 1) {
                this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_ATTACK, 0.5);
                this.highlightGraphics.fillRect(
                    enemy.gridX * CONFIG.TILE_SIZE + 4,
                    enemy.gridY * CONFIG.TILE_SIZE + 4,
                    CONFIG.TILE_SIZE - 8,
                    CONFIG.TILE_SIZE - 8
                );
            }
        }
    }

    highlightRangedAttackRange(unit) {
        // Highlight all enemies within attack range (including adjacent for melee)
        const enemies = this.scene.unitManager.getEnemyUnits();
        for (const enemy of enemies) {
            const dist = Math.abs(enemy.gridX - unit.gridX) + Math.abs(enemy.gridY - unit.gridY);
            if (dist > 0 && (dist === 1 || dist <= unit.rangedRange)) {
                this.highlightGraphics.lineStyle(3, 0xff6600, 1);
                this.highlightGraphics.strokeRect(
                    enemy.gridX * CONFIG.TILE_SIZE + 4,
                    enemy.gridY * CONFIG.TILE_SIZE + 4,
                    CONFIG.TILE_SIZE - 8,
                    CONFIG.TILE_SIZE - 8
                );
                this.highlightGraphics.fillStyle(0xff6600, 0.3);
                this.highlightGraphics.fillRect(
                    enemy.gridX * CONFIG.TILE_SIZE + 4,
                    enemy.gridY * CONFIG.TILE_SIZE + 4,
                    CONFIG.TILE_SIZE - 8,
                    CONFIG.TILE_SIZE - 8
                );
            }
        }
    }

    clearHighlights() {
        this.highlightGraphics.clear();
        this.validMoves = [];
        this.selectedUnit = null;
        this.clearAoePreview();
    }

    isValidMove(x, y) {
        return this.validMoves.some(m => m.x === x && m.y === y);
    }

    isValidMoveAI(x, y) {
        if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) {
            return false;
        }
        return !this.scene.unitManager.getUnitAt(x, y);
    }
}
