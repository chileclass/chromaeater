import { ctx } from './state.js';
import { state } from './state.js';
import { installInputHandlers } from './input.js';
import { draw } from './render.js';
import { update } from './update.js';
import { movePlayer } from './movement.js';
import { nextMap } from './maps.js';
import { initWave } from './enemies.js';

function loop() {
  movePlayer();
  update();
  draw();
  requestAnimationFrame(loop);
}

function initializeGame() {
  nextMap()
    .then(() => {
      initWave();
      loop();
    })
    .catch(error => {
      console.error('Fallo crítico al iniciar el juego. No se pudo cargar el mapa:', error);
      const mapInfo = document.getElementById('mapInfo');
      if (mapInfo) mapInfo.textContent = 'Mapa: Error de Carga Inicial Crítico';
    });
}

installInputHandlers();
initializeGame();
