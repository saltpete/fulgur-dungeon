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
const TILE   = 48;
const TSRC = 16;
const SCALE  = TILE / TSRC; // 48/16 = 3
const SPRITE = 64;
const DIR = {down: 0, left: 1, right: 2, up: 3};
const DRAW = SPRITE * SCALE; // 64*3 = 192
const FOOT = 0.734;

// Player
const heroWalk = new Image();
heroWalk.src   = 'assets/Swordsman_lvl1_Walk_with_shadow.png';  // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroIdle= new Image();
heroIdle.src = 'assets/Swordsman_lvl1_Idle_with_shadow.png'; // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)
const heroAttack = new Image();
heroAttack.src = 'assets/Swordsman_lvl1_attack_with_shadow.png'// craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

// Maptiles
const tiles = new Image();
tiles.src = 'assets/walls_floor.png'; // craftpix.net (License: Free for personal and commercial use, with credit to craftpix.net)

const map = [   // 9 Reihen, 16 Spalten. 0 Boden begehbar, 1 Wand
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,0,1,0,0,1,1,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,0,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const TILESET = {
  0: [1, 6], // Boden
  1: [1, 3], // Wand
  2: [11, 8], // Ausgang
};

const ROWS = map.length;
const COLS = map[0].length;


function drawMap(){
  for(let y=0; y<map.length; y++){
    for(let x=0; x<map[y].length; x++){
      const t = TILESET[map[y][x]];
      if(!t) continue;
      ctx.drawImage(
        tiles,
        t[0]*TSRC, t[1]*TSRC, TSRC, TSRC,     // Ausschnitt im Sheet
        x*TILE,   y*TILE,   TILE, TILE        // Ziel auf dem Canvas
      );
    }
  }
}


// SPRITE SHEET
// ============================================================
// Damit Sie keine Bilddatei brauchen, wird das Sheet beim Start
// per Code gemalt: 4 Frames zu je 32 mal 32 Pixeln, nebeneinander.
const FW = 32, FH = 32, FRAMES = 4;
const sheet = document.createElement('canvas');
sheet.width = FW * FRAMES; sheet.height = FH;
(function paintSheet(){
  const s = sheet.getContext('2d');
  for (let i = 0; i < FRAMES; i++) {
    const ox = i * FW;
    s.fillStyle = '#c8102e';                 // Koerper
    s.beginPath(); s.ellipse(ox + 15, 19, 10, 9 + (i % 2), 0, 0, 7); s.fill();
    s.fillStyle = '#1f2430';                 // Kopf
    s.beginPath(); s.arc(ox + 19, 9, 7, 0, 7); s.fill();
    s.fillStyle = '#fafaf8';                 // Auge, schaut nach rechts
    s.fillRect(ox + 21, 7, 3, 3);
    s.fillStyle = '#1f2430';                 // Beine, wandern je Frame
    s.fillRect(ox + 9 + (i % 2) * 3, 26, 4, 5);
    s.fillRect(ox + 18 - (i % 2) * 3, 26, 4, 5);
  }
})();


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
  Space:'space'
};

window.addEventListener('keydown', (e) => {
  // Default unterdrücken
  if (KEYS[e.code]) { input[KEYS[e.code]] = true; e.preventDefault(); }
  if (e.code === 'Space') e.preventDefault();

  //Angriff hinzufügen

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

for (const b of document.querySelectorAll('#dpad button')) {
  b.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    input.step = b.dataset.dir;
  });
}


// Overlay, das die Bildrate (rAF-Aufrufe pro Sekunde) zeigt.
let lastTime = performance.now();
let fps = 0;
let lastDt = 0;
const FPS_SMOOTHING = 0.1; // Glättungsfaktor für FPS-Berechnung

// ester Zeitschritt STEP = 1/60 mit Akkumulator (Eimer).
const STEP = 1/60; // 60 FPS
let accumulator = 0; // Eimer

// ---- RENDER: liest Zustand, mutiert nie --------------------
function drawOverlay(alpha) {
  // TODO B0 / B3: Overlay (dt, alpha, fps) zeichnen.
  ctx.fillStyle = '#000000'; // Schwarz für Text
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, 10, 20);
  ctx.fillText(`DT: ${lastDt.toFixed(4)}`, 10, 40);
  ctx.fillText(`Alpha: ${alpha.toFixed(3)}`, 10, 60);
}

