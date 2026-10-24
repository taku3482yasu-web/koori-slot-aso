// =====================================================================
// 熱いときに 震える 枠 と、プレミア「液晶の ひび割れ」(2026-10-24 ユーザー指定。前作のスロット・パチンコと 同じ 見せ方)
// ---------------------------------------------------------------------
// drawHotFrame(ctx, t, level): 液晶の ふちに 太い 枠を 出して ぶるぶる 震わせる。level 1 赤 / 2 金 / 3 虹
//   (カットインの 色 red・gold・rainbow と 確定音で 演出側が 決める。lcd/director.js)
// drawCrack(ctx, t, since, fx): 液晶が まっぷたつに ひび割れ → すき間から おにおに → 粉々に 砕ける → 咆哮 → 「確定!!」。
//   notice の premium (effect: 'crack') で 流す。出すかどうかは 内部処理が 決める (docs/events.md)
// =====================================================================

import { W, H, ch, text, rainbow, rect } from './kit.js';

export const CRACK_MS = { crack: 500, split: 1300, smash: 2400, roar: 2900, kakutei: 4000, end: 4800 };
const PATH = [[0, 0], [-0.025, 0.1], [0.02, 0.19], [-0.016, 0.29], [0.03, 0.38], [-0.012, 0.49], [0.024, 0.58], [-0.02, 0.68], [0.012, 0.78], [-0.008, 0.89], [0, 1]];
const jolt = m => [Math.round((Math.random() * 2 - 1) * m), Math.round((Math.random() * 2 - 1) * m)];

export function drawHotFrame(ctx, t, level) {
    if (!level) return;
    const [dx, dy] = jolt(level + 1);
    const th = 4 + level;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t / 60);
    rect(ctx, -4, -4, W + 8, th + 5, '#000000');
    rect(ctx, -4, H - th - 1, W + 8, th + 5, '#000000');
    rect(ctx, -4, -4, th + 5, H + 8, '#000000');
    rect(ctx, W - th - 1, -4, th + 5, H + 8, '#000000');
    const color = level >= 3 ? rainbow(ctx, 0, 0, W, H) : level === 2 ? '#ffd23a' : '#ff3040';
    rect(ctx, 0, 0, W, th, color);
    rect(ctx, 0, H - th, W, th, color);
    rect(ctx, 0, 0, th, H, color);
    rect(ctx, W - th, 0, th, H, color);
    // 内側の 光る すじ
    const glint = 'rgba(255,255,255,0.7)';
    rect(ctx, th, th, W - th * 2, 1, glint);
    rect(ctx, th, H - th - 1, W - th * 2, 1, glint);
    rect(ctx, th, th, 1, H - th * 2, glint);
    rect(ctx, W - th - 1, th, 1, H - th * 2, glint);
    ctx.restore();
}

function crackPath(ctx, k) {
    const n = PATH.length - 1, upto = k * n;
    ctx.beginPath();
    ctx.moveTo(W / 2 + PATH[0][0] * W, 0);
    for (let i = 1; i <= n; i++) {
        const f = Math.min(1, Math.max(0, upto - (i - 1)));
        if (f <= 0) break;
        const [x0, y0] = PATH[i - 1], [x1, y1] = PATH[i];
        ctx.lineTo(W / 2 + (x0 + (x1 - x0) * f) * W, (y0 + (y1 - y0) * f) * H);
    }
}

