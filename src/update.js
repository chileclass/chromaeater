import { state, canvas } from './state.js';
import { updateProjectiles } from './projectiles.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';
import { createEnemy } from './enemies.js';
import { update as frogBehavior } from './behaviors/frog.js';
import { getBackgroundColorAt } from './maps.js';

function spawnEnemyNearPlayer(isFrog = false) {
  if (state.totalSpawned >= state.maxEnemies) return;

  const player = state.player;
  const distance = 150 + Math.random() * 100;
  const angle = Math.random() * Math.PI * 2;

  const newEnemy = createEnemy();
  newEnemy.x = player.x + Math.cos(angle) * distance;
  newEnemy.y = player.y + Math.sin(angle) * distance;

  // Clamp within map
  const maxX = state.worldWidth - getEnemyWidth(newEnemy);
  const maxY = state.worldHeight ? state.worldHeight - 50 : 150;
  newEnemy.x = Math.max(0, Math.min(maxX, newEnemy.x));
  newEnemy.y = Math.max(0, Math.min(maxY, newEnemy.y));

  if (isFrog) newEnemy.behavior = frogBehavior;

  state.enemies.push(newEnemy);
  state.totalSpawned++;
}

export function moveEnemies() {
  const dt = 16; // approx frame ms; behavior can ignore
  state.enemies.forEach(enemy => {
    if (!enemy.active) return;
    const behavior = enemy.behavior;
    if (typeof behavior === 'function') {
      behavior(enemy, state, dt);
    }
  });
}

