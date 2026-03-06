/**
 * level1.js  –  DEPARTMENT SECTOR
 * ─────────────────────────────────────────────────────────────
 * Attendance > 90%
 * Environment : indoor corridor + classrooms + HOD office
 * Enemy       : HOD NPC patrols a fixed route
 * Objective   : Reach the EXIT door without being caught
 * Mechanics   : Stealth, interact with objects to distract HOD
 * ─────────────────────────────────────────────────────────────
 */

export class Level1 {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;

    // Level metadata (read by GameManager)
    this.meta = {
      id:        'level1',
      name:      'Department Sector',
      timeLimit: 300,
      color:     '#00ffe7',
    };

    // Player spawn
    this.spawnPoint = { x: 0, y: 0.9, z: 30 };

    // Boundary for player controller
    this.bounds = 50;

    // HOD patrol waypoints
    this._hodWaypoints = [
      new THREE.Vector3(-8, 0, 10),
      new THREE.Vector3(-8, 0, -10),
      new THREE.Vector3( 8, 0, -10),
      new THREE.Vector3( 8, 0,  10),
    ];
    this._hodWpIndex   = 0;
    this._hodSpeed     = 3.5;
    this._hodMesh      = null;
    this._hodAlert     = false;
    this._hodAlertTime = 0;

    // Interactable objects [ { mesh, onUse } ]
    this._interactables = [];

    // Exit trigger position
    this._exitPos  = new THREE.Vector3(0, 0, -35);
    this._exitOpen = false;

