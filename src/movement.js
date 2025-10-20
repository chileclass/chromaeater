import { state } from './state.js';
import { canMoveTo } from './maps.js';

export function movePlayer() {
  let newX = state.player.x;
  let newY = state.player.y;

  if (state.keys['w']) newY -= state.player.speed;
  if (state.keys['s']) newY += state.player.speed;
  if (state.keys['a']) newX -= state.player.speed;
  if (state.keys['d']) newX += state.player.speed;

  if (canMoveTo(newX, newY)) {
    state.player.x = newX;
    state.player.y = newY;
  }

  state.player.x = Math.max(0, Math.min(800 - state.player.size, state.player.x));
  state.player.y = Math.max(0, Math.min(600 - state.player.size, state.player.y));
}
