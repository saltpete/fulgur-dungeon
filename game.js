// ============================================================
// Fulgur Dungeon
// ============================================================
// In dieser Datei ist die Spiellogik implementiert. Sie ist in mehrere Teile gegliedert:
// 1. Assets: Bilder, Tileset, Map, Figuren
// 2. Input: Tastatur, Touchscreen-DPad, Overlay
// 3. Game Loop: Simulation, Interpolation, Rendering
// 4. Komposition: Figuren, Komponenten, Steuerung

// ============================================================
// Die weiteren Dateien mit der Spiellogik sind:
// world.js    Hindernisse, Kollision, Interaktion, Ebenenaufbau
// sprites.js  Pixelgrafiken

// Grundregel: Jede Zeile, die Ihr KI-Assistent schreibt, muessen
// Sie erklaeren koennen. In Uebung 1 arbeiten Sie ohne Assistent.
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
heroWalk.src   = 'assets/Swordsman_lvl1_Walk_with_shadow.png';  // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroIdle= new Image();
heroIdle.src = 'assets/Swordsman_lvl1_Idle_with_shadow.png'; // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroAttack = new Image();
heroAttack.src = 'assets/Swordsman_lvl1_attack_with_shadow.png'// craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Gegner
const enemyWalk = new Image();
enemyWalk.src   = 'assets/orc1_walk_with_shadow.png';
const enemyIdle= new Image();
enemyIdle.src = 'assets/orc1_idle_with_shadow.png';
const enemyAttack = new Image();
enemyAttack.src = 'assets/orc1_attack_with_shadow.png'

// Sprites
const HERO_SPRITE = {
  walk: heroWalk, idle: heroIdle, attack: heroAttack,
  walkFrames: HERO_WALK_FRAMES, idleFrames: HERO_IDLE_FRAMES, attackFrames:8,
  rows: { down: 0, left: 1, right: 2, up: 3 }
};

const ENEMY_SPRITE = {
  walk: enemyWalk, idle: enemyIdle,
  walkFrames: ENEMY_WALK_FRAMES, idleFrames: ENEMY_IDLE_FRAMES,
  rows: { down: 0, up: 1, left: 2, right: 3 }   // Ork-Sheet ist anders sortiert
};

// Maptiles
const tiles = new Image();
tiles.src = 'assets/walls_floor.png'; // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

const map = [   // 15 Reihen, 25 Spalten. 0 Boden, 1 Wand, 2 Treppe
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1],
  [1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1],
  [1,1,1,1,1,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];


const TILESET = {
  0: [1, 6],      // Boden, Grundkachel
  2: [11, 8],     // Treppe
};

// Bodenvarianten mit Fugen, rein optisch
const FLOOR_VARIANTS = [[1,6], [1,6], [1,6], [11,21], [12,21], [11,22], [12,22]];

// Konstanten für die Anzahl der Zeilen und Spalten in der Karte
const ROWS = map.length;
const COLS = map[0].length;

// Prüfung ob eine Zelle eine Wand ist. Außerhalb des Spielfeldes gilt als Wand.
function isWall(x, y){
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true;   // ausserhalb gilt als Wand
  return map[y][x] === 1;
}

// Waehlt aus dem 3x5-Wandblock im Tileset (Spalten 0-2, Zeilen 0-4).
// Waagrecht: welche Seite ist frei. Senkrecht: wie tief sitzt die Zelle im Block.
function wallTile(x, y){
  const sx = !isWall(x-1, y) ? 0 : (!isWall(x+1, y) ? 2 : 1);
  let sy;
  if      (!isWall(x, y+1)) sy = 4;   // Front, Unterkante des Blocks
  else if (!isWall(x, y+2)) sy = 2;   // helle Abschlusskante
  else if (!isWall(x, y-1)) sy = 0;   // Oberkante des Blocks
  else                      sy = 1;   // dunkles Inneres
  return [sx, sy];
}

// Jedes Feld bekommt immer dieselbe Variante.
// Math.random() waere hier falsch: die Kachel wuerde in jedem Frame neu
// gewuerfelt und das Bild flackern. Stattdessen rechnen wir aus x und y
// eine Zahl aus, die fuer dasselbe Feld immer gleich ist, und nehmen
// davon den Rest durch die Anzahl Varianten.