export function update() {
  if (state.gameOver) return;
  if (state.darkenEffect > 0) state.darkenEffect--;

  moveEnemies();

  // Tile consumption system
  const now = performance.now();
  const cfg = state.consumption;

  // Helper: pick best tile near enemy based on type preference
  function pickTileForEnemy(enemy) {
    const centerX = enemy.x + getEnemyWidth(enemy) / 2;
    const centerY = enemy.y + getEnemyHeight(enemy) / 2;
    const info = getBackgroundColorAt(centerX, centerY);
    if (!info || info.gridId === null) return null;
    const baseRow = info.gridRow;
    const baseCol = info.gridCol;
    const candidates = [
      [baseRow, baseCol],
      [baseRow - 1, baseCol],
      [baseRow + 1, baseCol],
      [baseRow, baseCol - 1],
      [baseRow, baseCol + 1]
    ];
    let best = null;
    let bestScore = -Infinity;
    for (const [r, c] of candidates) {
      if (r < 0 || r >= state.gridRows || c < 0 || c >= state.gridCols) continue;
      const cell = state.backgroundGrid[r][c];
      if (!cell) continue;
      const w = cell.whiteOpacity || 0;
      let score = 0;
      if (enemy.type === 'frog') {
        // Scavenger prefers semi-consumed (around 0.5)
        score = 1 - Math.abs(w - 0.5);
      } else {
        // Default avoids white -> higher score for lower w
        score = 1 - w;
      }
      // Slight preference for unclaimed tiles
      if (cell.consumingEnemyId === null || cell.consumingEnemyId === enemy.id) score += 0.05;
      // Allow revisiting fully white only if nothing better; handled naturally by scoring
      if (score > bestScore) {
        bestScore = score;
        best = { row: r, col: c, cell };
      }
    }
    return best;
  }

  // Ensure set storage for enemies and update consumption for selected tiles
  state.enemies.forEach(enemy => {
    if (!enemy.active) return;
    if (!state.enemyTileConsumption[enemy.id]) state.enemyTileConsumption[enemy.id] = new Set();

    // Keep consuming current tile if locked and it exists
    let choice = null;
    if (enemy.consumeLocked && enemy.consumeTarget) {
      const { row, col } = enemy.consumeTarget;
      if (row >= 0 && row < state.gridRows && col >= 0 && col < state.gridCols) {
        choice = { row, col, cell: state.backgroundGrid[row][col] };
      }
    }

    // Otherwise pick a tile to consume
    if (!choice) {
      choice = pickTileForEnemy(enemy);
      if (choice) {
        enemy.consumeTarget = { row: choice.row, col: choice.col };
      }
    }
    if (!choice) return;
    const { row, col, cell } = choice;
    const tileKey = `${row},${col}`;

    // Unassign any previous tiles for this enemy except current
    const assigned = state.enemyTileConsumption[enemy.id];
    assigned.forEach(k => {
      if (k !== tileKey) {
        const [pr, pc] = k.split(',').map(Number);
        const prev = state.backgroundGrid[pr]?.[pc];
        if (prev && prev.consumingEnemyId === enemy.id) prev.consumingEnemyId = null;
        assigned.delete(k);
      }
    });

    // Skip if already fully white for consumption progression
    if (cell.whiteOpacity >= 1) {
      cell.whiteFull = true;
      return;
    }

    // Claim if available or already ours
    if (cell.consumingEnemyId === null || cell.consumingEnemyId === enemy.id) {
      if (cell.consumingEnemyId === null) {
        cell.consumingEnemyId = enemy.id;
        cell.consumeStartTime = now;
        cell.initialBoostApplied = false;
        cell.lastConsumeUpdateTime = now;
      }
      assigned.add(tileKey);

      // Lock enemy movement while this tile is not full
      enemy.consumeLocked = true;
      enemy.consumeTarget = { row, col };

      // Initial delay then boost
      if (!cell.initialBoostApplied) {
        if (now - cell.consumeStartTime >= cfg.initialDelayMs) {
          cell.whiteOpacity = Math.min(1, (cell.whiteOpacity || 0) + cfg.initialBoost);
          cell.whiteTouched = true;
          if (cell.whiteOpacity < cfg.minTouchedOpacity) cell.whiteOpacity = cfg.minTouchedOpacity;
          cell.initialBoostApplied = true;
          cell.lastConsumeUpdateTime = now;
          if (cell.whiteOpacity >= 1 && !cell.whiteFull) {
            cell.whiteFull = true;
            state.whiteFullCount++;
          }
        }
      } else {
        const dtSec = Math.max(0, (now - (cell.lastConsumeUpdateTime || now)) / 1000);
        const rate = state.consumption.ratesByType[enemy.type] ?? state.consumption.ratesByType.default;
        if (dtSec > 0 && rate > 0) {
          cell.whiteOpacity = Math.min(1, (cell.whiteOpacity || 0) + rate * dtSec);
          cell.whiteTouched = true;
          if (cell.whiteOpacity < cfg.minTouchedOpacity) cell.whiteOpacity = cfg.minTouchedOpacity;
          cell.lastConsumeUpdateTime = now;
          if (cell.whiteOpacity >= 1 && !cell.whiteFull) {
            cell.whiteFull = true;
            state.whiteFullCount++;
          }
        }
      }

      // If tile is fully consumed, unlock and release claim
      if (cell.whiteOpacity >= 1) {
        enemy.consumeLocked = false;
        if (cell.consumingEnemyId === enemy.id) cell.consumingEnemyId = null;
        assigned.delete(tileKey);
        enemy.consumeTarget = null;
      }
    }
  });

  // Process enemies that died this frame and start decay on their tiles
  if (state.deadEnemiesQueue && state.deadEnemiesQueue.length > 0) {
    const queue = state.deadEnemiesQueue.splice(0, state.deadEnemiesQueue.length);
    queue.forEach(deadId => {
      const setForEnemy = state.enemyTileConsumption[deadId];
      if (!setForEnemy) return;
      setForEnemy.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const cell = state.backgroundGrid[r]?.[c];
        if (!cell) return;
        // Start decay to minimum regardless of current opacity
        cell.decayStartTime = now;
        cell.decayStartOpacity = cell.whiteOpacity || 0;
        state.decayingTiles.add(key);
        if (cell.consumingEnemyId === deadId) cell.consumingEnemyId = null;
      });
      delete state.enemyTileConsumption[deadId];
    });
  }

  // Update decays
  if (state.decayingTiles && state.decayingTiles.size > 0) {
    const removeKeys = [];
    state.decayingTiles.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const cell = state.backgroundGrid[r]?.[c];
      if (!cell) {
        removeKeys.push(key);
        return;
      }
      // Stop decaying if being consumed again
      if (cell.consumingEnemyId !== null) {
        removeKeys.push(key);
        return;
      }
      const t = Math.max(0, Math.min(1, (now - cell.decayStartTime) / cfg.decayDurationMs));
      const start = cell.decayStartOpacity;
      const target = cfg.minTouchedOpacity;
      const newOpacity = Math.max(target, start + (target - start) * t);
      // If tile was previously full white and now dropped below 1, update counters
      if (cell.whiteFull && newOpacity < 1) {
        cell.whiteFull = false;
        if (state.whiteFullCount > 0) state.whiteFullCount--;
      }
      cell.whiteOpacity = newOpacity;
      if (t >= 1) removeKeys.push(key);
    });
    removeKeys.forEach(k => state.decayingTiles.delete(k));
  }

  updateProjectiles();

  // Maintain at least 8 active enemies
  const aliveEnemies = state.enemies.filter(e => e.active);
  if (aliveEnemies.length < state.maxActive && state.totalSpawned < state.maxEnemies) {
    if (!state.spawnCooldown || performance.now() > state.spawnCooldown) {
      spawnEnemyNearPlayer();
      state.spawnCooldown = performance.now() + 2000; // 2s delay between spawns
    }
  }

  // Delayed, periodic loss check: skip first 45s, then once per 60s
  if (!state.nextLossCheckTime) {
    state.gameStartTime = state.gameStartTime || now;
    state.nextLossCheckTime = state.gameStartTime + 45000;
  }
  if (now >= state.nextLossCheckTime) {
    const ratio = state.totalTiles > 0 ? (state.whiteFullCount / state.totalTiles) : 0;
    if (ratio >= state.whiteLossThreshold) {
      state.gameOver = true;
      const mapInfo = document.getElementById('mapInfo');
      if (mapInfo) mapInfo.textContent = 'Derrota: ≥80% del mapa en blanco';
    } else {
      state.nextLossCheckTime = now + 60000; // next check in 60s
    }
  }
}
