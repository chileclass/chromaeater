import { state, debugInfo, canvas } from './state.js';

export function debug(msg) {
  debugInfo.textContent = `Debug: ${msg}`;
}

export function rgb(c) {
  return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
}

export function mixColor(base, added, opacity) {
  return {
    r: base.r * (1 - opacity) + added.r * opacity,
    g: base.g * (1 - opacity) + added.g * opacity,
    b: base.b * (1 - opacity) + added.b * opacity
  };
}

export function isColorSimilar(c1, c2) {
  const dR = c1.r - c2.r;
  const dG = c1.g - c2.g;
  const dB = c1.b - c2.b;
  const distance = Math.sqrt(dR * dR + dG * dG + dB * dB);
  const toleranceValue = state.toleranceLevels[state.currentTolerance].value * 2.2;
  return distance <= toleranceValue;
}

// Camera helpers (must match logic in render.js)
export function getCameraCenter() {
  const centerX = state.player.x + state.player.size / 2;
  const centerY = state.player.y + state.player.size / 2;
  const halfViewW = (canvas.width / state.zoomLevel) / 2;
  const halfViewH = (canvas.height / state.zoomLevel) / 2;
  const camMinX = halfViewW;
  const camMaxX = Math.max(halfViewW, state.worldWidth - halfViewW);
  const camMinY = halfViewH;
  const camMaxY = Math.max(halfViewH, state.worldHeight - halfViewH);
  const camX = Math.max(camMinX, Math.min(camMaxX, centerX));
  const camY = Math.max(camMinY, Math.min(camMaxY, centerY));
  return { camX, camY };
}

export function screenToWorld(screenX, screenY) {
  const { camX, camY } = getCameraCenter();
  const worldX = camX + (screenX - canvas.width / 2) / state.zoomLevel;
  const worldY = camY + (screenY - canvas.height / 2) / state.zoomLevel;
  return { worldX, worldY };
}
