// ============================================================
// effects.js · Partikel
// ============================================================


// Zufallszahl zwischen min und max
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Ein Rezept beschreibt eine Schicht. Tempo in px/s, Leben in s,
// gravity in px/s² (positiv fällt), drag: Anteil des Tempos, der nach 1 s noch übrig ist.
// color: Buchstabe aus der PALETTE in sprites.js, wie bei den Pixelrastern.

const SPARKS = { count: 12, speed: [80, 220], life: [0.2, 0.45], gravity: 300, drag: 0.15, size: 3, color: 'y' };   // Gold
const BLOOD = { count: 14, speed: [60, 180], life: [0.25, 0.5], gravity: 500, drag: 0.2, size: 3, color: 'p' };   // Rot wie die Herzen, fällt schneller
const SPLINTERS = { count: 20, speed: [80, 200], life: [0.3, 0.6], gravity: 400, drag: 0.3, size: 4, color: 'B' };   // Holz der Kiste


const parts = [];   // alle Teilchen: {x, y, vx, vy, life, max, r}

// Stoss: count Teilchen am Punkt (x, y), jedes mit eigener Richtung, Tempo und Lebenszeit
function burst(x, y, r) {
    if (!input.particlesEnabled) return;            // Taste P: Teilchen aus
    
    for (let i = 0; i < r.count; i++) {
    const angle = randomBetween(0, 2 * Math.PI);    // volle Drehung im Bogenmass
    const speed = randomBetween(r.speed[0], r.speed[1]);
    const life = randomBetween(r.life[0], r.life[1]);
    parts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, max: life, r });
  }
}

// Jedes Bild mit der echten Framezeit: Tempo bremsen, Schwerkraft, Ort, Lebenszeit
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {   // rückwärts wegen splice
    const p = parts[i];
    const k = Math.pow(p.r.drag, dt);             // bremsen, gleich bei jeder Bildrate
    p.vx *= k;
    p.vy *= k;
    p.vy += p.r.gravity * dt;                     // Schwerkraft ändert das Tempo
    p.x += p.vx * dt;                             // Tempo ändert den Ort
    p.y += p.vy * dt;
    p.life -= dt;                                 // Countdown bis zum Entfernen
    if (p.life <= 0) parts.splice(i, 1);
  }
}

// Zeichnen: verblasst mit der restlichen Lebenszeit
function drawParticles() {
  for (const p of parts) {
    ctx.globalAlpha = p.life / p.max;          // 1 am Anfang, 0 am Ende
    ctx.fillStyle = PALETTE[p.r.color];        // Farbe aus der Palette in sprites.js
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.r.size, p.r.size);
  }
  ctx.globalAlpha = 1;                         // zurücksetzen, sonst wird alles danach durchsichtig
}