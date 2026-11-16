// ============================================================
// Fulgur Dungeon
// ============================================================
// In dieser Datei ist die Spiellogik implementiert. Sie ist in mehrere Teile gegliedert:
// 1. Assets: Bilder, Tileset, Map, Figuren
// 2. Input: Tastatur, Overlay
// 3. Game Loop: Simulation, Interpolation, Rendering
// 4. Komposition: Figuren, Komponenten, Steuerung

// ============================================================
// Die weiteren Dateien mit der Spiellogik sind:
// world.js    Hindernisse, Kollision, Interaktion, Ebenenaufbau
// mapgen.js   Generierung der Ebenen, Seed, Bossebene
// combat.js   Leben, Schaden, Schwerthieb, Fulgur-Blitz
// enemy.js    Gegner: wahrnehmen, entscheiden, handeln
// hud.js      Herzen, Münzen, Abklingzeiten, Banner
// effects.js  Partikel
// sprites.js  Pixelgrafiken
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Pixelgrafik ohne Antialiasing
const W = canvas.width, H = canvas.height;
const MODE = 'grid'




// Assets
// ============================================================
const TILE   = 32;
const TSRC = 16;
const SCALE  = TILE / TSRC; // 32/16 = 2
const SPRITE = 64;
const DIR = {down: 0, left: 1, right: 2, up: 3};
const DIRV = {left: [-1,0], right: [1,0], up: [0,-1], down: [0,1]}; // Vektor für jede Richtung
const DRAW = SPRITE * SCALE; // 64*2 = 128
const FOOT = 0.734;

// Animation
const HERO_IDLE_FRAMES = [12, 12, 12, 4];   // Zeile 3 hat im Asset nur 4 Frames
const HERO_WALK_FRAMES = 6;
const ENEMY_IDLE_FRAMES = [4, 4, 4, 4];   // ganzes Set hat nur 4 Frames
const ENEMY_WALK_FRAMES = 6;

// Held
const heroWalk = new Image();
heroWalk.src   = 'assets/Swordsman_lvl1_Walk_with_shadow.png';    // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroIdle= new Image();
heroIdle.src = 'assets/Swordsman_lvl1_Idle_with_shadow.png';      // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroAttack = new Image();
heroAttack.src = 'assets/Swordsman_lvl1_attack_with_shadow.png'   // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// ===========================================================
// Alle Gegner
// ===========================================================

// Ork
const enemyWalk = new Image();
enemyWalk.src   = 'assets/orc1_walk_with_shadow.png';             // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const enemyIdle= new Image();
enemyIdle.src = 'assets/orc1_idle_with_shadow.png';               // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const enemyAttack = new Image();
enemyAttack.src = 'assets/orc1_attack_with_shadow.png'            // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Ork 2
const enemy2Walk = new Image();
enemy2Walk.src   = 'assets/orc2_walk_with_shadow.png';             // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const enemy2Idle= new Image();
enemy2Idle.src = 'assets/orc2_idle_with_shadow.png';               // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const enemy2Attack = new Image();
enemy2Attack.src = 'assets/orc2_attack_with_shadow.png'            // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Ork

// Schleim
const slimeWalk = new Image();
slimeWalk.src = 'assets/Slime1_Walk_with_shadow.png';              // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const slimeIdle = new Image();
slimeIdle.src = 'assets/Slime1_Idle_with_shadow.png';              // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Schleim 2
const slime2Walk = new Image();
slime2Walk.src = 'assets/Slime2_Walk_with_shadow.png';              // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const slime2Idle = new Image();
slime2Idle.src = 'assets/Slime2_Idle_with_shadow.png';              // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Schleim 3
const slime3Walk = new Image();
slime3Walk.src = 'assets/Slime3_Walk_with_shadow.png';              // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const slime3Idle = new Image();
slime3Idle.src = 'assets/Slime3_Idle_with_shadow.png';              // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Sprites
//Held
const HERO_SPRITE = {
  walk: heroWalk, idle: heroIdle, attack: heroAttack,
  walkFrames: HERO_WALK_FRAMES, idleFrames: HERO_IDLE_FRAMES, attackFrames:8,
  rows: { down: 0, left: 1, right: 2, up: 3 }
};

