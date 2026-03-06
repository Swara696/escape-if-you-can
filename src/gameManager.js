/**
 * gameManager.js  –  Full rewrite
 * Now includes:
 *  • Objectives panel management
 *  • Sound integration
 *  • Stamina bar sync
 *  • Heartbeat when low health
 *  • Better win/lose screens
 */
export class GameManager {
  constructor(scene, camera, renderer, levelLoader) {
    this.scene       = scene;
    this.camera      = camera;
    this.renderer    = renderer;
    this.levelLoader = levelLoader;

    this.isPlaying      = false;
    this.isPaused       = false;
    this.gameOver       = false;

    this.maxHealth  = 100;
    this.health     = 100;
    this.timeLeft   = 300;
    this.detection  = 0;

    this.currentLevel   = null;
    this.currentLevelId = null;

    // HUD refs
    this.hudEl         = document.getElementById('hud');
    this.healthFill    = document.getElementById('healthFill');
    this.timerEl       = document.getElementById('timer');
    this.detectionFill = document.getElementById('detectionFill');
    this.alertEl       = document.getElementById('alertMsg');
    this.levelNameEl   = document.getElementById('levelName');
    this.damageFlash   = document.getElementById('damageFlash');
    this.winScreen     = document.getElementById('winScreen');
    this.loseScreen    = document.getElementById('loseScreen');
    this.objList       = document.getElementById('objList');

    this._alertTimer = null;
    this._objectives = [];   // [{ id, text, done, active }]

    // Minimap
    this._minimapCanvas = document.getElementById('minimapCanvas');
    this._minimapCtx    = this._minimapCanvas?.getContext('2d');

    document.addEventListener('keydown', e => {
      if (e.code === 'Escape' && this.isPlaying) this.togglePause();
    });
  }

  async startGame(levelId, attendance) {
    this.currentLevelId = levelId;
    this.health      = this.maxHealth;
    this.detection   = 0;
    this.gameOver    = false;
    this.isPaused    = false;

    this.currentLevel = await this.levelLoader.load(levelId);

    const meta      = this.currentLevel?.meta || {};
    this.timeLeft   = meta.timeLimit || 300;
    if (this.levelNameEl) this.levelNameEl.textContent = meta.name || levelId;

    // Set objectives from level
    this._objectives = this.currentLevel?.objectives || [];
    this._renderObjectives();

    // Start ambient sound
    window.GAME?.soundSystem?.startAmbient(levelId);

    if (this.hudEl) this.hudEl.style.display = 'block';
    this.isPlaying = true;
    this._updateHUD();
  }

  update(delta) {
    if (!this.isPlaying || this.isPaused || this.gameOver) return;

    this.timeLeft -= delta;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this._triggerLose("TIME'S UP");
    }

    if (this.currentLevel?.update) this.currentLevel.update(delta);

    if (this.detection > 0 && !this._detected)
      this.detection = Math.max(0, this.detection - delta * 4);

    // Heartbeat when low health
    const snd = window.GAME?.soundSystem;
    if (this.health < 30) snd?.startHeartbeat();
    else snd?.stopHeartbeat();

