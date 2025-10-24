import { state } from '../state.js';

export function update(enemy, delta) {
  const now = performance.now();

  // Init properties if not present
  if (!enemy.jumpStart) enemy.jumpStart = 0;
  if (!enemy.jumpDuration) enemy.jumpDuration = 0;
  if (!enemy.startX) enemy.startX = enemy.x;
  if (!enemy.startY) enemy.startY = enemy.y;
  if (!enemy.targetX) enemy.targetX = enemy.x;
  if (!enemy.targetY) enemy.targetY = enemy.y;
  if (!enemy.restingTime) enemy.restingTime = 0;
  if (!enemy.runningAway) enemy.runningAway = false;
  if (!enemy.jumpCount) enemy.jumpCount = 0;
  if (!enemy.nextJumpTime) enemy.nextJumpTime = 0;

  // If consuming is locked, skip movement entirely but keep type assignment
  if (enemy.consumeLocked) {
    enemy.type = 'frog';
    return;
  }

  // Still resting
  if (enemy.restingTime > now) return;

  // Jump in progress — interpolate position
  if (now < enemy.jumpStart + enemy.jumpDuration) {
    const t = (now - enemy.jumpStart) / enemy.jumpDuration; // 0 → 1
    const smoothT = t * (2 - t); // ease out
    enemy.x = enemy.startX + (enemy.targetX - enemy.startX) * smoothT;
    enemy.y = enemy.startY + (enemy.targetY - enemy.startY) * smoothT;

    // optional bounce arc
    const arc = Math.sin(t * Math.PI) * 4;
    enemy.y -= arc;

    return;
  }

  // If it's time to start a new jump
  if (now > enemy.nextJumpTime) {
    let speed = enemy.baseSpeed;
    let angle = Math.random() * Math.PI * 2;

    // If painted, trigger escape behavior
    if (enemy.hasBeenHit && !enemy.runningAway) {
      enemy.runningAway = true;
      enemy.jumpCount = 0;
    }

    // Run away from player
    if (enemy.runningAway) {
      const player = state.player;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      angle = Math.atan2(dy, dx);
      speed = enemy.fastSpeed;
      enemy.jumpCount++;

      // After three fast jumps, rest 5s
      if (enemy.jumpCount >= 3) {
        enemy.runningAway = false;
        enemy.hasBeenHit = false;
        enemy.restingTime = now + 5000;
      }
    }

    // Compute jump distance & duration
    const jumpDistance = 40 + Math.random() * 20;
    const jumpDuration = enemy.runningAway ? 400 : 700;

    const nextX = enemy.x + Math.cos(angle) * jumpDistance;
    const nextY = enemy.y + Math.sin(angle) * jumpDistance;

    // Clamp to map bounds
    const maxX = state.worldWidth - enemy.shapeWidth * enemy.blockWidth;
    const minX = 0;
    const maxY = state.worldHeight ? state.worldHeight - 50 : 150;
    const minY = 0;
    const clampedX = Math.max(minX, Math.min(nextX, maxX));
    const clampedY = Math.max(minY, Math.min(nextY, maxY));

    // Setup jump parameters
    enemy.startX = enemy.x;
    enemy.startY = enemy.y;
    enemy.targetX = clampedX;
    enemy.targetY = clampedY;
    enemy.jumpStart = now;
    enemy.jumpDuration = jumpDuration;

    enemy.randomAngle = angle; // head faces jump direction
    enemy.nextJumpTime = now + jumpDuration + (enemy.runningAway ? 200 : 2000);
  }

  // Ensure type for consumption system
  enemy.type = 'frog';
}
