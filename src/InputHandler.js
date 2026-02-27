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
            // Check if spellbook modal is open - if so, don't process game clicks
            const spellbookModal = document.getElementById('spellbook-modal');
            if (spellbookModal && !spellbookModal.classList.contains('hidden')) {
                return;
            }
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

        // If a spell is selected, ONLY allow spell casting - block all other actions
        if (this.scene.spellSystem.activeSpell) {
            const spell = SPELLS[this.scene.spellSystem.activeSpell];
            if (spell) {
                if (spell.targetType === 'tile' || spell.targetType === 'enemy' || spell.targetType === 'ally') {
                    this.scene.spellSystem.executeSpellAt(gridX, gridY);
                } else if (spell.targetType === 'ally_then_tile') {
                    this.scene.spellSystem.executeSpellAt(gridX, gridY);
                }
            }
            return; // Block all other actions while spell is selected
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
        
        const bossSize = unit.bossSize || 1;

        // Highlight selected unit tiles (all tiles for 2x2 units)
        this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_SELECTED, 0.5);
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                this.highlightGraphics.fillRect(
                    (unit.gridX + dx) * CONFIG.TILE_SIZE + 2,
                    (unit.gridY + dy) * CONFIG.TILE_SIZE + 2,
                    CONFIG.TILE_SIZE - 4,
                    CONFIG.TILE_SIZE - 4
                );
            }
        }

        if (!unit.canMove()) return;

        // Calculate valid movement positions (BFS)
        // For 2x2 units, we check if the entire 2x2 area is free
        const queue = [{ x: unit.gridX, y: unit.gridY, dist: 0 }];
        const visited = new Set([`${unit.gridX},${unit.gridY}`]);

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();

            if (dist > 0 && dist <= unit.moveRange) {
                // Check if the entire boss area is free
                if (this.scene.unitManager.isValidPlacement(x, y, bossSize)) {
                    this.validMoves.push({ x, y });
                    // Highlight all tiles of the boss area
                    for (let dy = 0; dy < bossSize; dy++) {
                        for (let dx = 0; dx < bossSize; dx++) {
                            this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_MOVE, 0.4);
                            this.highlightGraphics.fillRect(
                                (x + dx) * CONFIG.TILE_SIZE + 4,
                                (y + dy) * CONFIG.TILE_SIZE + 4,
                                CONFIG.TILE_SIZE - 8,
                                CONFIG.TILE_SIZE - 8
                            );
                        }
                    }
                }
            }

            if (dist < unit.moveRange) {
                const neighbors = [
                    { x: x + 1, y }, { x: x - 1, y },
                    { x, y: y + 1 }, { x, y: y - 1 }
                ];

                for (const n of neighbors) {
                    if (n.x >= 0 && n.x <= CONFIG.GRID_WIDTH - bossSize &&
                        n.y >= 0 && n.y <= CONFIG.GRID_HEIGHT - bossSize &&
                        !visited.has(`${n.x},${n.y}`)) {
                        visited.add(`${n.x},${n.y}`);
                        queue.push({ x: n.x, y: n.y, dist: dist + 1 });
                    }
                }
            }
        }

        // Highlight attackable enemies (check adjacency to any part of enemy)
        const enemies = this.scene.unitManager.getEnemyUnits();
        for (const enemy of enemies) {
            const dist = this.getDistanceBetweenUnits(unit, enemy);
            if (dist === 1) {
                // Highlight all tiles of attackable enemy
                const enemySize = enemy.bossSize || 1;
                for (let dy = 0; dy < enemySize; dy++) {
                    for (let dx = 0; dx < enemySize; dx++) {
                        this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_ATTACK, 0.5);
                        this.highlightGraphics.fillRect(
                            (enemy.gridX + dx) * CONFIG.TILE_SIZE + 4,
                            (enemy.gridY + dy) * CONFIG.TILE_SIZE + 4,
                            CONFIG.TILE_SIZE - 8,
                            CONFIG.TILE_SIZE - 8
                        );
                    }
                }
            }
        }
    }
    
    // Calculate minimum distance between two units (accounting for 2x2)
    getDistanceBetweenUnits(unitA, unitB) {
        const sizeA = unitA.bossSize || 1;
        const sizeB = unitB.bossSize || 1;
        
        if (sizeA === 1 && sizeB === 1) {
            return Math.abs(unitB.gridX - unitA.gridX) + Math.abs(unitB.gridY - unitA.gridY);
        }
        
        // For multi-tile units, find minimum distance between any occupied tiles
        let minDist = Infinity;
        for (let dyA = 0; dyA < sizeA; dyA++) {
            for (let dxA = 0; dxA < sizeA; dxA++) {
                for (let dyB = 0; dyB < sizeB; dyB++) {
                    for (let dxB = 0; dxB < sizeB; dxB++) {
                        const dist = Math.abs((unitB.gridX + dxB) - (unitA.gridX + dxA)) + 
                                     Math.abs((unitB.gridY + dyB) - (unitA.gridY + dyA));
                        minDist = Math.min(minDist, dist);
                    }
                }
            }
        }
        return minDist;
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
    
    // Check if a position is valid for a unit of given size
    isValidPlacement(x, y, bossSize = 1) {
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX < 0 || checkX >= CONFIG.GRID_WIDTH || 
                    checkY < 0 || checkY >= CONFIG.GRID_HEIGHT) {
                    return false;
                }
                if (this.scene.unitManager.getUnitAt(checkX, checkY)) {
                    return false;
                }
            }
        }
        return true;
    }
}