// fx: { snap (割れる 前の 液晶の 写し。ここで 作る) }
export function drawCrack(ctx, t, since, fx) {
    const e = since;
    if (e < CRACK_MS.crack) {
        rect(ctx, 0, 0, W, H, `rgba(0,0,0,${0.5 * e / CRACK_MS.crack})`);
        return;
    }
    if (e < CRACK_MS.split) {
        rect(ctx, 0, 0, W, H, 'rgba(0,0,0,0.5)');
        const k = Math.min(1, (e - CRACK_MS.crack) / 450);
        ctx.save();
        const [dx, dy] = jolt(k >= 1 ? 2 : 1);
        ctx.translate(dx, dy);
        crackPath(ctx, k);
        ctx.strokeStyle = 'rgba(255,40,40,0.8)';
        ctx.lineWidth = 5;
        ctx.stroke();
        crackPath(ctx, k);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        // 割れる 画面を 写して おく (液晶の canvas の 大きさの まま)
        const c = ctx.canvas;
        if (!fx.snap) {
            fx.snap = document.createElement('canvas');
            fx.snap.width = c.width;
            fx.snap.height = c.height;
        }
        const g = fx.snap.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(c, 0, 0);
        return;
    }
    if (e < CRACK_MS.smash) {
        // 左右が ずれて、赤い すき間から おにおにが せり上がる
        const k = (e - CRACK_MS.split) / (CRACK_MS.smash - CRACK_MS.split);
        const gap = Math.round(Math.min(1, k / 0.35) * 34 + Math.max(0, k - 0.3) * 50);
        const rise = Math.min(1, Math.max(0, (k - 0.2) / 0.6));
        rect(ctx, 0, 0, W, H, '#140000');
        const glow = ctx.createLinearGradient(W / 2 - gap - 10, 0, W / 2 + gap + 10, 0);
        glow.addColorStop(0, 'rgba(255,0,0,0)');
        glow.addColorStop(0.5, `rgba(255,${90 + Math.floor(60 * Math.sin(t / 50))},40,0.95)`);
        glow.addColorStop(1, 'rgba(255,0,0,0)');
        rect(ctx, W / 2 - gap - 10, 0, gap * 2 + 20, H, glow);
        ch(ctx, 'onioni', W / 2, H + 4 + (1 - rise) * 130, { scale: 3.4, frame: Math.floor(t / 250) % 2 });
        if (fx.snap) {
            const [dx, dy] = jolt(1 + rise * 2);
            for (const side of [-1, 1]) {
                ctx.save();
                ctx.translate(side * gap + dx, dy);
                ctx.beginPath();
                ctx.moveTo(side < 0 ? -2 : W + 2, 0);
                for (const [x, y] of PATH) ctx.lineTo(W / 2 + x * W, y * H);
                ctx.lineTo(side < 0 ? -2 : W + 2, H);
                ctx.closePath();
                ctx.save();
                ctx.clip();
                ctx.drawImage(fx.snap, 0, 0, W, H);
                ctx.restore();
                ctx.strokeStyle = '#ffb0a0';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
        if (rise > 0.5) text(ctx, 'グ……', W / 2, 16, { size: 14, color: '#ff6060' });
        return;
    }
    if (e < CRACK_MS.roar) {
        // 粉々に 砕けて 飛び散る
        const k = (e - CRACK_MS.smash) / (CRACK_MS.roar - CRACK_MS.smash), q = k * k;
        rect(ctx, 0, 0, W, H, '#200000');
        if (fx.snap) {
            const cols = 6, rows = 4, cw = W / cols, chh = H / rows, sx = fx.snap.width / W, sy = fx.snap.height / H;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = (c + 0.5) * cw, cy = (r + 0.5) * chh;
                    const vx = (cx - W / 2) * 3.2 + ((r * 7 + c * 13) % 9 - 4) * 12, vy = (cy - H / 2) * 3.2 - 40;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
                    ctx.translate(cx + vx * q, cy + vy * q + 160 * q * q);
                    ctx.rotate(((r + c) % 2 ? 1 : -1) * k * 4);
                    ctx.drawImage(fx.snap, (cx - cw / 2) * sx, (cy - chh / 2) * sy, cw * sx, chh * sy, -cw / 2, -chh / 2, cw, chh);
                    ctx.restore();
                }
            }
        }
        if (k < 0.3) rect(ctx, 0, 0, W, H, `rgba(255,255,255,${0.9 * (1 - k / 0.3)})`);
        return;
    }
    if (e < CRACK_MS.kakutei) {
        // 赤い 画面で おにおにが 咆哮
        const bg = ctx.createRadialGradient(W / 2, H * 0.55, 6, W / 2, H * 0.55, W * 0.7);
        bg.addColorStop(0, '#ff4020');
        bg.addColorStop(0.5, '#801010');
        bg.addColorStop(1, '#100000');
        rect(ctx, 0, 0, W, H, bg);
        for (let j = 0; j < 3; j++) {
            const r = ((t / 600 + j / 3) % 1) * W * 0.7;
            ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - r / (W * 0.7))})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(W / 2, H * 0.45, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        const [dx, dy] = jolt(3);
        ch(ctx, 'onioni', W / 2 + dx, H - 2 + dy, { scale: 4, frame: 1 });
        const [tx, ty] = jolt(2);
        text(ctx, 'グオオオオオ!!', W / 2 + tx, 20 + ty, { size: 24, color: Math.floor(t / 100) % 2 ? '#ffe066' : '#ffffff', lw: 4 });
        return;
    }
    // 確定!!
    const k = (e - CRACK_MS.kakutei) / (CRACK_MS.end - CRACK_MS.kakutei);
    if (k < 0.25) rect(ctx, 0, 0, W, H, `rgba(255,255,255,${0.9 * (1 - k / 0.25)})`);
    rect(ctx, 0, H / 2 - 22, W, 44, 'rgba(0,0,0,0.55)');
    text(ctx, '確定!!', W / 2, H / 2, { size: 30, color: rainbow(ctx, 100, 0, 220, 0), lw: 5 });
}
