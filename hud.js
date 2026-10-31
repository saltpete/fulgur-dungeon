// =====================================================
// hud.js - Anzeige über dem Spielfeld
// =====================================================
// Liest nur Zustand und zeichnet ihn, keine Änderungen am Zustand.

let banner = null;   // { text, t }
function showBanner(text) {
  banner = { text, t: 2 };
}


// Trefferpunkte als Herzen oben links
function drawHud(dt) {
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

    // Durchlauf vorbei (FA-3-3, FA-3-4)
    if (game.state === 'dead') {
        ctx.fillStyle = 'rgba(8, 6, 10, 0.72)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e04555';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('Du bist gestorben', W / 2, H / 2 - 20);
        ctx.fillStyle = '#f4efe6';
        ctx.font = '18px sans-serif';
        ctx.fillText('Drücke R oder Enter für einen neuen Durchlauf', W / 2, H / 2 + 20);
        ctx.textAlign = 'left';
    }
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