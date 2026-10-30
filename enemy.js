// =============================================
// enemy.js Gegner: wahrnehmen, entscheiden, handeln
// =============================================

const VIEW_RANGE = 5 * TILE;   // sieht den Helden bis 160 px (5 Kacheln)
const VIEW_COS = 0.5;          // cos 60°: Blickfeld 60 Grad links und rechts der Blickrichtung

// Wahrnehmen: Was weiss der Gegner gerade über den Helden?
// Liest nur und verändert nichts.
function perceive(e) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const dist = Math.hypot(dx, dy); // Luftlinie
  const [fx, fy] = DIRV[e.facing];
  // Skalarprodukt aus Blickrichtung und Richtung zum Helden, geteilt durch den Abstand = cos(Winkel)
  const inView = dist > 0 && (dx * fx + dy * fy) / dist >= VIEW_COS;
  return {
    dist,                                 // Abstand in Pixeln
    adjacent: Math.abs(player.col - e.col) + Math.abs(player.row - e.row) === 1,   // direkt daneben
    sees: dist <= VIEW_RANGE && inView && hasLineOfSight(e, player),   // nah, im Blickfeld, keine Wand dazwischen
  };
}

// Sichtlinie: Prüfen ob auf der Linie kein Hindernis oder Wand ist
function hasLineOfSight(a, b) {
  const ax = a.x + TILE / 2, ay = a.y + TILE / 2;   // Mitte von a
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  for (let s = 8; s < dist; s += 8) {
    const col = Math.floor((ax + dx * s / dist) / TILE);
    const row = Math.floor((ay + dy * s / dist) / TILE);
    if (isWall(col, row)) return false;
  }
  return true;
}