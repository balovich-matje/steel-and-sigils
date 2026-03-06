// ============================================
// INPUT HANDLER - Grid System & Input Management
// ============================================

import { CONFIG } from './GameConfig.js';
import { SPELLS } from './GameConfig.js';

// ============================================
// GRID SYSTEM
// ============================================
export class GridSystem {
    constructor(scene, width, height, tileSize) {
        this.scene = scene;
        this.width = width || CONFIG.GRID_WIDTH;
        this.height = height || CONFIG.GRID_HEIGHT;
        this.tileSize = tileSize || this.tileSize;
        this.tiles = [];
        this.highlightGraphics = null;
        this.aoePreviewGraphics = null;
        this.selectedUnit = null;
        this.validMoves = [];
        this.obstacles = new Set(); // Store as "x,y" strings
    }

    create() {
        // Determine colors based on stage
        const isRuins = this.scene.currentStage && this.scene.currentStage.id === 'ruins';
        const colorA = isRuins ? CONFIG.COLORS.DIRT : CONFIG.COLORS.GRASS;
        const colorB = isRuins ? CONFIG.COLORS.DIRT_DARK : CONFIG.COLORS.GRASS_DARK;
        const tileSize = this.tileSize;

        // Create tile graphics
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                const color = (x + y) % 2 === 0 ? colorA : colorB;
                const tile = this.scene.add.rectangle(
                    x * tileSize + tileSize / 2,
                    y * tileSize + tileSize / 2,
                    tileSize - 2,
                    tileSize - 2,
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
            if (this.scene.victoryShown) return;
            this.handleTileClick(gameObject);
        });

        this.scene.input.on('gameobjectover', (pointer, gameObject) => {
            if (this.scene.victoryShown) return;
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
        const activeAbility = this.scene.activeUnitAbility;
        const { gridX, gridY } = tile;

        if (activeAbility === 'SORCERER_FIREBALL') {
            this.drawAoePreview(gridX, gridY, 1);
            return;
        }

        if (!activeSpell && !activeAbility) {
            const currentUnit = this.scene.turnSystem.currentUnit;
            // Check piercing hover if no spell is active
            if (currentUnit && currentUnit.isPlayer && currentUnit.hasPiercing && currentUnit.canAttack()) {
                // Determine if hovering over enemy or empty cell
                const hoveredUnit = this.scene.unitManager.getUnitAt(gridX, gridY);
                if (!hoveredUnit || !hoveredUnit.isPlayer) {
                    this.drawPiercingPreview(currentUnit, gridX, gridY);
                    return;
                }
            }
            this.clearAoePreview();
            return;
        }

        const spell = SPELLS[activeSpell];
        if (!spell) return;

        if (spell.effect !== 'aoeDamage' && spell.effect !== 'iceStorm' && spell.effect !== 'meteor') {
            this.clearAoePreview();
            return;
        }

        const radius = spell.effect === 'meteor' ? 2 : 1;
        this.drawAoePreview(gridX, gridY, radius);
    }

    drawPiercingPreview(unit, targetX, targetY) {
        this.clearAoePreview();

        const dx = targetX - unit.gridX;
        const dy = targetY - unit.gridY;
        if (dx === 0 && dy === 0) return;

        const length = Math.max(Math.abs(dx), Math.abs(dy));
        const stepX = dx / length;
        const stepY = dy / length;

        this.aoePreviewGraphics.fillStyle(0x9B6BAB, 0.4); // Subtle purple

        let currX = unit.gridX + stepX;
        let currY = unit.gridY + stepY;

        const path = [];
        while (currX >= -0.5 && currX < this.width + 0.5 && currY >= -0.5 && currY < this.height + 0.5) {
            const gx = Math.round(currX);
            const gy = Math.round(currY);

            if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
                if (path.length === 0 || path[path.length - 1].x !== gx || path[path.length - 1].y !== gy) {
                    path.push({ x: gx, y: gy });
                }
            }

            currX += stepX;
            currY += stepY;
        }

        for (const p of path) {
            const px = p.x * this.tileSize + 2;
            const py = p.y * this.tileSize + 2;
            this.aoePreviewGraphics.fillRect(px, py, this.tileSize - 4, this.tileSize - 4);
        }
    }

