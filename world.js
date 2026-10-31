// ============================================================
// Fulgur Dungeon World.js
// In dieser Datei sind die Regeln der Welt implementiert.
// ============================================================

// Alle Figuren  in einem Array
const objects = [];

let player = null;   // Held wird bei jedem Level neu erzeugt

// Spielzustand: 'play' oder 'dead'. Ohne diese Zeile wäre game dein Canvas (id="game").
const game = { state: 'play', coins: 0, depth: 1 };   // Münzen überleben den Tod

// Aufbau der Ebene: Spalte und Reihe jedes Objekts. Die Karte selbst
// steht in game.js. Prozedurale Ebenen folgen erst in Block 4.
const LEVEL = {
  hero:    [2, 2],
  crates:  [[6, 3], [4, 5], [11, 4]],          // schiebbar
  orc:     [16, 10],
  orcPatrol: [[13, 10], [20, 10]],             // Wegpunkte des Orks 
  stairs:  [21, 10],                           // Treppe zur nächsten Ebene
  slime:   [19, 3],
  slimePatrol: [[16, 3], [21, 3]],             // Wegpunkte des Schleims im Raum oben rechts
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

// Schleim: zweiter Gegnertyp aus denselben Bausteinen wie der Ork, ohne neue Klasse
// TODO: DAs gleiche Prinzip für Orc einbauen
function makeSlime(col, row, points) {
  const o = new Entity(col, row, SLIME_SPRITE)
    .add(new EnemyBrain(fleeDecision(0, 6 * TILE), {          // entscheidet: patrol oder flee
      patrol: new Patrol(points, 0.6),                        // Baustein für patrol
      flee: new Flee(0.3),                                    // Baustein für flee
    }))
    .add(new GridMovement())
    .add(new Health());
  o.kind = 'slime';
  o.state = 'patrol';
  o.solid = true;
  o.maxHp = 2;                                    // hält 2 Treffer aus
  o.hp = o.maxHp;
  o.loot = true;                                  // hinterlässt eine Münze
  o.hitFx = GOO;                                  // hellblaue Tropfen beim Treffer
  o.barY = -20;                                   // Lebensbalken tiefer, er ist kleiner als der Ork
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

// Verschiebt eine Position zufällig um höchstens ein Feld, wenn dort freier Boden ist.
// So sieht jede Ebene etwas anders aus, die Karte selbst bleibt gleich (generiert wird erst in Block 4).
function randomizePosition([col, row]) {
  const c = col + Math.floor(Math.random() * 3) - 1;   // -1, 0 oder +1
  const r = row + Math.floor(Math.random() * 3) - 1;
  if (isBlocked(c, r, null) || map[r][c] === 2) return [col, row];   // Wand, Objekt oder Treppe: bleibt
  return [c, r];
}


// ---------- Ebene aufbauen ----------
function buildLevel(depth) {
  const hpBefore = depth > 1 ? player.hp : null  // HP speichern wenn Level grösser als 1
  objects.length = 0;

  game.state = 'play';
  game.depth = depth;
  game.nextLevel = false;

  // Held (Bewegung, Rolle, Steuerung)
  player = new Entity(LEVEL.hero[0], LEVEL.hero[1], HERO_SPRITE)
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
  player.hp =   player.hp = hpBefore ?? player.maxHp;   // nimmt seine Leben mit, nur Ebene 1 startet voll
  player.invulnTime = 1;            // nach einem Treffer 1 s geschützt
  objects.push(player);
  
    // Randomisierung der Wegpunkte
  const dr = depth > 1 ? Math.floor(Math.random() * 5) - 2 : 0;   // -2 bis +2
  const patrol = LEVEL.orcPatrol.map(([c, r]) => [c, r + dr]);

  // Ork
  const orc = new Entity(LEVEL.orc[0], LEVEL.orc[1], ENEMY_SPRITE)
  .add(new GridMovement())              // Schreibt x,y^
  .add(new Health())                   // Ork kann Schaden nehmen
  .add(new EnemyBrain(decide, {
    patrol: new Patrol(patrol, 0.45),          //  Wegpunkte und Geschwindigkeit(1 Schritt alle 0.45 Sekungen)
  chase: new Chase(0.3),                       // auf der Jagd schneller (Alle 0.3 Sekunden einen Schritt)
  attack: new MeleeAttack(1.2, 0.45, 1),       // 1.2 s pro Schlag, trifft nach 0.45 s, 1 Herz
  }));
  orc.solid = true;
  orc.hitFx = BLOOD;
  orc.kind = 'orc';                     // damit das HUD weiss, dass es ein Ork ist
  orc.state = 'patrol';                 // Startzustand
  orc.maxHp = 3;                        // hält 3 Treffer aus
  orc.hp = orc.maxHp;
  orc.loot = true;                      // hinterlässt eine Münze
  objects.push(orc);

  // Kisten position varieren (maximal 1 Feld)
  for (const pos of LEVEL.crates) {
    const [c, r] = depth > 1 ? randomizePosition(pos) : pos;
    objects.push(makeCrate(c, r));
  }
  
  //Treppen hinzufügen
  objects.push(makeStairs(...LEVEL.stairs));

  //Schleim spawnen
  objects.push(makeSlime(...LEVEL.slime, LEVEL.slimePatrol));

  lastBumps = 0;   // neuer Held beginnt wieder bei 0 Rempeleien
  lastSwings = 0;
}