    // Collectible keys (need 2 to unlock exit)
    this._keysCollected = 0;
    this._keysNeeded    = 2;
  }

  // ── Tag helper ────────────────────────────────────────────
  _tag(obj) {
    obj.userData.levelObject = true;
    return obj;
  }

  // ─── Init ────────────────────────────────────────────────
  async init() {
    this._buildEnvironment();
    this._buildHOD();
    this._buildInteractables();
    this._buildExit();
    this._setupLighting();
    this._setupFog();
  }

  // ── Environment ──────────────────────────────────────────
  _buildEnvironment() {
    const s = this.scene;

    // Floor – tiled corridor
    const floorGeo = new THREE.PlaneGeometry(26, 80, 8, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, roughness: 0.9, metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x  = -Math.PI / 2;
    floor.receiveShadow = true;
    this._tag(floor); s.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 80),
      new THREE.MeshStandardMaterial({ color: 0x111122 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 6;
    this._tag(ceil); s.add(ceil);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x22223a, roughness: 0.8
    });

    // Left wall
    const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 80), wallMat);
    lWall.position.set(-13, 3, 0);
    lWall.castShadow = lWall.receiveShadow = true;
    this._tag(lWall); s.add(lWall);

    // Right wall
    const rWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 80), wallMat.clone());
    rWall.position.set(13, 3, 0);
    rWall.castShadow = rWall.receiveShadow = true;
    this._tag(rWall); s.add(rWall);

    // Back wall
    const bWall = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 0.5), wallMat.clone());
    bWall.position.set(0, 3, -40);
    bWall.castShadow = bWall.receiveShadow = true;
    this._tag(bWall); s.add(bWall);

    // Front wall
    const fWall = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 0.5), wallMat.clone());
    fWall.position.set(0, 3, 40);
    this._tag(fWall); s.add(fWall);

    // Classroom doors (decorative)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a2c0a, roughness: 0.7 });
    const doorPositions = [
      [-12.5, 1.5, -20], [-12.5, 1.5, -5], [-12.5, 1.5, 10],
      [ 12.5, 1.5, -15], [ 12.5, 1.5,  5],
    ];
    doorPositions.forEach(([x, y, z]) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 1.8), doorMat);
      door.position.set(x, y, z);
      door.castShadow = true;
      this._tag(door); s.add(door);

      // Door label (coloured plate)
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.3, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.3 })
      );
      plate.position.set(x + (x < 0 ? 0.15 : -0.15), y + 0.6, z);
      this._tag(plate); s.add(plate);
    });

    // HOD Office sign area (end of corridor)
    const signGeo = new THREE.BoxGeometry(4, 0.6, 0.1);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, emissive: 0xb8860b, emissiveIntensity: 0.5
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 4, -38);
    this._tag(sign); s.add(sign);

    // Lockers along corridor walls
    const lockerMat = new THREE.MeshStandardMaterial({ color: 0x2e4a7a, roughness: 0.6 });
    for (let z = -30; z < 30; z += 5) {
      [-11.5, 11.5].forEach(x => {
        const locker = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1), lockerMat.clone());
        locker.position.set(x, 1.5, z);
        locker.castShadow = locker.receiveShadow = true;
        this._tag(locker); s.add(locker);
      });
    }

    // Bulletin board
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    board.position.set(-5, 3, 39.8);
    this._tag(board); s.add(board);

    // "Attendance Required" poster (emissive)
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.5),
      new THREE.MeshStandardMaterial({
        color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 0.4
      })
    );
    poster.position.set(-5, 3, 39.9);
    this._tag(poster); s.add(poster);
  }

  // ── HOD NPC ──────────────────────────────────────────────
  _buildHOD() {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 1.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0a00 })
    );
    body.position.copy(this._hodWaypoints[0]);
    body.position.y = 0.85;
    body.castShadow = true;

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xc8a47a })
    );
    head.position.y = 1.1;
    body.add(head);

    // Name tag
    const tag = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.5 })
    );
    tag.position.set(0, 0.4, 0.38);
    body.add(tag);

    // Vision cone (flashlight)
    const coneGeo = new THREE.ConeGeometry(2.5, 6, 8, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffff88, transparent: true, opacity: 0.06, side: THREE.DoubleSide
    });
    this._hodVisionCone = new THREE.Mesh(coneGeo, coneMat);
    this._hodVisionCone.rotation.x = Math.PI / 2;
    this._hodVisionCone.position.z = -3;
    body.add(this._hodVisionCone);

    this._tag(body);
    this.scene.add(body);
    this._hodMesh = body;
  }

  // ── Interactable Objects ──────────────────────────────────
  _buildInteractables() {
    // Key 1 – near classrooms
    this._spawnKey(new THREE.Vector3(-9, 0.3, -5), 'KEY_1');
    // Key 2 – near HOD office
    this._spawnKey(new THREE.Vector3(9, 0.3, -25), 'KEY_2');

    // Distraction items (throw to lure HOD)
    this._spawnDistractor(new THREE.Vector3(-5, 0.4, 20), 'PAPER_BALL');
    this._spawnDistractor(new THREE.Vector3( 5, 0.4, 15), 'CHALK');
  }

  _spawnKey(pos, id) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.05, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.6, metalness: 0.8
      })
    );
    mesh.position.copy(pos);
    mesh.rotation.x = Math.PI / 2;
    mesh.userData.interactId = id;
    mesh.userData.type       = 'key';
    mesh.castShadow          = true;
    this._tag(mesh);
    this.scene.add(mesh);

    // Glowing point light under key
    const kLight = new THREE.PointLight(0xd4af37, 0.8, 2);
    kLight.position.copy(pos);
    kLight.position.y += 0.5;
    this._tag(kLight); this.scene.add(kLight);

    this._interactables.push({ mesh, type: 'key', id });
  }

  _spawnDistractor(pos, id) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 })
    );
    mesh.position.copy(pos);
    mesh.userData.interactId = id;
    mesh.userData.type       = 'distractor';
    this._tag(mesh);
    this.scene.add(mesh);
    this._interactables.push({ mesh, type: 'distractor', id });
  }

  // ── Exit ─────────────────────────────────────────────────
  _buildExit() {
    // Exit door frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x002200, emissive: 0x004400, emissiveIntensity: 0.3
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 0.3), frameMat);
    frame.position.copy(this._exitPos);
    frame.position.y = 2.25;
    this._tag(frame); this.scene.add(frame);

    // EXIT sign
    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.0
      })
    );
    exitSign.position.copy(this._exitPos);
    exitSign.position.y = 5;
    this._tag(exitSign); this.scene.add(exitSign);

    // KEY REQUIRED sign (shown when locked)
    const keySign = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.5, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8
      })
    );
    keySign.position.copy(this._exitPos);
    keySign.position.y = 4.3;
    this._exitKeySign = keySign;
    this._tag(keySign); this.scene.add(keySign);
  }

  // ── Lighting ─────────────────────────────────────────────
  _setupLighting() {
    const s = this.scene;

    const ambient = new THREE.AmbientLight(0x8899cc, 1.2);
    this._tag(ambient); s.add(ambient);

    // Fluorescent ceiling strips
    const stripPositions = [-20, -10, 0, 10, 20];
    stripPositions.forEach(z => {
      const strip = new THREE.PointLight(0xd8e8ff, 2.5, 28);
      strip.position.set(0, 5.5, z);
      strip.castShadow = true;
      this._tag(strip); s.add(strip);

      // Physical strip mesh
      const stripMesh = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.1, 0.4),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: 0xc8d8ff, emissiveIntensity: 0.8
        })
      );
      stripMesh.position.set(0, 5.8, z);
      this._tag(stripMesh); s.add(stripMesh);
    });

    // HOD office warm light
    const hodLight = new THREE.PointLight(0xff8844, 1.5, 15);
    hodLight.position.set(0, 4, -35);
    this._tag(hodLight); s.add(hodLight);
  }

  // ── Fog ───────────────────────────────────────────────────
  _setupFog() {
    this.scene.background = new THREE.Color(0x0a0a20);
    this.scene.fog         = new THREE.FogExp2(0x0a0a20, 0.025);
  }

  // ─── Game Loop Update ─────────────────────────────────────
  update(delta) {
    this._updateHOD(delta);
    this._animateKeys(delta);
    this._checkExit();
  }

  _updateHOD(delta) {
    if (!this._hodMesh) return;
    const gm  = window.GAME?.gameManager;
    const pc  = window.GAME?.playerController;
    const hod = this._hodMesh;

    const target = this._hodWaypoints[this._hodWpIndex];

    // Move toward current waypoint
    const dir = target.clone().sub(hod.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.5) {
      // Reached waypoint, advance
      this._hodWpIndex = (this._hodWpIndex + 1) % this._hodWaypoints.length;
    } else {
      dir.normalize();
      hod.position.addScaledVector(dir, this._hodSpeed * delta);
      // Face direction of travel
      hod.rotation.y = Math.atan2(dir.x, dir.z);
    }
    hod.position.y = 0.85;

    // ── LOS check to player ──────────────────────────────────
    if (!pc) return;
    const playerPos = pc.position;
    const toPlayer  = playerPos.clone().sub(hod.position);
    toPlayer.y      = 0;
    const pDist     = toPlayer.length();

    if (pDist < 10) {
      // Check if player is in front of HOD (dot product)
      const hodForward = new THREE.Vector3(
        Math.sin(hod.rotation.y), 0, Math.cos(hod.rotation.y)
      );
      const dot = hodForward.dot(toPlayer.normalize());

      if (dot > 0.5) {
        // In field of view
        const crouching = pc.isCrouching;
        const rate = crouching ? 8 : (pDist < 4 ? 30 : 15);
        gm?.addDetection(delta * rate);
        this._hodAlert = true;
        this._hodAlertTime = 2;

        // Rush toward player when alerted
        if (gm?.detection > 80) {
          this._hodSpeed = 7;
          const rush = playerPos.clone().sub(hod.position);
          rush.y = 0; rush.normalize();
          hod.position.addScaledVector(rush, 7 * delta);
        }
      } else {
        this._hodSpeed = 3.5;
      }
    } else {
      this._hodSpeed = 3.5;
    }

    // Decay alert
    if (this._hodAlert) {
      this._hodAlertTime -= delta;
      if (this._hodAlertTime <= 0) this._hodAlert = false;
    }
  }

  _animateKeys(delta) {
    // Bob and spin collected keys
    this._interactables.forEach(item => {
      if (item.type === 'key' && item.mesh.parent) {
        item.mesh.rotation.z += delta * 2;
        item.mesh.position.y  = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
      }
    });
  }

  _checkExit() {
    const pc = window.GAME?.playerController;
    if (!pc) return;
    const d = pc.position.distanceTo(this._exitPos);
    if (d < 2.5) {
      if (this._keysCollected >= this._keysNeeded) {
        window.GAME?.gameManager?.triggerWin();
      } else {
        const need = this._keysNeeded - this._keysCollected;
        window.GAME?.gameManager?.showAlert(`⚠ NEED ${need} MORE KEY${need > 1 ? 'S' : ''}`, 1000);
      }
    }
  }

  // ─── Interact (called by PlayerController on E press) ────
  onInteract(playerPos) {
    const gm = window.GAME?.gameManager;
    for (let i = this._interactables.length - 1; i >= 0; i--) {
      const item = this._interactables[i];
      if (!item.mesh.parent) continue;
      const d = playerPos.distanceTo(item.mesh.position);
      if (d < 2) {
        if (item.type === 'key') {
          // Collect key
          this.scene.remove(item.mesh);
          this._keysCollected++;
          gm?.showAlert(`🗝 KEY COLLECTED (${this._keysCollected}/${this._keysNeeded})`, 2000);
          this._interactables.splice(i, 1);
          if (this._keysCollected >= this._keysNeeded) {
            this._exitOpen = true;
            if (this._exitKeySign) {
              this._exitKeySign.material.emissive.set(0x004400);
              this._exitKeySign.material.emissiveIntensity = 0;
            }
            gm?.showAlert('EXIT UNLOCKED – REACH THE DOOR!', 3000);
          }
        } else if (item.type === 'distractor') {
          // Throw distractor – HOD moves toward it
          const throwTarget = new THREE.Vector3(
            item.mesh.position.x + (Math.random() - 0.5) * 10,
            0,
            item.mesh.position.z + (Math.random() - 0.5) * 10
          );
          this._hodWaypoints.unshift(throwTarget);
          setTimeout(() => this._hodWaypoints.shift(), 5000);
          this.scene.remove(item.mesh);
          this._interactables.splice(i, 1);
          gm?.showAlert('💨 DISTRACTION THROWN!', 1500);
        }
        return;
      }
    }
    gm?.showAlert('NOTHING TO INTERACT WITH', 800);
  }

  // ─── Ground height query ─────────────────────────────────
  getGroundY() { return 0.9; }

  // ─── Cleanup ─────────────────────────────────────────────
  destroy() {
    this.scene.fog        = null;
    this.scene.background = null;
  }
}