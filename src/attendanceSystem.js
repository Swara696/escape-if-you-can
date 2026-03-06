/**
 * attendanceSystem.js
 * ─────────────────────────────────────────────────────────────
 * Accepts the player's attendance percentage and maps it to
 * the correct level ID according to game rules.
 *
 * Rules:
 *   > 90        → level1  (Department Escape)
 *   75 – 90     → level2  (College Escape)
 *   40 – 74     → level3  (Warzone Escape)
 *   < 40        → level4  (Dark Horror Island)
 * ─────────────────────────────────────────────────────────────
 */

export class AttendanceSystem {
  constructor() {
    this.attendance = null;

    // Level metadata table
    this.levelMeta = {
      level1: {
        id:          'level1',
        name:        'Department Sector',
        subtitle:    'Escape the HOD surveillance',
        range:       '> 90%',
        color:       '#00ffe7',
        description: 'Good attendance, but the HOD is watching...',
        timeLimit:   300,   // seconds
      },
      level2: {
        id:          'level2',
        name:        'College Campus',
        subtitle:    'Evade security and CCTV',
        range:       '75 – 90%',
        color:       '#f39c12',
        description: 'Almost there. Security patrols the gates.',
        timeLimit:   270,
      },
      level3: {
        id:          'level3',
        name:        'Warzone',
        subtitle:    'Survive the chaos and reach extraction',
        range:       '40 – 74%',
        color:       '#e74c3c',
        description: 'Absent too long. The world has gone to war.',
        timeLimit:   240,
      },
      level4: {
        id:          'level4',
        name:        'Dark Horror Island',
        subtitle:    'Pray you make it out alive',
        range:       '< 40%',
        color:       '#9b59b6',
        description: 'You vanished. The island swallowed you whole.',
        timeLimit:   200,
      },
    };
  }

  /**
   * Validates and stores the attendance value.
   * @param {number|string} value – attendance percentage (0–100)
   * @returns {{ valid: boolean, error?: string }}
   */
  setAttendance(value) {
    const pct = parseFloat(value);

    if (isNaN(pct))             return { valid: false, error: 'Enter a valid number.' };
    if (pct < 0 || pct > 100)  return { valid: false, error: 'Attendance must be 0–100.' };

    this.attendance = pct;
    return { valid: true };
  }

  /**
   * Returns the level ID string based on the attendance value.
   * @param {number} pct – attendance percentage
   * @returns {string} levelId
   */
  getLevelId(pct) {
    const p = parseFloat(pct);
    if (p > 90)          return 'level1';
    if (p >= 75)         return 'level2';
    if (p >= 40)         return 'level3';
    return 'level4';
  }

  /**
   * Returns full metadata for a given levelId.
   * @param {string} levelId
   */
  getMeta(levelId) {
    return this.levelMeta[levelId] || this.levelMeta.level1;
  }

  /**
   * Returns a flavour line based on attendance.
   * Used by the start screen to add drama.
   */
  getFlavourText(pct) {
    const p = parseFloat(pct);
    if (p > 90)  return '"Perfect attendance. Or so you thought..."';
    if (p >= 75) return '"Still in the system. But barely safe."';
    if (p >= 40) return '"The rules broke down. So did everything else."';
    return '"You were never here. Now nowhere is safe."';
  }
}