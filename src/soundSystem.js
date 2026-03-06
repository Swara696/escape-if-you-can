/**
 * soundSystem.js
 * ─────────────────────────────────────────────────────────────
 * Procedural Web Audio API sound engine — no external files needed.
 * Generates all game sounds synthetically:
 *   footsteps, heartbeat, alarm, explosion, ambient drones,
 *   horror stings, pickup chime, win/lose jingles
 * ─────────────────────────────────────────────────────────────
 */
export class SoundSystem {
  constructor() {
    this._ctx    = null;
    this._master = null;
    this._muted  = false;
    this._ambientNode = null;
    this._heartNode   = null;
    this._footTimer   = 0;
    this._footInterval = 0.42;
    this._levelId = null;

    // Try to create AudioContext on first user gesture
    this._ready = false;
    document.addEventListener('click', () => this._init(), { once: true });
    document.addEventListener('keydown', () => this._init(), { once: true });

    // Sound toggle button
    const btn = document.getElementById('soundToggle');
    if (btn) btn.addEventListener('click', () => this.toggle(), { capture: true });
  }

  _init() {
    if (this._ready) return;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.6;
      this._master.connect(this._ctx.destination);
      this._ready = true;
    } catch(e) { console.warn('[Sound] AudioContext failed', e); }
  }

  get ctx() { return this._ctx; }

  // ── Toggle mute ──────────────────────────────────────────
  toggle() {
    if (!this._ready) { this._init(); return; }
    this._muted = !this._muted;
    this._master.gain.value = this._muted ? 0 : 0.6;
    const btn = document.getElementById('soundToggle');
    if (btn) btn.textContent = this._muted ? '🔇 MUTED' : '🔊 SOUND';
  }

  // ── Core helper: play oscillator burst ───────────────────
  _osc(type, freq, duration, gainVal = 0.3, startFreq = null, dest = null) {
    if (!this._ready || this._muted) return;
    const ctx  = this._ctx;
    const now  = ctx.currentTime;
    const g    = ctx.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    g.connect(dest || this._master);

    const osc  = ctx.createOscillator();
    osc.type   = type;
    osc.frequency.setValueAtTime(startFreq || freq, now);
    if (startFreq) osc.frequency.exponentialRampToValueAtTime(freq, now + duration * 0.5);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + duration);
  }

  // ── Noise burst (for footsteps, explosions) ───────────────
  _noise(duration, gainVal = 0.15, freq = 400) {
    if (!this._ready || this._muted) return;
    const ctx      = this._ctx;
    const now      = ctx.currentTime;
    const bufSize  = ctx.sampleRate * duration;
    const buffer   = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data     = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

    const src    = ctx.createBufferSource();
    src.buffer   = buffer;

    const filt   = ctx.createBiquadFilter();
    filt.type    = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = 1.5;

    const g      = ctx.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filt);
    filt.connect(g);
    g.connect(this._master);
    src.start(now);
    src.stop(now + duration);
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC SOUND EFFECTS
  // ─────────────────────────────────────────────────────────

  /** Footstep — varies by surface type */
  footstep(surface = 'tile', running = false) {
    if (!this._ready) return;
    if (surface === 'tile') {
      this._noise(0.06, running ? 0.22 : 0.14, 300);
      this._osc('sine', 80, 0.08, 0.08);
    } else if (surface === 'grass') {
      this._noise(0.1, running ? 0.18 : 0.1, 150);
    } else if (surface === 'gravel') {
      this._noise(0.08, 0.2, 600);
      this._noise(0.05, 0.1, 200);
    } else {
      this._noise(0.07, 0.15, 250);
    }
  }

  /** Pickup chime */
  pickup() {
    this._osc('sine', 880, 0.15, 0.25);
    setTimeout(() => this._osc('sine', 1320, 0.2, 0.2), 80);
    setTimeout(() => this._osc('sine', 1760, 0.3, 0.18), 160);
  }

  /** Alert / detection beep */
  alert() {
    this._osc('square', 440, 0.12, 0.3);
    setTimeout(() => this._osc('square', 440, 0.12, 0.3), 150);
    setTimeout(() => this._osc('square', 880, 0.2, 0.4), 300);
  }

  /** Damage hit */
  damage() {
    this._noise(0.18, 0.5, 120);
    this._osc('sawtooth', 80, 0.25, 0.4, 200);
  }

  /** Explosion */
  explosion() {
    this._noise(0.8, 0.9, 100);
    this._osc('sawtooth', 40, 1.0, 0.6, 200);
    setTimeout(() => this._noise(0.5, 0.4, 80), 100);
  }

  /** Door / gate open */
  gateOpen() {
    this._osc('sawtooth', 200, 0.3, 0.2, 80);
    setTimeout(() => this._osc('sine', 400, 0.4, 0.15), 200);
  }

  /** Jump */
  jump() {
    this._osc('sine', 180, 0.15, 0.18, 120);
  }

  /** Win jingle */
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this._osc('sine', f, 0.4, 0.35), i * 120));
  }

  /** Lose sting */
  lose() {
    this._osc('sawtooth', 220, 0.5, 0.4, 440);
    setTimeout(() => this._osc('sawtooth', 165, 0.7, 0.3, 220), 300);
    setTimeout(() => this._osc('sawtooth', 110, 1.0, 0.25, 165), 700);
  }

  /** Horror sting (jump scare) */
  jumpScare() {
    this._noise(0.3, 0.8, 2000);
    this._osc('sawtooth', 60, 0.5, 0.7, 800);
    setTimeout(() => this._osc('sawtooth', 30, 0.8, 0.5, 200), 100);
  }

  /** Footstep auto-ticker — call every frame with delta */
  tickFootsteps(delta, isMoving, isSprinting, surface = 'tile') {
    if (!isMoving) { this._footTimer = 0; return; }
    const interval = isSprinting ? 0.28 : this._footInterval;
    this._footTimer += delta;
    if (this._footTimer >= interval) {
      this._footTimer = 0;
      this.footstep(surface, isSprinting);
    }
  }

  // ─────────────────────────────────────────────────────────
  // AMBIENT LOOPS
  // ─────────────────────────────────────────────────────────

  startAmbient(levelId) {
    this._levelId = levelId;
    this.stopAmbient();
    if (!this._ready) { setTimeout(() => this.startAmbient(levelId), 1000); return; }

    const ctx = this._ctx;
    const now = ctx.currentTime;

    if (levelId === 'level1') {
      // Fluorescent hum
      this._ambientNode = this._createLoop(60, 'sine', 0.04);
      this._createLoop(120, 'sine', 0.02);
    } else if (levelId === 'level2') {
      // Outdoor breeze
      this._ambientNode = this._createNoiseLFO(0.06, 0.5, 300);
    } else if (levelId === 'level3') {
      // Deep war rumble
      this._ambientNode = this._createLoop(40, 'sawtooth', 0.08);
      this._createNoiseLFO(0.12, 0.3, 100);
    } else if (levelId === 'level4') {
      // Horror drone — low detuned oscillators
      this._ambientNode = this._createLoop(30, 'sine', 0.12);
      this._createLoop(31, 'sine', 0.08);   // slight detune = beating effect
      this._createNoiseLFO(0.05, 2.0, 200);
    }
  }

  stopAmbient() {
    if (this._ambientNode) {
      try { this._ambientNode.stop(); } catch(e){}
      this._ambientNode = null;
    }
  }

  _createLoop(freq, type, gainVal) {
    if (!this._ready) return null;
    const ctx  = this._ctx;
    const osc  = ctx.createOscillator();
    const g    = ctx.createGain();
    osc.type   = type;
    osc.frequency.value = freq;
    g.gain.value = gainVal;
    osc.connect(g); g.connect(this._master);
    osc.start();
    return osc;
  }

  _createNoiseLFO(gainVal, rate, filterFreq) {
    if (!this._ready) return null;
    const ctx  = this._ctx;
    const now  = ctx.currentTime;

    // White noise source
    const bufSize = ctx.sampleRate * 3;
    const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d       = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;

    const filt = ctx.createBiquadFilter();
    filt.type  = 'lowpass';
    filt.frequency.value = filterFreq;

    const lfo  = ctx.createOscillator();
    lfo.frequency.value = rate;
    const lfoG = ctx.createGain();
    lfoG.gain.value = gainVal * 0.5;
    lfo.connect(lfoG); lfoG.connect(filt.frequency);

    const g    = ctx.createGain();
    g.gain.value = gainVal;
    src.connect(filt); filt.connect(g); g.connect(this._master);
    src.start(); lfo.start();
    return src;
  }

  // Heartbeat — plays when health is low
  startHeartbeat() {
    if (this._heartNode || !this._ready) return;
    const beat = () => {
      if (!this._heartNode) return;
      this._osc('sine', 60, 0.08, 0.5);
      setTimeout(() => this._osc('sine', 55, 0.06, 0.4), 100);
      this._heartNode = setTimeout(beat, 800);
    };
    this._heartNode = setTimeout(beat, 0);
  }
  stopHeartbeat() {
    if (this._heartNode) { clearTimeout(this._heartNode); this._heartNode = null; }
  }
}