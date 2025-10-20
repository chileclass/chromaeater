import { canvas, mapInfo } from './state.js';
import { state, getCellWidth, getCellHeight } from './state.js';
import { debug, isColorSimilar } from './utils.js';
import { mapsList } from '../maps/index.js';
// Load maps list from module; keep a state copy for runtime ops
state.mapsList = Array.isArray(mapsList) ? mapsList.slice() : [];

export function drawBackground(ctx) {
  if (state.backgroundImage) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(state.backgroundImage, 0, 0, canvas.width, canvas.height);
  }
}

export function drawFallenBlocks(ctx, rgb) {
  state.fallenBlocks.forEach(block => {
    ctx.fillStyle = rgb(block.color);
    ctx.fillRect(block.x, block.y, block.width, block.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(block.x, block.y, block.width, block.height);
  });
}

export function loadBackgroundImage(url) {
  return new Promise((resolve, reject) => {
    debug(`Cargando imagen: ${url}`);

    const img = new Image();

    img.onload = () => {
      // Grid is exactly the source image pixels
      state.gridCols = img.width;
      state.gridRows = img.height;

      // Canvas will render scaled background: 1 src px -> 7 screen px
      const scaledWidth = Math.max(1, Math.floor(img.width * state.scale));
      const scaledHeight = Math.max(1, Math.floor(img.height * state.scale));
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      state.worldWidth = scaledWidth;
      state.worldHeight = scaledHeight;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.gridCols;
      tempCanvas.height = state.gridRows;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(img, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, state.gridCols, state.gridRows);
      const data = imageData.data;

      state.backgroundGrid = [];
      for (let row = 0; row < state.gridRows; row++) {
        state.backgroundGrid[row] = [];
        for (let col = 0; col < state.gridCols; col++) {
          const index = (row * state.gridCols + col) * 4;
          state.backgroundGrid[row][col] = {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            used: false
          };
        }
      }

      state.backgroundImage = img;
      debug('Cuadrícula procesada exitosamente');
      resolve();
    };

    img.onerror = () => {
      debug(`ERROR cargando imagen: ${url}`);
      reject(new Error(`No se pudo cargar: ${url}`));
    };

    img.src = url;
  });
}

function resetPlayerPositionToValidSpot() {
  // Try center of world first
  const startX = Math.max(0, Math.floor((state.worldWidth - state.player.size) / 2));
  const startY = Math.max(0, Math.floor((state.worldHeight - state.player.size) / 2));
  if (canMoveTo(startX, startY)) {
    state.player.x = startX;
    state.player.y = startY;
    return;
  }

  // Fallback: random sampling to find a walkable spot
  const maxTries = 2000;
  for (let i = 0; i < maxTries; i++) {
    const x = Math.floor(Math.random() * Math.max(1, state.worldWidth - state.player.size));
    const y = Math.floor(Math.random() * Math.max(1, state.worldHeight - state.player.size));
    if (canMoveTo(x, y)) {
      state.player.x = x;
      state.player.y = y;
      return;
    }
  }

  // Last resort: top-left corner inside bounds
  state.player.x = 0;
  state.player.y = 0;
}

export async function nextMap() {
  state.fallenBlocks.length = 0;
  debug('Bloques caídos limpiados');

  if (!state.mapsList || state.mapsList.length === 0) {
    mapInfo.textContent = 'Mapa: No hay mapas locales';
    throw new Error('No maps available');
  }

  // Pick random map different from previous if possible
  let nextIndex = Math.floor(Math.random() * state.mapsList.length);
  if (state.mapsList.length > 1 && nextIndex === state.currentMap) {
    nextIndex = (nextIndex + 1) % state.mapsList.length;
  }
  state.currentMap = nextIndex;
  const file = state.mapsList[state.currentMap];
  const url = `./maps/${file}`;
  debug(`Cambiando a mapa: ${file}`);

  return loadBackgroundImage(url)
    .then(() => {
      resetPlayerPositionToValidSpot();
      mapInfo.textContent = `Mapa: ${file}`;
    })
    .catch(error => {
      mapInfo.textContent = `Mapa: Error (${file})`;
      console.error(error);
      throw error;
    });
}

export function getBackgroundColorAt(x, y) {
  const cellWidth = getCellWidth();
  const cellHeight = getCellHeight();

  const col = Math.floor(x / cellWidth);
  const row = Math.floor(y / cellHeight);

  if (row >= 0 && row < state.gridRows && col >= 0 && col < state.gridCols) {
    const cell = state.backgroundGrid[row][col];
    return {
      color: cell,
      gridId: `${row}-${col}`,
      gridRow: row,
      gridCol: col,
      gridX: col * cellWidth,
      gridY: row * cellHeight,
      isUsed: cell.used
    };
  }
  return {
    color: { r: 0, g: 0, b: 0, used: false },
    gridId: null,
    gridRow: -1,
    gridCol: -1,
    isUsed: true
  };
}

export function getBackgroundColorWithFallenBlocksAt(x, y) {
  for (let i = 0; i < state.fallenBlocks.length; i++) {
    const block = state.fallenBlocks[i];
    if (
      x >= block.x &&
      x <= block.x + block.width &&
      y >= block.y &&
      y <= block.y + block.height
    ) {
      return block.color;
    }
  }
  return getBackgroundColorAt(x, y).color;
}

export function canMoveTo(x, y) {
  const corners = [
    { x: x, y: y },
    { x: x + state.player.size, y: y },
    { x: x, y: y + state.player.size },
    { x: x + state.player.size, y: y + state.player.size }
  ];

  return corners.every(corner => {
    const bgColor = getBackgroundColorWithFallenBlocksAt(corner.x, corner.y);
    return !isColorSimilar(bgColor, { r: 0, g: 0, b: 0 });
  });
}
