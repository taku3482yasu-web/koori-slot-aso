// =====================================================================
// 液晶の場面: 疑似ボーナス (画面設計書 4章)
// ---------------------------------------------------------------------
// BIG (黄金の背景にキャラ解説・ステージ解説) / REG (銀色の背景に短い版) / エピソードBIG (夕焼けの摩天楼とストーリー)
// 「こおりを狙え」のあいだの図柄の表示、AT確定 (こおりくん揃いのインパクトフラッシュ)、ボーナス終了と 1G連 の「ボーナス確定！」。
// どの場面を出すかは director.js が決め、ここは描くだけ。t・since はミリ秒。
// =====================================================================

import { ART } from '../art/characters.js';
import { drawSymbol } from '../art/symbols.js';
import { BODY, H, RAINBOW, W, ch, rainbow, rays, rect, room, roundRect, seeded, text, tower, vgrad } from './kit.js';
import { BIG_CARDS, EPISODES, REG_CARDS } from './bonusStory.js';

export const BONUS_NAME = { big: 'BIG BONUS', reg: 'REGULAR BONUS', epbig: 'EPISODE BIG' };
export const BONUS_SHORT = { big: 'BIG', reg: 'REG', epbig: 'エピソードBIG' };
export const ENTRY_MS = 1800;   // ボーナスが始まったときのタイトル
export const CARD_MS = 5000;    // 解説のカードを1枚出す時間

const frameOf = (t, ms = 320) => Math.floor(t / ms) % 2;
const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// キャラを箱 (幅 w・高さ h) に収まる大きさで描く。最大 maxScale 倍
function fitChar(ctx, id, x, ground, w, h, opts = {}, maxScale = 4) {
    const a = ART[id];
    ch(ctx, id, x, ground, { scale: Math.min(w / a.w, h / a.h, maxScale), ...opts });
}

// 回る光 (cx, cy を中心に)
function spinRays(ctx, t, cx, cy, colors, count, alpha, speed = 4000) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t / speed);
    ctx.translate(-cx, -cy);
    rays(ctx, cx, cy, colors, count, alpha);
    ctx.restore();
}

// ----- ボーナス中の画面 -----
// b: { bonus, games, left, payout, since, episode, at, atLabel }
export function drawBonusScreen(ctx, t, b) {
    const since = t - b.since;
    if (b.bonus === 'epbig') drawEpisode(ctx, t, b);
    else drawCards(ctx, t, b, since);
    drawBonusHud(ctx, t, b);
    if (since < ENTRY_MS) drawEntry(ctx, t, since, b);
}

function drawCards(ctx, t, b, since) {
    const big = b.bonus === 'big';
    rect(ctx, 0, 0, W, H, big ? vgrad(ctx, 0, H, ['#fff2a0', '#e8b020', '#8a5a00']) : vgrad(ctx, 0, H, ['#ffffff', '#b8c0cc', '#5a6270']));
    spinRays(ctx, t, W / 2, 200, [big ? '#fff6c0' : '#ffffff', 'rgba(255,255,255,0)'], 28, 0.3);
    // 舞う光の粒
    const rnd = seeded(7);
    for (let i = 0; i < 18; i++) {
        const x = (rnd() * W + t / (30 + rnd() * 30)) % W;
        const y = (rnd() * H - t / (40 + rnd() * 40) + H * 10) % H;
        rect(ctx, x, y, 2, 2, big ? 'rgba(255,255,220,.8)' : 'rgba(255,255,255,.8)');
    }
    text(ctx, BONUS_NAME[b.bonus], W / 2, 18, { size: big ? 18 : 16, color: '#ffffff', lw: 5, stroke: big ? '#8a3a00' : '#3a4250' });

    const cards = big ? BIG_CARDS : REG_CARDS;
    const shown = Math.max(0, since - ENTRY_MS);
    const index = (b.cardStart + Math.floor(shown / CARD_MS)) % cards.length;
    const card = cards[index];
    const k = shown % CARD_MS;
    // カードが右から入って、左へ出ていく
    const slide = k < 250 ? (1 - ease(k / 250)) * W : k > CARD_MS - 200 ? -ease((k - CARD_MS + 200) / 200) * W : 0;
    ctx.save();
    ctx.translate(slide, 0);
    roundRect(ctx, 20, 34, 280, 112, 6, big ? 'rgba(30,16,0,.8)' : 'rgba(20,24,30,.8)', big ? '#ffe680' : '#e0e6ee');
    drawCardPicture(ctx, t, card, 26, 40, 84, 100);
    text(ctx, card.kind, 120, 50, { size: 10, align: 'left', color: big ? '#ffd23a' : '#c8d4e0', stroke: null, font: BODY, weight: '700' });
    text(ctx, card.name, 120, 68, { size: 15, align: 'left', color: '#ffffff', stroke: null });
    card.lines.forEach((l, i) => text(ctx, l, 120, 90 + i * 15, { size: 10, align: 'left', color: big ? '#f0e6d0' : '#e0e6ee', stroke: null, font: BODY }));
    // 何枚目か
    text(ctx, `${index + 1} / ${cards.length}`, 292, 138, { size: 8, align: 'right', color: 'rgba(255,255,255,.6)', stroke: null, font: BODY });
    ctx.restore();
}

