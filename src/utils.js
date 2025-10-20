import { state, debugInfo } from './state.js';

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