    this._updateHUD();
    this._drawMinimap();
  }

  _updateHUD() {
    const hp = Math.max(0, (this.health / this.maxHealth) * 100);
    if (this.healthFill) {
      this.healthFill.style.width = hp + '%';
      this.healthFill.style.background = hp < 30
        ? 'linear-gradient(90deg,#7b0000,#c0392b)'
        : 'linear-gradient(90deg,#c0392b,#e74c3c)';
    }

    if (this.timerEl) {
      const m = Math.floor(this.timeLeft / 60);
      const s = Math.floor(this.timeLeft % 60);
      this.timerEl.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
      this.timerEl.classList.toggle('danger', this.timeLeft < 30);
    }

    if (this.detectionFill) {
      this.detectionFill.style.width = Math.min(100, this.detection) + '%';
      this.detectionFill.style.background = this.detection > 70
        ? 'linear-gradient(90deg,#e74c3c,#c0392b)'
        : this.detection > 40
          ? 'linear-gradient(90deg,#f39c12,#e67e22)'
          : 'linear-gradient(90deg,#00ffe7,#0080ff)';
    }
  }

  // ── Objectives ──────────────────────────────────────────
  _renderObjectives() {
    if (!this.objList) return;
    this.objList.innerHTML = '';
    this._objectives.forEach(obj => {
      const div = document.createElement('div');
      div.className = 'obj-item ' + (obj.done ? 'done' : obj.active ? 'active' : '');
      div.dataset.objId = obj.id;
      div.innerHTML = `<div class="obj-dot"></div><span>${obj.text}</span>`;
      this.objList.appendChild(div);
    });
  }

  completeObjective(id) {
    const obj = this._objectives.find(o => o.id === id);
    if (!obj || obj.done) return;
    obj.done   = true;
    obj.active = false;
    // Activate next uncompleted
    const next = this._objectives.find(o => !o.done);
    if (next) next.active = true;
    this._renderObjectives();
    this.showAlert('✓ ' + obj.text, 2000);
    window.GAME?.soundSystem?.pickup();
  }

  setActiveObjective(id) {
    this._objectives.forEach(o => o.active = (o.id === id));
    this._renderObjectives();
  }

  // ── Public API ──────────────────────────────────────────
  takeDamage(amount) {
    if (this.gameOver) return;
    this.health = Math.max(0, this.health - amount);
    this._flashDamage();
    window.GAME?.soundSystem?.damage();
    if (this.health <= 0) this._triggerLose('YOU WERE CAUGHT');
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addDetection(amount) {
    this.detection = Math.min(100, this.detection + amount);
    if (this.detection >= 100) {
      this._detected = true;
      this.takeDamage(20);
      this.detection = 0;
      this._detected = false;
      this.showAlert('⚠ DETECTED! TAKE COVER', 2000);
      window.GAME?.soundSystem?.alert();
    }
  }

  triggerWin() {
    if (this.gameOver) return;
    this.gameOver  = true;
    this.isPlaying = false;
    window.GAME?.soundSystem?.win();
    window.GAME?.soundSystem?.stopAmbient();
    this._showWinScreen();
  }

  showAlert(msg, duration = 2500) {
    if (!this.alertEl) return;
    clearTimeout(this._alertTimer);
    this.alertEl.textContent = msg;
    this.alertEl.style.opacity = '1';
    if (duration < 99000)
      this._alertTimer = setTimeout(() => { this.alertEl.style.opacity = '0'; }, duration);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.showAlert(this.isPaused ? '⏸  PAUSED — ESC TO RESUME' : '▶ RESUMED', 1500);
  }

  _flashDamage() {
    if (!this.damageFlash) return;
    this.damageFlash.style.background = 'rgba(192,57,43,0.5)';
    setTimeout(() => { this.damageFlash.style.background = 'rgba(192,57,43,0)'; }, 180);
    this.hudEl?.classList.add('shake');
    setTimeout(() => this.hudEl?.classList.remove('shake'), 350);
  }

  _triggerLose(reason) {
    if (this.gameOver) return;
    this.gameOver  = true;
    this.isPlaying = false;
    window.GAME?.soundSystem?.lose();
    window.GAME?.soundSystem?.stopAmbient();
    this._showLoseScreen(reason);
  }

  _showWinScreen() {
    if (!this.winScreen) return;
    const elapsed = (this.currentLevel?.meta?.timeLimit || 300) - this.timeLeft;
    const m = Math.floor(elapsed/60), s = Math.floor(elapsed%60);
    const name = this.currentLevel?.meta?.name || 'SECTOR';
    const completedObjs = this._objectives.filter(o => o.done).length;
    const totalObjs     = this._objectives.length;
    this.winScreen.innerHTML = `
      <div style="background:rgba(0,0,0,0.94);border:1px solid #00ffe7;padding:55px 70px;text-align:center;font-family:'Courier New',monospace;color:#e8e8f0;max-width:460px;box-shadow:0 0 80px rgba(0,255,231,0.15);">
        <div style="font-size:9px;letter-spacing:6px;color:#00ffe7;margin-bottom:18px">◈ MISSION COMPLETE ◈</div>
        <div style="font-size:38px;font-weight:900;margin-bottom:6px;letter-spacing:2px;">ESCAPED</div>
        <div style="color:#7a7a9a;margin-bottom:28px;letter-spacing:2px;font-size:12px">${name.toUpperCase()}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:32px;">
          <div style="border:1px solid rgba(0,255,231,0.2);padding:12px;">
            <div style="font-size:9px;color:#7a7a9a;letter-spacing:2px;margin-bottom:6px">TIME</div>
            <div style="font-size:22px;color:#00ffe7">${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</div>
          </div>
          <div style="border:1px solid rgba(0,255,231,0.2);padding:12px;">
            <div style="font-size:9px;color:#7a7a9a;letter-spacing:2px;margin-bottom:6px">OBJECTIVES</div>
            <div style="font-size:22px;color:#00ffe7">${completedObjs}/${totalObjs}</div>
          </div>
          <div style="border:1px solid rgba(0,255,231,0.2);padding:12px;">
            <div style="font-size:9px;color:#7a7a9a;letter-spacing:2px;margin-bottom:6px">HEALTH</div>
            <div style="font-size:22px;color:${this.health>60?'#00ffe7':this.health>30?'#f39c12':'#e74c3c'}">${Math.round(this.health)}%</div>
          </div>
          <div style="border:1px solid rgba(0,255,231,0.2);padding:12px;">
            <div style="font-size:9px;color:#7a7a9a;letter-spacing:2px;margin-bottom:6px">ATTENDANCE</div>
            <div style="font-size:22px;color:#00ffe7">${document.getElementById('attendanceDisplay')?.textContent?.replace('ATTENDANCE: ','') || '--'}</div>
          </div>
        </div>
        <button onclick="location.reload()" style="background:transparent;border:1px solid #00ffe7;color:#00ffe7;font-family:'Courier New',monospace;font-size:12px;letter-spacing:4px;padding:13px 35px;cursor:pointer;transition:all .2s;width:100%"
          onmouseover="this.style.background='#00ffe7';this.style.color='#000'"
          onmouseout="this.style.background='transparent';this.style.color='#00ffe7'">
          ▶ PLAY AGAIN
        </button>
      </div>`;
    this.winScreen.style.display = 'flex';
  }

  _showLoseScreen(reason) {
    if (!this.loseScreen) return;
    this.loseScreen.innerHTML = `
      <div style="background:rgba(0,0,0,0.96);border:1px solid #c0392b;padding:55px 70px;text-align:center;font-family:'Courier New',monospace;color:#e8e8f0;max-width:460px;box-shadow:0 0 80px rgba(192,57,43,0.2);">
        <div style="font-size:9px;letter-spacing:6px;color:#c0392b;margin-bottom:18px">✗ MISSION FAILED ✗</div>
        <div style="font-size:38px;font-weight:900;margin-bottom:10px;letter-spacing:2px;">CAUGHT</div>
        <div style="color:#7a7a9a;margin-bottom:8px;letter-spacing:2px;font-size:13px">${reason}</div>
        <div style="color:rgba(192,57,43,0.7);margin-bottom:32px;font-size:11px;letter-spacing:1px">You could not escape. Try again.</div>
        <button onclick="location.reload()" style="background:transparent;border:1px solid #c0392b;color:#c0392b;font-family:'Courier New',monospace;font-size:12px;letter-spacing:4px;padding:13px 35px;cursor:pointer;transition:all .2s;width:100%"
          onmouseover="this.style.background='#c0392b';this.style.color='#000'"
          onmouseout="this.style.background='transparent';this.style.color='#c0392b'">
          ↺ TRY AGAIN
        </button>
      </div>`;
    this.loseScreen.style.display = 'flex';
  }

  // ── Minimap ──────────────────────────────────────────────
  _drawMinimap() {
    const ctx = this._minimapCtx;
    if (!ctx) return;
    const W = 130, H = 130, cx = W/2, cy = H/2, scale = 1.4;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0,0,W,H);

    const toMap = (wx, wz) => ({ x: cx + wx/scale, y: cy + wz/scale });
    const level = this.currentLevel;

    if (level?.meta) {
      const id = level.meta.id;
      if (id === 'level1') {
        ctx.strokeStyle='rgba(40,60,120,0.5)'; ctx.lineWidth=8;
        ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
        const ex = toMap(0,-35); ctx.fillStyle='#00ff44';
        ctx.fillRect(ex.x-5,ex.y-5,10,10);
      }
      if (id === 'level2') {
        [[-28,0,18,20],[28,10,16,14],[0,-25,20,12]].forEach(([bx,bz,bw,bd]) => {
          const p = toMap(bx,bz);
          ctx.fillStyle='rgba(50,80,160,0.45)';
          ctx.fillRect(p.x-bw/scale/2, p.y-bd/scale/2, bw/scale, bd/scale);
        });
        const g = toMap(0,-48); ctx.fillStyle='#00ff44'; ctx.fillRect(g.x-6,g.y-2,12,4);
      }
      if (id === 'level3') {
        const ex = toMap(0,-55); ctx.strokeStyle='#00ff44'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(ex.x,ex.y,6,0,Math.PI*2); ctx.stroke();
      }
      if (id === 'level4') {
        const lh = toMap(0,-55); ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.arc(lh.x,lh.y,5,0,Math.PI*2); ctx.fill();
      }

      // Enemies
      const enemies = [...(level._guards||[]), ...(level._entities||[]), ...(level._drones||[])];
      if (level._hodMesh) enemies.push({ mesh: level._hodMesh });
      enemies.forEach(e => {
        if (!e.mesh) return;
        const p = toMap(e.mesh.position.x, e.mesh.position.z);
        ctx.fillStyle='#ff3333';
        ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
      });
    }

    // Player
    const pc = window.GAME?.playerController;
    if (pc) {
      const pp = toMap(pc.position.x, pc.position.z);
      const yaw = pc.mesh ? -pc.mesh.rotation.y : 0;
      ctx.strokeStyle='#00ffe7'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(pp.x,pp.y);
      ctx.lineTo(pp.x+Math.sin(yaw)*9, pp.y+Math.cos(yaw)*9); ctx.stroke();
      ctx.fillStyle='#00ffe7';
      ctx.beginPath(); ctx.arc(pp.x,pp.y,4,0,Math.PI*2); ctx.fill();
      if (this.detection>0) {
        ctx.strokeStyle=`rgba(255,${Math.floor(255-this.detection*2.5)},0,${this.detection/100*0.7})`;
        ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(pp.x,pp.y,10+this.detection/10,0,Math.PI*2); ctx.stroke();
      }
    }

    ctx.strokeStyle='rgba(0,255,231,0.25)'; ctx.lineWidth=1; ctx.strokeRect(0,0,W,H);
    ctx.fillStyle='rgba(0,255,231,0.3)'; ctx.font='7px Courier New';
    ctx.textAlign='center'; ctx.fillText('N',cx,10); ctx.fillText('S',cx,H-3);
    ctx.textAlign='left';  ctx.fillText('W',3,cy+3);
    ctx.textAlign='right'; ctx.fillText('E',W-3,cy+3);
  }
}