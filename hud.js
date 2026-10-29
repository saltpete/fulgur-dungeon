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