// カードの左の絵 (キャラか、ステージの小さい絵)
function drawCardPicture(ctx, t, card, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const f = frameOf(t, 500);
    if (card.who) {
        rect(ctx, x, y, w, h, 'rgba(255,255,255,.08)');
        fitChar(ctx, card.who, x + w / 2, y + h - 6, w - 8, h - 12, { frame: f });
    } else if (card.stage === 'tower') {
        rect(ctx, x, y, w, h, vgrad(ctx, y, y + h, ['#3a1a4a', '#ff7a4a', '#ffd08a']));
        tower(ctx, x + w / 2, y + h, h - 8, '#0d1117');
        for (let i = 1; i < 6; i++) rect(ctx, x + w / 2 - 14, y + h - i * 14, 28, 1, frameOf(t + i * 200, 600) ? '#8fd6f7' : '#3a6a8a');
    } else if (card.stage === 'floor') {
        rect(ctx, x, y, w, h / 2, vgrad(ctx, y, y + h / 2, ['#7ac8f0', '#d8f0ff']));
        rect(ctx, x, y + h / 2, w, h / 2, vgrad(ctx, y + h / 2, y + h, ['#ff8a40', '#7a4a8a']));
        text(ctx, '1〜10F', x + w / 2, y + 14, { size: 10, color: '#1b3a6b', stroke: null });
        text(ctx, '11F〜', x + w / 2, y + h / 2 + 14, { size: 10, color: '#ffffff', stroke: '#5a2a1a', lw: 2 });
        ch(ctx, 'koori', x + 22, y + h / 2 - 2, { scale: 1.8, frame: f });
        ch(ctx, 'harry', x + 60, y + h / 2 - 2, { scale: 1, flip: true });
        ch(ctx, 'nakata', x + 60, y + h - 2, { scale: 0.8, silhouette: true, alpha: 0.7 });
    } else if (card.stage === 'middle') {
        rect(ctx, x, y, w, h, vgrad(ctx, y, y + h, ['#1a1438', '#3a2a5a', '#120c22']));
        ch(ctx, 'koori', x + 20, y + h - 6, { scale: 2, frame: f });
        ch(ctx, 'shibata', x + 62, y + h - 6, { scale: 1, flip: true });
        text(ctx, 'VS', x + w / 2 - 2, y + 30, { size: 16, color: '#ffe040', lw: 4, stroke: '#a01010' });
    } else {
        rect(ctx, x, y, w, h, vgrad(ctx, y, y + h, ['#05040e', '#3a0a14']));
        ch(ctx, 'maou', x + w / 2, y + h - 4, { scale: 1.2, silhouette: true, alpha: 0.9 });
        if (frameOf(t, 1400)) text(ctx, '･ ･', x + w / 2, y + 30, { size: 10, color: '#ff4040', stroke: null });
    }
    ctx.restore();
}