//Ork
const ENEMY_SPRITE = {
  walk: enemyWalk, idle: enemyIdle, attack: enemyAttack,
  walkFrames: ENEMY_WALK_FRAMES, idleFrames: ENEMY_IDLE_FRAMES, attackFrames: 8,
  rows: { down: 0, up: 1, left: 2, right: 3 }   // Ork-Sheet ist anders sortiert
};

//Ork 2
const ENEMY2_SPRITE = {
  walk: enemy2Walk, idle: enemy2Idle, attack: enemy2Attack,
  walkFrames: ENEMY_WALK_FRAMES, idleFrames: ENEMY_IDLE_FRAMES, attackFrames: 8,
  rows: { down: 0, up: 1, left: 2, right: 3 }   // Ork-Sheet ist anders sortiert
};

//Schleim
const SLIME_SPRITE = {
  walk: slimeWalk, idle: slimeIdle,
  walkFrames: 8, idleFrames: [6, 6, 6, 6],
  rows: { down: 0, up: 1, left: 2, right: 3 },   // gleiche Reihenfolge wie beim Ork
  foot: 0.656                                    // Füsse in Zeile 42 von 64, höher als bei Held und Ork
};
//Schleim 2
const SLIME2_SPRITE = {
  walk: slime2Walk, idle: slime2Idle,
  walkFrames: 8, idleFrames: [6, 6, 6, 6],
  rows: { down: 0, up: 1, left: 2, right: 3 },   // gleiche Reihenfolge wie beim Ork
  foot: 0.656                                    // Füsse in Zeile 42 von 64, höher als bei Held und Ork
};

//Schleim 3
const SLIME3_SPRITE = {
  walk: slime3Walk, idle: slime3Idle,
  walkFrames: 8, idleFrames: [6, 6, 6, 6],
  rows: { down: 0, up: 1, left: 2, right: 3 },   // gleiche Reihenfolge wie beim Ork
  foot: 0.656                                    // Füsse in Zeile 42 von 64, höher als bei Held und Ork
};


// Maptiles
const tiles = new Image();
tiles.src = 'assets/walls_floor.png'; // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

