import { state, canvas } from './state.js';
import { updateProjectiles } from './projectiles.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';

export function moveEnemies() {
  const now = Date.now();
  state.enemies.forEach(enemy => {
    if (!enemy.active) return;

    const enemyWidth = getEnemyWidth(enemy);
    const enemyHeight = getEnemyHeight(enemy);

    if (now - enemy.directionChangeTime > 1500) {
      enemy.randomAngle = Math.random() * Math.PI * 2;
      enemy.directionChangeTime = now;
    }

    enemy.x += Math.cos(enemy.randomAngle) * enemy.currentSpeed;
    enemy.y += Math.sin(enemy.randomAngle) * enemy.currentSpeed;

    const margin = 5;
    if (enemy.x < margin) {
      enemy.x = margin;
      enemy.randomAngle = Math.PI - enemy.randomAngle;
    } else if (enemy.x > canvas.width - enemyWidth - margin) {
      enemy.x = canvas.width - enemyWidth - margin;
      enemy.randomAngle = Math.PI - enemy.randomAngle;
    }

    if (enemy.y < margin) {
      enemy.y = margin;
      enemy.randomAngle = -enemy.randomAngle;
    } else if (enemy.y > canvas.height - enemyHeight - margin) {
      enemy.y = canvas.height - enemyHeight - margin;
      enemy.randomAngle = -enemy.randomAngle;
    }

    enemy.x = Math.max(0, Math.min(canvas.width - enemyWidth, enemy.x));
    enemy.y = Math.max(0, Math.min(canvas.height - enemyHeight, enemy.y));

    state.enemies.forEach(otherEnemy => {
      if (otherEnemy !== enemy && otherEnemy.active) {
        const otherEnemyWidth = getEnemyWidth(otherEnemy);
        const otherEnemyHeight = getEnemyHeight(otherEnemy);
        const dx = enemy.x - otherEnemy.x;
        const dy = enemy.y - otherEnemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (enemyWidth + otherEnemyWidth) / 2;

        if (distance < minDistance) {
          const angle = Math.atan2(dy, dx);
          const pushForce = (minDistance - distance) / minDistance * enemy.currentSpeed;

          enemy.x += Math.cos(angle) * pushForce;
          enemy.y += Math.sin(angle) * pushForce;
          otherEnemy.x -= Math.cos(angle) * pushForce;
          otherEnemy.y -= Math.sin(angle) * pushForce;
        }
      }
    });
  });
}

export function update() {
  if (state.darkenEffect > 0) state.darkenEffect--;
  moveEnemies();
  updateProjectiles();
}
