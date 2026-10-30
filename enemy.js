// =============================================
// enemy.js Gegner: wahrnehmen, entscheiden, handeln
// =============================================

const VIEW_RANGE = 5 * TILE;   // sieht den Helden bis 160 px (5 Kacheln)
const VIEW_COS = 0.5;          // cos 60°: Blickfeld 60 Grad links und rechts der Blickrichtung
const LOSE_RANGE = 8 * TILE;   // gibt die Jagd erst ab 256 px auf

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

// Entscheiden: Zustandsmaschine des Orks (Zustandsdiagramm_Ork_v2.png)
//   patrol → chase    sieht den Helden (bis 160 px, Blickfeld, Sichtlinie) oder getroffen
//   chase  → attack   Held direkt daneben
//   chase  → patrol   Abstand über 256 px (dazwischen jagt er weiter, Hysterese)
//   attack → chase    Schlag fertig und Held nicht mehr daneben
// Reine Funktion: liest nur, verändert nichts.

function decide(state, p) {
  if (state === 'patrol') {
    return (p.sees || p.wasHit) ? 'chase' : 'patrol';
  }
  if (state === 'chase') {
    if (p.adjacent) return 'attack';
    if (p.dist > LOSE_RANGE) return 'patrol';
    return 'chase';
  }
  if (state === 'attack') {
    return (!p.swinging && !p.adjacent) ? 'chase' : 'attack';   // einen Schlag bricht er nicht ab
  }
  return state;
}

// Mini-Prüfstand: jeder Pfeil aus dem Diagramm einmal. Nur Fehler erscheinen in der Konsole.
console.assert(decide('patrol', { sees: true }) === 'chase', 'Patrouillieren → Verfolgen: sieht den Helden');
console.assert(decide('patrol', { wasHit: true }) === 'chase', 'Patrouillieren → Verfolgen: wurde getroffen');
console.assert(decide('patrol', {}) === 'patrol', 'Patrouillieren bleibt ohne Grund');
console.assert(decide('chase', { adjacent: true, dist: 32 }) === 'attack', 'Verfolgen → Angreifen: Held daneben');
console.assert(decide('chase', { dist: 300 }) === 'patrol', 'Verfolgen → Patrouillieren: Abstand > 256 px');
console.assert(decide('chase', { dist: 200 }) === 'chase', 'Hysterese: bei 200 px jagt er weiter');
console.assert(decide('attack', { adjacent: false }) === 'chase', 'Angreifen → Verfolgen: Held nicht mehr daneben');
console.assert(decide('attack', { adjacent: false, swinging: true }) === 'attack', 'Angreifen: Schlag wird nicht abgebrochen');
console.log('Prüfstand decide: 8 Tests gelaufen');