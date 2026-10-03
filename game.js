// ============================================================
// GAMEDEV Starter-Template (V0)
// ============================================================
// In Uebung 1 bauen Sie dieses Standbild zu einem Fundament aus:
//   Teil A  V0 bis V4, das Handwerk
//   Teil B  die vier Zwaenge (variabler + fester Zeitschritt,
//           Interpolation)
//   Teil C  Komposition statt Vererbung
//
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
const DRAW = SPRITE * SCALE; // 64*2 = 128
const FOOT = 0.734;

// Animation
const HERO_IDLE_FRAMES = [12, 12, 12, 4];   // Zeile 3 hat im Asset nur 4 Frames
const HERO_WALK_FRAMES = 6;
const ENEMY_IDLE_FRAMES = [4, 4, 4, 4];   // ganzes Set hat nur 4 Frames
const ENEMY_WALK_FRAMES = 6;

// Player
const heroWalk = new Image();
heroWalk.src   = 'assets/Swordsman_lvl1_Walk_with_shadow.png';  // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroIdle= new Image();
heroIdle.src = 'assets/Swordsman_lvl1_Idle_with_shadow.png'; // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroAttack = new Image();
heroAttack.src = 'assets/Swordsman_lvl1_attack_with_shadow.png'// craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Enemy
const enemyWalk = new Image();
enemyWalk.src   = 'assets/orc1_walk_with_shadow.png';
const enemyIdle= new Image();
enemyIdle.src = 'assets/orc1_idle_with_shadow.png';
const enemyAttack = new Image();
enemyAttack.src = 'assets/orc1_attack_with_shadow.png'

//Sprites
const HERO_SPRITE = {
  walk: heroWalk, idle: heroIdle,
  walkFrames: HERO_WALK_FRAMES, idleFrames: HERO_IDLE_FRAMES,
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

const ROWS = map.length;
const COLS = map[0].length;


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
const shake = {
  timer: 0,
  duration: 0.15,
  magnitude:0
}

let lastBumps = 0;

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

// Input
// Overlay-Flag zu Beginn true, damit Overlay beim Start sichtbar ist.
const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  step: null,
  roll: false,
  overlayEnabled: true };

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

  // TODO: Angriff hinzufügen

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

/*
// Touchscreen-DPad
for (const b of document.querySelectorAll('#dpad button')) {
  const dir = b.dataset.dir;
  b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); input.step = dir; input[dir] = true; });
  b.addEventListener('pointerup',   () => { input[dir] = false; });
  b.addEventListener('pointercancel', () => { input[dir] = false; });
  b.addEventListener('pointerleave', () => { input[dir] = false; });
}*/

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
  // TODOPosition des Spielers in Zeile und Spalte anzeigen.
  position.row = player.row;
  position.col = player.col;
  ctx.fillStyle = '#fcf7f7'; // Weiss für Text
  ctx.fillText(`Player Position: Row ${position.row}, Col ${position.col}`, 10, 80);
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, 10, 20);
  ctx.fillText(`DT: ${lastDt.toFixed(4)}`, 10, 40);
  ctx.fillText(`Alpha: ${alpha.toFixed(3)}`, 10, 60);
}


// Health bar
// TODO

// ---- GAME LOOP ---------------------------------------------
function frame(now) {
  const frameTime = Math.min((now - lastTime) / 1000, 0.25); //Begrenzung auf 250ms, damit bei Tab-Wechsel nicht alles explodiert
  lastTime = now;
  lastDt = frameTime;
  fps = fps+(1/frameTime - fps) * FPS_SMOOTHING; //FPS glätten für Overlay (Ähnlich wie bei Interpolation)

  accumulator += frameTime;
  while (accumulator >= STEP) {
    for (const o of objects) {
      o.prevX = o.x;
      o.prevY = o.y;
    }
    for (const o of objects) {
      o.simulate(STEP);

    }
    accumulator -= STEP;
    input.step = null;
    input.roll = false;
  }

  if ((player.bumps || 0) > lastBumps) {
    triggerShake(4, 0.15);
    lastBumps = player.bumps;
  }
  updateShake(frameTime);


  const alpha = accumulator / STEP; // TODO B3: fuer Interpolation merken
  const off = shakeOffset();
  ctx.clearRect(0, 0, W, H); // Gesamte Fläche löschen vor dem rendern

  ctx.save();
  ctx.translate(Math.round(off.x), Math.round(off.y)); // Shake-Offset anwenden
  // Map zeichnen
  drawMap();

  // Entities zeichnen
  for (const o of objects) {
    const dx = o.prevX + (o.x - o.prevX) * alpha;
    const dy = o.prevY + (o.y - o.prevY) * alpha;
    o.render(ctx, dx, dy, frameTime);
  }

  ctx.restore();
  // Overlay aufrufen
  if (input.overlayEnabled){
    drawOverlay(alpha);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

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
    if (this.animTimer === undefined) {this.animTimer = 0; this.animFrame = 0;}
    const row = this.sprite.rows[this.facing];
    const sheet  = this.moving ? this.sprite.walk : this.sprite.idle;
    const frames = this.moving ? this.sprite.walkFrames : this.sprite.idleFrames[row];
    const FRAME_TIME = 0.125;

    if (this.animFrame >= frames) this.animFrame = 0;

    this.animTimer += dt;
    if (this.animTimer >= FRAME_TIME) {
      this.animTimer -= FRAME_TIME;
      this.animFrame = (this.animFrame + 1) % frames;
    }

    const offX = (TILE - DRAW) / 2;
    const offY = TILE - DRAW * FOOT;
    ctx.drawImage(
      sheet,
      this.animFrame * SPRITE, row * SPRITE, SPRITE, SPRITE,
      dx + offX, dy + offY, DRAW, DRAW
    );
  }
}

 // Grundlegende Bewegung auf dem Raster
