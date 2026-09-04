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
const W = canvas.width, H = canvas.height;

// ---- ZUSTAND -----------------------------------------------
// Koordinaten: Ursprung oben links, y waechst nach unten.

// TODO A3: Eingabezustand { left, right }, keydown/keyup setzen Flags.
const input = { left: false, right: false, up: false, down: false };

window.addEventListener('keydown', (e) => {
  // e.key ist bei den Pfeiltasten 'ArrowLeft' / 'ArrowRight'
  // passendes Feld auf true setzen
  if (e.key === 'ArrowLeft') {
    input.left = true;
  }
  if (e.key === 'ArrowRight') {
    input.right = true;
  }
  if (e.key === 'ArrowUp'){
  input.up = true; 
  }
  if (e.key === 'ArrowDown') {
    input.down = true;
  }
});

window.addEventListener('keyup', (e) => {
  // dasselbe, aber auf false
  if (e.key === 'ArrowLeft') {
    input.left = false;
  }
  if (e.key === 'ArrowRight') {
    input.right = false;
  }
  if (e.key === 'ArrowUp') {
    input.up = false;
  }
  if (e.key === 'ArrowDown') {
    input.down = false;
  }
});


// TODO B0: Overlay, das die Bildrate (rAF-Aufrufe pro Sekunde) zeigt.
let lastTime = performance.now();
let fps = 0;
let lastDt = 0;
const FPS_SMOOTHING = 0.1; // Glättungsfaktor für FPS-Berechnung

// TODO B2: Fester Zeitschritt STEP = 1/60 mit Akkumulator (Eimer).
const STEP = 1/60; // 60 FPS
let accumulator = 0; // Eimer

// TODO B3: Interpolation: prevX merken, alpha = acc/STEP, dazwischen zeichnen.

// ---- UPDATE: mutiert Zustand, zeichnet nie -----------------
// Entity hat Simulate(dt) und render(ctx,dx,dy). 

// ---- RENDER: liest Zustand, mutiert nie --------------------
function drawOverlay(alpha) {
  // TODO B0 / B3: Overlay (dt, alpha, fps) zeichnen.
  ctx.fillStyle = '#000000'; // Schwarz für Text
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, 10, 20); 
  ctx.fillText(`DT: ${lastDt.toFixed(4)}`, 10, 40); 
  ctx.fillText(`Alpha: ${alpha.toFixed(3)}`, 10, 60); 
}

// ---- GAME LOOP ---------------------------------------------
// TODO A1: requestAnimationFrame-Loop, der update() und render() ruft.
// TODO B2: Akkumulator-Struktur (feste Simulationsschritte + Rendering).
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
  }
  const alpha = accumulator / STEP; // TODO B3: fuer Interpolation merken
  ctx.clearRect(0, 0, W, H); // Gesamte Fläche löschen vor dem rendern
  for (const o of objects) {
    const dx = o.prevX + (o.x - o.prevX) * alpha;
    const dy = o.prevY + (o.y - o.prevY) * alpha;
    o.render(ctx, dx, dy);
  }
  drawOverlay(alpha); 
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
}

class Entity {
  constructor(x,y, size, color){ 
    this.x = x; 
    this.y = y; 
    this.prevX = x;
    this.prevY = y;
    this.size = size; 
    this.color = color; 
    this.components = []; }
  add(c){ this.components.push(c); return this; }
  simulate(dt){ for (const c of this.components) c.update(this, dt); }
  render(ctx,dx,dy){
    ctx.fillStyle = this.color;
    ctx.fillRect(dx, dy, this.size, this.size);
  }
}

const objects = [
  new Entity(160, 300, 32, '#c8102e').add(new Playercontrol(220)),
  new Entity(100, 100, 32, '#00ff00').add(new Movement(100, 50)),
  new Entity(300, 200, 16, '#0000ff').add(new Movement(-50, 100))
]