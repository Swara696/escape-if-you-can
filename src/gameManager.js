/**
 * gameManager.js
 * ─────────────────────────────────────────────────────────────
 * Central orchestrator for:
 *   • Game state machine (idle → playing → paused → win/lose)
 *   • Health system (damage, heal, death)
 *   • Countdown timer
 *   • Stealth / detection meter
 *   • Scene switching via LevelLoader
 *   • Win / Lose screen injection
 *   • HUD updates
 * ─────────────────────────────────────────────────────────────
 */

export class GameManager {
  constructor(scene, camera, renderer, levelLoader) {
    this.scene       = scene;
    this.camera      = camera;
    this.renderer    = renderer;
    this.levelLoader = levelLoader;

    // ── State ─────────────────────────────────────────────────
    this.isPlaying     = false;
    this.isPaused      = false;
    this.gameOver      = false;

    // ── Stats ─────────────────────────────────────────────────
    this.maxHealth     = 100;
    this.health        = 100;
    this.timeLeft      = 300;   // seconds, overwritten per level
    this.detection     = 0;     // 0–100
    this.currentLevel  = null;
    this.currentLevelId = null;

    // ── HUD Element Refs ──────────────────────────────────────
    this.hudEl         = document.getElementById('hud');
    this.healthFill    = document.getElementById('healthFill');
    this.timerEl       = document.getElementById('timer');
    this.stealthFill   = document.getElementById('stealthFill');
    this.alertEl       = document.getElementById('alertMsg');
    this.levelNameEl   = document.getElementById('levelName');
    this.damageFlash   = document.getElementById('damageFlash');
    this.winScreen     = document.getElementById('winScreen');
    this.loseScreen    = document.getElementById('loseScreen');

    // ── Alert queue ───────────────────────────────────────────
    this._alertTimer   = null;

    // ── Minimap ───────────────────────────────────────────────
    this._minimapCanvas = document.getElementById('minimapCanvas');
    this._minimapCtx    = this._minimapCanvas ? this._minimapCanvas.getContext('2d') : null;
    this._minimapScale  = 1.4;   // world units per pixel

    // ── Pause on ESC ─────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isPlaying) this.togglePause();
    });
  }

  // ─── Start Game ───────────────────────────────────────────
  async startGame(levelId, attendance) {
    this.currentLevelId = levelId;
    this.health         = this.maxHealth;
    this.detection      = 0;
    this.gameOver       = false;
    this.isPaused       = false;

    // Load the level; get back the level module
    this.currentLevel = await this.levelLoader.load(levelId);

    // Set timer from level meta
    const meta    = this.currentLevel?.meta || {};
    this.timeLeft = meta.timeLimit || 300;

    // Update HUD label
    if (this.levelNameEl) this.levelNameEl.textContent = meta.name || levelId;

    // Show HUD
    if (this.hudEl) this.hudEl.style.display = 'block';

    this.isPlaying = true;
    this._updateHUD();
  }

  // ─── Main Update (called every frame) ─────────────────────
  update(delta) {
    if (!this.isPlaying || this.isPaused || this.gameOver) return;

    // Tick timer
    this.timeLeft -= delta;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this._triggerLose('TIME\'S UP');
    }

    // Update level AI / world
    if (this.currentLevel && this.currentLevel.update) {
      this.currentLevel.update(delta);
    }

    // Tick detection decay (slowly reduce detection when hidden)
    if (this.detection > 0 && !this._detected) {
      this.detection = Math.max(0, this.detection - delta * 5);
    }

    this._updateHUD();
    this._drawMinimap();
  }

  // ─── HUD Refresh ─────────────────────────────────────────
  _updateHUD() {
    // Health bar
    const hp = Math.max(0, (this.health / this.maxHealth) * 100);
    if (this.healthFill) {
      this.healthFill.style.width = hp + '%';
      if (hp < 30) {
        this.healthFill.style.background = 'linear-gradient(90deg,#7b0000,#c0392b)';
      } else {
        this.healthFill.style.background = 'linear-gradient(90deg,#c0392b,#e74c3c)';
      }
    }

    // Timer
    if (this.timerEl) {
      const m = Math.floor(this.timeLeft / 60);
      const s = Math.floor(this.timeLeft % 60);
      this.timerEl.textContent =
        String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
      this.timerEl.classList.toggle('danger', this.timeLeft < 30);
    }

    // Detection / stealth
    if (this.stealthFill) {
      this.stealthFill.style.width = Math.min(100, this.detection) + '%';
      if (this.detection > 70) {
        this.stealthFill.style.background = 'linear-gradient(90deg,#e74c3c,#c0392b)';
      } else if (this.detection > 40) {
        this.stealthFill.style.background = 'linear-gradient(90deg,#f39c12,#e67e22)';
      } else {
        this.stealthFill.style.background = 'linear-gradient(90deg,#00ffe7,#0080ff)';
      }
    }
  }

  // ─── Public API ───────────────────────────────────────────

  /** Deal damage to the player */
  takeDamage(amount) {
    if (this.gameOver) return;
    this.health = Math.max(0, this.health - amount);
    this._flashDamage();
    if (this.health <= 0) this._triggerLose('YOU WERE CAUGHT');
  }

  /** Heal the player */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** Increase detection meter */
  addDetection(amount) {
    this.detection = Math.min(100, this.detection + amount);
    if (this.detection >= 100) {
      this._detected = true;
      this.takeDamage(25);
      this.detection = 0;
      this._detected = false;
      this.showAlert('⚠ DETECTED!');
    }
  }

  /** Called by level when player reaches exit */
  triggerWin() {
    if (this.gameOver) return;
    this.gameOver  = true;
    this.isPlaying = false;
    this._showWinScreen();
  }

  /** Show a temporary HUD alert message */
  showAlert(msg, duration = 2500) {
    if (!this.alertEl) return;
    clearTimeout(this._alertTimer);
    this.alertEl.textContent = msg;
    this.alertEl.style.opacity = '1';
    this._alertTimer = setTimeout(() => {
      this.alertEl.style.opacity = '0';
    }, duration);
  }

  /** Toggle pause */
  togglePause() {
    this.isPaused = !this.isPaused;
    this.showAlert(this.isPaused ? '⏸  PAUSED – ESC TO RESUME' : '▶ RESUMED', 1500);
  }

  // ─── Private Helpers ──────────────────────────────────────

  _flashDamage() {
    if (!this.damageFlash) return;
    this.damageFlash.style.background = 'rgba(192,57,43,0.45)';
    setTimeout(() => {
      this.damageFlash.style.background = 'rgba(192,57,43,0)';
    }, 200);
    // Shake HUD
    if (this.hudEl) {
      this.hudEl.classList.add('shake');
      setTimeout(() => this.hudEl.classList.remove('shake'), 400);
    }
  }

  _triggerLose(reason) {
    if (this.gameOver) return;
    this.gameOver  = true;
    this.isPlaying = false;
    this._showLoseScreen(reason);
  }

  _showWinScreen() {
    if (!this.winScreen) return;
    const levelName = this.currentLevel?.meta?.name || 'SECTOR';
    const elapsed   = (this.currentLevel?.meta?.timeLimit || 300) - this.timeLeft;
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    this.winScreen.innerHTML = `
      <div style="
        background:rgba(0,0,0,0.92);
        border:1px solid #00ffe7;
        padding:60px 80px;
        text-align:center;
        font-family:'Courier New',monospace;
        color:#e8e8f0;
        max-width:480px;
        box-shadow:0 0 60px rgba(0,255,231,0.2);
      ">
        <div style="font-size:11px;letter-spacing:6px;color:#00ffe7;margin-bottom:20px">
          MISSION COMPLETE
        </div>
        <div style="font-size:36px;font-weight:700;margin-bottom:8px">YOU ESCAPED</div>
        <div style="color:#7a7a9a;margin-bottom:30px">${levelName}</div>
        <div style="font-size:13px;color:#00ffe7;margin-bottom:40px">
          TIME: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}&emsp;
          HEALTH: ${this.health}%
        </div>
        <button onclick="location.reload()" style="
          background:transparent;
          border:1px solid #00ffe7;
          color:#00ffe7;
          font-family:'Courier New',monospace;
          font-size:13px;
          letter-spacing:3px;
          padding:12px 30px;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.background='#00ffe7';this.style.color='#000'"
           onmouseout="this.style.background='transparent';this.style.color='#00ffe7'">
          PLAY AGAIN
        </button>
      </div>`;
    this.winScreen.style.display = 'flex';
  }

  _showLoseScreen(reason) {
    if (!this.loseScreen) return;
    this.loseScreen.innerHTML = `
      <div style="
        background:rgba(0,0,0,0.95);
        border:1px solid #c0392b;
        padding:60px 80px;
        text-align:center;
        font-family:'Courier New',monospace;
        color:#e8e8f0;
        max-width:480px;
        box-shadow:0 0 60px rgba(192,57,43,0.3);
      ">
        <div style="font-size:11px;letter-spacing:6px;color:#c0392b;margin-bottom:20px">
          MISSION FAILED
        </div>
        <div style="font-size:36px;font-weight:700;margin-bottom:8px">CAPTURED</div>
        <div style="color:#7a7a9a;margin-bottom:30px">${reason}</div>
        <div style="font-size:13px;color:#c0392b;margin-bottom:40px">
          YOU COULD NOT ESCAPE
        </div>
        <button onclick="location.reload()" style="
          background:transparent;
          border:1px solid #c0392b;
          color:#c0392b;
          font-family:'Courier New',monospace;
          font-size:13px;
          letter-spacing:3px;
          padding:12px 30px;
          cursor:pointer;
          transition:all 0.2s;
        " onmouseover="this.style.background='#c0392b';this.style.color='#000'"
           onmouseout="this.style.background='transparent';this.style.color='#c0392b'">
          TRY AGAIN
        </button>
      </div>`;
    this.loseScreen.style.display = 'flex';
  }

  // ─── Minimap Renderer ─────────────────────────────────────
  _drawMinimap() {
    const ctx = this._minimapCtx;
    if (!ctx) return;

    const W = 140, H = 140;
    const cx = W / 2, cy = H / 2;
    const scale = this._minimapScale;

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // World-to-minimap transform
    const toMap = (wx, wz) => ({
      x: cx + wx / scale,
      y: cy + wz / scale,
    });

    const level = this.currentLevel;

    // Draw level-specific static features
    if (level && level.meta) {
      const id = level.meta.id;

      if (id === 'level1') {
        // Corridor walls
        ctx.fillStyle = 'rgba(40,60,120,0.6)';
        ctx.fillRect(cx - 100/scale, cy - 80/scale, 200/scale, 1);
        ctx.fillRect(cx - 100/scale, cy + 80/scale, 200/scale, 1);
        // Exit marker
        const ex = toMap(0, -35);
        ctx.fillStyle = '#00ff44';
        ctx.fillRect(ex.x - 4, ex.y - 4, 8, 8);
      }

      if (id === 'level2') {
        // Buildings as rectangles
        const buildings = [
          [-28, 0, 18, 20], [28, 10, 16, 14], [0, -25, 20, 12]
        ];
        buildings.forEach(([bx, bz, bw, bd]) => {
          const p = toMap(bx, bz);
          ctx.fillStyle = 'rgba(60,80,150,0.5)';
          ctx.fillRect(p.x - bw/scale/2, p.y - bd/scale/2, bw/scale, bd/scale);
        });
        // Gate/exit
        const gate = toMap(0, -48);
        ctx.fillStyle = '#00ff44';
        ctx.fillRect(gate.x - 5, gate.y - 2, 10, 4);
      }

      if (id === 'level3') {
        // Extraction zone
        const ex = toMap(0, -55);
        ctx.strokeStyle = '#00ff44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (id === 'level4') {
        // Lighthouse
        const lh = toMap(0, -55);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lh.x, lh.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw enemies/entities from the level
      const enemies = level._guards || level._entities || level._drones || [];
      enemies.forEach(e => {
        const mesh = e.mesh;
        if (!mesh) return;
        const p = toMap(mesh.position.x, mesh.position.z);
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // HOD (level 1)
      if (level._hodMesh) {
        const p = toMap(level._hodMesh.position.x, level._hodMesh.position.z);
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw player
    const pc = window.GAME?.playerController;
    if (pc) {
      const pp = toMap(pc.position.x, pc.position.z);

      // Player direction indicator
      const yaw = pc.mesh ? pc.mesh.rotation.y : 0;
      ctx.strokeStyle = '#00ffe7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pp.x, pp.y);
      ctx.lineTo(
        pp.x + Math.sin(yaw) * 8,
        pp.y + Math.cos(yaw) * 8
      );
      ctx.stroke();

      // Player dot
      ctx.fillStyle = '#00ffe7';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Detection radius ring
      if (this.detection > 0) {
        ctx.strokeStyle = `rgba(255,${Math.floor(255 - this.detection * 2.5)},0,${this.detection / 100 * 0.8})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 10 + this.detection / 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Minimap border glow
    ctx.strokeStyle = 'rgba(0,255,231,0.3)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0, 0, W, H);

    // Cardinal labels
    ctx.fillStyle = 'rgba(0,255,231,0.3)';
    ctx.font      = '7px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 10);
    ctx.fillText('S', cx, H - 3);
    ctx.textAlign = 'left';
    ctx.fillText('W', 3, cy + 3);
    ctx.textAlign = 'right';
    ctx.fillText('E', W - 3, cy + 3);
  }
}