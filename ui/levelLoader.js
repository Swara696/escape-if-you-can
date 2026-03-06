/**
 * levelLoader.js
 * ─────────────────────────────────────────────────────────────
 * Dynamically imports the correct level module based on
 * the attendance-derived levelId, clears the scene of any
 * previous level geometry, then calls the level's init().
 * ─────────────────────────────────────────────────────────────
 */

export class LevelLoader {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;

    this._currentLevel = null;
    this._disposables  = [];  // meshes/geometries to dispose on unload
  }

  /**
   * Load a level by ID.
   * @param {string} levelId – 'level1' | 'level2' | 'level3' | 'level4'
   * @returns {Promise<object>} – the level module instance
   */
  async load(levelId) {
    // 1. Tear down previous level
    this._unload();

    // 2. Show loading hint
    window.GAME?.gameManager?.showAlert('LOADING SECTOR...', 99999);

    // 3. Dynamically import the level module
    let LevelClass;
    try {
      switch (levelId) {
        case 'level1':
          ({ Level1 : LevelClass } = await import('../levels/level1_department/level1.js'));
          break;
        case 'level2':
          ({ Level2 : LevelClass } = await import('../levels/level2_college/level2.js'));
          break;
        case 'level3':
          ({ Level3 : LevelClass } = await import('../levels/level3_warzone/level3.js'));
          break;
        case 'level4':
        default:
          ({ Level4 : LevelClass } = await import('../levels/level4_island/level4.js'));
          break;
      }
    } catch (err) {
      console.error('[LevelLoader] Failed to import level:', levelId, err);
      window.GAME?.gameManager?.showAlert('ERROR LOADING SECTOR', 3000);
      return null;
    }

    // 4. Instantiate and initialise the level
    const level = new LevelClass(this.scene, this.camera, this.renderer);
    await level.init();

    this._currentLevel = level;

    // 5. Spawn player at the level's defined spawn point
    const pc = window.GAME?.playerController;
    if (pc && level.spawnPoint) {
      const { x, y, z } = level.spawnPoint;
      pc.setSpawn(x, y, z);
    }

    // 6. Dismiss loading alert
    window.GAME?.gameManager?.showAlert('', 0);

    return level;
  }

  /** Destroy all objects from the previous level */
  _unload() {
    if (!this._currentLevel) return;

    // Call level's own cleanup if it has one
    if (this._currentLevel.destroy) this._currentLevel.destroy();

    // Remove all non-permanent scene children
    // (Levels should tag their objects with userData.levelObject = true)
    const toRemove = [];
    this.scene.traverse((obj) => {
      if (obj.userData && obj.userData.levelObject) toRemove.push(obj);
    });
    toRemove.forEach((obj) => {
      this.scene.remove(obj);
      if (obj.geometry)  obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      }
    });

    this._currentLevel = null;
  }

  get current() { return this._currentLevel; }
}