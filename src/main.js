/**
 * main.js
 * ─────────────────────────────────────────────────────────────
 * Entry point for "Escape If You Can".
 * Initialises the Three.js renderer, wires together all modules,
 * and starts the render / game loop.
 * ─────────────────────────────────────────────────────────────
 */

import { StartScreen }        from '../ui/startScreen.js';
import { AttendanceSystem }   from './attendanceSystem.js';
import { GameManager }        from './gameManager.js';
import { PlayerController }   from './playerController.js';
import { LevelLoader }        from '../ui/levelLoader.js';

// ─── Simulated loading progress ───────────────────────────────
function fakeLoadProgress(onDone) {
  const fill  = document.getElementById('loadingFill');
  const label = document.getElementById('loadingText');
  const steps = [
    [10,  'LOADING THREE.JS ENGINE...'],
    [30,  'BUILDING SCENE GRAPH...'],
    [55,  'COMPILING SHADERS...'],
    [75,  'LOADING LEVEL ASSETS...'],
    [90,  'INITIALISING AI SYSTEMS...'],
    [100, 'READY'],
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) { onDone(); return; }
    const [pct, msg] = steps[i++];
    fill.style.width  = pct + '%';
    label.textContent = msg;
    setTimeout(tick, 300 + Math.random() * 200);
  };
  tick();
}

// ─── Bootstrap ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  fakeLoadProgress(() => {
    // Hide loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.transition = 'opacity 0.8s';
    loadingScreen.style.opacity    = '0';
    setTimeout(() => loadingScreen.style.display = 'none', 800);

    // ── Create Three.js Renderer ──────────────────────────────
    const canvas   = document.getElementById('gameCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding    = THREE.sRGBEncoding;

    // ── Main Scene & Camera ───────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70, window.innerWidth / window.innerHeight, 0.1, 2000
    );

    // ── Clock for delta-time ──────────────────────────────────
    const clock = new THREE.Clock();

    // ── Module Instances ──────────────────────────────────────
    const attendanceSystem = new AttendanceSystem();
    const levelLoader      = new LevelLoader(scene, camera, renderer);
    const gameManager      = new GameManager(scene, camera, renderer, levelLoader);
    const playerController = new PlayerController(camera, scene);

    // Expose globally so modules can cross-communicate
    window.GAME = {
      renderer, scene, camera, clock,
      gameManager, playerController, levelLoader, attendanceSystem,
    };

    // ── Handle Resize ─────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Show Start Screen ─────────────────────────────────────
    const startScreen = new StartScreen((attendance) => {
      // Determine level from attendance
      const levelId = attendanceSystem.getLevelId(attendance);

      // Update HUD attendance display
      document.getElementById('attendanceDisplay').textContent =
        `ATTENDANCE: ${attendance}%`;

      // Load the level
      gameManager.startGame(levelId, attendance);
    });

    startScreen.show();

    // ── Main Render Loop ──────────────────────────────────────
    let animId;
    function gameLoop() {
      animId = requestAnimationFrame(gameLoop);
      const delta = clock.getDelta();

      // Update active systems
      if (gameManager.isPlaying) {
        playerController.update(delta);
        gameManager.update(delta);
      }

      renderer.render(scene, camera);
    }

    gameLoop();

    // Expose loop control
    window.GAME.stopLoop  = () => cancelAnimationFrame(animId);
    window.GAME.startLoop = () => gameLoop();
  });
});