// ----- エピソードBIG -----
const EP_BG = {
    home(ctx, t) {
        rect(ctx, 0, 0, W, H, '#c89a6a');
        rect(ctx, 0, 0, W, 8, '#7a5030');
        // 窓 (夕焼け)
        rect(ctx, 200, 20, 90, 64, vgrad(ctx, 20, 84, ['#ff7a4a', '#ffd08a']));
        rect(ctx, 244, 20, 2, 64, '#7a5030');
        ctx.strokeStyle = '#7a5030';
        ctx.lineWidth = 3;
        ctx.strokeRect(200, 20, 90, 64);
        // ちゃぶ台
        rect(ctx, 0, 118, W, 62, vgrad(ctx, 118, H, ['#a8784a', '#6a4a2a']));
        rect(ctx, 130, 112, 60, 6, '#5a3a1a');
        rect(ctx, 138, 118, 4, 10, '#5a3a1a');
        rect(ctx, 178, 118, 4, 10, '#5a3a1a');
    },
    town(ctx, t) {
        rect(ctx, 0, 0, W, H, vgrad(ctx, 0, 120, ['#3a1a4a', '#ff7a4a', '#ffd08a']));
        const rnd = seeded(21);
        for (let x = 0; x < W; x += 30 + Math.floor(rnd() * 20)) {
            const h = 20 + rnd() * 30;
            rect(ctx, x, 118 - h, 26, h, '#2a1a28');
            ctx.fillStyle = '#2a1a28';
            ctx.beginPath();
            ctx.moveTo(x - 3, 118 - h);
            ctx.lineTo(x + 13, 118 - h - 12);
            ctx.lineTo(x + 29, 118 - h);
            ctx.fill();
            if (rnd() < 0.6) rect(ctx, x + 9, 124 - h, 6, 5, '#ffd27a');
        }
        rect(ctx, 0, 118, W, 62, '#3a2a30');
    },
    tower(ctx, t) {
        rect(ctx, 0, 0, W, H, vgrad(ctx, 0, H, ['#3a1a4a', '#ff7a4a', '#ffd08a']));
        tower(ctx, 250, 128, 120, '#0d1117');
        for (let i = 1; i < 8; i++) if (frameOf(t + i * 300, 900)) rect(ctx, 246, 128 - i * 14, 8, 2, '#8fd6f7');
        rect(ctx, 0, 118, W, 62, '#2a1a20');
    },
    middle(ctx, t) {
        rect(ctx, 0, 0, W, H, vgrad(ctx, 0, H, ['#1a1438', '#3a2a5a', '#120c22']));
        for (let x = 0; x < W; x += 40) rect(ctx, x, 20, 6, 98, 'rgba(255,255,255,.06)');
        rect(ctx, 0, 118, W, 62, vgrad(ctx, 118, H, ['#4a3a6a', '#1a1028']));
    },
    boss(ctx, t) {
        room(ctx, { sky: ['#05040e', '#1a1040'], wall: '#14101c', floor: ['#3a0a14', '#14040a'], cityColor: '#0a0a14', lights: '#8fd6f7', stars: true });
    },
    top(ctx, t) {
        room(ctx, { sky: ['#1a0000', '#5a0a00'], wall: '#120808', floor: ['#5a1000', '#1a0400'], cityColor: '#200404', lights: '#ff6a20' });
        rect(ctx, 0, 0, W, H, `rgba(255,60,0,${0.06 + Math.sin(t / 400) * 0.04})`);
    }
};

// いまの場面: ボーナスのゲーム数を場面の数で割って、消化したぶんだけ進める (最後の場面は終わりまで)
export function episodeScene(b) {
    const ep = EPISODES[b.episode % EPISODES.length];
    const played = b.games - b.left;
    const i = Math.min(ep.scenes.length - 1, Math.floor(played / (b.games / ep.scenes.length)));
    return { ep, scene: ep.scenes[i], index: i };
}

