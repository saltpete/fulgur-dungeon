// =====================================================
// hud.js - Anzeige über dem Spielfeld
// =====================================================
// Liest nur den Spielzustand und zeichnet ihn. Nur das Banner zählt seine eigene Anzeigezeit.

const BANNER_TIME = 1;     // so lange bleibt das Banner stehen, in Sekunden
const BANNER_FADE = 0.4;   // in den letzten 0.4 s blendet es aus

let banner = null;   // { text, t }: t = restliche Anzeigezeit
function showBanner(text) {
  banner = { text, t: BANNER_TIME };
}

// Jedes Bild mit der echten Framezeit, wie updateShake und updateParticles
function updateBanner(dt) {
  if (!banner) return;
  banner.t -= dt;
  if (banner.t <= 0) banner = null;   // abgelaufen: weg
}

// Grosser Schriftzug oben in der Mitte, blendet am Ende aus
function drawBanner() {
  if (!banner) return;
  ctx.save();                                                // Schrift, Kontur und Alpha danach wieder zurück
  ctx.globalAlpha = Math.min(1, banner.t / BANNER_FADE);     // 1 solange genug Zeit, dann auf 0
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = PALETTE.k;                               // dunkle Kontur, auf jedem Boden lesbar
  ctx.strokeText(banner.text, W / 2, H / 3);
  ctx.fillStyle = '#f4efe6';
  ctx.fillText(banner.text, W / 2, H / 3);
  ctx.restore();
}


// Trefferpunkte als Herzen oben links
function drawHud() {
    for (let i = 0; i < player.maxHp; i++) {
        const art = i < player.hp ? PIX.heart : PIX.heartEmpty;
        drawPixel(ctx, art, 10 + i * 24, 10);
    }
    // Rechts oben: Ebene und Münzen
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#f4efe6';
    ctx.fillText('Ebene ' + game.depth, W - 104, 25);
    drawPixel(ctx, PIX.coin, W - 92, 2);
    ctx.textAlign = 'left';
    ctx.fillText(String(game.coins), W - 58, 25);
    
    // Abklingzeiten: Der Balken füllt sich, hell heisst bereit
    drawCooldown('SHIFT ROLLE', player.rollReady ?? 1, W - 166, 36);
    
    // TODO: Zusätzliche Fähigkeiten automatisch hinzufügen lassen
    drawCooldown('F BLITZ', player.boltReady ?? 1, W - 86, 36);

    // Banner beim Betreten einer Ebene
    drawBanner();

    // Startbild, Pause und Game Over liegen über dem Spielfeld (FA-3-3, FA-3-4)
    if (game.state === 'menu') drawScreen('Fulgur Dungeon', ['Steig so tief hinab, wie du kannst.', recordText(), 'Enter: Start']);
    if (game.state === 'pause') drawScreen('Pause', ['ESC: weiter']);
    if (game.state === 'dead') drawScreen('Du bist gestorben', [`Ebene ${game.depth} erreicht · Seed ${game.seed}`, recordText(), 'R oder Enter: neuer Durchlauf'], '#e04555');
}

// Dunkle Folie mit Titel und Zeilen darunter
function drawScreen(title, lines, color = '#f4efe6') {
  ctx.fillStyle = 'rgba(8, 6, 10, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 30);
  ctx.fillStyle = '#f4efe6';
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + 10 + i * 26));
  ctx.textAlign = 'left';
}

// Rekord als Text für Startbild und Game Over
function recordText() {
  const best = loadRecord();
  return best.depth > 0 ? `Rekord: Ebene ${best.depth} (Seed ${best.seed})` : 'Noch kein Rekord';
}

// Ein Balken für eine Abklingzeit. ready: 0 gerade benutzt, 1 bereit
function drawCooldown(label, ready, x, y) {
  const w = 74, h = 14;
  ctx.fillStyle = 'rgba(15, 17, 24, 0.6)';                 // Hintergrund
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ready >= 1 ? PALETTE.u : PALETTE.U;      // bereit hell, sonst dunkel
  ctx.fillRect(x, y, w * Math.min(1, ready), h);           // füllt sich von links
  ctx.fillStyle = ready >= 1 ? PALETTE.k : PALETTE.w;      // Schrift auf beiden Farben lesbar
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + 11);
  ctx.textAlign = 'left';
}

// Lebensbalken über jedem Gegner (FA-3-7): ein Feld pro Leben, rot voll, grau leer
function drawHealthBars(alpha) {
  for (const o of objects) {
    if (o === player || !o.maxHp) continue;            // nur Gegner mit maxHp
    const x = o.prevX + (o.x - o.prevX) * alpha;        // gleiche Stelle wie die Figur
    const y = o.prevY + (o.y - o.prevY) * alpha;
    const seg = 8;                                      // Breite pro Leben in px
    const w = o.maxHp * seg;
    const bx = Math.round(x + (TILE - w) / 2);
    const by = Math.round(y + (o.barY ?? -38));         // über dem Kopf, pro Figur einstellbar
    ctx.fillStyle = PALETTE.k;
    ctx.fillRect(bx - 1, by - 1, w + 1, 6);             // dunkler Rahmen
    for (let i = 0; i < o.maxHp; i++) {
      ctx.fillStyle = i < o.hp ? PALETTE.p : PALETTE.e;
      ctx.fillRect(bx + i * seg, by, seg - 1, 4);
    }
  }
}