    drawAoePreview(centerX, centerY, radius) {
        this.clearAoePreview();

        this.aoePreviewGraphics.fillStyle(0xff6600, 0.3);
        this.aoePreviewGraphics.lineStyle(2, 0xff6600, 0.6);

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;

                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const px = x * this.tileSize + 1;
                    const py = y * this.tileSize + 1;
                    this.aoePreviewGraphics.fillRect(px, py, this.tileSize - 2, this.tileSize - 2);
                    this.aoePreviewGraphics.strokeRect(px, py, this.tileSize - 2, this.tileSize - 2);
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
                    (unit.gridX + dx) * this.tileSize + 2,
                    (unit.gridY + dy) * this.tileSize + 2,
                    this.tileSize - 4,
                    this.tileSize - 4
                );
            }
        }

        if (unit.canMove()) {
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
                                    (x + dx) * this.tileSize + 4,
                                    (y + dy) * this.tileSize + 4,
                                    this.tileSize - 8,
                                    this.tileSize - 8
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
                        if (n.x >= 0 && n.x <= this.width - bossSize &&
                            n.y >= 0 && n.y <= this.height - bossSize &&
                            !visited.has(`${n.x},${n.y}`) &&
                            !this.isObstacle(n.x, n.y)) {
                            visited.add(`${n.x},${n.y}`);
                            queue.push({ x: n.x, y: n.y, dist: dist + 1 });
                        }
                    }
                }
            }
        }

        // Highlight attackable enemies (melee and ranged) if unit can still attack
        if (unit.canAttack()) {
            const enemies = this.scene.unitManager.getEnemyUnits();
            const attackRange = unit.rangedRange || 1;
            for (const enemy of enemies) {
                const dist = this.getDistanceBetweenUnits(unit, enemy);
                if (dist <= attackRange) {
                    // Highlight all tiles of attackable enemy
                    const enemySize = enemy.bossSize || 1;
                    for (let dy = 0; dy < enemySize; dy++) {
                        for (let dx = 0; dx < enemySize; dx++) {
                            this.highlightGraphics.fillStyle(CONFIG.COLORS.HIGHLIGHT_ATTACK, 0.5);
                            this.highlightGraphics.fillRect(
                                (enemy.gridX + dx) * this.tileSize + 4,
                                (enemy.gridY + dy) * this.tileSize + 4,
                                this.tileSize - 8,
                                this.tileSize - 8
                            );
                        }
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
                    enemy.gridX * this.tileSize + 4,
                    enemy.gridY * this.tileSize + 4,
                    this.tileSize - 8,
                    this.tileSize - 8
                );
                this.highlightGraphics.fillStyle(0xff6600, 0.3);
                this.highlightGraphics.fillRect(
                    enemy.gridX * this.tileSize + 4,
                    enemy.gridY * this.tileSize + 4,
                    this.tileSize - 8,
                    this.tileSize - 8
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
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return !this.scene.unitManager.getUnitAt(x, y) && !this.isObstacle(x, y);
    }

    // Check if a position is valid for a unit of given size
    isValidPlacement(x, y, bossSize = 1) {
        for (let dy = 0; dy < bossSize; dy++) {
            for (let dx = 0; dx < bossSize; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX < 0 || checkX >= this.width ||
                    checkY < 0 || checkY >= this.height) {
                    return false;
                }
                if (this.isObstacle(checkX, checkY)) {
                    return false;
                }
                if (this.scene.unitManager.getUnitAt(checkX, checkY)) {
                    return false;
                }
            }
        }
        return true;
    }

    addObstacle(x, y) {
        this.obstacles.add(`${x},${y}`);
        if (this.tiles[y] && this.tiles[y][x]) {
            // Hide the tile and add a wall image instead
            this.tiles[y][x].setVisible(false);
            const tileSize = this.tileSize;
            const wallImage = this.scene.add.image(
                x * tileSize + tileSize / 2,
                y * tileSize + tileSize / 2,
                'wall_img'
            );
            wallImage.setDisplaySize(tileSize - 4, tileSize - 4);
            wallImage.setDepth(1); // Ensure wall is visible above grid
            if (!this.wallImages) this.wallImages = [];
            this.wallImages.push({ x, y, image: wallImage });
        } else {
        }
    }

    isObstacle(x, y) {
        return this.obstacles.has(`${x},${y}`);
    }
}
