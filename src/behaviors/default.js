// Default enemy behavior: wandering with periodic direction changes
// and soft collision separation, clamped to world bounds.

export function update(enemy, state, dtMs = 16) {
  const now = Date.now();
  const enemyWidth = enemy.shapeWidth * enemy.blockWidth;
  const enemyHeight = enemy.shapeHeight * enemy.blockHeight;

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
  } else if (enemy.x > state.worldWidth - enemyWidth - margin) {
    enemy.x = state.worldWidth - enemyWidth - margin;
    enemy.randomAngle = Math.PI - enemy.randomAngle;
  }

  if (enemy.y < margin) {
    enemy.y = margin;
    enemy.randomAngle = -enemy.randomAngle;
  } else if (enemy.y > state.worldHeight - enemyHeight - margin) {
    enemy.y = state.worldHeight - enemyHeight - margin;
    enemy.randomAngle = -enemy.randomAngle;
  }

  enemy.x = Math.max(0, Math.min(state.worldWidth - enemyWidth, enemy.x));
  enemy.y = Math.max(0, Math.min(state.worldHeight - enemyHeight, enemy.y));

  // Simple separation
  state.enemies.forEach(otherEnemy => {
    if (otherEnemy === enemy || !otherEnemy.active) return;
    const otherEnemyWidth = otherEnemy.shapeWidth * otherEnemy.blockWidth;
    const otherEnemyHeight = otherEnemy.shapeHeight * otherEnemy.blockHeight;
    const dx = enemy.x - otherEnemy.x;
    const dy = enemy.y - otherEnemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (enemyWidth + otherEnemyWidth) / 2;

    if (distance < minDistance && distance > 0.0001) {
      const angle = Math.atan2(dy, dx);
      const pushForce = (minDistance - distance) / minDistance * enemy.currentSpeed;
      enemy.x += Math.cos(angle) * pushForce;
      enemy.y += Math.sin(angle) * pushForce;
      otherEnemy.x -= Math.cos(angle) * pushForce;
      otherEnemy.y -= Math.sin(angle) * pushForce;
    }
  });
}
