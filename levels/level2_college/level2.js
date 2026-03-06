/**
 * level2.js  –  COLLEGE CAMPUS
 * ─────────────────────────────────────────────────────────────
 * Attendance 75–90%
 * Environment : outdoor campus – library, canteen, main gate
 * Enemies     : 2 security guards on patrol + CCTV cones
 * Objective   : Reach the main gate to escape
 * Mechanics   : Avoid guards & CCTV cones, collect ID card
 * ─────────────────────────────────────────────────────────────
 */

export class Level2 {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;

    this.meta = {
      id:        'level2',
      name:      'College Campus',
      timeLimit: 270,
      color:     '#f39c12',
    };

    this.spawnPoint = { x: 0, y: 0.9, z: 45 };
    this.bounds     = 60;

    // Guards config
    this._guards = [];
    this._guardRoutes = [
      // Guard A: library–canteen loop
      [
        new THREE.Vector3(-20, 0, 20),
        new THREE.Vector3(-20, 0, -10),
        new THREE.Vector3(  0, 0, -10),
        new THREE.Vector3(  0, 0,  20),
      ],
      // Guard B: canteen–gate path
      [
        new THREE.Vector3( 20, 0,  30),
        new THREE.Vector3( 20, 0, -30),
        new THREE.Vector3(-10, 0, -30),
        new THREE.Vector3(-10, 0,  30),
      ],
    ];

    // CCTV cameras
    this._cctvCameras = [];

