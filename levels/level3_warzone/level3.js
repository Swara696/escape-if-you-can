/**
 * level3.js  –  WARZONE
 * ─────────────────────────────────────────────────────────────
 * Attendance 40–74%
 * Environment : destroyed city with rubble, craters, fire
 * Enemies     : drone patrols + searchlight towers
 * Hazards     : periodic explosions cause damage
 * Objective   : Reach the extraction zone (green flare)
 * ─────────────────────────────────────────────────────────────
 */

export class Level3 {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;

    this.meta = {
      id:        'level3',
      name:      'Warzone',
      timeLimit: 240,
      color:     '#e74c3c',
    };

    this.spawnPoint = { x: 0, y: 0.9, z: 50 };
    this.bounds     = 70;

    this._drones        = [];
    this._searchlights  = [];
    this._particles     = [];
    this._explosionQueue = [];
    this._explosionTimer = 0;

    this._extractionPos = new THREE.Vector3(0, 0, -55);
  }

  _tag(obj) { obj.userData.levelObject = true; return obj; }

  async init() {
    this._buildGround();
    this._buildRuins();
    this._buildDrones();
    this._buildSearchlights();
    this._buildExtraction();
    this._buildAmbientFires();
    this._setupLighting();
    this._setupFog();
  }

  // ── Scorched Ground ───────────────────────────────────────
  _buildGround() {
    const geo = new THREE.PlaneGeometry(150, 150, 20, 20);
    // Manually deform vertices for craters
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, (Math.random() - 0.5) * 0.4);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1208, roughness: 1.0, metalness: 0.0
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x  = -Math.PI / 2;
    ground.receiveShadow = true;
    this._tag(ground); this.scene.add(ground);

    // Craters (dark circles)
    for (let i = 0; i < 12; i++) {
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(2 + Math.random() * 3, 10),
        new THREE.MeshStandardMaterial({ color: 0x080604, roughness: 1.0 })
      );
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(
        (Math.random() - 0.5) * 110,
        0.02,
        (Math.random() - 0.5) * 100
      );
      this._tag(crater); this.scene.add(crater);
    }
  }

  // ── Destroyed Buildings & Rubble ─────────────────────────
  _buildRuins() {
    const rubbleMat = new THREE.MeshStandardMaterial({
      color: 0x4a4040, roughness: 1.0
    });

    // Ruined building skeletons
    const buildingDefs = [
      [-35,  15,  18, 6,  20],
      [ 35,  20,  15, 5,  18],
      [-30, -20,  12, 8,  16],
      [ 30, -25,  14, 4,  20],
      [  0, -10,  10, 9,  12],
      [-15,  30,  16, 7,  20],
      [ 15,  35,  12, 5,  16],
    ];
    buildingDefs.forEach(([x, z, w, h, d]) => {
      // Shell walls only (no roof – bombed out)
      const wallH = h * (0.4 + Math.random() * 0.5);
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(w, wallH, d),
        rubbleMat.clone()
      );
      shell.position.set(x, wallH / 2, z);
      shell.castShadow = shell.receiveShadow = true;
      // Slightly tilt destroyed buildings
      shell.rotation.z = (Math.random() - 0.5) * 0.08;
      this._tag(shell); this.scene.add(shell);

      // Rubble pile at base
      for (let r = 0; r < 5; r++) {
        const chunk = new THREE.Mesh(
          new THREE.BoxGeometry(
            0.5 + Math.random() * 1.5,
            0.3 + Math.random() * 0.8,
            0.5 + Math.random() * 1.5
          ),
          rubbleMat.clone()
        );
        chunk.position.set(
          x + (Math.random() - 0.5) * w,
          0.3,
          z + (Math.random() - 0.5) * d
        );
        chunk.rotation.y = Math.random() * Math.PI;
        chunk.castShadow = true;
        this._tag(chunk); this.scene.add(chunk);
      }
    });

    // Burnt-out vehicles
    const carMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 });
    [[10, 20], [-10, -10], [20, -30]].forEach(([x, z]) => {
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1.2, 4), carMat.clone()
      );
      car.position.set(x, 0.6, z);
      car.rotation.y = Math.random() * Math.PI;
      car.castShadow = car.receiveShadow = true;
      this._tag(car); this.scene.add(car);
    });
  }

  // ── Drones ────────────────────────────────────────────────
  _buildDrones() {
    const droneDefs = [
      { x:  15, z:  20, radius: 18, height: 12 },
      { x: -15, z: -20, radius: 15, height: 10 },
      { x:   0, z:   0, radius: 25, height: 15 },
    ];

    droneDefs.forEach((def, i) => {
      const body = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.6, 0),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8 })
      );

      // Arms
      [0, 1, 2, 3].forEach(a => {
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.05, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 })
        );
        arm.position.set(
          Math.sin(a * Math.PI / 2) * 0.7,
          0,
          Math.cos(a * Math.PI / 2) * 0.7
        );
        body.add(arm);
      });

      // Searchlight on drone
      const droneLight = new THREE.SpotLight(0xff4400, 3, 25, Math.PI / 8, 0.4, 2);
      droneLight.position.set(0, 0, 0);
      droneLight.target.position.set(0, -10, 0);
      body.add(droneLight);
      body.add(droneLight.target);

      // Cone visual
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(3, 12, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xff2200, transparent: true, opacity: 0.04, side: THREE.DoubleSide
        })
      );
      cone.position.y = -6;
      body.add(cone);

      body.position.set(def.x, def.height, def.z);
      body.castShadow = true;
      this._tag(body);
      this.scene.add(body);
      if (droneLight.target) { this._tag(droneLight.target); this.scene.add(droneLight.target); }

      this._drones.push({
        mesh: body, droneLight,
        angle: Math.random() * Math.PI * 2,
        radius: def.radius,
        centerX: def.x,
        centerZ: def.z,
        height:  def.height,
        speed:   0.6 + i * 0.15,
      });
    });
  }

  // ── Searchlight Towers ───────────────────────────────────
  _buildSearchlights() {
    [[30, -30], [-30, -30]].forEach(([x, z]) => {
      // Tower
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.8, 15, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a4040, roughness: 0.9 })
      );
      tower.position.set(x, 7.5, z);
      tower.castShadow = true;
      this._tag(tower); this.scene.add(tower);

      // Spotlight
      const spot = new THREE.SpotLight(0xffffff, 8, 60, Math.PI / 10, 0.3, 1.5);
      spot.position.set(x, 15, z);
      spot.castShadow = true;
      spot.shadow.mapSize.width  = 1024;
      spot.shadow.mapSize.height = 1024;
      this._tag(spot); this.scene.add(spot);

      const target = new THREE.Object3D();
      target.position.set(x, 0, z - 20);
      this._tag(target); this.scene.add(target);
      spot.target = target;

      this._searchlights.push({ spot, target, baseX: x, baseZ: z, angle: 0, speed: 0.5 });
    });
  }

  // ── Extraction Zone ───────────────────────────────────────
  _buildExtraction() {
    // Green smoke flare ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.2, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.0
      })
    );
    ring.position.copy(this._extractionPos);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    this._tag(ring); this.scene.add(ring);

    // Pulsing ground light
    const exLight = new THREE.PointLight(0x00ff44, 3, 15);
    exLight.position.copy(this._extractionPos);
    exLight.position.y = 1;
    this._tag(exLight); this.scene.add(exLight);
    this._exLight = exLight;

    // Signal pillar of light
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 2, 50, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x00ff44, transparent: true, opacity: 0.08,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    pillar.position.copy(this._extractionPos);
    pillar.position.y = 25;
    this._tag(pillar); this.scene.add(pillar);
  }

  // ── Ambient Fires ─────────────────────────────────────────
  _buildAmbientFires() {
    const firePositions = [
      [-20, 10], [20, -15], [-30, -25], [15, 30], [-10, -40]
    ];
    firePositions.forEach(([x, z]) => {
      const fireLight = new THREE.PointLight(0xff4400, 2, 8);
      fireLight.position.set(x, 1.5, z);
      this._tag(fireLight); this.scene.add(fireLight);

      // Fire mesh (cone)
      const fire = new THREE.Mesh(
        new THREE.ConeGeometry(0.5 + Math.random() * 0.5, 2 + Math.random(), 6, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xff6600, transparent: true, opacity: 0.6,
          side: THREE.DoubleSide, depthWrite: false
        })
      );
      fire.position.set(x, 1, z);
      this._tag(fire); this.scene.add(fire);
      this._particles.push({ type: 'fire', mesh: fire, light: fireLight, t: Math.random() * 10 });
    });
  }

  // ── Lighting ─────────────────────────────────────────────
  _setupLighting() {
    const ambient = new THREE.AmbientLight(0x7a4422, 1.2);
    this._tag(ambient); this.scene.add(ambient);

    // Smoke-filtered orange sunlight
    const sun = new THREE.DirectionalLight(0xff8844, 2.0);
    sun.position.set(-30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left    = -80;
    sun.shadow.camera.right   =  80;
    sun.shadow.camera.top     =  80;
    sun.shadow.camera.bottom  = -80;
    sun.shadow.camera.far     = 200;
    this._tag(sun); this.scene.add(sun);
  }

  _setupFog() {
    this.scene.background = new THREE.Color(0x3a1a08);
    this.scene.fog         = new THREE.FogExp2(0x3a1a08, 0.015);
  }

  // ─── Game Loop ────────────────────────────────────────────
  update(delta) {
    this._updateDrones(delta);
    this._updateSearchlights(delta);
    this._updateFires(delta);
    this._updateExplosions(delta);
    this._checkExtraction();
  }

  _updateDrones(delta) {
    const gm = window.GAME?.gameManager;
    const pc = window.GAME?.playerController;

    this._drones.forEach(d => {
      d.angle += d.speed * delta;
      d.mesh.position.x = d.centerX + Math.cos(d.angle) * d.radius;
      d.mesh.position.z = d.centerZ + Math.sin(d.angle) * d.radius;
      d.mesh.position.y = d.height  + Math.sin(d.angle * 2) * 1.5;
      d.mesh.rotation.y += delta * 2;

      // Point cone downward at world
      if (!pc) return;
      const toPlayer = pc.position.clone().sub(d.mesh.position);
      const pDist    = toPlayer.length();
      if (pDist < 15) {
        // Drone detects if nearly below it
        const angle2d = Math.abs(Math.atan2(
          Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.z * toPlayer.z),
          -toPlayer.y
        ));
        if (angle2d < 0.35) {
          gm?.addDetection(delta * 18);
          gm?.showAlert('⚠ DRONE SPOTTED YOU!', 1200);
        }
      }
    });
  }

  _updateSearchlights(delta) {
    const gm = window.GAME?.gameManager;
    const pc = window.GAME?.playerController;

    this._searchlights.forEach(sl => {
      sl.angle += sl.speed * delta;
      const sweep = Math.sin(sl.angle) * 35;
      sl.target.position.set(sl.baseX + sweep, 0, sl.baseZ - 20);
      this.scene.add(sl.target);

      // Check player in cone
      if (!pc) return;
      const spotDir  = sl.target.position.clone().sub(sl.spot.position).normalize();
      const toPlayer = pc.position.clone().sub(sl.spot.position).normalize();
      const dot      = spotDir.dot(toPlayer);
      const dist     = pc.position.distanceTo(sl.spot.position);
      if (dot > 0.95 && dist < 55 && !pc.isCrouching) {
        gm?.addDetection(delta * 20);
      }
    });
  }

  _updateFires(delta) {
    this._particles.forEach(p => {
      if (p.type === 'fire') {
        p.t += delta;
        p.mesh.scale.x = 1 + Math.sin(p.t * 8) * 0.2;
        p.mesh.scale.z = 1 + Math.cos(p.t * 6) * 0.2;
        p.mesh.scale.y = 0.8 + Math.sin(p.t * 5) * 0.3;
        p.light.intensity = 1.5 + Math.sin(p.t * 7) * 0.8;
      }
    });
  }

  _updateExplosions(delta) {
    this._explosionTimer -= delta;
    if (this._explosionTimer <= 0) {
      this._explosionTimer = 4 + Math.random() * 6;
      this._spawnExplosion();
    }

    // Process queued explosion flashes
    for (let i = this._explosionQueue.length - 1; i >= 0; i--) {
      const ex = this._explosionQueue[i];
      ex.time -= delta;

      if (ex.light) {
        ex.light.intensity = Math.max(0, ex.light.intensity - delta * 20);
        ex.mesh.scale.multiplyScalar(1 + delta * 6);
        ex.mesh.material.opacity = Math.max(0, ex.mesh.material.opacity - delta * 3);
      }

      if (ex.time <= 0) {
        this.scene.remove(ex.mesh);
        this.scene.remove(ex.light);
        this._explosionQueue.splice(i, 1);
      }

      // Damage player if close
      const pc = window.GAME?.playerController;
      const gm = window.GAME?.gameManager;
      if (pc && ex.pos && pc.position.distanceTo(ex.pos) < 5) {
        gm?.takeDamage(12);
        gm?.showAlert('💥 EXPLOSION DAMAGE!', 1000);
      }
    }
  }

  _spawnExplosion() {
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 80;
    const pos = new THREE.Vector3(x, 0, z);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff8800, transparent: true, opacity: 0.9, depthWrite: false
      })
    );
    sphere.position.copy(pos);
    sphere.position.y = 1;
    this._tag(sphere); this.scene.add(sphere);

    const flash = new THREE.PointLight(0xff6600, 15, 20);
    flash.position.copy(pos);
    flash.position.y = 2;
    this._tag(flash); this.scene.add(flash);

    this._explosionQueue.push({ mesh: sphere, light: flash, pos, time: 0.5 });

    window.GAME?.gameManager?.showAlert('💥 INCOMING!', 800);
  }

  _checkExtraction() {
    const pc = window.GAME?.playerController;
    const gm = window.GAME?.gameManager;
    if (!pc || !gm) return;

    const d = pc.position.distanceTo(this._extractionPos);
    // Pulse extraction light
    if (this._exLight) {
      this._exLight.intensity = 2 + Math.sin(Date.now() * 0.005) * 1;
    }
    if (d < 4) gm.triggerWin();
  }

  onInteract() {}
  getGroundY() { return 0.9; }

  destroy() {
    this.scene.fog        = null;
    this.scene.background = null;
  }
}