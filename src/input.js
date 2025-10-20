import { canvas, hud, toleranceInfo } from './state.js';
import { state } from './state.js';
import { getActiveColors, toggleColorMode } from './colors.js';
import { performManualColorCheck, whitenLastEnemy, blackenLastEnemy } from './checks.js';
import { performCurvedSlash, launchPaintBurst, performColorExplosion } from './attacks.js';

export function installInputHandlers() {
  document.addEventListener('keydown', e => {
    state.keys[e.key] = true;

    const activeColors = getActiveColors();
    if (activeColors[e.key]) {
      if (state.selectedColor !== activeColors[e.key]) {
        state.selectedColor = activeColors[e.key];
        state.opacity = 0.1;
      } else {
        state.opacity = Math.min(state.opacity + 0.1, 1);
      }
      hud.textContent = `Modo: ${state.colorMode} | Color: ${state.selectedColor.name} | Opacidad: ${Math.round(state.opacity * 100)}%`;
    }

    if (e.key === ' ' || e.key === 'Spacebar') performManualColorCheck();
    if (e.key === 'e' || e.key === 'E') whitenLastEnemy();
    if (e.key === 'q' || e.key === 'Q') blackenLastEnemy();
    if (e.key === '4') toggleColorMode();

    if (e.key === 'ArrowUp') {
      state.currentTolerance = Math.min(state.currentTolerance + 1, state.toleranceLevels.length - 1);
      toleranceInfo.textContent = `Tolerancia: ${state.toleranceLevels[state.currentTolerance].name} (▲/▼ para ajustar)`;
    }
    if (e.key === 'ArrowDown') {
      state.currentTolerance = Math.max(state.currentTolerance - 1, 0);
      toleranceInfo.textContent = `Tolerancia: ${state.toleranceLevels[state.currentTolerance].name} (▲/▼ para ajustar)`;
    }

    if (e.key === 'm') {
      import('./maps.js').then(({ nextMap }) => nextMap().then(() => import('./enemies.js').then(({ initWave }) => initWave())));
    }
    if (e.key === 'z') state.zoomLevel = Math.min(state.zoomLevel + 0.1, 3.0);
    if (e.key === 'x') state.zoomLevel = Math.max(state.zoomLevel - 0.1, 1.0);
  });

  document.addEventListener('keyup', e => {
    state.keys[e.key] = false;
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', e => {
    if (!state.selectedColor) return;

    if (e.button === 0) {
      const now = Date.now();
      if (now - state.lastSlashTime < state.slashCooldown) return;
      state.leftMouseDownTime = now;
      state.isCharged = false;
    } else if (e.button === 2) {
      performColorExplosion();
    }
  });

  canvas.addEventListener('mouseup', e => {
    if (!state.selectedColor) return;

    if (e.button === 0) {
      const now = Date.now();
      const holdDuration = now - state.leftMouseDownTime;
      if (state.leftMouseDownTime === 0) return;

      if (state.isCharged || holdDuration >= state.chargeTime) {
        launchPaintBurst();
      } else {
        performCurvedSlash();
      }

      state.leftMouseDownTime = 0;
      state.isCharged = false;
    }
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());
}
