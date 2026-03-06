/**
 * playerController.js
 * ─────────────────────────────────────────────────────────────
 * Handles:
 *   • WASD / Arrow movement
 *   • Shift = sprint, C = crouch
 *   • Space = jump (with gravity)
 *   • Third-person camera follow with mouse orbit
 *   • Simple AABB ground collision
 *   • Crouch reduces detection rate
 * ─────────────────────────────────────────────────────────────
 */

export class PlayerController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene  = scene;

    // ── Player mesh (invisible capsule stand-in) ──────────────
    const geo  = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8);
    const mat  = new THREE.MeshStandardMaterial({ color: 0x00ffe7, visible: false });
    this.mesh  = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, 0.9, 0);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // ── Visual body (simple capsule stand-in visible mesh) ────
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.38, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50, roughness: 0.8, metalness: 0.2
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow    = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe8c49a });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 1.05, 0);
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // ── Physics state ─────────────────────────────────────────
    this.velocity   = new THREE.Vector3();
    this.onGround   = true;
    this.gravity    = -20;
    this.jumpForce  = 8;
    this.groundY    = 0.9;   // updated by level

    // ── Movement config ───────────────────────────────────────
    this.walkSpeed   = 6;
    this.sprintSpeed = 11;
    this.crouchSpeed = 2.5;

    // ── State flags ───────────────────────────────────────────
    this.isCrouching = false;
    this.isSprinting = false;

    // ── Camera orbit ─────────────────────────────────────────
    this.camOffset   = new THREE.Vector3(0, 3, 6);
    this.camYaw      = 0;     // horizontal orbit angle (radians)
    this.camPitch    = 0.3;   // vertical tilt (radians)
    this.camMinPitch = -0.1;
    this.camMaxPitch = 1.0;
    this.camSmooth   = 0.12;
    this._camTarget  = new THREE.Vector3();

    // ── Key state ─────────────────────────────────────────────
    this.keys = {};
    window.addEventListener('keydown', e => { this.keys[e.code] = true;  this._onKey(e); });
    window.addEventListener('keyup',   e => { this.keys[e.code] = false; });

    // ── Mouse orbit ───────────────────────────────────────────
    this.isPointerLocked = false;
    document.addEventListener('click', () => {
      if (window.GAME?.gameManager?.isPlaying) {
        document.body.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.camYaw   -= e.movementX * 0.003;
      this.camPitch  = Math.max(
        this.camMinPitch,
        Math.min(this.camMaxPitch, this.camPitch + e.movementY * 0.003)
      );
    });
  }

  // ── Key actions ───────────────────────────────────────────
  _onKey(e) {
    const gm = window.GAME?.gameManager;
    if (!gm?.isPlaying) return;

    // Jump
    if (e.code === 'Space' && this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround   = false;
    }
    // Crouch toggle
    if (e.code === 'KeyC') {
      this.isCrouching = !this.isCrouching;
      // Squish the body to half height when crouching
      const scale = this.isCrouching ? 0.55 : 1.0;
      this.mesh.scale.y = scale;
      gm.showAlert(this.isCrouching ? '▼ CROUCHING' : '▲ STANDING', 900);
    }
    // Interact
    if (e.code === 'KeyE') {
      this._tryInteract();
    }
  }

  /** Try to interact with nearby interactable objects in the scene */
  _tryInteract() {
    const gm = window.GAME?.gameManager;
    const level = gm?.currentLevel;
    if (level?.onInteract) level.onInteract(this.mesh.position);
  }

  // ── Main update ──────────────────────────────────────────
  update(delta) {
    const gm = window.GAME?.gameManager;
    if (!gm?.isPlaying || gm.isPaused || gm.gameOver) return;

    // ── Movement direction from keys ──────────────────────────
    const forward = new THREE.Vector3(
      -Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.camYaw), 0, -Math.sin(this.camYaw)
    );

    let move = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);

    // ── Speed selection ───────────────────────────────────────
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    let speed = this.walkSpeed;
    if (this.isCrouching)  speed = this.crouchSpeed;
    else if (this.isSprinting) speed = this.sprintSpeed;

    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed);
      // Rotate mesh to face movement direction
      const angle = Math.atan2(move.x, move.z);
      this.mesh.rotation.y = angle;
    }

    // Apply horizontal velocity
    this.velocity.x = move.x;
    this.velocity.z = move.z;

    // ── Gravity ───────────────────────────────────────────────
    if (!this.onGround) {
      this.velocity.y += this.gravity * delta;
    }

    // ── Move ─────────────────────────────────────────────────
    this.mesh.position.addScaledVector(this.velocity, delta);

    // ── Ground collision ──────────────────────────────────────
    // Ask current level for ground height at this position
    const level   = gm?.currentLevel;
    const groundY = level?.getGroundY
      ? level.getGroundY(this.mesh.position)
      : this.groundY;

    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velocity.y      = 0;
      this.onGround        = true;
    }

    // ── Boundary clamp (simple world boundary) ────────────────
    const bound = level?.bounds || 80;
    this.mesh.position.x = Math.max(-bound, Math.min(bound, this.mesh.position.x));
    this.mesh.position.z = Math.max(-bound, Math.min(bound, this.mesh.position.z));

    // ── Detection based on speed ──────────────────────────────
    if (this.isSprinting && !this.isCrouching) {
      gm.addDetection(delta * 4);   // sprinting raises detection
    } else if (this.isCrouching) {
      // Crouching lowers detection passively
    }

    // ── Camera follow ─────────────────────────────────────────
    this._updateCamera();
  }

  // ── Third-person camera ───────────────────────────────────
  _updateCamera() {
    // Desired camera position orbiting around player
    const dist = this.isCrouching ? 4 : 6;
    const desiredOffset = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist,
      Math.sin(this.camPitch) * dist + 1.5,
      Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist
    );

    const desiredPos = this.mesh.position.clone().add(desiredOffset);

    // Smooth camera
    this.camera.position.lerp(desiredPos, this.camSmooth);

    // Look at player slightly above center
    this._camTarget.copy(this.mesh.position);
    this._camTarget.y += 1.2;
    this.camera.lookAt(this._camTarget);
  }

  /** Set spawn position (called by level on load) */
  setSpawn(x, y, z) {
    this.mesh.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  /** Return current world position */
  get position() { return this.mesh.position; }
}