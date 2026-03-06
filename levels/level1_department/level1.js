/**
 * level1.js  –  DEPARTMENT SECTOR  (Attendance > 90%)
 * Rich corridor environment with:
 *  • Detailed tiled floor, drop ceiling, fluorescent panels
 *  • Classroom doors with labels CR-101 etc
 *  • Notice boards, water cooler, chairs, tables
 *  • HOD with name tag + vision cone AI
 *  • 2 keys + 2 distractors + objectives system
 */
export class Level1 {
  constructor(scene, camera, renderer) {
    this.scene = scene; this.camera = camera; this.renderer = renderer;
    this.meta = { id:'level1', name:'Department Sector', timeLimit:300, color:'#00ffe7' };
    this.spawnPoint = { x:0, y:0.9, z:32 };
    this.bounds     = 50;

    this.objectives = [
      { id:'find_key1',  text:'Find the first key (near classrooms)',    done:false, active:true  },
      { id:'find_key2',  text:'Find the second key (near HOD office)',   done:false, active:false },
      { id:'reach_exit', text:'Unlock and reach the EXIT door',          done:false, active:false },
    ];

    this._hodWaypoints = [
      new THREE.Vector3(-8,0,10), new THREE.Vector3(-8,0,-10),
      new THREE.Vector3(8,0,-10), new THREE.Vector3(8,0,10),
    ];
    this._hodWpIndex = 0; this._hodSpeed = 3.2; this._hodMesh = null;
    this._interactables = [];
    this._keysCollected = 0; this._keysNeeded = 2;
    this._exitPos = new THREE.Vector3(0,0,-36);
  }

  _tag(o) { o.userData.levelObject = true; return o; }

  async init() {
    this._buildFloor();
    this._buildWalls();
    this._buildCeiling();
    this._buildFurniture();
    this._buildHOD();
    this._buildInteractables();
    this._buildExit();
    this._setupLighting();
    this._setupFog();
    // Welcome message
    setTimeout(() => window.GAME?.gameManager?.showAlert('Find 2 keys to unlock the exit!', 4000), 1200);
  }

