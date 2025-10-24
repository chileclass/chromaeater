// Default enemy behavior: wandering with periodic direction changes
// and soft collision separation, clamped to world bounds.

export function update(enemy, state, dtMs = 16) {
  const now = Date.now();
  const enemyWidth = enemy.shapeWidth * enemy.blockWidth;
  const enemyHeight = enemy.shapeHeight * enemy.blockHeight;

  // General behavior: if painted recently, flee from player for a short duration
  if (enemy.hasBeenHit) {
    enemy.fleeingUntil = now + 1200; // flee for 1.2s after being painted
    enemy.hasBeenHit = false;
  }

  if (enemy.fleeingUntil && now < enemy.fleeingUntil) {
    const player = state.player;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const angle = Math.atan2(dy, dx);
    const fleeSpeed = enemy.fastSpeed;
    enemy.x += Math.cos(angle) * fleeSpeed;
    enemy.y += Math.sin(angle) * fleeSpeed;
    // Clamp to world bounds
    enemy.x = Math.max(0, Math.min(state.worldWidth - enemyWidth, enemy.x));
    enemy.y = Math.max(0, Math.min(state.worldHeight - enemyHeight, enemy.y));
    // Skip other behavior while fleeing
    if (!enemy.type) enemy.type = 'default';
    return;
  }

  // If consuming is locked, do not move; only perform minimal separation to avoid overlap
  if (enemy.consumeLocked) {
    // Minimal soft separation only
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
        const pushForce = (minDistance - distance) / minDistance * enemy.currentSpeed * 0.5;
        enemy.x += Math.cos(angle) * pushForce;
        enemy.y += Math.sin(angle) * pushForce;
      }
    });
    if (!enemy.type) enemy.type = 'default';
    return;
  }

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

  // Mark this enemy type for consumption system
  if (!enemy.type) enemy.type = 'default';
}
