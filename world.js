// ============================================================
// Fulgur Dungeon World.js
// In dieser Datei sind die Regeln der Welt implementiert.
// ============================================================

// Alle Figuren  in einem Array
const objects = [];

let player = null;   // Held wird bei jedem Level neu erzeugt

// Spielzustand: 'play' oder 'dead'. Ohne diese Zeile wäre game dein Canvas (id="game").
const game = { state: 'play', coins: 0 };   // Münzen überleben den Tod 

// Aufbau der Ebene: Spalte und Reihe jedes Objekts. Die Karte selbst
// steht in game.js. Prozedurale Ebenen folgen erst in Block 4.
const LEVEL = {
  hero:    [2, 2],
  crates:  [[6, 3], [4, 5], [11, 4]],          // schiebbar
  orc:     [16, 10],
  orcPatrol: [[13, 10], [20, 10]],             // Wegpunkte des Orks
};

// ---------- Widerstand: Was ist ein Hindernis? ----------

function isSolid(o) {
  return !!o.solid;
}

// Festes Objekt auf einer Zelle, ausser dem, das sich gerade bewegt
function blockerAt(col, row, mover) {
  for (const o of objects) {
    if (o !== mover && o.col === col && o.row === row && isSolid(o)) return o;
  }
  return null;
}

function isBlocked(col, row, mover) {
  return isWall(col, row) || blockerAt(col, row, mover) !== null;
}

// Grundlegende Bewegung auf dem Raster (Block 2), erweitert um Hindernisse.
// interact = true nur beim normalen Schritt des Helden: Dann darf er
// Kisten schieben und den Hebel betätigen. Rolle, Rückstoss und Ork nicht.
function tryMove(e, dcol, drow, interact = false) {
  const nc = e.col + dcol, nr = e.row + drow;   // Kandidat
  // 1. Wand oder ausserhalb des Spielfelds? Dann anhalten.
  if (isWall(nc, nr)) return false;
  // 2. Steht dort ein Hindernis oder eine andere Figur?
  const b = blockerAt(nc, nr, e);
  if (b) {
    if (interact && b.pushable && push(b, dcol, drow)) {
      // Kiste ist ein Feld weitergerückt, die Zielzelle ist jetzt frei
    } else {
      return false;                                                     // sonst: anhalten
    }
  }
  // 3. Zustand ändern
  e.col = nc; e.row = nr;
  foundExit(e);   // Held auf Ausgang? Dann kann er in den nächsten Bereich wechseln.
  return true;
}

// Schieben: Die Kiste rückt ein Feld weiter, wenn dahinter frei ist.
// Dahinter gilt dieselbe Prüfung wie für Figuren, eine Kiste schiebt keine zweite.
function push(o, dcol, drow) {
  if (isBlocked(o.col + dcol, o.row + drow, o)) return false;
  o.col += dcol; o.row += drow;
  o.moving = true;
  return true;
}

// ---------- Interaktion: Auslöser über Kollision ----------
// Rechteck-Kollision aus der Vorlesung (AABB): Überlappen sich a und b?
function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w
      && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Hitbox: kleiner als die Kachel, damit ein Auslöser erst greift,
// wenn der Held sichtbar darauf steht. Nutzt x und y, also die gleitende Position.
function hitbox(e, inset = 8) {
  return { x: e.x + inset, y: e.y + inset, w: TILE - 2 * inset, h: TILE - 2 * inset };
}

// Berührt der Held ein Objekt mit onTouch, reagiert das Objekt selbst
function checkTriggers() {
  const hb = hitbox(player);
  for (const o of objects) {
    if (o.onTouch && !o.dead && overlaps(hb, hitbox(o))) o.onTouch(player);
  }
}

// ---------- Objekte der Welt ----------
// Alles Entities, kein Objekt bekommt eine eigene Klasse.
// Sie unterscheiden sich nur durch Daten und Komponenten.

// Kiste: Hindernis, das der Held schieben kann. GridMovement lässt sie gleiten.
function makeCrate(col, row) {
  const o = new Entity(col, row).add(new GridMovement());
  o.kind = 'crate'; o.solid = true; o.pushable = true;
  o.hp = 1;                          // ein Hieb zerschlägt sie
  o.loot = true;                     // hinterlässt eine Münze
  o.draw = (ctx, x, y) => drawPixel(ctx, PIX.crate, x, y);
  return o;
}

// Münze: Item ohne Widerstand. Beim Berühren zählt sie und verschwindet.
function makeCoin(col, row) {
  const o = new Entity(col, row);
  o.kind = 'coin';
  o.layer = 0;                       // am Boden, unter den Figuren
  o.onTouch = () => {
    game.coins += 1;
    o.dead = true;                   // removeDead räumt sie nach dem Schritt weg
  };
  o.draw = (ctx, x, y) => drawPixel(ctx, PIX.coin, x, y);
  return o;
}


// Wenn die Figur auf dem Ausgang steht, kann sie in den nächsten Bereich wechseln.
function foundExit(e){
  if (map[e.row][e.col] === 2 && e === player) {
    console.log("Found exit, could leave to next Area");
  }
}

// Entfernt tote Objekte. Rückwärts, weil splice alles dahinter nach vorne schiebt.
function removeDead() {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (!o.dead) continue;
    objects.splice(i, 1);
    if (o.loot) objects.push(makeCoin(o.col, o.row));   // Beute fallen lassen
  }
}


// ---------- Ebene aufbauen ----------
function buildLevel(depth) {
  objects.length = 0;

  game.state = 'play';

  // Held (Bewegung, Rolle, Steuerung)
  player = new Entity(LEVEL.hero[0], LEVEL.hero[1], HERO_SPRITE)
    .add(new GridMovement())        // Schreibt x,y
    .add(new RollControl(3, 1.5))   
    .add(new GridControl()) 
    .add(new AttackControl())     // Angriff mit Leertaste
    .add(new Health());
  player.kind = 'hero'; 
  player.solid = true;
  player.maxHp = 5            // 5 Herzen
  player.hp = player.maxHp;   // startet mit voller Gesundheit
  player.invulnTime = 1;            // nach einem Treffer 1 s geschützt
  objects.push(player);
  
  // Ork wie in Block 2, jetzt fest (solid). Noch kein kind = 'orc', sonst stürzt hud.js ab
  const orc = new Entity(LEVEL.orc[0], LEVEL.orc[1], ENEMY_SPRITE)
  .add(new GridMovement())              // Schreibt x,y^
  .add(new Health())                   // Ork kann Schaden nehmen
  .add(new EnemyBrain(decide, {
  patrol: new Patrol(LEVEL.orcPatrol, 0.45),   // Wegpunkte und Geschwindigkeit(1 Schritt alle 0.45 Sekungen)
  chase: new Chase(0.3),                       // auf der Jagd schneller (Alle 0.3 Sekunden einen Schritt)
  attack: new MeleeAttack(1.2, 0.45, 1),       // 1.2 s pro Schlag, trifft nach 0.45 s, 1 Herz
  }));
  orc.solid = true;
  orc.kind = 'orc';                     // damit das HUD weiss, dass es ein Ork ist
  orc.state = 'patrol';                 // Startzustand
  orc.maxHp = 3;                        // hält 3 Treffer aus
  orc.hp = orc.maxHp;
  orc.loot = true;                      // hinterlässt eine Münze
  objects.push(orc);

  for (const [c, r] of LEVEL.crates)  objects.push(makeCrate(c, r));

  lastBumps = 0;   // neuer Held beginnt wieder bei 0 Rempeleien
  lastSwings = 0;
}