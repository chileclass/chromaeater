import { state } from './state.js';
import { debug, isColorSimilar } from './utils.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';
import { getBackgroundColorAt } from './maps.js';

export function isEnemyNearPlayer(enemy, maxDistance = 400) {
  const enemyCenterX = enemy.x + getEnemyWidth(enemy) / 2;
  const enemyCenterY = enemy.y + getEnemyHeight(enemy) / 2;
  const playerCenterX = state.player.x + state.player.size / 2;
  const playerCenterY = state.player.y + state.player.size / 2;
  const dx = enemyCenterX - playerCenterX;
  const dy = enemyCenterY - playerCenterY;
  return Math.sqrt(dx * dx + dy * dy) <= maxDistance;
}

export function isBlockSufficientlyPainted(block) {
  if (!block) return false;
  const white = { r: 255, g: 255, b: 255 };
  const difference =
    Math.abs(block.color.r - white.r) +
    Math.abs(block.color.g - white.g) +
    Math.abs(block.color.b - white.b);
  return difference > 10;
}

export function performManualColorCheck() {
  const now = Date.now();
  if (now - state.lastCheckTime < state.checkCooldown) return;

  state.lastCheckTime = now;
  state.darkenEffect = state.DARKEN_DURATION;

  let totalBlocksChecked = 0;
  let matchesFound = 0;
  let blocksRemoved = 0;

  state.enemies.forEach(enemy => {
    if (!enemy.active) return;
    if (!isEnemyNearPlayer(enemy, 400)) return;

    for (let i = enemy.blocks.length - 1; i >= 0; i--) {
      const block = enemy.blocks[i];
      if (!block) continue;

      totalBlocksChecked++;
      if (!isBlockSufficientlyPainted(block)) continue;

      const blockWorldX = enemy.x + block.relX * enemy.blockWidth;
      const blockWorldY = enemy.y + block.relY * enemy.blockHeight;

      const bgInfo = getBackgroundColorAt(
        blockWorldX + enemy.blockWidth / 2,
        blockWorldY + enemy.blockHeight / 2
      );
      const bgColor = bgInfo.color;

      const samplePoints = [
        {
          x: blockWorldX + enemy.blockWidth * 0.5,
          y: blockWorldY + enemy.blockHeight * 0.5
        }
      ];

      let matchCount = 0;
      samplePoints.forEach(p => {
        const sampleColor = getBackgroundColorAt(p.x, p.y).color;
        if (isColorSimilar(block.color, sampleColor)) matchCount++;
      });
      const matchRatio = matchCount / samplePoints.length;

      if (bgInfo.gridId !== null && matchRatio >= 0.5) {
        state.backgroundGrid[bgInfo.gridRow][bgInfo.gridCol].used = true;

        state.fallenBlocks.push({
          x: blockWorldX,
          y: blockWorldY,
          width: enemy.blockWidth,
          height: enemy.blockHeight,
          color: { ...block.color },
          enemyId: enemy.id
        });

        enemy.blocks.splice(i, 1);
        matchesFound++;
        blocksRemoved++;
        checkVictory(enemy);
      }
    }
  });

  if (totalBlocksChecked > 0) {
    debug(
      `Escaneo: ${totalBlocksChecked} bloques → ${matchesFound} coincidencias, ${blocksRemoved} removidos`
    );
  } else {
    debug('Escaneo: Sin bloques para verificar');
  }
}

export function checkVictory(enemy) {
  if (enemy.blocks.length === 0) {
    enemy.active = false;
    if (state.enemies.every(e => !e.active)) {
      state.wave++;
      setTimeout(() => {
        import('./maps.js').then(({ nextMap }) => {
          nextMap()
            .then(() => import('./enemies.js').then(({ initWave }) => initWave()))
            .catch(() => {});
        });
      }, 1000);
    }
  }
}

export function whitenLastEnemy() {
  if (!state.lastHitEnemy) return;
  state.lastHitEnemy.blocks.forEach(block => {
    block.color = { r: 255, g: 255, b: 255 };
    block.painted = false;
  });
  state.lastHitEnemy.currentSpeed = state.lastHitEnemy.baseSpeed;
  state.lastHitEnemy.hasBeenHit = false;
}

export function blackenLastEnemy() {
  if (!state.lastHitEnemy) return;
  state.lastHitEnemy.blocks.forEach(block => {
    block.color = { r: 0, g: 0, b: 0 };
    block.painted = true;
  });
}
