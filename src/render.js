import { canvas, ctx } from './state.js';
import { state } from './state.js';
import { rgb } from './utils.js';
import { drawBackground, drawFallenBlocks } from './maps.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';

export function drawEffects() {
  state.projectiles.forEach(p => {
    ctx.save();
    ctx.fillStyle = rgb(p.color);
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  for (let i = state.effects.length - 1; i >= 0; i--) {
    const effect = state.effects[i];
    ctx.save();
    ctx.globalAlpha = effect.opacity * (effect.life / 20);

    if (effect.type === 'slash') {
      ctx.strokeStyle = rgb(effect.color);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, effect.startAngle, effect.endAngle);
      ctx.stroke();

      ctx.strokeStyle = rgb(effect.color);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x + Math.cos(effect.angle) * effect.radius, effect.y + Math.sin(effect.angle) * effect.radius);
      ctx.stroke();
    } else if (effect.type === 'explosion') {
      ctx.fillStyle = rgb(effect.color);
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (effect.type === 'burstLine') {
      ctx.strokeStyle = rgb(effect.color);
      ctx.globalAlpha = effect.opacity * (effect.life / 15);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(effect.x1, effect.y1);
      ctx.lineTo(effect.x2, effect.y2);
      ctx.stroke();
    } else if (effect.type === 'particle') {
      ctx.fillStyle = rgb(effect.color);
      ctx.globalAlpha = effect.life / 15;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 2, 0, Math.PI * 2);
      ctx.fill();
      effect.x += effect.dx;
      effect.y += effect.dy;
      effect.life--;
    }

    ctx.restore();

    effect.life--;
    if (effect.life <= 0) {
      state.effects.splice(i, 1);
    }
  }

  if (state.leftMouseDownTime > 0) {
    const chargeElapsed = Date.now() - state.leftMouseDownTime;
    const chargeRatio = Math.min(chargeElapsed / state.chargeTime, 1);
    if (chargeRatio >= 1) state.isCharged = true;
    if (chargeRatio > 0.1) {
      const indicatorSize = state.player.size + 10 + 20 * chargeRatio;
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * chargeRatio;
      ctx.strokeStyle = state.isCharged ? 'yellow' : 'cyan';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        state.player.x + state.player.size / 2,
        state.player.y + state.player.size / 2,
        indicatorSize / 2,
        0,
        Math.PI * 2 * chargeRatio
      );
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (state.darkenEffect > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.zoomLevel, state.zoomLevel);
  ctx.translate(-(state.player.x + state.player.size / 2), -(state.player.y + state.player.size / 2));

  drawBackground(ctx);
  drawFallenBlocks(ctx, rgb);

  ctx.fillStyle = state.player.color;
  ctx.fillRect(state.player.x, state.player.y, state.player.size, state.player.size);
  // Always outline player to ensure visibility on any background
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 2;
  ctx.strokeRect(state.player.x, state.player.y, state.player.size, state.player.size);

  state.enemies.forEach(enemy => {
    if (!enemy.active) return;
    enemy.blocks.forEach(block => {
      ctx.fillStyle = rgb(block.color);
      const worldX = enemy.x + block.relX * enemy.blockWidth;
      const worldY = enemy.y + block.relY * enemy.blockHeight;
      ctx.fillRect(worldX, worldY, enemy.blockWidth, enemy.blockHeight);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(enemy.x, enemy.y, getEnemyWidth(enemy), getEnemyHeight(enemy));
  });

  drawEffects();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, canvas.height / 2);
  ctx.lineTo(state.mouseX, state.mouseY);
  ctx.stroke();
  // Center marker
  ctx.fillStyle = 'rgba(255,255,0,0.7)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  // Score removed
  ctx.fillText(
    `Tolerancia: ${state.toleranceLevels[state.currentTolerance].name}`,
    20,
    canvas.height - 45
  );
  ctx.fillText(`[ESPACIO] para escanear`, 20, canvas.height - 70);
  ctx.fillText(`[E] Blanco | [Q] Negro`, 20, canvas.height - 95);
  ctx.fillText(
    `[4] Cambiar a ${state.colorMode === 'RGB' ? 'MYC' : 'RGB'}`,
    20,
    canvas.height - 120
  );
}