const LEVEL1_MAP = [   // 18 Reihen, 32 Spalten. 0 Boden, 1 Wand, 2 Treppe
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1],
  [1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1],
  [1,1,1,1,1,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Aktuelle Ebene: am Anfang eine Kopie der Handkarte, ab Ebene 2 schreibt die Generierung hier hinein
const map = LEVEL1_MAP.map(row => row.slice());

const TILESET = {
  0: [1, 6],      // Boden, Grundkachel
  2: [10, 8],     // Treppe
};

// Bodenvarianten mit Fugen, rein optisch
const FLOOR_VARIANTS = [[1,6], [1,6], [1,6], [11,21], [12,21], [11,22], [12,22]];

// Konstanten für die Anzahl der Zeilen und Spalten in der Karte
const ROWS = H / TILE;
const COLS = W / TILE;

// Prüfung ob eine Zelle eine Wand ist. Außerhalb des Spielfeldes gilt als Wand.
function isWall(x, y){
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true;   // ausserhalb gilt als Wand
  return map[y][x] === 1;
}

// Waehlt aus dem 3x5-Wandblock im Tileset (Spalten 0-2, Zeilen 0-4).
// Eine ganze Kachel aus dem Tileset zeichnen. t = [Spalte, Reihe] im Tileset
function drawTile(t, x, y) {
  ctx.drawImage(tiles, t[0] * TSRC, t[1] * TSRC, TSRC, TSRC, x * TILE, y * TILE, TILE, TILE);
}

// Eine halbe Kachel zeichnen: half = 0 für links, 8 für rechts (in Pixeln im Tileset)
function drawHalf(col, row, x, y, half) {
  ctx.drawImage(tiles, col * TSRC + half, row * TSRC, TSRC / 2, TSRC,
                x * TILE + half * SCALE, y * TILE, TILE / 2, TILE);
}

// Welche Reihe aus dem 3x5-Wandblock im Tileset (Spalten 0 bis 2, Reihen 0 bis 4).
// Die Mauer ist zwei Kacheln hoch: unten die Ziegel, darüber die helle Oberkante.
function wallRow(x, y) {
  if (!isWall(x, y + 1)) return 4;   // darunter Boden: Ziegel mit Unterkante
  if (!isWall(x, y + 2)) return 2;   // zwei darunter Boden: helle Oberkante der Mauer
  if (!isWall(x, y - 1)) return 0;   // darüber Boden: Rand oben
  return 1;                          // sonst: dunkle Oberseite
}

function floorTile(x, y){
  const mixed = x * 7919 + y * 104729;    // zwei Primzahlen, damit sich
  return FLOOR_VARIANTS[mixed % FLOOR_VARIANTS.length];   // kein Muster bildet
}

function drawMap(){
  // 1. Boden überall, auch unter den Wänden. Die Wandkacheln haben durchsichtige Ränder
  //    mit weichem Schatten, dort soll Boden durchscheinen statt Schwarz.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawTile(floorTile(x, y), x, y);
      if (map[y][x] === 2) drawTile(TILESET[2], x, y);   // Treppe liegt auf dem Boden
    }
  }

  // 2. Wände in zwei Hälften: Die linke bekommt einen Rand, wenn links Boden ist,
  //    die rechte, wenn rechts Boden ist. Die Reihe sagt, ob oben, Mauer oder dunkel.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isWall(x, y)) continue;
      const row = wallRow(x, y);
      drawHalf(isWall(x - 1, y) ? 1 : 0, row, x, y, 0);   // linke Hälfte
      drawHalf(isWall(x + 1, y) ? 1 : 2, row, x, y, 8);   // rechte Hälfte
    }
  }

  // 3. Weicher Schatten auf dem Boden direkt unter einer Mauer
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isWall(x, y) || !isWall(x, y - 1)) continue;   // nur Boden mit Wand darüber
      const g = ctx.createLinearGradient(0, y * TILE, 0, y * TILE + 14);
      g.addColorStop(0, 'rgba(10, 8, 25, 0.45)');        // oben dunkel
      g.addColorStop(1, 'rgba(10, 8, 25, 0)');           // nach 14 px weg
      ctx.fillStyle = g;
      ctx.fillRect(x * TILE, y * TILE, TILE, 14);
    }
  }

}

// ============================================================
// Screen shake
// ============================================================
const shake = {
  timer: 0,
  duration: 0.15,
  magnitude:0
}

let lastBumps = 0;
let lastHurts = 0;    // wie lastBumps, für den Shake, wenn der Held getroffen wird
let lastDepth = 0;    // zuletzt angezeigte Ebene, für das Banner

function triggerShake(mag  = 4, dur = 0.15){
  if (shake.timer > 0) return; // Wenn bereits ein Shake läuft, nicht überschreiben
  shake.magnitude = mag;
  shake.duration = dur;
  shake.timer = dur;
}

function updateShake(dt){
  shake.timer = Math.max(0, shake.timer - dt);
}

function shakeOffset(){
  if (shake.timer <= 0) return {x:0, y:0};
  const k = shake.timer / shake.duration;
  const offsetX = (Math.random() * 2 - 1) * shake.magnitude * k;
  const offsetY = (Math.random() * 2 - 1) * shake.magnitude * k;
  return {x: offsetX, y: offsetY};
}

// ============================================================
// Input
// ============================================================

// Overlay-Flag zu Beginn true, damit Overlay beim Start sichtbar ist.
const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  step: null,
  roll: false,              // Shift für Ausweichrolle
  attack: false,            // Leertaste für Nahkampf
  restart: false,           // R oder Enter: neuer Durchlauf nach dem Tod
  particlesEnabled: true,   // P: Partikel an und aus
  cast: false,              // F: Fulgur-Blitz (Einmal-Impuls)   // neu
  overlayEnabled: true,
};