function drawEpisode(ctx, t, b) {
    const { ep, scene, index } = episodeScene(b);
    if (b.sceneIndex !== index) {
        b.sceneIndex = index;
        b.sceneAt = t;
    }
    const k = t - (b.sceneAt || t);
    (EP_BG[scene.bg] || EP_BG.tower)(ctx, t);
    // 出るキャラを左から並べる (右半分にいるキャラは左を向く)
    const n = scene.cast.length;
    scene.cast.forEach((id, i) => {
        const x = n === 1 ? W / 2 : 50 + i * ((W - 100) / (n - 1 || 1));
        const big = id === 'maou' ? 72 : 60;
        const talking = scene.who && ART[id] && frameOf(t, 220) && k < 2400;
        fitChar(ctx, id, x, 122 + (talking ? -1 : 0), 64, big, { frame: frameOf(t, 500), flip: n > 1 && x > W / 2 }, 2.8);
    });
    // 場面が変わったときは少し暗くしてから明るく
    if (k < 300) rect(ctx, 0, 0, W, H, `rgba(0,0,0,${0.6 * (1 - k / 300)})`);
    text(ctx, 'EPISODE BIG', 8, 12, { size: 10, align: 'left', color: '#ffffff', lw: 3 });
    text(ctx, `第${(b.episode % EPISODES.length) + 1}話「${ep.title}」`, W - 8, 12, { size: 10, align: 'right', color: '#ffffff', lw: 3 });
    // セリフ (1文字ずつ出る)
    roundRect(ctx, 10, 124, 300, 34, 4, 'rgba(0,0,0,.78)', '#ffd08a');
    text(ctx, scene.who, 20, 134, { size: 9, align: 'left', color: '#ff8a7a', stroke: null, font: BODY, weight: '700' });
    const shown = [...scene.line].slice(0, Math.floor(k / 45)).join('');
    text(ctx, shown, 20, 149, { size: 11, align: 'left', color: '#ffffff', stroke: null, font: BODY });
}

// ----- 下の帯: 獲得枚数・残りゲーム数・進み具合。AT確定のあとは右上に「AT確定」 -----
function drawBonusHud(ctx, t, b) {
    const dark = b.bonus === 'epbig' ? '#2a1020' : b.bonus === 'big' ? '#3a2000' : '#2a3038';
    rect(ctx, 0, 162, W, 18, 'rgba(0,0,0,.55)');
    text(ctx, `獲得 ${b.payout}枚`, 10, 171, { size: 11, align: 'left', color: '#ffffff', lw: 3, stroke: dark });
    text(ctx, `残り ${b.left}G`, W - 10, 171, { size: 11, align: 'right', color: '#ffffff', lw: 3, stroke: dark });
    const p = b.games ? 1 - b.left / b.games : 0;
    roundRect(ctx, 100, 168, 120, 6, 3, 'rgba(255,255,255,.2)');
    if (p > 0) roundRect(ctx, 100, 168, 120 * p, 6, 3, b.bonus === 'reg' ? '#e0e6ee' : '#ffd23a');
    if (b.at) {
        const y = b.bonus === 'epbig' ? 28 : 16;
        roundRect(ctx, W - 78, y - 9, 72, 18, 4, 'rgba(0,0,0,.7)');
        text(ctx, b.atLabel, W - 42, y, { size: b.atLabel.length > 5 ? 10 : 12, color: rainbow(ctx, W - 76, 0, W - 8, 0), lw: 2 });
    }
}

