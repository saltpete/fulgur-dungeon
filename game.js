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
const box = { x: 160, y: 200, w: 32, h: 32 };
let prevX = box.x; // TODO B3: fuer Interpolation merken

// TODO A1: Bewegung im Loop ergaenzen (x += 3 pro Frame).

// TODO A3: Eingabezustand { left, right }, keydown/keyup setzen Flags.
const input = { left: false, right: false };

window.addEventListener('keydown', (e) => {
  // e.key ist bei den Pfeiltasten 'ArrowLeft' / 'ArrowRight'
  // passendes Feld auf true setzen
  if (e.key === 'ArrowLeft') {
    input.left = true;
  }
  if (e.key === 'ArrowRight') {
    input.right = true;
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
});


// TODO B0: Overlay, das die Bildrate (rAF-Aufrufe pro Sekunde) zeigt.
let lastTime = performance.now();
let fps = 0;
let lastDt = 0;
//Alpha noch hinzufügen, wenn B3 implementiert wird.

// TODO B1: Geschwindigkeit in px/SEKUNDE, Bewegung mit vx * dt.
const SPEED = 180; // px pro Sekunde

// TODO B2: Fester Zeitschritt STEP = 1/60 mit Akkumulator (Eimer).
const STEP = 1/60; // 60 FPS
let accumulator = 0; // Eimer

// TODO B3: Interpolation: prevX merken, alpha = acc/STEP, dazwischen zeichnen.

// ---- UPDATE: mutiert Zustand, zeichnet nie -----------------
function simulate(dt) {
  // TODO A1 / A3 / B1
  if (input.left) {
    box.x -= SPEED * dt;
  }
  if (input.right) {
    box.x += SPEED * dt;
  }
}

// ---- RENDER: liest Zustand, mutiert nie --------------------
function render(alpha) {
  // TODO B3
  const drawX = prevX + (box.x - prevX) * alpha;
  // TODO A2: erst clearRect (Zeichenzyklus), dann zeichnen.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(drawX, box.y, box.w, box.h);
  // TODO B0 / B3: Overlay (dt, alpha, fps) zeichnen.
  ctx.fillStyle = '#000000';
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, 10, 20);
  ctx.fillText(`DT: ${lastDt.toFixed(4)}`, 10, 40);
  ctx.fillText(`Alpha: ${alpha.toFixed(3)}`, 10, 60);
}

// ---- GAME LOOP ---------------------------------------------
// TODO A1: requestAnimationFrame-Loop, der update() und render() ruft.
// TODO B2: Akkumulator-Struktur (feste Simulationsschritte + Rendering).
function frame(now) {
  const frameTime = (now-lastTime) / 1000; // in Sekunden
  lastTime = now;
  lastDt = frameTime;
  fps = 1 / frameTime;

  accumulator += frameTime;
  while (accumulator >= STEP) {
    prevX = box.x; // TODO B3: fuer Interpolation merken
    simulate(STEP);
    accumulator -= STEP;
  }
  const alpha = accumulator / STEP; // TODO B3: fuer Interpolation merken
  render(alpha);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- TODO C: Komposition -----------------------------------
// Ersetzen Sie die Player-Logik durch eine Entity-Huelle mit
// Komponentenliste. Eine Movement-Komponente rechnet mit dt.
// Beweisen Sie: ein zweiter Objekttyp entsteht OHNE neue Klasse,
// nur durch Zusammenstecken von Komponenten.
//
//   class Entity {
//     constructor(){ this.components = []; }
//     add(c){ this.components.push(c); return this; }
//     simulate(dt){ for (const c of this.components) c.update(this, dt); }
//   }