function floorTile(x, y){
  const mixed = x * 7919 + y * 104729;    // zwei Primzahlen, damit sich
  return FLOOR_VARIANTS[mixed % FLOOR_VARIANTS.length];   // kein Muster bildet
}

function drawMap(){
  for(let y = 0; y < ROWS; y++){
    for(let x = 0; x < COLS; x++){
      const v = map[y][x];
      const t = v === 1 ? wallTile(x, y)
              : v === 0 ? floorTile(x, y)
              : TILESET[v];
      if(!t) continue;
      ctx.drawImage(tiles, t[0]*TSRC, t[1]*TSRC, TSRC, TSRC, x*TILE, y*TILE, TILE, TILE);
    }
  }
};

// ============================================================
// Screen shake
// ============================================================
const shake = {
  timer: 0,
  duration: 0.15,
  magnitude:0
}

let lastBumps = 0;
let lastSwings = 0;     //Shake beim Angriff

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
  roll: false,       // Shift für Ausweichrolle
  attack: false,     // Leertaste für Nahkampf
  restart: false,    // R oder Enter: neuer Durchlauf nach dem Tod
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
  if (e.code === 'KeyO' && !e.repeat) input.overlayEnabled = !input.overlayEnabled;;
  // Rolle
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) input.roll = true;

  // Angriff
  if (e.code === 'Space' && !e.repeat) input.attack = true;

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
let position = {row: 0, col: 0}; // Position des Spielers

// ester Zeitschritt STEP = 1/60 mit Akkumulator (Eimer).
const STEP = 1/60; // 60 FPS
let accumulator = 0; // Eimer

// ---- Overlay--------------------
function drawOverlay(alpha) {
  position.row = player.row;
  position.col = player.col;
  const left = [
    `FPS: ${fps.toFixed(0)}   DT: ${lastDt.toFixed(4)}`,
    `Alpha: ${alpha.toFixed(3)}`,
    `Player Position: Row ${position.row}, Col ${position.col}`,
  ]
  ctx.fillStyle = 'rgba(12, 14, 20, 0.7)';
  ctx.fillRect(0, H - 62, W, 62);
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fcf7f7'; // Weiss für Text
  left.forEach((t, i) => ctx.fillText(t, 12, H - 46 + i * 14));

  const orc = objects.find(o => o.kind === 'orc');
  if (orc) {
    ctx.textAlign = 'right';
    ctx.fillText(`Ork: ${STATE_NAMES[orc.state]} · Leben ${orc.hp}/${orc.maxHp}`, W - 12, H - 46);;
    const p = perceive(orc);
    ctx.fillText(`Abstand ${Math.round(p.dist)} px · daneben: ${p.adjacent ? 'ja' : 'nein'} · sieht: ${p.sees ? 'ja' : 'nein'}`, W - 12, H - 32);
    ctx.textAlign = 'left';
  }

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

    removeDead();
  }
  // Einmal-Impulse sind verbraucht, auch wenn der Held tot ist
  input.step = null;
  input.roll = false;
  input.attack = false;
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
  if ((player.swings || 0 ) > lastSwings){
    triggerShake(1.5, 0.04); //leichter Shake
    lastSwings = player.swings;
  }
  updateShake(frameTime);

  const alpha = accumulator / STEP; // Anteil bis zum nächsten Schritt, für die Interpolation
  const off = shakeOffset();
  ctx.clearRect(0, 0, W, H); // Gesamte Fläche löschen vor dem rendern

  ctx.save();
  ctx.translate(Math.round(off.x), Math.round(off.y)); // Shake-Offset anwenden
  drawMap();

  // Entities zeichnen:
  const order = objects.slice().sort((a, b) => a.y - b.y);
  for (const o of order) {
    const dx = o.prevX + (o.x - o.prevX) * alpha;
    const dy = o.prevY + (o.y - o.prevY) * alpha;
    o.render(ctx, dx, dy, frameTime);
  }

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
    const offY = TILE - DRAW * FOOT;
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
    // Gegen ein Hindernis gelaufen (Hebel zählt nicht, der reagiert selbst)
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