// ----- ボーナスが始まったときのタイトル -----
function drawEntry(ctx, t, since, b) {
    const a = since > ENTRY_MS - 300 ? 1 - (since - ENTRY_MS + 300) / 300 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    const colors = b.bonus === 'big' ? ['#ffe680', '#ff9a20'] : b.bonus === 'reg' ? ['#ffffff', '#a8b0bc'] : ['#ffd08a', '#ff7a4a'];
    rect(ctx, 0, 0, W, H, b.bonus === 'epbig' ? '#2a0a1a' : b.bonus === 'big' ? '#3a1a00' : '#20242c');
    spinRays(ctx, t, W / 2, 80, colors, 32, 0.5, 1500);
    const pop = 1 + Math.max(0, 0.6 - since / 400);
    const fill = b.bonus === 'big' ? vgrad(ctx, 50, 90, ['#fff6b0', '#ffd23a', '#c88a10']) : b.bonus === 'reg' ? vgrad(ctx, 50, 90, ['#ffffff', '#b8c0cc']) : vgrad(ctx, 50, 90, ['#ffe0b0', '#ff7a4a']);
    text(ctx, BONUS_NAME[b.bonus], W / 2, 70, { size: 28 * pop, color: fill, lw: 7, stroke: '#2a0a00' });
    const aim = { big: ['seven', 'seven', 'seven'], reg: ['seven', 'seven', 'bar'], epbig: ['bar', 'bar', 'bar'] }[b.bonus];
    aim.forEach((id, i) => drawSymbol(ctx, id, 112 + i * 34, 100, 30));
    if (b.bonus === 'epbig' && since > 600) {
        const ep = EPISODES[b.episode % EPISODES.length];
        text(ctx, `第${(b.episode % EPISODES.length) + 1}話「${ep.title}」`, W / 2, 150, { size: 14, color: '#ffffff', lw: 4, stroke: '#5a1a2a' });
    } else if (since > 600) {
        text(ctx, `${b.games}G`, W / 2, 150, { size: 16, color: '#ffffff', lw: 4, stroke: '#2a0a00' });
    }
    ctx.restore();
}

// ----- 「こおりを狙え」のあいだ: 上に「こおりを狙え！」と、止まったリールの中段にこおりくんがいるか -----
// nerae: { color, stops: [null | true | false] x3, phase: 'aim' | 'tenpai' | 'hit' | 'miss', since, endAt }
export function drawNerae(ctx, t, nerae) {
    if (nerae.phase === 'hit') return;   // そろったあとは AT確定 の画面と右上の札で見せる
    const miss = nerae.phase === 'miss';
    const since = miss ? t - nerae.endAt : 0;
    if (miss && since > 1400) return;
    ctx.save();
    if (miss) ctx.globalAlpha = 1 - Math.max(0, (since - 900) / 500);
    const tenpai = nerae.phase === 'tenpai';
    rect(ctx, 0, 30, W, 70, tenpai ? `rgba(120,0,0,${0.55 + Math.sin(t / 60) * 0.15})` : 'rgba(0,0,0,.6)');
    const blink = frameOf(t, tenpai ? 120 : 260);
    text(ctx, tenpai ? 'テンパイ！' : miss && since > 200 ? '…' : 'こおりを狙え！', W / 2, 46, { size: 18, color: blink ? '#ffffff' : '#8fd6f7', lw: 5, stroke: '#1b3a6b' });
    nerae.stops.forEach((s, i) => {
        const x = 112 + i * 34;
        if (s === true) {
            rect(ctx, x - 2, 60, 34, 34, 'rgba(255,255,255,.9)');
            drawSymbol(ctx, 'koori', x, 62, 30);
        } else if (s === false) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            drawSymbol(ctx, 'koori', x, 62, 30);
            ctx.restore();
            text(ctx, '×', x + 15, 77, { size: 22, color: '#ff4a4a', lw: 3 });
        } else {
            ctx.save();
            ctx.globalAlpha = blink ? 0.9 : 0.5;
            drawSymbol(ctx, 'koori', x, 62, 30);
            ctx.restore();
        }
    });
    ctx.restore();
}

