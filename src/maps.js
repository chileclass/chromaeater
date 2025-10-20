import { canvas, mapInfo } from './state.js';
import { state, getCellWidth, getCellHeight } from './state.js';
import { debug, isColorSimilar } from './utils.js';

const predefinedMaps = [
  {
    name: 'Mapa Test 1',
    type: 'image',
    url: 'https://i.ibb.co/93GBxC9z/mapa.png?1'
  }
];

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
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.gridCols;
      tempCanvas.height = state.gridRows;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(img, 0, 0, state.gridCols, state.gridRows);

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

export function nextMap() {
  state.fallenBlocks.length = 0;
  debug('Bloques caídos limpiados');

  state.currentMap = (state.currentMap + 1) % predefinedMaps.length;
  const map = predefinedMaps[state.currentMap];
  debug(`Cambiando a mapa: ${map.name}`);

  return loadBackgroundImage(map.url)
    .then(() => {
      mapInfo.textContent = `Mapa: ${map.name}`;
    })
    .catch(error => {
      mapInfo.textContent = `Mapa: Error (${map.name})`;
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