function tryMove(e, dcol, drow) {
  const nc = e.col + dcol, nr = e.row + drow;  // Kandidat
  // 1. Liegt der Kandidat im Spielfeld?
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
  // 2. Ist die Zelle begehbar? Boden (0) und Ausgang (2) ja, Wand (1) nein
  if (map[nr][nc] !== 0 && map[nr][nc] !== 2) return false;
  e.col = nc; e.row = nr;                          // 3. Zustand ändern
  foundExit(e);                                    // 4. Steht die Figur jetzt auf dem Ausgang?
  return true;
}
// Wenn die Figur auf dem Ausgang steht, kann sie in den nächsten Bereich wechseln.
function foundExit(e){
  if (map[e.row][e.col] === 2 && e === player) {
    console.log("Found exit, could leave to next Area");
  }
}


// Bewegung des Spielers
class GridControl {
  update(e, dt) {
    // Impuls merken, auch wenn die Figur gerade läuft
    if(input.step) this.queued = input.step;
    // Wenn die Figur gerade läuft, keine neue Bewegung starten
    if (e.moving) return;

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
    if (dir === 'left')       { e.facing = 'left';  moved = tryMove(e, -1, 0); }
    else if (dir === 'right') { e.facing = 'right'; moved = tryMove(e,  1, 0); }
    else if (dir === 'up')    { e.facing = 'up';    moved = tryMove(e,  0,-1); }
    else if (dir === 'down')  { e.facing = 'down';  moved = tryMove(e,  0, 1); }

    // Schritt geklappt, Figur unterwegs
    if(dir && moved) e.moving = true;
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
    if (!input.roll || this.timer > 0) return;

    //Richtung: gedrückte Pfeiltaste sonst Blickrichtung
    const dir = input.left ? 'left' : input.right ? 'right' : input.up ? 'up' : input.down ? 'down' : e.facing;
    const [dcol,drow] = dir === 'left' ? [-1,0] : dir === 'right' ? [1,0] : dir === 'up' ? [0,-1] : [0,1];
    e.facing = dir;

    //Kacheln prüfen, stoppt bei Wand
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

// Gegner verfolgt Spieler
class ChaseControl {
  constructor(target, interval) {
    this.target = target;
    this.interval = interval;
    this.timer = 0;
  }
  update(e, dt) {
    // Timer runterzaehlen, bei > 0 raus
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval;
    // Timer zuruecksetzen
    // Abstand in Spalten und Reihen zum Ziel
    const dcol = this.target.col - e.col;
    const drow = this.target.row - e.row;
    
    // Wenn der Gegner den Spieler erreicht, keine weitere Bewegung
    if (Math.abs(dcol) + Math.abs(drow) <= 1) return;; // Wenn der Gegner den Spieler erreicht, keine weitere Bewegung

    // groessere Achse waehlen
    if (Math.abs(dcol) > Math.abs(drow)) {
      if (dcol < 0) { e.facing = 'left';  tryMove(e, -1, 0); } // nach links
      else          { e.facing = 'right'; tryMove(e,  1, 0); } // nach rechts
    } else {
      if (drow < 0) { e.facing = 'up';    tryMove(e,  0,-1); } // nach oben
      else          { e.facing = 'down';  tryMove(e,  0, 1); } // nach unten
    }
  }
}


const player = new Entity(2, 2, HERO_SPRITE).add(new GridMovement()).add(new RollControl(3,1.5)).add(new GridControl());
const enemy = new Entity(22, 10, ENEMY_SPRITE).add(new ChaseControl(player, 0.5)).add(new GridMovement());


const objects = [player, enemy]