// ----- AT確定: こおりくん揃い → 虹色のインパクトフラッシュ → 「AT確定」 -----
// label: 'AT確定' (AT 中のボーナスでは '特化ゾーン確定')
export const KAKUTEI_MS = 2800;
export function drawAtKakutei(ctx, t, since, label) {
    // はじめの 180ms は白い光
    if (since < 180) {
        rect(ctx, 0, 0, W, H, '#ffffff');
        return;
    }
    rect(ctx, 0, 0, W, H, '#ffffff');
    spinRays(ctx, t, W / 2, 90, RAINBOW, 40, 0.75, 1200);
    const k = ease((since - 180) / 400);
    const g = rainbow(ctx, 100, 40 + Math.sin(t / 150) * 20, 220, 140);
    ch(ctx, 'koori', W / 2, 150, { scale: 7 * k, tint: '#ffffff' });
    ch(ctx, 'koori', W / 2, 144, { scale: 6 * k, tint: g, alpha: 0.85 });
    ch(ctx, 'koori', W / 2, 140, { scale: 5.2 * k, frame: frameOf(t, 160) });
    if (since > 450) {
        const pop = 1 + Math.max(0, 0.5 - (since - 450) / 300);
        text(ctx, label, W / 2, 28, { size: (label.length > 4 ? 24 : 30) * pop, color: rainbow(ctx, 70, 0, 250, 0), lw: 7 });
        [100, 145, 190].forEach(x => drawSymbol(ctx, 'koori', x, 146, 30));
    }
    // 最後は白くとぶ
    if (since > KAKUTEI_MS - 250) rect(ctx, 0, 0, W, H, `rgba(255,255,255,${(since - KAKUTEI_MS + 250) / 250})`);
}

// ----- ボーナス終了 -----
// end: { bonus, payout, at, stock, atLabel }。1G連 (stock) があれば「ボーナス確定！」、AT へ行くなら RASH へ
export const END_MS = 2400;
export function drawBonusEnd(ctx, t, since, end) {
    const big = end.bonus !== 'reg';
    rect(ctx, 0, 0, W, H, end.bonus === 'epbig' ? vgrad(ctx, 0, H, ['#3a1a4a', '#ff7a4a', '#ffd08a'])
        : big ? vgrad(ctx, 0, H, ['#fff2a0', '#e8b020', '#8a5a00']) : vgrad(ctx, 0, H, ['#ffffff', '#b8c0cc', '#5a6270']));
    rect(ctx, 0, 0, W, H, 'rgba(0,0,0,.45)');
    text(ctx, `${BONUS_SHORT[end.bonus]} 終了`, W / 2, 26, { size: 16, color: '#ffffff', lw: 4 });
    const count = Math.round(end.payout * Math.min(1, since / 700));
    text(ctx, `獲得 ${count}枚`, W / 2, 50, { size: 20, color: vgrad(ctx, 40, 60, ['#fff6b0', '#ffd23a']), lw: 5, stroke: '#3a2000' });
    if (since < 800) return;
    const k = ease((since - 800) / 300);
    if (end.stock) {
        // 1G連: 赤い帯に「ボーナス確定！」(ストックが2つ以上なら ×数)
        rect(ctx, (1 - k) * W, 72, W, 50, vgrad(ctx, 72, 122, ['#ff3030', '#a00010']));
        text(ctx, end.stock > 1 ? `ボーナス確定！ ×${end.stock}` : 'ボーナス確定！', W / 2 + (1 - k) * W, 97, { size: 24, color: '#ffe040', lw: 6 });
        if (since > 1300) text(ctx, '7を狙え', W / 2, 140, { size: 14, color: frameOf(t, 260) ? '#ffffff' : '#ffe040', lw: 4 });
    } else if (end.at) {
        rect(ctx, 0, 72, W, 50, `rgba(0,0,0,${0.6 * k})`);
        ctx.save();
        ctx.globalAlpha = k;
        text(ctx, 'こおりバトルRASH へ！', W / 2, 97, { size: 22, color: rainbow(ctx, 50, 0, 270, 0), lw: 6 });
        ctx.restore();
        ch(ctx, 'koori', 40, 168, { scale: 3, frame: frameOf(t, 200) });
    } else {
        ch(ctx, 'koori', W / 2, 150, { scale: 3, frame: frameOf(t, 500) });
        text(ctx, '摩天楼へもどる…', W / 2, 92, { size: 14, color: '#e0e6ee', lw: 4 });
    }
}
