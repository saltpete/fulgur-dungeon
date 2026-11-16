// ============================================================
// Fulgur Dungeon World.js
// In dieser Datei sind die Regeln der Welt implementiert.
// ============================================================

// Alle Figuren  in einem Array
const objects = [];

let player = null;   // Held wird bei jedem Level neu erzeugt

// Spielzustand: 'play' oder 'dead'. Ohne diese Zeile wäre game dein Canvas (id="game").
const game = { state: 'play', coins: 0, depth: 1 };   // Münzen überleben den Tod

// Aufbau der Ebene: Spalte und Reihe jedes Objekts
const LEVEL = {
  hero:    [2, 2],
  crates:  [[6, 3], [4, 5], [11, 4]],          // schiebbar
  stairs:  [21, 10],                           // Treppe zur nächsten Ebene
  enemies: [                                   // gleich aufgebaut wie bei generateLevel
    { kind: 'orc',   col: 16, row: 10 },
    { kind: 'slime', col: 19, row: 3 },
  ],
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
// Kisten schieben. Rolle, Rückstoss und Ork nicht.
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
  o.kind = 'crate';
  o.solid = true;                    // solides Objekt
  o.pushable = true;                 // kann verschoben werden
  o.hp = 1;                          // ein Hieb zerschlägt sie
  o.loot = true;                     // hinterlässt eine Münze
  o.hitFx = SPLINTERS;               // Holzsplitter beim Treffer
  o.draw = (ctx, x, y) => drawPixel(ctx, PIX.crate, x, y);
  return o;
}

// Münze: Item ohne Widerstand. Beim Berühren zählt sie und verschwindet.
// TODO: Je nachdem was makeCoin triggert unterschiedlich viele Coins erstellen (Bosse / Kisten (unterschiedliche Anzahl)) evtl. durch Director gesteuert
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

// TODO: makeHeart

// Treppe: Zone über der Treppenkachel. Beim Berühren geht es eine Ebene tiefer.
// Nur ein Merker: buildLevel darf nicht mitten in der Schleife über objects laufen.
function makeStairs(col, row) {
  const o = new Entity(col, row);
  o.kind = 'stairs';
  o.layer = 0;                       // am Boden
  o.onTouch = () => { game.nextLevel = true; };
  o.draw = () => {};                 // die Karte zeichnet die Treppe
  return o;
}

// ---------- Gegner ----------
// Alle Gegner in einer Tabelle: Aussehen, Verhalten und Werte. Ein neuer Gegner ist eine neue Zeile.
// brain 'hunt': patrouillieren, verfolgen, angreifen. brain 'flee': patrouillieren, fliehen.
// cost: Preis im Gegnerbudget (mapgen.js). Zeiten in Sekunden, hit = Herzen pro Schlag.
// TODO: Bossgegner alle 5 Level dafür auch neue Liste (BOSS_TYPES) und makeBoss, die dann auch eine eigene Grafik haben. 
const ENEMY_TYPES = {
  slime:  { sprite: SLIME_SPRITE,  brain: 'flee', cost: 2, hp: 2, patrol: 0.6,  flee: 0.3,  goo: true, barY: -20 },
  slime2: { sprite: SLIME2_SPRITE, brain: 'flee', cost: 3, hp: 3, patrol: 0.5,  flee: 0.25, goo: true, barY: -20 },
  slime3: { sprite: SLIME3_SPRITE, brain: 'hunt', cost: 4, hp: 3, patrol: 0.6,  chase: 0.35, swing: 1.2, hitAt: 0.5,  hit: 1, goo: true, barY: -20 },
  orc:    { sprite: ENEMY_SPRITE,  brain: 'hunt', cost: 3, hp: 3, patrol: 0.45, chase: 0.3,  swing: 1.2, hitAt: 0.45, hit: 1 },
  orc2:   { sprite: ENEMY2_SPRITE, brain: 'hunt', cost: 5, hp: 5, patrol: 0.45, chase: 0.25, swing: 1.0, hitAt: 0.4,  hit: 1 },
};

// Baut einen Gegner aus seiner Tabellenzeile, immer aus denselben Bausteinen
function makeEnemy(kind, col, row) {
  const t = ENEMY_TYPES[kind];
  const brain = t.brain === 'hunt'
    ? new EnemyBrain(decide, { patrol: new Patrol(t.patrol), chase: new Chase(t.chase), attack: new MeleeAttack(t.swing, t.hitAt, t.hit) })
    : new EnemyBrain(fleeDecision(4 * TILE, 6 * TILE), { patrol: new Patrol(t.patrol), flee: new Flee(t.flee) });
  const o = new Entity(col, row, t.sprite)
    .add(new GridMovement())
    .add(new Health())
    .add(brain);
  o.kind = kind;
  o.state = 'patrol';                      // Startzustand
  o.solid = true;
  o.maxHp = t.hp;
  o.hp = t.hp;
  o.loot = true;                           // hinterlässt eine Münze
  o.hitFx = t.goo ? GOO : BLOOD;           // Teilchen beim Treffer
  o.barY = t.barY;                         // Höhe des Lebensbalkens, ohne Angabe Standard
  return o;
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
  const hpBefore = depth > 1 ? player.hp : null  // HP speichern wenn Level grösser als 1
  objects.length = 0;

  if (depth === 1) game.seed = newRunSeed();                       // neuer Durchlauf, neuer Seed
  const L = depth === 1 ? useLevel1()
        : generateLevel(game.seed + depth * 7919, depth);

  game.state = 'play';
  game.depth = depth;
  game.nextLevel = false;

  // Held (Bewegung, Rolle, Steuerung)
  player = new Entity(L.hero[0], L.hero[1], HERO_SPRITE)
    .add(new GridMovement())        // Schreibt x,y
    .add(new RollControl(3, 1.5))   
    .add(new GridControl()) 
    .add(new AttackControl())     // Angriff mit Leertaste
    .add(new Health())
    .add(new BoltControl(2));        // F: Blitz, 2 s Abklingzeit // TODO Abklingzeit verkürzen mit Levelup
  player.kind = 'hero';
  player.hitFx = BLOOD;
  player.solid = true;
  player.maxHp = 5            // 5 Herzen
  player.hp = hpBefore ?? player.maxHp;   // nimmt seine Leben mit, nur Ebene 1 startet voll
  player.invulnTime = 1;            // nach einem Treffer 1 s geschützt
  objects.push(player);
  
  // Gegner: so viele, wie in L.enemies stehen (Ebene 1 fest, ab Ebene 2 aus dem Budget)
  for (const e of L.enemies) objects.push(makeEnemy(e.kind, e.col, e.row));

  for (const [c, r] of L.crates) objects.push(makeCrate(c, r));
  
  //Treppen hinzufügen
  objects.push(makeStairs(...L.stairs));

  lastBumps = 0;   // neuer Held beginnt wieder bei 0 Rempeleien
  lastHurts = 0;   // und bei 0 Treffern, sonst bleibt der Shake aus
  lastDepth = 0;   // damit das Banner auch nach einem Neustart auf Ebene 1 erscheint
}