const KEYS = {
  ArrowLeft:'left', KeyA:'left',
  ArrowRight:'right', KeyD:'right',
  ArrowUp:'up', KeyW:'up',
  ArrowDown:'down', KeyS:'down',
  Space:'space',
};

window.addEventListener('keydown', (e) => {
  // Default unterdrücken
  if (KEYS[e.code]) { input[KEYS[e.code]] = true; e.preventDefault(); }
  if (e.code === 'Space') e.preventDefault();

  //Overlay
  if (e.code === 'KeyO' && !e.repeat) input.overlayEnabled = !input.overlayEnabled;
  // Rolle
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) input.roll = true;

  // Angriff
  if (e.code === 'Space' && !e.repeat) input.attack = true;
  // Fernkampf
  if (e.code === 'KeyF' && !e.repeat) input.cast = true;   // neu

  // Partikel an und aus
  if (e.code === 'KeyP' && !e.repeat) input.particlesEnabled = !input.particlesEnabled;

  // Neustart
  if ((e.code === 'KeyR' || e.code === 'Enter') && !e.repeat) input.restart = true;


    if (!e.repeat && MODE === 'grid') {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') input.step = 'left';
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.step = 'right';
      if (e.code === 'ArrowUp'    || e.code === 'KeyW') input.step = 'up';
      if (e.code === 'ArrowDown'  || e.code === 'KeyS') input.step = 'down';
      
    }
  });

window.addEventListener('keyup', (e) => {
  if (KEYS[e.code]) input[KEYS[e.code]] = false;
});


// Wenn der Tab gewechselt wird, alle Tasten loslassen, damit die Figur nicht weiterläuft.
window.addEventListener('blur', () => {
  input.left = input.right = input.up = input.down = false;
  input.step = null;
});


// Overlay, das die Bildrate (rAF-Aufrufe pro Sekunde) zeigt.
let lastTime = performance.now();
let fps = 0;
let lastDt = 0;
const FPS_SMOOTHING = 0.1; // Glättungsfaktor für FPS-Berechnung

// ester Zeitschritt STEP = 1/60 mit Akkumulator (Eimer).
const STEP = 1/60; // 60 FPS
let accumulator = 0; // Eimer

// ---- Overlay--------------------
function drawOverlay(alpha) {
  overlayBox([
    `FPS ${fps.toFixed(0)} · DT ${lastDt.toFixed(4)} · Alpha ${alpha.toFixed(2)}`,
    `Held: Reihe ${player.row}, Spalte ${player.col} · Seed ${game.seed}`,
  ], 'left');

  const orc = objects.find(o => o.kind === 'orc');
  if (orc) {
    const p = perceive(orc);
    overlayBox([
      `Ork: ${STATE_NAMES[orc.state]} · Leben ${orc.hp}/${orc.maxHp}`,
      `Abstand ${Math.round(p.dist)} px · daneben: ${p.adjacent ? 'ja' : 'nein'} · sieht: ${p.sees ? 'ja' : 'nein'}`,
    ], 'right');
  }
}

// Kleiner Kasten unten links oder rechts, nur so gross wie sein Text
function overlayBox(lines, side) {
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 12;
  const h = lines.length * 12 + 6;
  const x = side === 'left' ? 6 : W - w - 6;
  const y = H - h - 6;
  ctx.fillStyle = 'rgba(12, 14, 20, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fcf7f7';
  lines.forEach((l, i) => ctx.fillText(l, x + 6, y + 13 + i * 12));
}



// ---- SIMULATION: ein fester Schritt von 1/60 s -------------
// Hier wird der Spielzustand verändert, sonst nirgends.
function simulationStep() {
  for (const o of objects) {
    o.prevX = o.x;
    o.prevY = o.y;
  }
  if (game.state === 'dead') {
    // Held tot: Die Welt steht still, nur R oder Enter startet neu (FA-3-4)
    if (input.restart) buildLevel(1);
  } else {
    for (const o of objects) {
      o.simulate(STEP);
    }
    checkTriggers();   // Münzen und Zonen: berührt der Held etwas?
    removeDead();
    if (game.nextLevel) buildLevel(game.depth + 1);   // Treppe erreicht
  }
  // Einmal-Impulse sind verbraucht, auch wenn der Held tot ist
  input.step = null;
  input.roll = false;
  input.attack = false;
  input.cast = false;   // neu
  input.restart = false;
}

