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

// TODO A1: Bewegung im Loop ergaenzen (x += 3 pro Frame).
// TODO A3: Eingabezustand { left, right }, keydown/keyup setzen Flags.

// TODO B0: Overlay, das die Bildrate (rAF-Aufrufe pro Sekunde) zeigt.
// TODO B1: Geschwindigkeit in px/SEKUNDE, Bewegung mit vx * dt.
// TODO B2: Fester Zeitschritt STEP = 1/60 mit Akkumulator (Eimer).
// TODO B3: Interpolation: prevX merken, alpha = acc/STEP, dazwischen zeichnen.

// ---- UPDATE: mutiert Zustand, zeichnet nie -----------------
function update() {
  // TODO A1 / A3 / B1
}

// ---- RENDER: liest Zustand, mutiert nie --------------------
function render() {
  // TODO A2: erst clearRect (Zeichenzyklus), dann zeichnen.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // TODO B0 / B3: Overlay (dt, alpha, fps) zeichnen.
}

// ---- GAME LOOP ---------------------------------------------
// TODO A1: requestAnimationFrame-Loop, der update() und render() ruft.
// TODO B2: Akkumulator-Struktur (feste Simulationsschritte + Rendering).
function frame() {
  update();
  render();
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
