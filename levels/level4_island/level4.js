/**
 * level4.js  –  DARK HORROR ISLAND
 * ─────────────────────────────────────────────────────────────
 * Attendance < 40%
 * Environment : cursed island – fog, ruins, caves, dark water
 * Enemies     : lurking shadow creatures + jump scares
 * Hazards     : sanity drain – HUD glitches when near entities
 * Objective   : Reach the lighthouse beacon to escape
 * ─────────────────────────────────────────────────────────────
 */

export class Level4 {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;

    this.meta = {
      id:        'level4',
      name:      'Dark Horror Island',
      timeLimit: 200,
      color:     '#9b59b6',
    };

    this.spawnPoint = { x: 0, y: 0.9, z: 50 };
    this.bounds     = 65;

    this.objectives = [
      { id:'find_key',     text:'Find the Ancient Key (near the altar)',     done:false, active:true  },
      { id:'lighthouse',   text:'Reach the LIGHTHOUSE beacon to escape',     done:false, active:false },
    ];

    this._entities        = [];
    this._jumpScareCooldown = 0;
    this._jumpScareActive   = false;
    this._horrorOverlay     = null;
    this._lighthousePos     = new THREE.Vector3(0, 0, -55);
    this._ambientSounds     = [];

    // Sanity system (0=fine, 100=terror)
    this._sanity = 0;

    // Torch flicker
    this._torchLight = null;
    this._torchT     = 0;

