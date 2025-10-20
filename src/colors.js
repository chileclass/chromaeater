import { state, hud } from './state.js';
import { debug } from './utils.js';

export function getActiveColors() {
  return state.palettes[state.colorMode];
}

export function toggleColorMode() {
  state.colorMode = state.colorMode === 'RGB' ? 'MYC' : 'RGB';
  state.selectedColor = null;
  state.opacity = 0.1;
  hud.textContent = `Modo: ${state.colorMode} | Color: Ninguno | Opacidad: ${Math.round(state.opacity * 100)}%`;
  debug(`Modo de color cambiado a: ${state.colorMode}`);
}
