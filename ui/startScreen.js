/**
 * startScreen.js
 * ─────────────────────────────────────────────────────────────
 * Renders the cinematic start screen that asks the player
 * to enter their attendance percentage and shows a preview
 * of what world they'll enter.
 * ─────────────────────────────────────────────────────────────
 */

export class StartScreen {
  /**
   * @param {function(number): void} onStart – callback with attendance value
   */
  constructor(onStart) {
    this.onStart = onStart;
    this.el      = null;
  }

  show() {
    const mount = document.getElementById('startScreenMount');
    if (!mount) return;

    mount.innerHTML = `
      <div id="startOverlay" style="
        position:fixed; inset:0; z-index:100;
        background:#000;
        display:flex; align-items:center; justify-content:center;
        font-family:'Courier New',monospace;
        overflow:hidden;
      ">

        <!-- Animated background grid -->
        <canvas id="bgGrid" style="position:absolute;inset:0;opacity:0.15;pointer-events:none;"></canvas>

        <!-- Scanlines overlay -->
        <div style="
          position:absolute;inset:0;
          background:repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px
          );
          pointer-events:none;
        "></div>

        <!-- Main Panel -->
        <div style="
          position:relative;
          width:min(520px,90vw);
          padding:60px 50px;
          border:1px solid rgba(0,255,231,0.3);
          background:rgba(4,8,18,0.95);
          box-shadow:0 0 80px rgba(0,255,231,0.08), inset 0 0 40px rgba(0,0,0,0.5);
        ">
          <!-- Corner decorations -->
          <div style="position:absolute;top:0;left:0;width:20px;height:20px;
            border-top:2px solid #00ffe7;border-left:2px solid #00ffe7;"></div>
          <div style="position:absolute;top:0;right:0;width:20px;height:20px;
            border-top:2px solid #00ffe7;border-right:2px solid #00ffe7;"></div>
          <div style="position:absolute;bottom:0;left:0;width:20px;height:20px;
            border-bottom:2px solid #00ffe7;border-left:2px solid #00ffe7;"></div>
          <div style="position:absolute;bottom:0;right:0;width:20px;height:20px;
            border-bottom:2px solid #00ffe7;border-right:2px solid #00ffe7;"></div>

          <!-- Studio tag -->
          <div style="
            font-size:10px;letter-spacing:5px;color:rgba(0,255,231,0.5);
            margin-bottom:40px;text-align:center;
          ">◈ ANTHROPIC GAME LABS ◈</div>

          <!-- Title -->
          <div id="mainTitle" style="
            font-size:clamp(28px,5vw,42px);
            font-weight:900;
            letter-spacing:4px;
            text-align:center;
            color:#fff;
            text-shadow:0 0 40px rgba(0,255,231,0.4);
            margin-bottom:6px;
            line-height:1;
          ">ESCAPE</div>
          <div style="
            font-size:clamp(12px,2vw,16px);
            letter-spacing:10px;
            text-align:center;
            color:#00ffe7;
            margin-bottom:8px;
          ">IF YOU CAN</div>
          <div style="
            width:80px; height:1px;
            background:linear-gradient(90deg,transparent,#00ffe7,transparent);
            margin:0 auto 40px;
          "></div>

          <!-- Flavour text -->
          <div id="flavourText" style="
            text-align:center;
            font-size:12px;
            letter-spacing:1px;
            color:rgba(232,232,240,0.5);
            font-style:italic;
            margin-bottom:36px;
            min-height:20px;
            transition:all 0.4s;
          ">Your fate is determined by your attendance.</div>

          <!-- Level preview card with canvas scene illustration -->
          <div id="levelPreview" style="
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(0,0,0,0.4);
            margin-bottom:30px;
            transition:border-color 0.4s;
            overflow:hidden;
          ">
            <!-- Canvas preview image -->
            <canvas id="previewCanvas" width="420" height="120" style="
              width:100%; display:block;
              border-bottom:1px solid rgba(255,255,255,0.06);
            "></canvas>
            <!-- Text info row -->
            <div style="padding:12px 16px;">
              <div id="previewTitle" style="font-size:11px;letter-spacing:3px;color:#7a7a9a;margin-bottom:4px;">
                ENTER ATTENDANCE TO PREVIEW YOUR WORLD
              </div>
              <div id="previewName" style="font-size:15px;color:#fff;margin-bottom:3px;"></div>
              <div id="previewDesc" style="font-size:11px;color:#7a7a9a;"></div>
            </div>
          </div>

          <!-- Attendance Input -->
          <div style="margin-bottom:10px;">
            <label style="
              display:block;font-size:10px;
              letter-spacing:4px;color:#7a7a9a;
              margin-bottom:10px;
            ">ATTENDANCE PERCENTAGE (0 – 100)</label>
            <input
              id="attendanceInput"
              type="number"
              min="0" max="100"
              placeholder="e.g. 73"
              style="
                width:100%;
                background:rgba(0,255,231,0.04);
                border:1px solid rgba(0,255,231,0.3);
                color:#fff;
                font-family:'Courier New',monospace;
                font-size:22px;
                letter-spacing:4px;
                padding:14px 16px;
                outline:none;
                transition:border 0.2s, box-shadow 0.2s;
                -moz-appearance:textfield;
              "
            />
          </div>

          <!-- Error message -->
          <div id="inputError" style="
            font-size:11px;letter-spacing:2px;
            color:#e74c3c;margin-bottom:16px;
            min-height:16px;
          "></div>

          <!-- Level legend -->
          <div style="
            display:grid; grid-template-columns:1fr 1fr;
            gap:8px; margin-bottom:30px;
          ">
            ${this._legendItems()}
          </div>

          <!-- Start button -->
          <button id="startBtn" style="
            width:100%;
            background:transparent;
            border:1px solid #00ffe7;
            color:#00ffe7;
            font-family:'Courier New',monospace;
            font-size:13px;
            letter-spacing:5px;
            padding:16px;
            cursor:pointer;
            transition:all 0.2s;
            text-transform:uppercase;
          ">▶ ENTER THE WORLD</button>
        </div>
      </div>
    `;

    this.el = document.getElementById('startOverlay');

    // Wire up events
    this._startGrid();
    this._wireEvents();
  }