// ---- GAME LOOP ---------------------------------------------
function frame(now) {
  const frameTime = (now-lastTime) / 1000;
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
  }
  const alpha = accumulator / STEP; // TODO B3: fuer Interpolation merken
  ctx.clearRect(0, 0, W, H); // Gesamte Fläche löschen vor dem rendern

  // Map zeichnen
  drawMap();

  // Entities zeichnen
  for (const o of objects) {
    const dx = o.prevX + (o.x - o.prevX) * alpha;
    const dy = o.prevY + (o.y - o.prevY) * alpha;
    o.render(ctx, dx, dy, frameTime);
  }
  // Overlay aufrufen
  if (input.overlayEnabled){
    drawOverlay(alpha);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// ---- TODO C: Komposition -----------------------------------
// Ersetzen Sie die Player-Logik durch eine Entity-Huelle mit
// Komponentenliste. Eine Movement-Komponente rechnet mit dt.
// Beweisen Sie: ein zweiter Objekttyp entsteht OHNE neue Klasse,
// nur durch Zusammenstecken von Komponenten.
//

class Movement {
  constructor(speedx, speedy){ this.speedx = speedx; this.speedy = speedy; }
  update(entity, dt){
    entity.x += this.speedx * dt;
    entity.y += this.speedy * dt;
    // Falls es ausserhalb des Canvas geht
    if (entity.x < 0 || entity.x+entity.size > W) this.speedx = -this.speedx;
    if (entity.y < 0 || entity.y+entity.size > H) this.speedy = -this.speedy;
  }
}


/*
class Playercontrol {
  constructor(speed){ this.speed = speed; }
  update(entity, dt){
    if (input.left) {
      entity.x -= this.speed * dt;
    }
    if (input.right) {
      entity.x += this.speed * dt;
    }
    if (input.up) {
      entity.y -= this.speed * dt;
    }
    if (input.down) {
      entity.y += this.speed * dt;
    }
    //Bereichsbeschränkung
    if (entity.x < 0 ) entity.x = 0;  // Linker Rand
    if (entity.x+entity.size > W) entity.x = W - entity.size; // Rechter Rand
    if (entity.y < 0 ) entity.y = 0; // Oberer Rand
    if (entity.y+entity.size > H) entity.y = H - entity.size; // Unterer Rand
  }
} */




class Entity {
  constructor(col,row, size, color){
    this.col = col;
    this.row = row;
    this.x = col * TILE;
    this.y = row * TILE;
    this.prevX = this.x;
    this.prevY = this.y;
    this.facing = DIR.down;
    this.size = size;
    this.color = color;
    this.components = []; }
  add(c){ this.components.push(c); return this; }

  simulate(dt){
    for (const c of this.components) c.update(this, dt); }

  render(ctx,dx,dy,dt){
    if (this.animTimer === undefined) {this.animTimer = 0; this.animFrame = 0;}

    const sheet = this.moving ? heroWalk : heroIdle;
    const frames = this.moving ? 6 : 12;
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
      this.animFrame * SPRITE, this.facing * SPRITE, SPRITE, SPRITE,
      dx + offX, dy + offY, DRAW, DRAW
    );
  }
}


function tryMove(e, dcol, drow) {
  const nc = e.col + dcol, nr = e.row + drow;  // Kandidat
  // 1. Liegt der Kandidat im Spielfeld?
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
  // 2. Ist die Zelle begehbar? Boden (0) und Ausgang (2) ja, Wand (1) nein
  if (map[nr][nc] !== 0 && map[nr][nc] !== 2) return;
  e.col = nc; e.row = nr;                          // 3. Zustand ändern
  foundExit(e);                                    // 4. Steht die Figur jetzt auf dem Ausgang?
}

function foundExit(e){
  if (map[e.row][e.col] === 2) {
    console.log("Found exit, could leave to next Area");
  }
}

/* Aus Starterset PVA2 - Einfachheitshalber das aus Kaefer genommen
function drawGridWorld() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] === 1) {
        ctx.fillStyle = '#c9cdd4';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      } else if (pathCells.has(c + ',' + r)) {
        ctx.fillStyle = '#f0ece6';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }
  ctx.strokeStyle = '#e6e2dc'; ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, ROWS * TILE); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(COLS * TILE, r * TILE); ctx.stroke();
  }
  for (const key of towers) {
    const parts = key.split(',');
    const c = Number(parts[0]), r = Number(parts[1]);
    ctx.fillStyle = '#1f2430';
    ctx.fillRect(c * TILE + 8, r * TILE + 8, TILE - 16, TILE - 16);
  }
} */

// Bewegung des Spielers
class GridControl {
  update(e, dt) {
    if (input.step === 'left')  { e.facing =  DIR.left; tryMove(e, -1, 0); }
    else if (input.step === 'right') { e.facing = DIR.right; tryMove(e, 1, 0); }
    else if (input.step === 'up') { e.facing = DIR.up; tryMove(e, 0,-1); }
    else if (input.step === 'down') { e.facing = DIR.down; tryMove(e, 0, 1); }
  }

}

class GridMovement {
  update(e, dt) {
    const zielX = e.col * TILE;
    const zielY = e.row * TILE;
    const k = Math.min(1, dt * 12);
    e.x += (zielX - e.x) * k;
    e.y += (zielY - e.y) * k;
    e.moving = Math.abs(zielX - e.x) > 0.5 || Math.abs(zielY - e.y) > 0.5;
  }
}


const objects = [
  new Entity(1, 1, 50, '#c8102e').add(new GridControl()).add(new GridMovement())
  ]