// ---- GAME LOOP ---------------------------------------------
function frame(now) {
  const frameTime = Math.min((now - lastTime) / 1000, 0.25); //Begrenzung auf 250ms, damit bei Tab-Wechsel nicht alles explodiert
  lastTime = now;
  lastDt = frameTime;
  if (frameTime > 0) fps = fps+(1/frameTime - fps) * FPS_SMOOTHING; //FPS glätten für Overlay (Ähnlich wie bei Interpolation)

  accumulator += frameTime;
  while (accumulator >= STEP) {
    simulationStep();
    accumulator -= STEP;
  }

  if ((player.bumps || 0) > lastBumps) {
    triggerShake(4, 0.15);
    lastBumps = player.bumps;
  }
  if ((player.hurts || 0) > lastHurts) {
    triggerShake(4, 0.2);   // Held getroffen: das Bild wackelt
    lastHurts = player.hurts;
  }

  if (game.depth !== lastDepth) {   // neue Ebene: Banner zeigen
    showBanner('Ebene ' + game.depth);
    lastDepth = game.depth;
  }

  updateShake(frameTime);
  updateParticles(frameTime);   // Teilchen mit der echten Framezeit
  updateBanner(frameTime);      // Banner zählt seine Anzeigezeit herunter

  const alpha = accumulator / STEP; // Anteil bis zum nächsten Schritt, für die Interpolation
  const off = shakeOffset();
  ctx.clearRect(0, 0, W, H); // Gesamte Fläche löschen vor dem rendern

  ctx.save();
  ctx.translate(Math.round(off.x), Math.round(off.y)); // Shake-Offset anwenden
  drawMap();
  drawMood();   // Bossebene: rote Farbschicht

  // Entities zeichnen:
  const order = objects.slice().sort((a, b) => (a.layer ?? 1) - (b.layer ?? 1) || a.y - b.y);
  for (const o of order) {
    const dx = o.prevX + (o.x - o.prevX) * alpha;
    const dy = o.prevY + (o.y - o.prevY) * alpha;
    o.render(ctx, dx, dy, frameTime);
  }
  // Lebensbalken über Gegner
  drawHealthBars(alpha);   // Lebensbalken über den Gegnern

  // Partikel
  drawParticles();   // noch im Shake, die Funken gehören zur Welt
  
  ctx.restore();
  drawHud();

  if (input.overlayEnabled){
    drawOverlay(alpha);
  }

  requestAnimationFrame(frame);
}

// Wenn der Tab gewechselt wird, den Akkumulator zurücksetzen, damit die Simulation nicht explodiert.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { lastTime = performance.now(); accumulator = 0; }
});




// Komposition -----------------------------------


class Entity {
  constructor(col,row, sprite){
    this.col = col;
    this.row = row;
    this.x = col * TILE;
    this.y = row * TILE;
    this.prevX = this.x;
    this.prevY = this.y;
    this.facing = 'down';
    this.sprite = sprite;
    this.components = []; }
  add(c){ this.components.push(c); return this; }

  simulate(dt){
    for (const c of this.components) c.update(this, dt); }

  render(ctx,dx,dy,dt){
    // Objekte mit eigner Pixelgrafik können hier direkt gezeichnet werden.
    if (this.draw) {this.draw(ctx, dx, dy, dt); return;}



    if (this.animTimer === undefined) {this.animTimer = 0; this.animFrame = 0;}
    const row = this.sprite.rows[this.facing];
    let sheet  = this.moving ? this.sprite.walk : this.sprite.idle;
    const frames = this.moving ? this.sprite.walkFrames : this.sprite.idleFrames[row];
    const FRAME_TIME = 0.125;

    if (this.animFrame >= frames) this.animFrame = 0;

    this.animTimer += dt;
    if (this.animTimer >= FRAME_TIME) {
      this.animTimer -= FRAME_TIME;
      this.animFrame = (this.animFrame + 1) % frames;
    }

    let frame = this.animFrame;

    // Hieb
    if (this.attackAnim > 0) {
      sheet = this.sprite.attack;
      frame = Math.min(this.sprite.attackFrames-1, Math.floor (this.attackAnim * this.sprite.attackFrames))
    }

    const offX = (TILE - DRAW) / 2;
    const offY = TILE - DRAW * (this.sprite.foot ?? FOOT);   // Fusslinie, pro Sprite einstellbar

    ctx.drawImage(
      sheet,
      frame * SPRITE, row * SPRITE, SPRITE, SPRITE,
      dx + offX, dy + offY, DRAW, DRAW
    );
  }
}




