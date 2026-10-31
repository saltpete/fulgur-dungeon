// =============================================
// enemy.js Gegner: wahrnehmen, entscheiden, handeln
// =============================================

const VIEW_RANGE = 5 * TILE;   // sieht den Helden bis 160 px (5 Kacheln)
const VIEW_COS = 0.5;          // cos 60°: Blickfeld 60 Grad links und rechts der Blickrichtung
const LOSE_RANGE = 8 * TILE;   // gibt die Jagd erst ab 256 px auf
const STATE_NAMES = { patrol: 'Patrouillieren', chase: 'Verfolgen', attack: 'Angreifen' };   // fürs Overlay

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
    wasHit: !!e.wasHit,                   // seit dem letzten Schritt getroffen?
    swinging: !!e.swinging,               // mitten in einem Schlag?
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

// ---------- Handeln: Verhalten als Bausteine ----------
// Jedes Verhalten hat act(e, p, dt). EnemyBrain ruft das Verhalten des aktuellen Zustands auf.

// Ein Schritt Richtung Ziel, zuerst auf der grösseren Achse.
// Ist die blockiert, versucht er die andere, so bleibt er seltener an Wänden hängen.
function stepToward(e, col, row) {
  const dcol = col - e.col, drow = row - e.row;
  const horizontal = [Math.sign(dcol), 0], vertical = [0, Math.sign(drow)];
  const tries = Math.abs(dcol) > Math.abs(drow) ? [horizontal, vertical] : [vertical, horizontal];
  for (const [dc, dr] of tries) {
    if (dc === 0 && dr === 0) continue;
    e.facing = dc < 0 ? 'left' : dc > 0 ? 'right' : dr < 0 ? 'up' : 'down';
    if (tryMove(e, dc, dr)) return;
  }
}

// Patrouillieren: läuft seine Wegpunkte der Reihe nach ab
class Patrol {
  constructor(points, interval) {
    this.points = points;       // Wegpunkte [Spalte, Reihe]
    this.index = 0;             // aktueller Wegpunkt
    this.interval = interval;   // Sekunden pro Schritt
    this.timer = 0;
  }
  act(e, p, dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval;
    const [col, row] = this.points[this.index];
    if (e.col === col && e.row === row) this.index = (this.index + 1) % this.points.length;   // angekommen: nächster
    else stepToward(e, col, row);
  }
}

// Verfolgen: läuft zum Helden, schneller als auf Patrouille
class Chase {
  constructor(interval) {
    this.interval = interval;
    this.timer = 0;
  }
  act(e, p, dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval;
    stepToward(e, player.col, player.row);
  }
}

// Komponente EnemyBrain: jeden Schritt wahrnehmen, entscheiden, handeln.
// decideFn ist die Zustandsmaschine dieses Gegners, behaviors die Bausteine pro Zustand.
class EnemyBrain {
  constructor(decideFn, behaviors) {
    this.decide = decideFn;
    this.behaviors = behaviors;
  }
  update(e, dt) {
    const p = perceive(e);                   // 1. wahrnehmen
    e.state = this.decide(e.state, p);       // 2. entscheiden
    e.wasHit = false;                        // Treffer ist verarbeitet
    const b = this.behaviors[e.state];       // 3. handeln
    if (b) b.act(e, p, dt);                  // ohne Baustein für den Zustand: stehen bleiben
  }
}

// Angreifen: dreht sich zum Helden, holt aus und schlägt zu. Getroffen wird nur,
// wer beim Zuschlagen noch direkt vor ihm steht. Wer rechtzeitig wegrollt, weicht aus.
class MeleeAttack {
  constructor(time, hitAt, amount) {
    this.time = time;       // ganzer Schlag in Sekunden
    this.hitAt = hitAt;     // nach so vielen Sekunden trifft er
    this.amount = amount;   // Schaden pro Treffer
    this.timer = 0;         // läuft während des Schlags von time auf 0
    this.hitDone = true;    // Treffer dieses Schlags schon ausgewertet?
  }
  act(e, p, dt) {
    if (this.timer <= 0) {                // neuer Schlag
      faceToward(e, player);
      this.timer = this.time;
      this.hitDone = false;
    }
    this.timer -= dt;
    if (!this.hitDone && this.time - this.timer >= this.hitAt) {
      this.hitDone = true;
      const [dcol, drow] = DIRV[e.facing];
      if (player.col === e.col + dcol && player.row === e.row + drow) damage(player, this.amount, dcol, drow);
    }
    e.swinging = this.timer > 0;                                // decide bricht den Schlag nicht ab
    e.attackAnim = e.swinging ? 1 - this.timer / this.time : 0; // Fortschritt 0 bis 1 fürs Bild
  }
}

// Dreht e zum Ziel t, auf der grösseren Achse
function faceToward(e, t) {
  const dcol = t.col - e.col, drow = t.row - e.row;
  if (Math.abs(dcol) > Math.abs(drow)) e.facing = dcol < 0 ? 'left' : 'right';
  else e.facing = drow < 0 ? 'up' : 'down';
}