    // ID card (needed to open gate)
    this._hasCard  = false;
    this._exitPos  = new THREE.Vector3(0, 0, -50);
  }

  _tag(obj) {
    obj.userData.levelObject = true;
    return obj;
  }

  // ─── Init ─────────────────────────────────────────────────
  async init() {
    this._buildGround();
    this._buildBuildings();
    this._buildGuards();
    this._buildCCTV();
    this._buildIDCard();
    this._buildGate();
    this._setupLighting();
    this._setupFog();
  }

  // ── Ground & Path ─────────────────────────────────────────
  _buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 130, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1.0 })
    );
    ground.rotation.x  = -Math.PI / 2;
    ground.receiveShadow = true;
    this._tag(ground); this.scene.add(ground);

    // Paved paths
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    const hPath = new THREE.Mesh(new THREE.BoxGeometry(130, 0.05, 6), pathMat);
    hPath.position.set(0, 0.02, 0);
    this._tag(hPath); this.scene.add(hPath);

    const vPath = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 130), pathMat.clone());
    vPath.position.set(0, 0.02, 0);
    this._tag(vPath); this.scene.add(vPath);

    // Trees
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 90;
      // Avoid paths
      if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;
      this._spawnTree(x, z);
    }
  }

  _spawnTree(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c3317 })
    );
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 7, 7),
      new THREE.MeshStandardMaterial({ color: 0x1a6b2a, roughness: 1.0 })
    );
    canopy.position.y = 2.2;
    canopy.castShadow = true;
    trunk.add(canopy);

    this._tag(trunk); this.scene.add(trunk);
  }

  // ── Buildings ─────────────────────────────────────────────
  _buildBuildings() {
    // Library
    this._spawnBuilding(-28, 0, 0, 18, 8, 20, 0x2c3e6b, 'LIBRARY');
    // Canteen
    this._spawnBuilding(28, 0, 10, 16, 5, 14, 0x6b3a2c, 'CANTEEN');
    // Admin block
    this._spawnBuilding(0, 0, -25, 20, 10, 12, 0x3a3a5c, 'ADMIN');
    // Boundary walls
    this._spawnWall(  0, 2,  55, 120, 4, 1.5);
    this._spawnWall( 55, 2,   0, 1.5, 4, 110);
    this._spawnWall(-55, 2,   0, 1.5, 4, 110);
  }

  _spawnBuilding(x, y, z, w, h, d, color, label) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 })
    );
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this._tag(mesh); this.scene.add(mesh);

    // Roof trim
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2a })
    );
    roof.position.set(x, h + 0.15, z);
    this._tag(roof); this.scene.add(roof);
  }

  _spawnWall(x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.9 })
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this._tag(mesh); this.scene.add(mesh);
  }

  // ── Security Guards ───────────────────────────────────────
  _buildGuards() {
    this._guardRoutes.forEach((route, i) => {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.7, 8),
        new THREE.MeshStandardMaterial({ color: i === 0 ? 0x003366 : 0x1a3300 })
      );
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xc8a47a })
      );
      head.position.y = 1.1;
      body.add(head);

      // Cap
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      cap.position.y = 0.18;
      head.add(cap);

      // Torch / vision cone
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(3, 8, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffff66, transparent: true, opacity: 0.07, side: THREE.DoubleSide
        })
      );
      cone.rotation.x = Math.PI / 2;
      cone.position.z = -4;
      body.add(cone);

      body.position.copy(route[0]);
      body.position.y = 0.85;
      body.castShadow = true;
      this._tag(body); this.scene.add(body);

      this._guards.push({
        mesh: body,
        route,
        wpIndex: 0,
        speed: 4 + i * 0.5,
        visionCone: cone,
      });
    });
  }

  // ── CCTV Cameras ─────────────────────────────────────────
  _buildCCTV() {
    const cctvPositions = [
      { x: -10, z: 0,   angle: 0 },
      { x:  10, z: -20, angle: Math.PI },
      { x:  25, z: 30,  angle: -Math.PI / 2 },
      { x: -25, z: -5,  angle:  Math.PI / 2 },
    ];

    cctvPositions.forEach(conf => {
      // Camera housing
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6 })
      );
      housing.position.set(conf.x, 7, conf.z);
      housing.castShadow = true;
      this._tag(housing); this.scene.add(housing);

      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
      );
      pole.position.set(conf.x, 3.5, conf.z);
      this._tag(pole); this.scene.add(pole);

      // Red indicator light
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0
        })
      );
      led.position.set(conf.x + 0.25, 7.1, conf.z);
      this._tag(led); this.scene.add(led);

      // Sweep cone (pivots left-right)
      const sweepCone = new THREE.Mesh(
        new THREE.ConeGeometry(5, 10, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xff4400, transparent: true, opacity: 0.05, side: THREE.DoubleSide
        })
      );
      sweepCone.rotation.x = Math.PI / 2;
      sweepCone.position.z = -5;
      housing.add(sweepCone);

      this._cctvCameras.push({
        housing, sweepCone,
        baseAngle: conf.angle,
        sweepTime: Math.random() * Math.PI * 2,
        sweepRange: 0.8,
        led,
      });
    });
  }

  // ── ID Card collectible ───────────────────────────────────
  _buildIDCard() {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.01, 0.25),
      new THREE.MeshStandardMaterial({
        color: 0x003399, emissive: 0x001166, emissiveIntensity: 0.5, metalness: 0.3
      })
    );
    card.position.set(-25, 0.3, 5);
    this._cardMesh = card;
    this._tag(card); this.scene.add(card);

    const cardLight = new THREE.PointLight(0x0055ff, 0.8, 3);
    cardLight.position.set(-25, 1, 5);
    this._tag(cardLight); this.scene.add(cardLight);
  }

  // ── Main Gate ─────────────────────────────────────────────
  _buildGate() {
    const gatePostMat = new THREE.MeshStandardMaterial({
      color: 0x888888, metalness: 0.7, roughness: 0.3
    });

    // Posts
    [-3, 3].forEach(x => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 5, 0.6), gatePostMat
      );
      post.position.set(x, 2.5, -48);
      post.castShadow = true;
      this._tag(post); this.scene.add(post);
    });

    // Gate bar
    this._gateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.5 })
    );
    this._gateMesh.position.set(0, 2.5, -48);
    this._tag(this._gateMesh); this.scene.add(this._gateMesh);

    // EXIT sign
    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.5, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.0
      })
    );
    exitSign.position.set(0, 5.5, -48);
    this._tag(exitSign); this.scene.add(exitSign);
  }

  // ── Lighting ─────────────────────────────────────────────
  _setupLighting() {
    // Daytime sun
    const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
    sun.position.set(40, 60, 20);
    sun.castShadow              = true;
    sun.shadow.mapSize.width    = 2048;
    sun.shadow.mapSize.height   = 2048;
    sun.shadow.camera.near      = 0.5;
    sun.shadow.camera.far       = 200;
    sun.shadow.camera.left      = -80;
    sun.shadow.camera.right     =  80;
    sun.shadow.camera.top       =  80;
    sun.shadow.camera.bottom    = -80;
    this._tag(sun); this.scene.add(sun);

    const ambient = new THREE.AmbientLight(0x88aadd, 1.5);
    this._tag(ambient); this.scene.add(ambient);

    // Street lamps
    const lampPositions = [[-15, -15], [15, -15], [-15, 15], [15, 15]];
    lampPositions.forEach(([x, z]) => {
      const lamp = new THREE.PointLight(0xffaa44, 1.2, 20);
      lamp.position.set(x, 7, z);
      lamp.castShadow = true;
      this._tag(lamp); this.scene.add(lamp);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x555555 })
      );
      post.position.set(x, 3.5, z);
      this._tag(post); this.scene.add(post);
    });
  }

  _setupFog() {
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog         = new THREE.Fog(0x87ceeb, 50, 120);
  }

  // ─── Game Loop ────────────────────────────────────────────
  update(delta) {
    this._updateGuards(delta);
    this._updateCCTV(delta);
    this._animateCard(delta);
    this._checkExit();
  }

  _updateGuards(delta) {
    const gm = window.GAME?.gameManager;
    const pc = window.GAME?.playerController;

    this._guards.forEach(g => {
      const target = g.route[g.wpIndex];
      const dir = target.clone().sub(g.mesh.position);
      dir.y = 0;

      if (dir.length() < 0.5) {
        g.wpIndex = (g.wpIndex + 1) % g.route.length;
      } else {
        dir.normalize();
        g.mesh.position.addScaledVector(dir, g.speed * delta);
        g.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
      g.mesh.position.y = 0.85;

      // LOS to player
      if (!pc) return;
      const toPlayer = pc.position.clone().sub(g.mesh.position);
      toPlayer.y = 0;
      const pDist = toPlayer.length();

      if (pDist < 12) {
        const forward = new THREE.Vector3(Math.sin(g.mesh.rotation.y), 0, Math.cos(g.mesh.rotation.y));
        const dot = forward.dot(toPlayer.normalize());
        if (dot > 0.45) {
          const rate = pc.isCrouching ? 6 : 14;
          gm?.addDetection(delta * rate);
          // Guard chases if high detection
          if (gm?.detection > 70) {
            g.mesh.position.addScaledVector(toPlayer.normalize(), g.speed * 1.8 * delta);
          }
        }
      }
    });
  }

  _updateCCTV(delta) {
    const gm = window.GAME?.gameManager;
    const pc = window.GAME?.playerController;

    this._cctvCameras.forEach(cam => {
      cam.sweepTime += delta * 0.6;
      const angle = cam.baseAngle + Math.sin(cam.sweepTime) * cam.sweepRange;
      cam.housing.rotation.y = angle;

      // Blink LED
      const blink = Math.sin(cam.sweepTime * 3) > 0;
      cam.led.material.emissiveIntensity = blink ? 1.0 : 0.2;

      // Check if player is inside CCTV cone
      if (!pc) return;
      const camWorldPos = new THREE.Vector3();
      cam.housing.getWorldPosition(camWorldPos);
      const toPlayer = pc.position.clone().sub(camWorldPos);
      const pDist    = toPlayer.length();

      if (pDist < 10) {
        const camDir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).negate();
        const dot    = camDir.dot(toPlayer.clone().normalize());
        if (dot > 0.6 && !pc.isCrouching) {
          gm?.addDetection(delta * 10);
          cam.led.material.color.set(0xff8800);
        } else {
          cam.led.material.color.set(0xff0000);
        }
      }
    });
  }

  _animateCard(delta) {
    if (this._cardMesh && this._cardMesh.parent) {
      this._cardMesh.rotation.y += delta * 2;
      this._cardMesh.position.y = 0.3 + Math.sin(Date.now() * 0.003) * 0.08;
    }
  }

  _checkExit() {
    const pc = window.GAME?.playerController;
    const gm = window.GAME?.gameManager;
    if (!pc || !gm) return;

    const d = pc.position.distanceTo(this._exitPos);
    if (d < 3) {
      if (this._hasCard) {
        gm.triggerWin();
      } else {
        gm.showAlert('⚠ NEED ID CARD TO OPEN GATE', 1200);
      }
    }
  }

  onInteract(playerPos) {
    const gm = window.GAME?.gameManager;
    if (this._cardMesh && this._cardMesh.parent) {
      const d = playerPos.distanceTo(this._cardMesh.position);
      if (d < 2.5) {
        this._hasCard = true;
        this.scene.remove(this._cardMesh);
        // Open gate
        if (this._gateMesh) {
          this._gateMesh.material.color.set(0x00ff44);
          this._gateMesh.position.x = 10;  // slide gate open
        }
        gm?.showAlert('🪪 ID CARD COLLECTED – GATE OPEN!', 2500);
        return;
      }
    }
    gm?.showAlert('NOTHING NEARBY', 800);
  }

  getGroundY() { return 0.9; }

  destroy() {
    this.scene.fog        = null;
    this.scene.background = null;
  }
}