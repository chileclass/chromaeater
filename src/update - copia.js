import { state, canvas } from './state.js';
import { updateProjectiles } from './projectiles.js';
import { getEnemyWidth, getEnemyHeight } from './enemies.js';

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
}
