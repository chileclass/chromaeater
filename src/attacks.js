import { state, canvas } from './state.js';
import { mixColor } from './utils.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';

export function performCurvedSlash() {
  const now = Date.now();
  if (now - state.lastSlashTime < state.slashCooldown) return;
  if (!state.selectedColor) return;

  state.lastSlashTime = now;

  const playerCenterX = state.player.x + state.player.size / 2;
  const playerCenterY = state.player.y + state.player.size / 2;
  const dxMouse = state.mouseX - canvas.width / 2;
  const dyMouse = state.mouseY - canvas.height / 2;
  const mouseDist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
  const slashMax = 80;
  const slashRadius = Math.min(mouseDist, slashMax);
  const slashThickness = 10;

  const angle = Math.atan2(
    state.mouseY - canvas.height / 2,
    state.mouseX - canvas.width / 2
  );

  const startAngle = angle - Math.PI / 4;
  const endAngle = angle + Math.PI / 4;

  state.effects.push({
    type: 'slash',
    x: playerCenterX,
    y: playerCenterY,
    angle,
    radius: slashRadius,
    startAngle,
    endAngle,
    color: state.selectedColor,
    opacity: state.opacity,
    life: 20
  });

  state.enemies.forEach(enemy => {
    if (!enemy.active) return;
    let enemyHit = false;

    enemy.blocks.forEach(block => {
      const blockWorldX = enemy.x + block.relX * enemy.blockWidth;
      const blockWorldY = enemy.y + block.relY * enemy.blockHeight;
      const blockCenterX = blockWorldX + enemy.blockWidth / 2;
      const blockCenterY = blockWorldY + enemy.blockHeight / 2;

      const dx = blockCenterX - playerCenterX;
      const dy = blockCenterY - playerCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const blockAngle = Math.atan2(dy, dx);

      if (distance >= slashRadius - slashThickness && distance <= slashRadius) {
        let angleDiff = blockAngle - angle;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) <= Math.PI / 4) {
          block.color = mixColor(block.color, state.selectedColor, state.opacity);
          block.painted = true;
          enemyHit = true;
        }
      }
    });

    if (enemyHit) {
      state.lastHitEnemy = enemy;
      if (!enemy.hasBeenHit) {
        enemy.hasBeenHit = true;
        enemy.currentSpeed = enemy.fastSpeed;
      }
    }
  });
}

export function launchPaintBurst() {
  if (!state.selectedColor) return;

  const now = Date.now();
  if (now - state.lastBurstTime < state.burstCooldown) return;
  state.lastBurstTime = now;

  setTimeout(() => {
    const playerCenterX = state.player.x + state.player.size / 2;
    const playerCenterY = state.player.y + state.player.size / 2;

    const angle = Math.atan2(
      state.mouseY - canvas.height / 2,
      state.mouseX - canvas.width / 2
    );
    const burstLength = 300;
    const burstWidth = 12;

    const endX = playerCenterX + Math.cos(angle) * burstLength;
    const endY = playerCenterY + Math.sin(angle) * burstLength;

    state.enemies.forEach(enemy => {
      if (!enemy.active) return;

      enemy.blocks.forEach(block => {
        const blockWorldX = enemy.x + block.relX * enemy.blockWidth;
        const blockWorldY = enemy.y + block.relY * enemy.blockHeight;
        const bx = blockWorldX + enemy.blockWidth / 2;
        const by = blockWorldY + enemy.blockHeight / 2;

        const dx = bx - playerCenterX;
        const dy = by - playerCenterY;
        const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
        const perp = -dx * Math.sin(angle) + dy * Math.cos(angle);

        if (proj >= 0 && proj <= burstLength && Math.abs(perp) <= burstWidth) {
          block.color = mixColor(block.color, state.selectedColor, state.opacity);
          block.painted = true;
          enemy.hasBeenHit = true;
          enemy.currentSpeed = enemy.fastSpeed;
        }
      });
    });

    state.effects.push({
      type: 'burstLine',
      x1: playerCenterX,
      y1: playerCenterY,
      x2: endX,
      y2: endY,
      color: state.selectedColor,
      opacity: state.opacity,
      life: 15
    });
  }, 250);
}

export function performColorExplosion() {
  const now = Date.now();
  if (now - state.lastExplosionTime < state.explosionCooldown) return;
  if (!state.selectedColor) return;

  state.lastExplosionTime = now;

  const playerCenterX = state.player.x + state.player.size / 2;
  const playerCenterY = state.player.y + state.player.size / 2;
  const explosionRadius = 40;

  state.effects.push({
    type: 'explosion',
    x: playerCenterX,
    y: playerCenterY,
    radius: explosionRadius,
    color: state.selectedColor,
    opacity: state.opacity,
    life: 15
  });

  state.enemies.forEach(enemy => {
    if (!enemy.active) return;
    let enemyHit = false;

    enemy.blocks.forEach(block => {
      const blockWorldX = enemy.x + block.relX * enemy.blockWidth;
      const blockWorldY = enemy.y + block.relY * enemy.blockHeight;

      const closestX = Math.max(
        enemy.x,
        Math.min(playerCenterX, enemy.x + getEnemyWidth(enemy))
      );
      const closestY = Math.max(
        enemy.y,
        Math.min(playerCenterY, enemy.y + getEnemyHeight(enemy))
      );

      const dx = closestX - playerCenterX;
      const dy = closestY - playerCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= explosionRadius) {
        block.color = mixColor(block.color, state.selectedColor, state.opacity);
        block.painted = true;
        enemyHit = true;
      }
    });

    if (enemyHit) {
      state.lastHitEnemy = enemy;
      if (!enemy.hasBeenHit) {
        enemy.hasBeenHit = true;
        enemy.currentSpeed = enemy.fastSpeed;
      }
    }
  });
}
