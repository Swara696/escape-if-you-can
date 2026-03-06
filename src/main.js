/**
 * main.js  –  Entry point
 */
import { StartScreen }      from '../ui/startScreen.js';
import { AttendanceSystem } from './attendanceSystem.js';
import { GameManager }      from './gameManager.js';
import { PlayerController } from './playerController.js';
import { LevelLoader }      from '../ui/levelLoader.js';
import { SoundSystem }      from './soundSystem.js';

function fakeLoadProgress(onDone) {
  const fill  = document.getElementById('loadingFill');
  const label = document.getElementById('loadingText');
  const steps = [
    [12,  'LOADING THREE.JS ENGINE...'],
    [28,  'BUILDING SCENE GRAPH...'],
    [48,  'COMPILING SHADERS...'],
    [65,  'LOADING LEVEL GEOMETRY...'],
    [80,  'INITIALISING AI SYSTEMS...'],
    [92,  'GENERATING AUDIO ENGINE...'],
    [100, 'READY — ENTER YOUR FATE'],
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) { onDone(); return; }
    const [pct, msg] = steps[i++];
    fill.style.width  = pct + '%';
    label.textContent = msg;
    setTimeout(tick, 280 + Math.random() * 180);
  };
  tick();
}

window.addEventListener('DOMContentLoaded', () => {
  fakeLoadProgress(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.transition = 'opacity 0.8s';
    loadingScreen.style.opacity    = '0';
    setTimeout(() => loadingScreen.style.display = 'none', 800);

    const canvas   = document.getElementById('gameCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled      = true;
    renderer.shadowMap.type         = THREE.PCFSoftShadowMap;
    renderer.toneMapping            = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure    = 1.3;
    renderer.outputEncoding         = THREE.sRGBEncoding;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 2000);
    const clock  = new THREE.Clock();

    const soundSystem      = new SoundSystem();
    const attendanceSystem = new AttendanceSystem();
    const levelLoader      = new LevelLoader(scene, camera, renderer);
    const gameManager      = new GameManager(scene, camera, renderer, levelLoader);
    const playerController = new PlayerController(camera, scene);

    window.GAME = { renderer, scene, camera, clock, gameManager, playerController, levelLoader, attendanceSystem, soundSystem };

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const startScreen = new StartScreen((attendance) => {
      const levelId = attendanceSystem.getLevelId(attendance);
      document.getElementById('attendanceDisplay').textContent = `ATTENDANCE: ${attendance}%`;
      gameManager.startGame(levelId, attendance);
    });
    startScreen.show();

    let animId;
    function gameLoop() {
      animId = requestAnimationFrame(gameLoop);
      const delta = Math.min(clock.getDelta(), 0.05); // cap delta to avoid spiral
      if (gameManager.isPlaying) {
        playerController.update(delta);
        gameManager.update(delta);
      }
      renderer.render(scene, camera);
    }
    gameLoop();
    window.GAME.stopLoop  = () => cancelAnimationFrame(animId);
    window.GAME.startLoop = gameLoop;
  });
});