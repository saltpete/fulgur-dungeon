// =====================================================
// hud.js - Anzeige über dem Spielfeld
// =====================================================
// Liest nur Zustand und zeichnet ihn, keine Änderungen am Zustand.

// Trefferpunkte als Herzen oben links
function drawHud() {
    for (let i = 0; i < player.maxHp; i++) {
        const art = i < player.hp ? PIX.heart : PIX.heartEmpty;
        drawPixel(ctx, art, 10 + i * 24, 10);
    }
}