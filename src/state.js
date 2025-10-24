export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
// Fix viewport size; world can be larger/smaller and camera will scroll
canvas.width = canvas.width; // preserve initial width set in HTML
canvas.height = canvas.height; // preserve initial height set in HTML

export const hud = document.getElementById('hud');
export const waveInfo = document.getElementById('waveInfo');
export const toleranceInfo = document.getElementById('toleranceInfo');
export const mapInfo = document.getElementById('mapInfo');
export const debugInfo = document.getElementById('debugInfo');

export const state = {
  player: { x: 400, y: 500, size: 20, speed: 4, color: 'white' },
  enemies: [],
  fallenBlocks: [],
  effects: [],
  projectiles: [],
  zoomLevel: 1.5,
  scale: 7,
  worldWidth: canvas.width,
  worldHeight: canvas.height,

  colorMode: 'RGB',
  palettes: {
    RGB: {
      '1': { r: 255, g: 0, b: 0, name: 'Rojo' },
      '2': { r: 0, g: 255, b: 0, name: 'Verde' },
      '3': { r: 0, g: 0, b: 255, name: 'Azul' }
    },
    MYC: {
      '1': { r: 255, g: 0, b: 255, name: 'Magenta' },
      '2': { r: 255, g: 255, b: 0, name: 'Amarillo' },
      '3': { r: 0, g: 255, b: 255, name: 'Cian' }
    }
  },
  selectedColor: null,
  opacity: 0.1,

  toleranceLevels: [
    { name: 'Media', value: 35 },
    { name: 'Alta', value: 50 },
    { name: 'Muy Alta', value: 70 }
  ],
  currentTolerance: 0,

  lastHitEnemy: null,
  mouseX: 0,
  mouseY: 0,
  wave: 1,
  currentMap: -1,
  mapsList: [],
  backgroundImage: null,
  backgroundGrid: [],
  enemyIdCounter: 0,

  gridCols: 8,
  gridRows: 6,

  lastSlashTime: 0,
  slashCooldown: 250,

  lastBurstTime: 0,
  burstCooldown: 3000,

  lastExplosionTime: 0,
  explosionCooldown: 3000,

  leftMouseDownTime: 0,
  chargeTime: 500,
  isCharged: false,

  lastCheckTime: 0,
  checkCooldown: 500,
  darkenEffect: 0,
  DARKEN_DURATION: 15,

  keys: {},

  // White overlay/consumption system
  whiteLossThreshold: 0.8, // configurable loss threshold
  whiteFullCount: 0,       // number of tiles at 100% white overlay
  totalTiles: 0,           // total grid tiles for percentage
  gameOver: false,
  gameStartTime: 0,
  nextLossCheckTime: 0,

  // Consumption behavior configuration
  consumption: {
    initialDelayMs: 1000,     // 1s delay before boost
    initialBoost: 0.10,       // +10% immediate boost
    // Given two enemy types, keep both the same as requested
    ratesByType: {            // per-second rates after boost
      default: 0.05,
      frog: 0.05
    },
    decayDurationMs: 5000,    // 5s linear decay to minimum
    minTouchedOpacity: 0.10   // tiles never drop below 10% once touched
  },

  // Runtime tracking for efficient updates
  enemyTileConsumption: {},   // enemyId -> Set of "row,col" tile keys
  decayingTiles: new Set(),   // Set of tile keys currently decaying
  deadEnemiesQueue: []        // enemyIds that died this frame; processed by update loop
};

export function getCellWidth() { return state.worldWidth / state.gridCols; }
export function getCellHeight() { return state.worldHeight / state.gridRows; }
