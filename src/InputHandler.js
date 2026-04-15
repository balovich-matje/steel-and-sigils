// ============================================
// INPUT HANDLER - Grid System & Input Management
// ============================================

import { CONFIG, SPELLS } from './GameConfig.js';

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
        this.walls = new Set();    // Wall tiles (block LOS + movement)
        this.towers = new Set();   // Tower tiles (ranged units only, double range)
        this.wallImages = []; // Store obstacle image references for cleanup
    }

    create() {
        // Determine tile image key based on stage
        const tileType = this.scene.currentStage?.tileType || 'grass';
        const stageId = this.scene.currentStage?.id;
        const tileSize = this.tileSize;
        
        // Forest map uses random grass tiles for variety
        const grassTileKeys = ['grass1', 'grass2', 'grass3'];
        const isForest = stageId === 'forest';
        
        let tileImageKey;
        if (tileType === 'dirt') {
            tileImageKey = 'dirt_tile';
        } else if (tileType === 'rock') {
            tileImageKey = 'rock_tile';
        } else if (isForest) {
            // Forest uses random grass tiles
            tileImageKey = grassTileKeys; // Array for random selection
        } else {
            tileImageKey = 'dirt_tile'; // fallback
        }
        
        const hasTileImage = isForest 
            ? grassTileKeys.some(key => this.scene.textures.exists(key))
            : this.scene.textures.exists(tileImageKey);

        // Create tile graphics
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                let tile;
                
                if (hasTileImage) {
                    // Use tile image sprite
                    // For forest, randomly pick one of the grass tiles
                    const selectedTileKey = isForest 
                        ? grassTileKeys[Math.floor(Math.random() * grassTileKeys.length)]
                        : tileImageKey;
                    
                    tile = this.scene.add.image(
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2,
                        selectedTileKey
                    );
                    tile.setDisplaySize(tileSize, tileSize);
                } else {
                    // Fallback to colored rectangle
                    const isRuins = this.scene.currentStage && this.scene.currentStage.id === 'ruins';
                    const colorA = isRuins ? CONFIG.COLORS.DIRT : CONFIG.COLORS.GRASS;
                    const colorB = isRuins ? CONFIG.COLORS.DIRT_DARK : CONFIG.COLORS.GRASS_DARK;
                    const color = (x + y) % 2 === 0 ? colorA : colorB;
                    tile = this.scene.add.rectangle(
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2,
                        tileSize - 2,
                        tileSize - 2,
                        color
                    );
                }
                
                tile.setInteractive();
                tile.gridX = x;
                tile.gridY = y;
                this.tiles[y][x] = tile;
            }
        }

        // Border tiles — same texture ring (half-tile wide) around the grid.
        // Camera zoom in centerCameraOnMap() reveals exactly this border area.
        const isRuins = this.scene.currentStage?.id === 'ruins';
        const borderCoords = [];
        for (let x = -1; x <= this.width; x++) {
            borderCoords.push([x, -1]);
            borderCoords.push([x, this.height]);
        }
        for (let y = 0; y < this.height; y++) {
            borderCoords.push([-1, y]);
            borderCoords.push([this.width, y]);
        }
        for (const [bx, by] of borderCoords) {
            const wx = bx * tileSize + tileSize / 2;
            const wy = by * tileSize + tileSize / 2;
            let borderTile;
            if (hasTileImage) {
                const key = isForest
                    ? grassTileKeys[Math.floor(Math.random() * grassTileKeys.length)]
                    : tileImageKey;
                borderTile = this.scene.add.image(wx, wy, key);
                borderTile.setDisplaySize(tileSize, tileSize);
            } else {
                const cA = isRuins ? CONFIG.COLORS.DIRT : CONFIG.COLORS.GRASS;
                const cB = isRuins ? CONFIG.COLORS.DIRT_DARK : CONFIG.COLORS.GRASS_DARK;
                borderTile = this.scene.add.rectangle(wx, wy, tileSize - 2, tileSize - 2,
                    (bx + by) % 2 === 0 ? cA : cB);
            }
            borderTile.setDepth(-1); // behind playfield tiles
        }

        // Grid lines — visible by default, toggled via setGridVisible()
        this.gridGraphics = this.scene.add.graphics();
        this.gridGraphics.setDepth(1);
        this._drawGridLines();

        this.highlightGraphics = this.scene.add.graphics();
        this.aoePreviewGraphics = this.scene.add.graphics();

        this.scene.input.on('gameobjectdown', (pointer, gameObject) => {
            if (this.scene.victoryShown) return;
            this.handleTileClick(gameObject);
        });

        // Use pointer move for hover to catch all positions, including under units
        this.scene.input.on('pointermove', (pointer) => {
            if (this.scene.victoryShown) return;
            
            // Convert screen coordinates to world coordinates (accounts for camera zoom/position)
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            
            // Get tile coordinates from world position
            const tileSize = this.tileSize;
            const gridX = Math.floor(worldPoint.x / tileSize);
            const gridY = Math.floor(worldPoint.y / tileSize);
            
            // Check if within grid bounds
            if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
                const tile = this.tiles[gridY][gridX];
                if (tile) {
                    this.handleTileHover(tile);
                }
            } else {
                this.clearAoePreview();
            }
        });

        this.scene.input.on('gameobjectout', (pointer, gameObject) => {
            // Don't clear on gameobjectout since we use pointermove now
            // this.clearAoePreview();
        });
    }

    handleTileClick(tile) {
        let { gridX, gridY } = tile;

        // If clicked on a unit sprite (not a tile), find the owning unit directly
        if (gridX === undefined || gridY === undefined) {
            const ownerUnit = this.scene.unitManager.units.find(u => u.sprite === tile && !u.isDead);
            if (ownerUnit) {
                gridX = ownerUnit.gridX;
                gridY = ownerUnit.gridY;
            } else {
                return; // Clicked an unknown game object
            }
        }
        const clickedUnit = this.scene.unitManager.getUnitAt(gridX, gridY);

        // If a unit ability is active (like Sorcerer Fireball), execute it
        if (this.scene.activeUnitAbility) {
            this.scene.executeUnitAbilityAt(gridX, gridY);
            return;
        }

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
                const dist = this.getDistanceBetweenUnits(currentUnit, clickedUnit);

                if (dist > 1 && dist <= currentUnit.rangedRange && currentUnit.rangedRange > 0 && this.hasUnitLineOfSight(currentUnit, clickedUnit)) {
                    this.scene.performRangedAttack(currentUnit, clickedUnit);
                    return;
                }
                if (dist === 1 && this.hasUnitLineOfSight(currentUnit, clickedUnit)) {
                    this.scene.performAttack(currentUnit, clickedUnit);
                    return;
                }
                // Debug: attack blocked — distance out of range
                console.warn(`[click] Attack blocked: ${currentUnit.type} at (${currentUnit.gridX},${currentUnit.gridY}) → ${clickedUnit.type} at (${clickedUnit.gridX},${clickedUnit.gridY}), dist=${dist}, range=${currentUnit.rangedRange || 1}`);
            } else if (currentUnit) {
                // Debug: can't attack
                console.warn(`[click] Can't attack: isPlayer=${currentUnit.isPlayer}, canAttack=${currentUnit.canAttack()}, hasMoved=${currentUnit.hasMoved}, hasAttacked=${currentUnit.hasAttacked}`);
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
            // Fireball ability always shows AoE preview (3x3 area)
            this.drawAoePreview(gridX, gridY, 1);
            return;
        }

        if (!activeSpell && !activeAbility) {
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
                if (dist <= attackRange && this.hasUnitLineOfSight(unit, enemy)) {
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
            // Chebyshev distance: diagonals count as 1 (allows diagonal attacks)
            return Math.max(Math.abs(unitB.gridX - unitA.gridX), Math.abs(unitB.gridY - unitA.gridY));
        }

        // For multi-tile units, find minimum Chebyshev distance between any occupied tiles
        let minDist = Infinity;
        for (let dyA = 0; dyA < sizeA; dyA++) {
            for (let dxA = 0; dxA < sizeA; dxA++) {
                for (let dyB = 0; dyB < sizeB; dyB++) {
                    for (let dxB = 0; dxB < sizeB; dxB++) {
                        const dist = Math.max(
                            Math.abs((unitB.gridX + dxB) - (unitA.gridX + dxA)),
                            Math.abs((unitB.gridY + dyB) - (unitA.gridY + dyA))
                        );
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
            const dist = Math.max(Math.abs(enemy.gridX - unit.gridX), Math.abs(enemy.gridY - unit.gridY));
            if (dist > 0 && (dist === 1 || dist <= unit.rangedRange) && this.hasUnitLineOfSight(unit, enemy)) {
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

    isValidMoveAI(x, y, unit = null) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        if (this.scene.unitManager.getUnitAt(x, y)) return false;
        // Tower tiles: only ranged units can enter
        if (this.isTower(x, y)) {
            return unit && unit.rangedRange > 0;
        }
        return !this.isObstacle(x, y);
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

    addObstacle(x, y, type = 'wall') {
        this.obstacles.add(`${x},${y}`);
        if (this.tiles[y] && this.tiles[y][x]) {
            // Hide the tile
            this.tiles[y][x].setVisible(false);
            const tileSize = this.tileSize;
            
            // Determine image key based on obstacle type
            let imageKey;
            const isRock = type.startsWith('rock');
            
            if (isRock) {
                // Map rock types to their image keys
                const rockImageMap = {
                    'rock': 'rock_large_img',
                    'rock_tall': 'rock_tall_img',
                    'rock_wide': 'rock_wide_img',
                    'rock_jagged': 'rock_jagged_img'
                };
                imageKey = rockImageMap[type] || 'rock_large_img';
                // Fallback to standard rock if specific variation not loaded
                if (!this.scene.textures.exists(imageKey)) {
                    imageKey = 'rock_large_img';
                }
            } else {
                imageKey = 'wall_large_img';
            }
            
            const hasImage = this.scene.textures.exists(imageKey);
            const finalImageKey = hasImage ? imageKey : (isRock ? 'rock_img' : 'wall_img');
            // Walls: 140% of tile size, Rocks: 135% of tile size
            const displaySize = isRock ? tileSize * 1.35 : tileSize * 1.40;
            
            const obstacleImage = this.scene.add.image(
                x * tileSize + tileSize / 2,
                y * tileSize + tileSize / 2,
                finalImageKey
            );
            obstacleImage.setDisplaySize(displaySize, displaySize);
            obstacleImage.setDepth(5); // Above tiles (0), below units (10)
            
            // Random horizontal flip for variety (50% chance)
            obstacleImage.setFlipX(Math.random() < 0.5);
            
            if (!this.wallImages) this.wallImages = [];
            this.wallImages.push({ x, y, type: type, image: obstacleImage });
        }
    }

    isObstacle(x, y) {
        return this.obstacles.has(`${x},${y}`);
    }

    addWall(x, y) {
        const key = `${x},${y}`;
        this.obstacles.add(key);
        this.walls.add(key);
        if (this.tiles[y] && this.tiles[y][x]) {
            this.tiles[y][x].setVisible(false);
            const tileSize = this.tileSize;
            const wallSprite = this.scene.add.text(
                x * tileSize + tileSize / 2,
                y * tileSize + tileSize / 2,
                '🧱', { fontSize: `${Math.floor(tileSize * 0.7)}px` }
            ).setOrigin(0.5).setDepth(5);
            if (!this.wallImages) this.wallImages = [];
            this.wallImages.push({ x, y, type: 'castle_wall', image: wallSprite });
        }
    }

    addTower(x, y) {
        const key = `${x},${y}`;
        this.towers.add(key);
        // Towers are NOT added to obstacles — ranged units can enter them
        // But they block melee units (handled in movement validation)
        if (this.tiles[y] && this.tiles[y][x]) {
            this.tiles[y][x].setVisible(false);
            const tileSize = this.tileSize;
            const towerSprite = this.scene.add.text(
                x * tileSize + tileSize / 2,
                y * tileSize + tileSize / 2,
                '🏰', { fontSize: `${Math.floor(tileSize * 0.7)}px` }
            ).setOrigin(0.5).setDepth(5);
            if (!this.wallImages) this.wallImages = [];
            this.wallImages.push({ x, y, type: 'tower', image: towerSprite });
        }
    }

    isWall(x, y) {
        return this.walls.has(`${x},${y}`);
    }

    isTower(x, y) {
        return this.towers.has(`${x},${y}`);
    }

    // Bresenham LOS: returns true if no wall tiles between (x1,y1) and (x2,y2)
    hasLineOfSight(x1, y1, x2, y2) {
        if (this.walls.size === 0) return true; // No walls on this map
        let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
        let sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        let cx = x1, cy = y1;
        while (cx !== x2 || cy !== y2) {
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; cx += sx; }
            if (e2 < dx) { err += dx; cy += sy; }
            if (cx === x2 && cy === y2) break; // Reached target
            if (this.isWall(cx, cy)) return false; // Wall blocks LOS
        }
        return true;
    }

    // LOS check between two units (accounts for multi-tile bosses)
    hasUnitLineOfSight(unitA, unitB) {
        if (this.walls.size === 0) return true;
        // Units on towers have elevated vision — bypass LOS entirely
        if (this.isTower(unitA.gridX, unitA.gridY)) return true;
        if (this.isTower(unitB.gridX, unitB.gridY)) return true;
        const posA = unitA.getOccupiedPositions ? unitA.getOccupiedPositions() : [{ x: unitA.gridX, y: unitA.gridY }];
        const posB = unitB.getOccupiedPositions ? unitB.getOccupiedPositions() : [{ x: unitB.gridX, y: unitB.gridY }];
        // Any tile of A can see any tile of B → LOS exists
        for (const a of posA) {
            for (const b of posB) {
                if (this.hasLineOfSight(a.x, a.y, b.x, b.y)) return true;
            }
        }
        return false;
    }

    _drawGridLines() {
        this.gridGraphics.clear();
        const tileSize = this.tileSize;
        const width = this.width * tileSize;
        const height = this.height * tileSize;
        this.gridGraphics.lineStyle(2, 0x000000, 0.22);
        for (let x = 0; x <= this.width; x++) {
            this.gridGraphics.moveTo(x * tileSize, 0);
            this.gridGraphics.lineTo(x * tileSize, height);
        }
        for (let y = 0; y <= this.height; y++) {
            this.gridGraphics.moveTo(0, y * tileSize);
            this.gridGraphics.lineTo(width, y * tileSize);
        }
        this.gridGraphics.strokePath();
    }

    setGridVisible(visible) {
        if (visible) {
            this._drawGridLines();
        } else {
            this.gridGraphics.clear();
        }
    }
}
