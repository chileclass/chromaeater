import { state } from './state.js';
import { debug } from './utils.js';
import { update as defaultBehaviorUpdate } from './behaviors/default.js';
import { update as frogBehavior } from './behaviors/frog.js'; // <— added import

async function loadPngShape(url, maxSize = 32) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.max(1, Math.floor(img.width * scale));
      const h = Math.max(1, Math.floor(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0, w, h);
      const data = cx.getImageData(0, 0, w, h).data;

      const blocks = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const a = data[i + 3];
          if (a > 10) blocks.push({ x, y });
        }
      }
      resolve({ width: w, height: h, blocks });
    };
    img.onerror = () => reject(new Error('Failed to load enemy PNG ' + url));
    img.src = url;
  });
}

export function generateRandomShape() {
  const maxSize = 20;
  const minBlocks = 12;
  const maxBlocks = 30;

  const width = Math.floor(Math.random() * (maxSize - 3)) + 3;
  const height = Math.floor(Math.random() * (maxSize - 3)) + 3;
  const totalBlocks = Math.floor(Math.random() * (maxBlocks - minBlocks)) + minBlocks;

  const grid = Array(height).fill().map(() => Array(width).fill(0));
  const startX = Math.floor(Math.random() * width);
  const startY = Math.floor(Math.random() * height);
  const blocks = [{ x: startX, y: startY }];
  grid[startY][startX] = 1;

  const directions = [
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: -1 }, { dx: -1, dy: 1 },
    { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
  ];

  while (blocks.length < totalBlocks && blocks.length < width * height) {
    const randomBlock = blocks[Math.floor(Math.random() * blocks.length)];
    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
    let added = false;

    for (const dir of shuffledDirections) {
      const newX = randomBlock.x + dir.dx;
      const newY = randomBlock.y + dir.dy;
      if (newX >= 0 && newX < width && newY >= 0 && newY < height && grid[newY][newX] === 0) {
        blocks.push({ x: newX, y: newY });
        grid[newY][newX] = 1;
        added = true;
        break;
      }
    }

    if (!added) {
      for (const block of blocks) {
        for (const dir of directions) {
          const newX = block.x + dir.dx;
          const newY = block.y + dir.dy;
          if (newX >= 0 && newX < width && newY >= 0 && newY < height && grid[newY][newX] === 0) {
            blocks.push({ x: newX, y: newY });
            grid[newY][newX] = 1;
            added = true;
            break;
          }
        }
        if (added) break;
      }
    }
    if (!added) break;
  }
  return { blocks, width, height };
}

export function createEnemy() {
  const shape = generateRandomShape();
  const blockSize = 6;
  const pixelWidth = shape.width * blockSize;
  const x = Math.random() * Math.max(1, (state.worldWidth - pixelWidth));
  const y = Math.random() * 150;
  state.enemyIdCounter++;

  const blocks = shape.blocks.map(blockPos => ({
    color: { r: 255, g: 255, b: 255 },
    painted: false,
    relX: blockPos.x,
    relY: blockPos.y
  }));

  return {
    id: state.enemyIdCounter,
    x, y,
    blockWidth: blockSize,
    blockHeight: blockSize,
    blocks,
    shapeWidth: shape.width,
    shapeHeight: shape.height,
    baseSpeed: 0.08,
    currentSpeed: 0.08,
    fastSpeed: 0.2,
    active: true,
    directionChangeTime: 0,
    randomAngle: Math.random() * Math.PI * 2,
    hasBeenHit: false,
    behavior: defaultBehaviorUpdate,
    // consumption state
    type: 'default',
    consumeLocked: false,     // lock movement while consuming
    consumeTarget: null,      // { row, col }
    consumeStartTime: 0,
    lastConsumeTick: 0
  };
}

export async function createEnemyFromPng(url, options = {}) {
  const { width: w, height: h, blocks: pix } = await loadPngShape(url, options.maxSize ?? 32);
  const blockSize = options.blockSize ?? 6;
  state.enemyIdCounter++;

  const blocks = pix.map(p => ({
    color: { r: 255, g: 255, b: 255 },
    painted: false,
    relX: p.x,
    relY: p.y
  }));

  const pixelWidth = w * blockSize;
  const x = Math.random() * Math.max(1, (state.worldWidth - pixelWidth));
  const y = Math.random() * 150;

  return {
    id: state.enemyIdCounter,
    x, y,
    blockWidth: blockSize,
    blockHeight: blockSize,
    blocks,
    shapeWidth: w,
    shapeHeight: h,
    baseSpeed: 0.08,
    currentSpeed: 0.08,
    fastSpeed: 0.2,
    active: true,
    directionChangeTime: 0,
    randomAngle: Math.random() * Math.PI * 2,
    hasBeenHit: false,
    behavior: defaultBehaviorUpdate,
    // consumption state
    type: 'default',
    consumeLocked: false,
    consumeTarget: null,
    consumeStartTime: 0,
    lastConsumeTick: 0
  };
}

export function getEnemyWidth(enemy) {
  return enemy.shapeWidth * enemy.blockWidth;
}

export function getEnemyHeight(enemy) {
  return enemy.shapeHeight * enemy.blockHeight;
}

export function initWave() {
  state.enemies.length = 0;
  state.totalSpawned = 0;
  state.maxEnemies = 50;
  state.maxActive = 8;
  state.spawnCooldown = 0;

  // Spawn initial batch
  for (let i = 0; i < state.maxActive; i++) {
    spawnEnemyNearPlayer(i === 0); // first one = frog
  }

  debug(`Oleada: ${state.wave} | Máximo: ${state.maxEnemies}`);
}

function spawnEnemyNearPlayer(isFrog = false) {
  if (state.totalSpawned >= state.maxEnemies) return;

  const player = state.player;
  const distance = 150 + Math.random() * 100;
  const angle = Math.random() * Math.PI * 2;

  const newEnemy = createEnemy();
  newEnemy.x = player.x + Math.cos(angle) * distance;
  newEnemy.y = player.y + Math.sin(angle) * distance;

  // Clamp to world limits
  const maxX = state.worldWidth - getEnemyWidth(newEnemy);
  const maxY = state.worldHeight ? state.worldHeight - 50 : 150;
  newEnemy.x = Math.max(0, Math.min(maxX, newEnemy.x));
  newEnemy.y = Math.max(0, Math.min(maxY, newEnemy.y));

  // Assign Frog to first spawn
  if (isFrog) newEnemy.behavior = frogBehavior;

  state.enemies.push(newEnemy);
  state.totalSpawned++;
}

