import { state } from './state.js';
import { debug, mixColor } from './utils.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';

export function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (!p.active) continue;

    const dx = Math.cos(p.angle) * p.speed;
    const dy = Math.sin(p.angle) * p.speed;

    p.x += dx;
    p.y += dy;
    p.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

    state.enemies.forEach(enemy => {
      if (!enemy.active || p.hitEnemies.has(enemy.id)) return;

      const enemyWidth = getEnemyWidth(enemy);
      const enemyHeight = getEnemyHeight(enemy);

      const closestX = Math.max(enemy.x, Math.min(p.x, enemy.x + enemyWidth));
      const closestY = Math.max(enemy.y, Math.min(p.y, enemy.y + enemyHeight));

      const distSq = (p.x - closestX) * (p.x - closestX) + (p.y - closestY) * (p.y - closestY);

      if (distSq < (p.size / 2) * (p.size / 2)) {
        let enemyHit = false;
        let blocksPainted = 0;

        enemy.blocks.forEach(block => {
          const blockWorldX = enemy.x + block.relX * enemy.blockWidth;
          const blockWorldY = enemy.y + block.relY * enemy.blockHeight;
          const blockWorldWidth = enemy.blockWidth;
          const blockWorldHeight = enemy.blockHeight;

          const closestBlockX = Math.max(
            blockWorldX,
            Math.min(p.x, blockWorldX + blockWorldWidth)
          );
          const closestBlockY = Math.max(
            blockWorldY,
            Math.min(p.y, blockWorldY + blockWorldHeight)
          );

          const dxBlock = closestBlockX - p.x;
          const dyBlock = closestBlockY - p.y;
          const distanceBlockSq = dxBlock * dxBlock + dyBlock * dyBlock;

          if (distanceBlockSq < (p.size / 2) * (p.size / 2)) {
            block.color = mixColor(block.color, p.color, p.opacity);
            block.painted = true;
            enemyHit = true;
            blocksPainted++;
          }
        });

        if (blocksPainted > 0) {
          debug(`Burst pintó ${blocksPainted} bloques`);
        }

        if (enemyHit) {
          state.lastHitEnemy = enemy;
          if (!enemy.hasBeenHit) {
            enemy.hasBeenHit = true;
            enemy.currentSpeed = enemy.fastSpeed;
          }
        }

        p.hitEnemies.add(enemy.id);
      }
    });

    if (p.distanceTraveled > p.maxDistance) {
      p.active = false;
    }

    if (!p.active) {
      state.effects.push({
        type: 'explosion',
        x: p.x,
        y: p.y,
        radius: 15,
        color: p.color,
        opacity: p.opacity,
        life: 10
      });
      state.projectiles.splice(i, 1);
    }
  }
}
