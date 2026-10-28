// ==========================
// combat.js · Kampf: Trefferpunkte, Schaden, Invinzibilität
// ==========================

// Komponente Health: Zählt die Schutzzeit (invuln) jeden Schritt herunter
// Solange invuln > 0, kann die Figur keinen Schaden nehmen.
class Health {
  update(e,dt) {
    e.invuln = Math.max(0,(e.invuln || 0) - dt);
  }
}