  _legendItems() {
    const items = [
      { range: '> 90%',    name: 'Dept. Escape',   color: '#00ffe7' },
      { range: '75–90%',   name: 'College Escape',  color: '#f39c12' },
      { range: '40–74%',   name: 'Warzone',         color: '#e74c3c' },
      { range: '< 40%',    name: 'Horror Island',   color: '#9b59b6' },
    ];
    return items.map(it => `
      <div style="
        border:1px solid rgba(255,255,255,0.07);
        padding:8px 10px;
        display:flex; align-items:center; gap:8px;
      ">
        <div style="width:6px;height:6px;border-radius:50%;background:${it.color};flex-shrink:0;"></div>
        <div>
          <div style="font-size:9px;letter-spacing:1px;color:#7a7a9a;">${it.range}</div>
          <div style="font-size:11px;color:#e8e8f0;">${it.name}</div>
        </div>
      </div>
    `).join('');
  }

  _wireEvents() {
    const input   = document.getElementById('attendanceInput');
    const btn     = document.getElementById('startBtn');
    const errorEl = document.getElementById('inputError');

    // Button hover
    btn.addEventListener('mouseover', () => {
      btn.style.background = '#00ffe7';
      btn.style.color      = '#000';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'transparent';
      btn.style.color      = '#00ffe7';
    });

    // Input focus style
    input.addEventListener('focus', () => {
      input.style.border     = '1px solid #00ffe7';
      input.style.boxShadow  = '0 0 15px rgba(0,255,231,0.15)';
    });
    input.addEventListener('blur', () => {
      input.style.boxShadow = 'none';
    });

    // Live preview while typing
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        errorEl.textContent = '';
        this._updatePreview(val);
      } else {
        this._clearPreview();
      }
    });

    // Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });

    // Start button
    btn.addEventListener('click', () => {
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 0 || val > 100) {
        errorEl.textContent = '⚠ Please enter a number between 0 and 100';
        input.focus();
        return;
      }
      errorEl.textContent = '';
      this._dismiss(() => this.onStart(val));
    });
  }

  _updatePreview(pct) {
    const gm = window.GAME?.attendanceSystem;
    if (!gm) {
      // Fallback inline preview
      const info = this._getPreviewInfo(pct);
      this._setPreview(info);
      return;
    }
    const levelId = gm.getLevelId(pct);
    const meta    = gm.getMeta(levelId);
    const flavour = gm.getFlavourText(pct);
    document.getElementById('flavourText').textContent = flavour;
    this._setPreview({
      color: meta.color,
      range: meta.range,
      name:  meta.name,
      desc:  meta.description,
      levelId,
    });
  }

  _getPreviewInfo(pct) {
    if (pct > 90)  return { color:'#00ffe7', range:'>90%',    levelId:'level1', name:'Department Sector', desc:'Escape the HOD surveillance corridor.' };
    if (pct >= 75) return { color:'#f39c12', range:'75-90%',  levelId:'level2', name:'College Campus',    desc:'Security patrols. CCTV watches all gates.' };
    if (pct >= 40) return { color:'#e74c3c', range:'40-74%',  levelId:'level3', name:'Warzone',           desc:'Explosions. Drones. No rules left.' };
    return               { color:'#9b59b6', range:'<40%',    levelId:'level4', name:'Horror Island',     desc:'Darkness, ruins, and things that hunt.' };
  }

  _setPreview({ color, range, name, desc, levelId }) {
    const preview = document.getElementById('levelPreview');
    preview.style.borderColor = color + '55';
    document.getElementById('previewTitle').textContent = `SECTOR — ${range}`;
    document.getElementById('previewTitle').style.color = color;
    document.getElementById('previewName').textContent  = name;
    document.getElementById('previewName').style.color  = color;
    document.getElementById('previewDesc').textContent  = desc;
    // Draw the canvas scene illustration
    this._drawLevelPreview(levelId || 'level1', color);
  }

  // ── Canvas level scene illustrations ─────────────────────
  _drawLevelPreview(levelId, accentColor) {
    const canvas = document.getElementById('previewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (levelId === 'level1') {
      // Department corridor – fluorescent lit hallway perspective
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0a0a20'); bg.addColorStop(1, '#111130');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Floor perspective lines
      ctx.strokeStyle = '#222244'; ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const x = (W / 8) * i;
        ctx.beginPath(); ctx.moveTo(x, H);
        ctx.lineTo(W/2, H * 0.3); ctx.stroke();
      }
      // Ceiling strips
      [0.25, 0.5, 0.75].forEach(t => {
        const x = W * t - 30 + t * 20;
        ctx.fillStyle = '#c8d8ff';
        ctx.shadowColor = '#c8d8ff'; ctx.shadowBlur = 12;
        ctx.fillRect(W/2 - 60 * (1-t*0.5), H * 0.28, 120 * (1-t*0.5+0.2), 3);
      });
      ctx.shadowBlur = 0;
      // Lockers
      ctx.fillStyle = '#2e4a7a';
      [[20, H*0.4, 30, H*0.55], [W-50, H*0.4, 30, H*0.55]].forEach(([x,y,w,h]) => {
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#1a2a4a'; ctx.lineWidth = 1;
        ctx.strokeRect(x+2, y+4, w-4, h*0.6);
      });
      // Exit glow at end
      const grd = ctx.createRadialGradient(W/2, H*0.3, 0, W/2, H*0.3, 40);
      grd.addColorStop(0, 'rgba(0,255,68,0.5)'); grd.addColorStop(1, 'rgba(0,255,68,0)');
      ctx.fillStyle = grd; ctx.fillRect(W/2-40, H*0.1, 80, 60);
      // HOD figure silhouette
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(W/2 - 8, H*0.35, 16, 30);
      ctx.beginPath(); ctx.arc(W/2, H*0.32, 8, 0, Math.PI*2); ctx.fill();
      // Label
      ctx.fillStyle = accentColor; ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'right'; ctx.fillText('DEPT. CORRIDOR — HOD PATROLS', W-10, H-10);

    } else if (levelId === 'level2') {
      // College campus – outdoors daytime
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#4a9edd'); sky.addColorStop(1, '#87ceeb');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // Ground
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, H*0.6, W, H*0.4);
      // Path
      ctx.fillStyle = '#888'; ctx.fillRect(W*0.4, H*0.6, W*0.2, H*0.4);
      // Buildings
      const bldgs = [[30, H*0.2, 80, H*0.4, '#2c3e6b'], [W-130, H*0.3, 70, H*0.3, '#6b3a2c'], [W/2-50, H*0.15, 100, H*0.45, '#3a3a5c']];
      bldgs.forEach(([x, y, w, h, c]) => {
        ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(x, y, w, 4);
        // Windows
        ctx.fillStyle = 'rgba(255,220,100,0.4)';
        for (let wy = y+10; wy < y+h-10; wy += 16) {
          for (let wx = x+6; wx < x+w-6; wx += 14) ctx.fillRect(wx, wy, 7, 9);
        }
      });
      // CCTV pole
      ctx.fillStyle = '#555'; ctx.fillRect(W*0.7, H*0.3, 4, H*0.3);
      ctx.fillStyle = '#111'; ctx.fillRect(W*0.7-8, H*0.3, 12, 6);
      // Red LED
      ctx.fillStyle = '#ff0000'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(W*0.7+8, H*0.3+3, 3, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Gate bars
      ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
      for (let gx = W/2-25; gx < W/2+25; gx += 8) {
        ctx.beginPath(); ctx.moveTo(gx, H*0.6); ctx.lineTo(gx, H*0.4); ctx.stroke();
      }
      ctx.fillStyle = accentColor; ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'right'; ctx.fillText('CAMPUS — REACH THE GATE', W-10, H-10);

    } else if (levelId === 'level3') {
      // Warzone – orange smoky sky, rubble
      const smoke = ctx.createLinearGradient(0, 0, 0, H);
      smoke.addColorStop(0, '#1a0a06'); smoke.addColorStop(0.5, '#3a1808'); smoke.addColorStop(1, '#1a0a06');
      ctx.fillStyle = smoke; ctx.fillRect(0, 0, W, H);
      // Broken buildings silhouettes
      const ruins = [[20,H*0.2,50,H*0.8],[90,H*0.3,40,H*0.7],[W-80,H*0.15,60,H*0.85],[W-160,H*0.25,45,H*0.75],[W/2-20,H*0.35,35,H*0.65]];
      ruins.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#1a1208';
        ctx.fillRect(x, y, w, H - y);
        // Jagged top
        ctx.fillStyle = '#0d0906';
        for (let rx = x; rx < x+w; rx += 6) {
          ctx.fillRect(rx, y - Math.random()*12, 5, 12);
        }
      });
      // Fire glow spots
      [[60,H*0.7],[W*0.6,H*0.75],[W*0.3,H*0.65]].forEach(([fx,fy]) => {
        const fg = ctx.createRadialGradient(fx,fy,0,fx,fy,25);
        fg.addColorStop(0,'rgba(255,150,0,0.8)'); fg.addColorStop(1,'rgba(255,50,0,0)');
        ctx.fillStyle = fg; ctx.fillRect(fx-25,fy-25,50,50);
      });
      // Drone shape
      ctx.fillStyle = '#111'; ctx.fillRect(W*0.7-10, H*0.2, 20, 6);
      ctx.fillStyle = '#ff2200'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(W*0.7, H*0.23, 3, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // Explosion flash
      const exg = ctx.createRadialGradient(W*0.45, H*0.5, 0, W*0.45, H*0.5, 35);
      exg.addColorStop(0,'rgba(255,200,50,0.9)'); exg.addColorStop(1,'rgba(255,80,0,0)');
      ctx.fillStyle = exg; ctx.fillRect(W*0.45-35,H*0.5-35,70,70);
      ctx.fillStyle = accentColor; ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'right'; ctx.fillText('WARZONE — REACH EXTRACTION', W-10, H-10);

    } else if (levelId === 'level4') {
      // Horror island – dark night, lighthouse beam
      ctx.fillStyle = '#01010a'; ctx.fillRect(0, 0, W, H);
      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(Math.random()*W, Math.random()*H*0.55, 1, 1);
      }
      // Island silhouette
      ctx.fillStyle = '#050308';
      ctx.beginPath(); ctx.moveTo(0, H);
      ctx.bezierCurveTo(W*0.1,H*0.5, W*0.3,H*0.45, W*0.5,H*0.5);
      ctx.bezierCurveTo(W*0.7,H*0.55, W*0.9,H*0.5, W,H);
      ctx.fill();
      // Dead trees
      [[80,H*0.5],[160,H*0.45],[W-100,H*0.48],[W-200,H*0.52]].forEach(([tx,ty]) => {
        ctx.strokeStyle = '#0a0a08'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx,H); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx,ty+10); ctx.lineTo(tx-15,ty-5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx,ty+5); ctx.lineTo(tx+12,ty-8); ctx.stroke();
      });
      // Lighthouse
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(W/2-5, H*0.2, 10, H*0.3);
      ctx.fillStyle = '#ffeeaa'; ctx.shadowColor='#ffeeaa'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(W/2, H*0.2, 6, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // Rotating beam
      const beamGrd = ctx.createConicalGradient
        ? null
        : (() => {
          const bg2 = ctx.createLinearGradient(W/2, H*0.2, W/2+100, H*0.5);
          bg2.addColorStop(0,'rgba(255,240,180,0.4)'); bg2.addColorStop(1,'rgba(255,240,180,0)');
          return bg2;
        })();
      if (beamGrd) {
        ctx.fillStyle = beamGrd;
        ctx.beginPath(); ctx.moveTo(W/2, H*0.2);
        ctx.lineTo(W/2+120, H*0.4); ctx.lineTo(W/2+80, H*0.5);
        ctx.closePath(); ctx.fill();
      }
      // Purple eye glow (creature)
      ctx.fillStyle = '#cc00ff'; ctx.shadowColor='#aa00ff'; ctx.shadowBlur=10;
      [[W*0.25, H*0.65],[W*0.75, H*0.7]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex+8, ey, 3, 0, Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur=0;
      ctx.fillStyle = accentColor; ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'right'; ctx.fillText('HORROR ISLAND — FIND LIGHTHOUSE', W-10, H-10);
    }
  }

  _clearPreview() {
    document.getElementById('previewTitle').textContent = 'ENTER ATTENDANCE TO PREVIEW YOUR WORLD';
    document.getElementById('previewTitle').style.color = '#7a7a9a';
    document.getElementById('previewName').textContent  = '';
    document.getElementById('previewDesc').textContent  = '';
  }

  _dismiss(cb) {
    if (!this.el) { cb(); return; }
    this.el.style.transition = 'opacity 0.6s';
    this.el.style.opacity    = '0';
    setTimeout(() => {
      this.el.style.display = 'none';
      cb();
    }, 600);
  }

  // Animated background grid on canvas
  _startGrid() {
    const canvas = document.getElementById('bgGrid');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    let t        = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!document.getElementById('bgGrid')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00ffe7';
      ctx.lineWidth   = 0.5;

      const step = 60;
      const offsetX = (t * 0.3) % step;
      const offsetY = (t * 0.2) % step;

      for (let x = -step + offsetX; x < canvas.width + step; x += step) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = -step + offsetY; y < canvas.height + step; y += step) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      t++;
      requestAnimationFrame(draw);
    };
    draw();
  }
}