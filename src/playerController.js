/**
 * playerController.js
 * Full rewrite — animated student character with:
 *  • Walk/run bob animation
 *  • Arm-swing legs
 *  • Stamina system
 *  • Backpack
 *  • Smooth crouch
 *  • Sound-driven footsteps
 */
export class PlayerController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene  = scene;

    // ── Root object (moves in world) ──────────────────────
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0.9, 0);
    scene.add(this.mesh);

    this._buildStudentBody();

    // ── Physics ───────────────────────────────────────────
    this.velocity  = new THREE.Vector3();
    this.onGround  = true;
    this.gravity   = -22;
    this.jumpForce = 9;
    this.groundY   = 0.9;

    // ── Movement ──────────────────────────────────────────
    this.walkSpeed   = 5.5;
    this.sprintSpeed = 10;
    this.crouchSpeed = 2.2;

    // ── Stamina ───────────────────────────────────────────
    this.stamina     = 100;
    this.maxStamina  = 100;
    this.staminaDrain  = 28;   // per second while sprinting
    this.staminaRegen  = 14;

    // ── State ─────────────────────────────────────────────
    this.isCrouching = false;
    this.isSprinting = false;
    this.isMoving    = false;
    this._crouchT    = 0;       // 0=stand, 1=crouch (lerp)
    this._bobT       = 0;
    this._limbT      = 0;

    // ── Camera orbit ──────────────────────────────────────
    this.camYaw      = 0;
    this.camPitch    = 0.28;
    this.camMinPitch = -0.05;
    this.camMaxPitch = 0.95;
    this._camPos     = new THREE.Vector3();
    this._camLook    = new THREE.Vector3();

    // ── Keys ──────────────────────────────────────────────
    this.keys = {};
    window.addEventListener('keydown', e => { this.keys[e.code] = true;  this._onKey(e); });
    window.addEventListener('keyup',   e => { this.keys[e.code] = false; });

    // ── Mouse look (pointer lock) ─────────────────────────
    this.isPointerLocked = false;
    document.addEventListener('click', () => {
      if (window.GAME?.gameManager?.isPlaying && !window.GAME?.gameManager?.isPaused)
        document.body.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });
    document.addEventListener('mousemove', e => {
      if (!this.isPointerLocked) return;
      this.camYaw   -= e.movementX * 0.0028;
      this.camPitch  = Math.max(this.camMinPitch, Math.min(this.camMaxPitch, this.camPitch + e.movementY * 0.0028));
    });
  }

  // ── Build student character ───────────────────────────
  _buildStudentBody() {
    const skin   = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
    const shirt  = new THREE.MeshStandardMaterial({ color: 0x2c5fa1, roughness: 0.9 }); // blue shirt
    const pants  = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 }); // dark jeans
    const shoe   = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const hair   = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0 });
    const bag    = new THREE.MeshStandardMaterial({ color: 0x2c6e49, roughness: 0.9 }); // green backpack

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.28), shirt);
    this.torso.position.y = 0.55; this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.35), skin);
    this.head.position.y = 1.12; this.head.castShadow = true;
    this.mesh.add(this.head);

    // Hair
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.16, 0.37), hair);
    hairMesh.position.y = 0.14;
    this.head.add(hairMesh);

    // Eyes (white + pupil)
    [-0.09, 0.09].forEach(x => {
      const white = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
      white.position.set(x, 0.02, 0.178);
      this.head.add(white);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x111111 }));
      pupil.position.set(0, 0, 0.01);
      white.add(pupil);
    });

    // Backpack
    const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.18), bag);
    packBody.position.set(0, 0.55, -0.22);
    packBody.castShadow = true;
    this.mesh.add(packBody);

    const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.06), bag.clone());
    packPocket.material.color.set(0x245c3a);
    packPocket.position.set(0, 0.38, -0.13);
    this.mesh.add(packPocket);

    // Arms
    this.armL = this._makeArm(shirt, skin, -0.36);
    this.armR = this._makeArm(shirt, skin,  0.36);

    // Legs
    this.legL = this._makeLeg(pants, shoe, -0.15);
    this.legR = this._makeLeg(pants, shoe,  0.15);
  }

  _makeArm(sleeveM, skinM, x) {
    const g = new THREE.Group();
    g.position.set(x, 0.55, 0);
    // Upper arm
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.38, 0.17), sleeveM);
    upper.position.y = -0.18;
    g.add(upper);
    // Forearm
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), skinM);
    lower.position.y = -0.54;
    g.add(lower);
    g.castShadow = true;
    this.mesh.add(g);
    return g;
  }

  _makeLeg(pantsM, shoeM, x) {
    const g = new THREE.Group();
    g.position.set(x, 0.22, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), pantsM);
    upper.position.y = -0.2;
    g.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.38, 0.19), pantsM.clone());
    lower.position.y = -0.55;
    g.add(lower);
    // Shoe
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.32), shoeM);
    s.position.set(0, -0.75, 0.05);
    g.add(s);
    g.castShadow = true;
    this.mesh.add(g);
    return g;
  }

  // ── Key events ────────────────────────────────────────
  _onKey(e) {
    const gm = window.GAME?.gameManager;
    if (!gm?.isPlaying) return;

    if (e.code === 'Space' && this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround   = false;
      window.GAME?.soundSystem?.jump();
    }
    if (e.code === 'KeyC') {
      this.isCrouching = !this.isCrouching;
      gm.showAlert(this.isCrouching ? '▼ CROUCHING — detection reduced' : '▲ STANDING', 1000);
    }
    if (e.code === 'KeyE') this._tryInteract();
  }

  _tryInteract() {
    const level = window.GAME?.gameManager?.currentLevel;
    if (level?.onInteract) level.onInteract(this.mesh.position);
  }

  // ── Main update ──────────────────────────────────────
  update(delta) {
    const gm = window.GAME?.gameManager;
    if (!gm?.isPlaying || gm.isPaused || gm.gameOver) return;

    const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right   = new THREE.Vector3( Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));

    let move = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);

    this.isMoving = move.length() > 0;

    // Stamina
    const wantSprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.isSprinting = wantSprint && this.isMoving && this.stamina > 5 && !this.isCrouching;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrain * delta);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * delta);
    }
    // Update stamina bar
    const sf = document.getElementById('staminaFill');
    if (sf) sf.style.width = this.stamina + '%';

    let speed = this.isCrouching ? this.crouchSpeed : this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    if (this.isMoving) {
      move.normalize().multiplyScalar(speed);
      this.mesh.rotation.y = Math.atan2(move.x, move.z);
    }

    this.velocity.x = move.x;
    this.velocity.z = move.z;

    // Gravity
    if (!this.onGround) this.velocity.y += this.gravity * delta;

    this.mesh.position.addScaledVector(this.velocity, delta);

    // Ground
    const level   = gm.currentLevel;
    const groundY = level?.getGroundY ? level.getGroundY(this.mesh.position) : this.groundY;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velocity.y      = 0;
      this.onGround        = true;
    }

    // Boundary
    const bound = level?.bounds || 65;
    this.mesh.position.x = Math.max(-bound, Math.min(bound, this.mesh.position.x));
    this.mesh.position.z = Math.max(-bound, Math.min(bound, this.mesh.position.z));

    // Detection from sprinting
    if (this.isSprinting) gm.addDetection(delta * 3.5);

    // Crouch interpolation
    this._crouchT = THREE.MathUtils.lerp(this._crouchT, this.isCrouching ? 1 : 0, delta * 8);
    const crouchOffset = this._crouchT * -0.35;
    this.torso.position.y = 0.55 + crouchOffset;
    this.head.position.y  = 1.12 + crouchOffset;

    // Walk bob + limb animation
    this._animate(delta, speed);

    // Footsteps
    const surface = level?.meta?.id === 'level1' ? 'tile' :
                    level?.meta?.id === 'level2' ? 'grass' :
                    level?.meta?.id === 'level3' ? 'gravel' : 'tile';
    window.GAME?.soundSystem?.tickFootsteps(delta, this.isMoving, this.isSprinting, surface);

    // Camera
    this._updateCamera();

    // Nearby interact check
    this._checkInteractProximity();
  }

  _animate(delta, speed) {
    if (!this.isMoving) {
      // Idle breathing
      this._bobT += delta * 1.2;
      this.torso.position.y += Math.sin(this._bobT) * 0.003;
      // Return limbs to rest
      this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, 0, delta * 6);
      this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, 0, delta * 6);
      this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, delta * 6);
      this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, delta * 6);
      return;
    }

    const rate = this.isSprinting ? 9 : this.isCrouching ? 4 : 6;
    this._limbT += delta * rate;

    const swing = Math.sin(this._limbT) * (this.isSprinting ? 0.9 : 0.55);
    const bob   = Math.abs(Math.sin(this._limbT)) * (this.isCrouching ? 0.01 : this.isSprinting ? 0.06 : 0.03);

    this.armL.rotation.x =  swing * 0.9;
    this.armR.rotation.x = -swing * 0.9;
    this.legL.rotation.x = -swing;
    this.legR.rotation.x =  swing;

    // Bob the whole body
    this.mesh.position.y = this.groundY + bob;
    // Head slight tilt
    this.head.rotation.z = Math.sin(this._limbT * 0.5) * 0.02;
  }

  _checkInteractProximity() {
    const level  = window.GAME?.gameManager?.currentLevel;
    const prompt = document.getElementById('interactPrompt');
    if (!prompt || !level) return;
    let near = false;
    if (level._interactables) {
      level._interactables.forEach(it => {
        if (it.mesh?.parent && this.mesh.position.distanceTo(it.mesh.position) < 2.5) near = true;
      });
    }
    if (level._cardMesh?.parent && this.mesh.position.distanceTo(level._cardMesh.position) < 2.5) near = true;
    if (level._boatKey?.parent  && this.mesh.position.distanceTo(level._boatKey.position) < 2.5) near = true;
    prompt.style.opacity = near ? '1' : '0';
  }

  _updateCamera() {
    const crouchMod = this.isCrouching ? -0.4 : 0;
    const dist = 5.5;
    const desired = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist,
      Math.sin(this.camPitch) * dist + 1.6 + crouchMod,
      Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist
    ).add(this.mesh.position);

    this.camera.position.lerp(desired, 0.14);
    this._camLook.copy(this.mesh.position).setY(this.mesh.position.y + 1.1 + crouchMod);
    this.camera.lookAt(this._camLook);
  }

  setSpawn(x, y, z) {
    this.mesh.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.camera.position.set(x, y + 4, z + 6);
  }

  get position() { return this.mesh.position; }
}