  _buildFloor() {
    const s = this.scene;
    // Checkered tile floor
    const floorMat = new THREE.MeshStandardMaterial({ color:0x1e2236, roughness:0.4, metalness:0.3 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26,78,13,39), floorMat);
    floor.rotation.x = -Math.PI/2; floor.receiveShadow = true;
    this._tag(floor); s.add(floor);

    // Tile lines
    const lineMat = new THREE.MeshStandardMaterial({ color:0x12142a });
    for (let z=-38; z<38; z+=2) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(26,0.04), lineMat);
      line.rotation.x = -Math.PI/2; line.position.set(0,0.01,z);
      this._tag(line); s.add(line);
    }
    for (let x=-12; x<12; x+=2) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.04,78), lineMat);
      line.rotation.x = -Math.PI/2; line.position.set(x,0.01,0);
      this._tag(line); s.add(line);
    }
  }

  _buildWalls() {
    const s = this.scene;
    const wallMat = new THREE.MeshStandardMaterial({ color:0x2a2c44, roughness:0.85 });

    const addWall = (x,y,z,w,h,d) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat.clone());
      m.position.set(x,y,z); m.castShadow = m.receiveShadow = true;
      this._tag(m); s.add(m); return m;
    };
    addWall(-13,3,0,  0.4,6,80);   // left
    addWall( 13,3,0,  0.4,6,80);   // right
    addWall(0,3,-40,  26,6,0.4);   // back
    addWall(0,3,40,   26,6,0.4);   // front

    // Skirting boards
    const skirtM = new THREE.MeshStandardMaterial({ color:0x111118, roughness:0.9 });
    [-13,13].forEach(x => {
      const sk = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.18,80), skirtM);
      sk.position.set(x,0.09,0); this._tag(sk); s.add(sk);
    });

    // Classroom partition walls (perpendicular short walls)
    [-20,-8,8,20].forEach(z => {
      const pw = new THREE.Mesh(new THREE.BoxGeometry(4,6,0.3), wallMat.clone());
      pw.position.set(-11,3,z); pw.castShadow = pw.receiveShadow = true;
      this._tag(pw); s.add(pw);
    });
    [-15,5].forEach(z => {
      const pw = new THREE.Mesh(new THREE.BoxGeometry(4,6,0.3), wallMat.clone());
      pw.position.set(11,3,z); pw.castShadow = pw.receiveShadow = true;
      this._tag(pw); s.add(pw);
    });

    // Classroom doors with numbers
    const doorMat = new THREE.MeshStandardMaterial({ color:0x3d2006, roughness:0.7, metalness:0.1 });
    const rooms = [
      { x:-12.8, z:-14, num:'CR-101' }, { x:-12.8, z:0,  num:'CR-102' },
      { x:-12.8, z:14,  num:'CR-103' }, { x:12.8,  z:-10, num:'CR-104' },
      { x:12.8,  z:10,  num:'CR-105' },
    ];
    rooms.forEach(r => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.12,2.8,1.6), doorMat);
      door.position.set(r.x, 1.4, r.z); door.castShadow = true;
      this._tag(door); s.add(door);
      // Door handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.08,0.25),
        new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.8}));
      handle.position.set(r.x>0?-0.1:0.1, 1.2, r.z+0.4);
      this._tag(handle); s.add(handle);
      // Room number plate
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.25,0.55),
        new THREE.MeshStandardMaterial({color:0x4a6fa5, emissive:0x1a3060, emissiveIntensity:0.3}));
      plate.position.set(r.x>0?-0.1:0.1, 1.9, r.z);
      this._tag(plate); s.add(plate);
    });
  }

  _buildCeiling() {
    const s = this.scene;
    // Drop ceiling tiles
    const ceilMat = new THREE.MeshStandardMaterial({ color:0x161620, roughness:0.95 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26,80), ceilMat);
    ceil.rotation.x = Math.PI/2; ceil.position.y = 5.8;
    this._tag(ceil); s.add(ceil);

    // Ceiling grid lines
    const gridM = new THREE.MeshStandardMaterial({ color:0x0d0d16 });
    for (let z=-38; z<38; z+=4) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(26,0.04,0.06), gridM);
      l.position.set(0,5.78,z); this._tag(l); s.add(l);
    }
    for (let x=-12; x<12; x+=4) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,80), gridM);
      l.position.set(x,5.78,0); this._tag(l); s.add(l);
    }
  }

  _buildFurniture() {
    const s = this.scene;
    // Lockers along left wall
    const lockerM = new THREE.MeshStandardMaterial({color:0x2e4a7a, roughness:0.6, metalness:0.2});
    for (let z=-30; z<30; z+=2.2) {
      const lk = new THREE.Mesh(new THREE.BoxGeometry(0.7,2.6,0.9), lockerM.clone());
      lk.position.set(-12.2, 1.3, z); lk.castShadow = lk.receiveShadow = true;
      this._tag(lk); s.add(lk);
      // Locker ventilation slots
      const slotM = new THREE.MeshStandardMaterial({color:0x1a2a4a});
      for (let sy=0.4; sy<1.2; sy+=0.25) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.06,0.6), slotM);
        slot.position.set(-11.82, lk.position.y-0.5+sy, z);
        this._tag(slot); s.add(slot);
      }
    }

    // Benches
    const benchM = new THREE.MeshStandardMaterial({color:0x5c3317, roughness:0.9});
    [[6,0.25,24],[6,0.25,-24],[-6,0.25,24],[-6,0.25,-24]].forEach(([x,y,z]) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4,0.2,0.6), benchM);
      bench.position.set(x,y,z); bench.castShadow = bench.receiveShadow = true;
      this._tag(bench); s.add(bench);
      // Bench legs
      [[-0.9,-0.8],[0.9,-0.8],[-0.9,0.8],[0.9,0.8]].forEach(([lx,lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.5,0.1), benchM.clone());
        leg.position.set(x+lx,-0.1,z+lz); this._tag(leg); s.add(leg);
      });
    });

    // Notice board
    const boardM = new THREE.MeshStandardMaterial({color:0x6b3a0a});
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.5,1.8,0.1), boardM);
    board.position.set(5, 3.2, 39.7); this._tag(board); s.add(board);
    // Pinned papers on board
    const paperM = new THREE.MeshStandardMaterial({color:0xf5f0e0});
    [[0.6,0.3],[-0.5,0.2],[0.1,-0.3]].forEach(([ox,oy]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.55), paperM.clone());
      p.position.set(5+ox, 3.2+oy, 39.72); this._tag(p); s.add(p);
    });
    // "ATTENDANCE REQUIRED" red sign
    const warnSign = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.5,0.06),
      new THREE.MeshStandardMaterial({color:0xcc0000, emissive:0x880000, emissiveIntensity:0.5}));
    warnSign.position.set(-5, 3.5, 39.7); this._tag(warnSign); s.add(warnSign);

    // Water cooler
    const coolerM = new THREE.MeshStandardMaterial({color:0xdde8f0, roughness:0.3, metalness:0.5});
    const cooler = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,1.1,10), coolerM);
    cooler.position.set(11,0.55,28); this._tag(cooler); s.add(cooler);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.4,10),
      new THREE.MeshStandardMaterial({color:0x88ccff, transparent:true, opacity:0.7}));
    bottle.position.set(11,1.35,28); this._tag(bottle); s.add(bottle);

    // HOD Office door (end of corridor)
    const hodDoorM = new THREE.MeshStandardMaterial({color:0x1a0800, roughness:0.5, metalness:0.2});
    const hodDoor = new THREE.Mesh(new THREE.BoxGeometry(3,3.5,0.15), hodDoorM);
    hodDoor.position.set(0,1.75,-38.5); this._tag(hodDoor); s.add(hodDoor);
    // HOD nameplate
    const namePlate = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.35,0.08),
      new THREE.MeshStandardMaterial({color:0xd4af37, emissive:0xaa8800, emissiveIntensity:0.6}));
    namePlate.position.set(0,2.6,-38.4); this._tag(namePlate); s.add(namePlate);
  }

  _buildHOD() {
    const s = this.scene;
    const body = new THREE.Group();

    // Torso (suit)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.65,0.27),
      new THREE.MeshStandardMaterial({color:0x0a0a18, roughness:0.8}));
    torso.position.y = 0.55; torso.castShadow = true;
    body.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.32),
      new THREE.MeshStandardMaterial({color:0xb8895a, roughness:0.8}));
    head.position.y = 1.08; head.castShadow = true;
    body.add(head);

    // Glasses
    const glassM = new THREE.MeshStandardMaterial({color:0x111111, metalness:0.7});
    [-0.1,0.1].forEach(x => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.055,0.012,6,12), glassM);
      lens.position.set(x, 0.05, 0.17); lens.rotation.y = Math.PI/2;
      head.add(lens);
    });

    // Arms (suit sleeves)
    const armM = new THREE.MeshStandardMaterial({color:0x0a0a18});
    [-0.34,0.34].forEach(x => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.55,0.16), armM);
      arm.position.set(x, 0.35, 0); arm.castShadow = true;
      body.add(arm);
    });

    // Legs
    const legM = new THREE.MeshStandardMaterial({color:0x050510});
    [-0.14,0.14].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.6,0.2), legM);
      leg.position.set(x, -0.1, 0); leg.castShadow = true;
      body.add(leg);
      // Shoes
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.32),
        new THREE.MeshStandardMaterial({color:0x080808, metalness:0.3}));
      shoe.position.set(x, -0.45, 0.05); body.add(shoe);
    });

    // Vision cone (flashlight-style)
    const coneGeo = new THREE.ConeGeometry(3,8,8,1,true);
    const coneMat = new THREE.MeshBasicMaterial({color:0xffff66, transparent:true, opacity:0.05, side:THREE.DoubleSide});
    this._hodCone = new THREE.Mesh(coneGeo, coneMat);
    this._hodCone.rotation.x = Math.PI/2; this._hodCone.position.z = -4;
    body.add(this._hodCone);

    body.position.copy(this._hodWaypoints[0]); body.position.y = 0.65;
    this._tag(body); s.add(body); this._hodMesh = body;
  }

  _buildInteractables() {
    this._spawnKey(new THREE.Vector3(-9, 0.3, -4),   'KEY_1');
    this._spawnKey(new THREE.Vector3( 9, 0.3, -24),  'KEY_2');
    this._spawnDistractor(new THREE.Vector3(-5, 0.4, 22), 'PAPER_BALL');
    this._spawnDistractor(new THREE.Vector3( 5, 0.4, 18), 'CHALK');
  }

  _spawnKey(pos, id) {
    const g = new THREE.Group();
    // Key ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14,0.04,6,12),
      new THREE.MeshStandardMaterial({color:0xd4af37, emissive:0xd4af37, emissiveIntensity:0.7, metalness:0.9}));
    ring.rotation.x = Math.PI/2; g.add(ring);
    // Key shank
    const shank = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,0.22),
      new THREE.MeshStandardMaterial({color:0xc8a000, metalness:0.8}));
    shank.position.z = 0.2; g.add(shank);
    // Key teeth
    [0.04,0.1,0.16].forEach(tz => {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,0.04),
        new THREE.MeshStandardMaterial({color:0xc8a000, metalness:0.8}));
      tooth.position.set(0.05, 0, tz); g.add(tooth);
    });
    g.position.copy(pos);
    g.userData.interactId = id; g.userData.type = 'key';

    // Glow
    const kl = new THREE.PointLight(0xd4af37, 1.2, 2.5);
    kl.position.copy(pos); kl.position.y += 0.5;
    this._tag(kl); this.scene.add(kl);

    this._tag(g); this.scene.add(g);
    this._interactables.push({ mesh:g, type:'key', id });
  }

  _spawnDistractor(pos, id) {
    const isChalr = id === 'CHALK';
    const geo = isChalr
      ? new THREE.CylinderGeometry(0.04,0.04,0.18,8)
      : new THREE.SphereGeometry(0.1,8,8);
    const mesh = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({color: isChalr ? 0xfaf0e0 : 0xd4e0f0, roughness:0.9}));
    mesh.position.copy(pos);
    mesh.userData.interactId = id; mesh.userData.type = 'distractor';
    this._tag(mesh); this.scene.add(mesh);
    this._interactables.push({ mesh, type:'distractor', id });
  }

  _buildExit() {
    const s = this.scene;
    const frameM = new THREE.MeshStandardMaterial({color:0x003300, emissive:0x002200, emissiveIntensity:0.4});
    const frame  = new THREE.Mesh(new THREE.BoxGeometry(3.2,4.8,0.25), frameM);
    frame.position.copy(this._exitPos); frame.position.y = 2.4;
    this._tag(frame); s.add(frame);

    // EXIT green glowing sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.45,0.1),
      new THREE.MeshStandardMaterial({color:0x00ff44, emissive:0x00ff44, emissiveIntensity:1.5}));
    sign.position.copy(this._exitPos); sign.position.y = 5.4;
    this._tag(sign); s.add(sign);

    const el = new THREE.PointLight(0x00ff44, 2, 6);
    el.position.copy(this._exitPos); el.position.y = 5;
    this._tag(el); s.add(el); this._exitLight = el;

    // LOCKED indicator
    this._lockedSign = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.4,0.1),
      new THREE.MeshStandardMaterial({color:0xff2200, emissive:0xff1100, emissiveIntensity:0.9}));
    this._lockedSign.position.copy(this._exitPos); this._lockedSign.position.y = 4.7;
    this._tag(this._lockedSign); s.add(this._lockedSign);
  }

  _setupLighting() {
    const s = this.scene;
    const ambient = new THREE.AmbientLight(0x8090cc, 1.4);
    this._tag(ambient); s.add(ambient);

    [-28,-14,0,14,28].forEach(z => {
      const pl = new THREE.PointLight(0xe0e8ff, 2.8, 24);
      pl.position.set(0, 5.5, z); pl.castShadow = true;
      this._tag(pl); s.add(pl);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(6,0.08,0.5),
        new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xd0e0ff, emissiveIntensity:1.0}));
      panel.position.set(0, 5.7, z);
      this._tag(panel); s.add(panel);
    });

    const hodLight = new THREE.PointLight(0xffaa44, 2, 12);
    hodLight.position.set(0,4,-36); this._tag(hodLight); s.add(hodLight);
  }

  _setupFog() {
    this.scene.background = new THREE.Color(0x0a0a1c);
    this.scene.fog = new THREE.FogExp2(0x0a0a1c, 0.022);
  }

  update(delta) {
    this._updateHOD(delta);
    this._animateKeys(delta);
    this._checkExit();
  }

  _updateHOD(delta) {
    if (!this._hodMesh) return;
    const gm = window.GAME?.gameManager;
    const pc = window.GAME?.playerController;
    const hod = this._hodMesh;

    const target = this._hodWaypoints[this._hodWpIndex];
    const dir = target.clone().sub(hod.position); dir.y = 0;
    if (dir.length() < 0.5) {
      this._hodWpIndex = (this._hodWpIndex+1) % this._hodWaypoints.length;
    } else {
      dir.normalize();
      hod.position.addScaledVector(dir, this._hodSpeed * delta);
      hod.rotation.y = Math.atan2(dir.x, dir.z);
    }
    hod.position.y = 0.65;

    // Bob the HOD while walking
    hod.position.y = 0.65 + Math.abs(Math.sin(Date.now()*0.007)) * 0.03;

    if (!pc) return;
    const toPlayer = pc.position.clone().sub(hod.position); toPlayer.y = 0;
    const pDist = toPlayer.length();

    if (pDist < 12) {
      const hodFwd = new THREE.Vector3(Math.sin(hod.rotation.y), 0, Math.cos(hod.rotation.y));
      const dot = hodFwd.dot(toPlayer.normalize());
      if (dot > 0.45) {
        const rate = pc.isCrouching ? 6 : pDist < 4 ? 28 : 14;
        gm?.addDetection(delta * rate);
        if (gm?.detection > 75) {
          this._hodSpeed = 7;
          hod.position.addScaledVector(toPlayer.normalize(), 7*delta);
        }
      } else { this._hodSpeed = 3.2; }
    } else { this._hodSpeed = 3.2; }
  }

  _animateKeys(delta) {
    this._interactables.forEach(item => {
      if (item.type === 'key' && item.mesh.parent) {
        item.mesh.rotation.y += delta * 2.5;
        item.mesh.position.y = 0.3 + Math.sin(Date.now()*0.003) * 0.12;
      }
    });
    // Pulse exit light
    if (this._exitLight) {
      this._exitLight.intensity = 1.5 + Math.sin(Date.now()*0.004) * 0.8;
    }
  }

  _checkExit() {
    const pc = window.GAME?.playerController;
    const gm = window.GAME?.gameManager;
    if (!pc||!gm) return;
    const d = pc.position.distanceTo(this._exitPos);
    if (d < 2.8) {
      if (this._keysCollected >= this._keysNeeded) {
        gm.completeObjective('reach_exit');
        gm.triggerWin();
      } else {
        const need = this._keysNeeded - this._keysCollected;
        gm.showAlert(`🔒 LOCKED — Find ${need} more key${need>1?'s':''}`, 1200);
      }
    }
  }

  onInteract(playerPos) {
    const gm = window.GAME?.gameManager;
    for (let i=this._interactables.length-1; i>=0; i--) {
      const item = this._interactables[i];
      if (!item.mesh.parent) continue;
      if (playerPos.distanceTo(item.mesh.position) < 2.5) {
        if (item.type === 'key') {
          this.scene.remove(item.mesh); this._keysCollected++;
          gm?.completeObjective(this._keysCollected===1?'find_key1':'find_key2');
          if (this._keysCollected >= this._keysNeeded) {
            if (this._lockedSign) { this._lockedSign.material.emissiveIntensity=0; }
            gm?.showAlert('🔓 Both keys found — reach the EXIT!', 3000);
            gm?.setActiveObjective('reach_exit');
          } else {
            gm?.showAlert(`🗝 Key ${this._keysCollected}/${this._keysNeeded} collected!`, 2000);
          }
          this._interactables.splice(i,1);
        } else {
          const dest = new THREE.Vector3(
            item.mesh.position.x + (Math.random()-0.5)*14,
            0, item.mesh.position.z + (Math.random()-0.5)*14
          );
          this._hodWaypoints.unshift(dest);
          setTimeout(()=>this._hodWaypoints.shift(), 5000);
          this.scene.remove(item.mesh); this._interactables.splice(i,1);
          gm?.showAlert('💨 Distraction thrown — HOD distracted!', 1500);
        }
        return;
      }
    }
    gm?.showAlert('Nothing to interact with here', 700);
  }

  getGroundY() { return 0.9; }
  destroy() { this.scene.fog=null; this.scene.background=null; }
}