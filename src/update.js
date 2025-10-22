import { state, canvas } from './state.js';
import { updateProjectiles } from './projectiles.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';
import { createEnemy } from './enemies.js';
import { update as frogBehavior } from './behaviors/frog.js';

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
  if (state.darkenEffect > 0) state.darkenEffect--;

  moveEnemies();
  updateProjectiles();

  // Maintain at least 8 active enemies
  const aliveEnemies = state.enemies.filter(e => e.active);
  if (aliveEnemies.length < state.maxActive && state.totalSpawned < state.maxEnemies) {
    if (!state.spawnCooldown || performance.now() > state.spawnCooldown) {
      spawnEnemyNearPlayer();
      state.spawnCooldown = performance.now() + 2000; // 2s delay between spawns
    }
  }
}