// Bewegung des Spielers
class GridControl {
  update(e, dt) {
    // Impuls merken, auch wenn die Figur gerade läuft
    if(input.step) this.queued = input.step;
    // Wenn die Figur gerade läuft, keine neue Bewegung starten
    if (e.moving || e.attacking) return;

    //Impulst wird verbraucht
    let dir = this.queued || null;
    const pressed = dir !== null;
    this.queued = null;

    // Danach nur weiter, wenn die Figur die letzte Kachel erreicht hat
    if (!dir) {
      if (input.left) dir = 'left';
      else if (input.right) dir = 'right';
      else if (input.up) dir = 'up';
      else if (input.down) dir = 'down';
    }

    let moved = true;
    if (dir === 'left')       { e.facing = 'left';  moved = tryMove(e, -1, 0, true); }
    else if (dir === 'right') { e.facing = 'right'; moved = tryMove(e,  1, 0, true); }
    else if (dir === 'up')    { e.facing = 'up';    moved = tryMove(e,  0,-1, true); }
    else if (dir === 'down')  { e.facing = 'down';  moved = tryMove(e,  0, 1, true); }

    // Schritt geklappt, Figur unterwegs
    if(dir && moved) e.moving = true;
    // Gegen ein Hindernis gelaufen
    if (!moved && pressed) e.bumps = (e.bumps || 0) + 1;
  }
}

// Rolle bzw. Sprungbewegung des Spielers
class RollControl {
  constructor(distance, cooldown){
    this.distance = distance;
    this.cooldown = cooldown;
    this.timer = 0;
  }
  update(e, dt) {
    this.timer=Math.max(0, this.timer - dt);
    e.rollReady = 1 - this.timer / this.cooldown;   // 0 bis 1, für die Anzeige
    if (!input.roll || this.timer > 0 || e.attacking) return;

    //Richtung: gedrückte Pfeiltaste sonst Blickrichtung
    const dir = input.left ? 'left' : input.right ? 'right' : input.up ? 'up' : input.down ? 'down' : e.facing;
    const [dcol,drow] = dir === 'left' ? [-1,0] : dir === 'right' ? [1,0] : dir === 'up' ? [0,-1] : [0,1];
    e.facing = dir;

    //Kacheln prüfen, stoppt bei jedem Hindernis (Rolle schiebt keine Kisten)
    let steps = 0;
    for (let i=0; i<this.distance; i++){
      if (!tryMove(e, dcol, drow)) break;
      steps++;
    }
    if (steps > 0) {
      burst(e.x + TILE / 2, e.y + TILE - 6, DUST);   // Staubwolke, wo er abrollt
      e.moving = true;
      this.timer = this.cooldown; //Cooldown nur, wenn die Rolle erfolgreich war
      input.step = null; // Impuls verbrauchen
    }
  }
}

// Bewegung der Figur auf dem Raster
class GridMovement {
  update(e, dt) {
    const zielX = e.col * TILE;
    const zielY = e.row * TILE;
    const k = Math.min(1, dt * 12);
    e.x += (zielX - e.x) * k;
    e.y += (zielY - e.y) * k;
    e.moving = Math.abs(zielX - e.x) > 3 || Math.abs(zielY - e.y) > 3;
  }
}

// Start erst, wenn alle Skripte geladen sind
window.addEventListener('DOMContentLoaded', () => {
  buildLevel(1);   // Ebene 1 aufbauen
  requestAnimationFrame(frame);
});