    // Interactable – boat key
    this._boatKey    = null;
    this._hasBoatKey = false;
  }

  _tag(obj) { obj.userData.levelObject = true; return obj; }

  async init() {
    this._buildIsland();
    this._buildRuins();
    this._buildCaves();
    this._buildLighthouse();
    this._buildCreatures();
    this._buildBoatKey();
    this._buildHorrorProps();
    this._setupLighting();
    this._setupFog();
    this._buildHorrorOverlay();

    // Show intro message
    setTimeout(() => {
      window.GAME?.gameManager?.showAlert(
        '⚠ YOU WERE NEVER HERE. FIND THE LIGHTHOUSE.', 4000
      );
    }, 1500);
  }

  // ── Island Ground ─────────────────────────────────────────
  _buildIsland() {
    // Main island floor
    const geo = new THREE.PlaneGeometry(140, 140, 24, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      // Island shape – higher in center, drops to sea at edges
      pos.setY(i, Math.max(-0.5, 8 - r * 0.12 + (Math.random() - 0.5) * 1.5));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x0d1108, roughness: 1.0
    });
    const island = new THREE.Mesh(geo, mat);
    island.rotation.x  = -Math.PI / 2;
    island.receiveShadow = true;
    this._tag(island); this.scene.add(island);

    // Surrounding black ocean
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600, 4, 4),
      new THREE.MeshStandardMaterial({
        color: 0x000608, roughness: 0.2, metalness: 0.5
      })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y  = -1.5;
    this._tag(ocean); this.scene.add(ocean);

    // Dead twisted trees
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = 10 + Math.random() * 35;
      this._spawnDeadTree(
        Math.cos(angle) * r,
        Math.sin(angle) * r
      );
    }
  }

  _spawnDeadTree(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, 4 + Math.random() * 3, 5),
      new THREE.MeshStandardMaterial({ color: 0x0a0a08, roughness: 1.0 })
    );
    trunk.position.set(x, 2, z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    trunk.castShadow = true;

    // Twisted branches
    for (let b = 0; b < 4; b++) {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, 1.5 + Math.random(), 4),
        new THREE.MeshStandardMaterial({ color: 0x0a0a06 })
      );
      branch.position.set(
        (Math.random() - 0.5) * 1,
        1 + Math.random() * 1.5,
        (Math.random() - 0.5) * 1
      );
      branch.rotation.z = (Math.random() - 0.5) * 1.2;
      branch.rotation.x = (Math.random() - 0.5) * 0.6;
      trunk.add(branch);
    }

    this._tag(trunk); this.scene.add(trunk);
  }

  // ── Ruins ─────────────────────────────────────────────────
  _buildRuins() {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x1a1618, roughness: 1.0, metalness: 0.05
    });

    // Ancient temple-like ruins
    const pillarDefs = [
      [-12, -10], [12, -10], [-12, -20], [12, -20],
      [-20, 0],   [20, 0],   [-8, 5],    [8, 5],
    ];
    pillarDefs.forEach(([x, z]) => {
      const h = 2 + Math.random() * 3;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, h, 6),
        stoneMat.clone()
      );
      pillar.position.set(x, h / 2, z);
      pillar.castShadow = pillar.receiveShadow = true;
      pillar.rotation.y = Math.random() * 0.3;
      this._tag(pillar); this.scene.add(pillar);
    });

    // Fallen walls
    [[0, -15, 12, 2, 0.5], [-18, 5, 0.5, 3, 8]].forEach(([x, z, w, h, d]) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d), stoneMat.clone()
      );
      wall.position.set(x, h / 2, z);
      wall.rotation.z = (Math.random() - 0.5) * 0.15;
      wall.castShadow = wall.receiveShadow = true;
      this._tag(wall); this.scene.add(wall);
    });

    // Eerie altar
    const altar = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1, 2),
      new THREE.MeshStandardMaterial({ color: 0x0d0d18, roughness: 0.6 })
    );
    altar.position.set(0, 0.5, -10);
    altar.castShadow = true;
    this._tag(altar); this.scene.add(altar);

    // Blood-red candle on altar
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x220000 })
    );
    candle.position.set(0, 1.2, -10);
    this._tag(candle); this.scene.add(candle);

    const candleFlame = new THREE.PointLight(0xff2200, 1.5, 6);
    candleFlame.position.set(0, 1.5, -10);
    this._tag(candleFlame); this.scene.add(candleFlame);
    this._candleFlame = candleFlame;
  }

  // ── Cave Entrance ─────────────────────────────────────────
  _buildCaves() {
    // Cave archway
    const caveMat = new THREE.MeshStandardMaterial({ color: 0x050305, roughness: 1.0 });
    const caveArch = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.8, 6, 12, Math.PI),
      caveMat
    );
    caveArch.position.set(-30, 3, 0);
    caveArch.rotation.y = Math.PI / 2;
    caveArch.castShadow = true;
    this._tag(caveArch); this.scene.add(caveArch);

    // Cave interior darkness
    const caveInner = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2, 15, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
    );
    caveInner.position.set(-38, 1, 0);
    caveInner.rotation.z = Math.PI / 2;
    this._tag(caveInner); this.scene.add(caveInner);

    // Dripping purple mist light
    const caveLight = new THREE.PointLight(0x220033, 2, 12);
    caveLight.position.set(-32, 2, 0);
    this._tag(caveLight); this.scene.add(caveLight);
    this._caveLight = caveLight;
  }

  // ── Lighthouse ────────────────────────────────────────────
  _buildLighthouse() {
    const lhMat = new THREE.MeshStandardMaterial({
      color: 0xc8c8c8, roughness: 0.6
    });

    // Tower body
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.5, 18, 10),
      lhMat
    );
    tower.position.copy(this._lighthousePos);
    tower.position.y = 9;
    tower.castShadow = true;
    this._tag(tower); this.scene.add(tower);

    // Red/white stripes
    [3, 6, 9, 12].forEach(y => {
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: 0xcc0000 })
      );
      stripe.position.copy(this._lighthousePos);
      stripe.position.y = y;
      this._tag(stripe); this.scene.add(stripe);
    });

    // Lantern room
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 2, 10),
      new THREE.MeshStandardMaterial({
        color: 0x88ddff, transparent: true, opacity: 0.7, metalness: 0.3
      })
    );
    lantern.position.copy(this._lighthousePos);
    lantern.position.y = 19;
    this._tag(lantern); this.scene.add(lantern);

    // Rotating beacon
    this._beaconLight = new THREE.SpotLight(0xffffff, 20, 120, Math.PI / 12, 0.3, 1);
    this._beaconLight.position.copy(this._lighthousePos);
    this._beaconLight.position.y = 20;
    this._beaconLight.castShadow = true;
    this._tag(this._beaconLight); this.scene.add(this._beaconLight);

    this._beaconTarget = new THREE.Object3D();
    this._beaconTarget.position.copy(this._lighthousePos);
    this._beaconTarget.position.z -= 30;
    this._tag(this._beaconTarget); this.scene.add(this._beaconTarget);
    this._beaconLight.target = this._beaconTarget;

    this._beaconAngle = 0;

    // Platform ring
    const platform = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.3, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 })
    );
    platform.position.copy(this._lighthousePos);
    platform.position.y = 18;
    platform.rotation.x = Math.PI / 2;
    this._tag(platform); this.scene.add(platform);

    // EXIT glow at base
    const exitGlow = new THREE.PointLight(0xffffff, 4, 12);
    exitGlow.position.copy(this._lighthousePos);
    exitGlow.position.y = 1;
    this._tag(exitGlow); this.scene.add(exitGlow);
    this._exitGlow = exitGlow;
  }

  // ── Shadow Creatures ──────────────────────────────────────
  _buildCreatures() {
    const routes = [
      [new THREE.Vector3(-15, 0, 20), new THREE.Vector3( 15, 0, 20),
       new THREE.Vector3( 15, 0, -5), new THREE.Vector3(-15, 0, -5)],
      [new THREE.Vector3(  0, 0, 30), new THREE.Vector3(  0, 0, 10),
       new THREE.Vector3(-20, 0, 10), new THREE.Vector3(-20, 0, 30)],
    ];

    routes.forEach((route, i) => {
      // Shadow creature – elongated dark shape
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.4, 2.2, 6),
        new THREE.MeshStandardMaterial({
          color: 0x0a0008, emissive: 0x200020, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.85
        })
      );

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0x0a0008, emissive: 0x440044, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.85
        })
      );
      head.position.y = 1.3;
      body.add(head);

      // Glowing purple eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xcc00ff, emissive: 0xcc00ff, emissiveIntensity: 2.0
      });
      [-0.1, 0.1].forEach(x => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat.clone());
        eye.position.set(x, 0, 0.28);
        head.add(eye);
      });

      // Aura light
      const aura = new THREE.PointLight(0x440044, 1.5, 5);
      aura.position.y = 1;
      body.add(aura);

      body.position.copy(route[0]);
      body.position.y = 0.9;
      body.castShadow = true;
      this._tag(body); this.scene.add(body);

      this._entities.push({
        mesh: body, route,
        wpIndex: 0,
        speed: 2.5 + i * 0.5,
        aura,
      });
    });
  }

  // ── Boat Key Collectible ──────────────────────────────────
  _buildBoatKey() {
    const key = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.06, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0xaa44ff, emissive: 0x6600cc, emissiveIntensity: 0.8, metalness: 0.5
      })
    );
    key.position.set(-5, 0.4, -8);
    key.rotation.x = Math.PI / 2;
    this._boatKey = key;
    this._tag(key); this.scene.add(key);

    const kLight = new THREE.PointLight(0x8800ff, 1.5, 4);
    kLight.position.set(-5, 1, -8);
    this._tag(kLight); this.scene.add(kLight);
  }

  // ── Horror Props ──────────────────────────────────────────
  _buildHorrorProps() {
    // Scattered skulls (spheres)
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.9 });
    [[5, 0, 10], [-8, 0, 15], [12, 0, -5], [-3, 0, -18]].forEach(([x, y, z]) => {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), skullMat.clone());
      skull.position.set(x, 0.2, z);
      this._tag(skull); this.scene.add(skull);
    });

    // Chains (thin cylinders hanging)
    for (let i = 0; i < 6; i++) {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 2 + Math.random() * 2, 4),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 })
      );
      chain.position.set(
        (Math.random() - 0.5) * 30,
        2,
        (Math.random() - 0.5) * 20
      );
      this._tag(chain); this.scene.add(chain);
    }
  }

  // ── Lighting ─────────────────────────────────────────────
  _setupLighting() {
    const ambient = new THREE.AmbientLight(0x223344, 1.0);
    this._tag(ambient); this.scene.add(ambient);

    // Moonlight - much brighter so scene is visible
    const moon = new THREE.DirectionalLight(0x8899cc, 1.8);
    moon.position.set(0, 80, 10);
    moon.castShadow           = true;
    moon.shadow.mapSize.width  = 1024;
    moon.shadow.mapSize.height = 1024;
    moon.shadow.camera.left   = -80;
    moon.shadow.camera.right  =  80;
    moon.shadow.camera.top    =  80;
    moon.shadow.camera.bottom = -80;
    this._tag(moon); this.scene.add(moon);

    // Secondary fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x112233, 0.8);
    fillLight.position.set(30, 40, -20);
    this._tag(fillLight); this.scene.add(fillLight);

    // Player torch - wider and brighter
    this._torchLight = new THREE.SpotLight(0xffcc88, 6, 35, Math.PI / 6, 0.4, 1.5);
    this._torchLight.position.set(0, 1.5, 0);
    this._torchLight.castShadow = true;
    this._tag(this._torchLight); this.scene.add(this._torchLight);

    this._torchTarget = new THREE.Object3D();
    this._torchTarget.position.set(0, 0, -10);
    this._tag(this._torchTarget); this.scene.add(this._torchTarget);
    this._torchLight.target = this._torchTarget;
  }

  _setupFog() {
    this.scene.background = new THREE.Color(0x0a1020);
    this.scene.fog         = new THREE.FogExp2(0x0a1020, 0.025);
  }

  // ── Horror Overlay ────────────────────────────────────────
  _buildHorrorOverlay() {
    this._horrorOverlay = document.createElement('div');
    Object.assign(this._horrorOverlay.style, {
      position:        'fixed',
      inset:           '0',
      background:      'rgba(40,0,60,0)',
      pointerEvents:   'none',
      zIndex:          '9',
      transition:      'background 0.5s',
      mixBlendMode:    'multiply',
    });
    document.body.appendChild(this._horrorOverlay);
  }

  // ─── Game Loop ────────────────────────────────────────────
  update(delta) {
    this._updateCreatures(delta);
    this._updateBeacon(delta);
    this._updateTorch(delta);
    this._updateHorrorAtmosphere(delta);
    this._checkLighthouse();
  }

  _updateCreatures(delta) {
    const gm = window.GAME?.gameManager;
    const pc = window.GAME?.playerController;

    this._entities.forEach(e => {
      const target = e.route[e.wpIndex];
      const dir    = target.clone().sub(e.mesh.position);
      dir.y = 0;

      if (dir.length() < 0.5) {
        e.wpIndex = (e.wpIndex + 1) % e.route.length;
      } else {
        dir.normalize();
        e.mesh.position.addScaledVector(dir, e.speed * delta);
        e.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
      e.mesh.position.y = 0.9 + Math.sin(Date.now() * 0.003) * 0.15;

      // Bobbing
      e.mesh.rotation.z = Math.sin(Date.now() * 0.004) * 0.05;

      // Player proximity check
      if (!pc) return;
      const pDist = pc.position.distanceTo(e.mesh.position);

      // Update sanity
      if (pDist < 8) {
        this._sanity = Math.min(100, this._sanity + delta * 15);
        gm?.addDetection(delta * 12);

        // Jump scare
        if (pDist < 3 && this._jumpScareCooldown <= 0) {
          this._triggerJumpScare();
          this._jumpScareCooldown = 8;
          gm?.takeDamage(20);
        }
      } else {
        this._sanity = Math.max(0, this._sanity - delta * 5);
      }

      if (this._jumpScareCooldown > 0) this._jumpScareCooldown -= delta;
    });
  }

  _triggerJumpScare() {
    if (this._jumpScareActive) return;
    this._jumpScareActive = true;

    // Flash white then black
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed', inset: '0',
      background: '#fff',
      zIndex: '500',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.05s',
    });
    document.body.appendChild(flash);

    requestAnimationFrame(() => { flash.style.opacity = '1'; });
    setTimeout(() => { flash.style.opacity = '0'; }, 80);
    setTimeout(() => {
      flash.style.background = '#000';
      flash.style.opacity    = '1';
    }, 100);
    setTimeout(() => {
      flash.style.opacity = '0';
      document.body.removeChild(flash);
      this._jumpScareActive = false;
    }, 350);

    window.GAME?.gameManager?.showAlert('👁 IT SAW YOU', 2000);
  }

  _updateBeacon(delta) {
    if (!this._beaconLight || !this._beaconTarget) return;
    this._beaconAngle += delta * 1.2;
    const r = 40;
    this._beaconTarget.position.set(
      this._lighthousePos.x + Math.sin(this._beaconAngle) * r,
      0,
      this._lighthousePos.z + Math.cos(this._beaconAngle) * r
    );
  }

  _updateTorch(delta) {
    const pc = window.GAME?.playerController;
    if (!pc || !this._torchLight) return;

    this._torchT += delta;
    // Flicker
    this._torchLight.intensity = 2.5 + Math.sin(this._torchT * 17) * 0.3
      + Math.sin(this._torchT * 5) * 0.2;

    this._torchLight.position.copy(pc.position);
    this._torchLight.position.y += 1.5;

    this._torchTarget.position.copy(pc.position);
    this._torchTarget.position.z -= 10;
  }

  _updateHorrorAtmosphere(delta) {
    if (!this._horrorOverlay) return;
    const s = this._sanity / 100;
    this._horrorOverlay.style.background =
      `rgba(40,0,60,${s * 0.35})`;

    // Candle flicker
    if (this._candleFlame) {
      this._candleFlame.intensity = 1.0 + Math.sin(Date.now() * 0.01) * 0.8;
    }
    // Cave pulse
    if (this._caveLight) {
      this._caveLight.intensity = 1.5 + Math.sin(Date.now() * 0.004) * 0.8;
    }
    // Exit glow pulse
    if (this._exitGlow) {
      this._exitGlow.intensity = 3 + Math.sin(Date.now() * 0.003) * 1.5;
    }
  }

  _checkLighthouse() {
    const pc = window.GAME?.playerController;
    const gm = window.GAME?.gameManager;
    if (!pc || !gm) return;

    const d = pc.position.distanceTo(this._lighthousePos);
    if (d < 5) {
      if (this._hasBoatKey) {
        gm.completeObjective('lighthouse');
        gm.triggerWin();
      } else {
        gm.showAlert('⚠ NEED THE ANCIENT KEY', 1200);
      }
    }
  }

  onInteract(playerPos) {
    const gm = window.GAME?.gameManager;
    if (this._boatKey && this._boatKey.parent) {
      const d = playerPos.distanceTo(this._boatKey.position);
      if (d < 2.5) {
        this._hasBoatKey = true;
        this.scene.remove(this._boatKey);
        gm?.completeObjective('find_key');
        gm?.setActiveObjective('lighthouse');
        gm?.showAlert('🗝 ANCIENT KEY FOUND — Reach the LIGHTHOUSE!', 3000);
        return;
      }
    }
    gm?.showAlert('NOTHING NEARBY', 600);
  }

  getGroundY() { return 0.9; }

  destroy() {
    this.scene.fog        = null;
    this.scene.background = null;
    if (this._horrorOverlay && this._horrorOverlay.parentNode) {
      this._horrorOverlay.parentNode.removeChild(this._horrorOverlay);
    }
  }
}