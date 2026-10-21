// =====================================================================
// エピソードBIG の話を全話、読める形 (docs/story.md) に書き出す
// ---------------------------------------------------------------------
// node tools/export-story.mjs
// 文章の元は src/presentation/lcd/bonusStory.js。セリフを直したら、これを動かして作り直す。
// =====================================================================

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EPISODES } from '../src/presentation/lcd/bonusStory.js';
import { characterName } from '../src/presentation/art/characters.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLACES = {
    home: 'こおりくんの家', town: '夕焼けの町', tower: '摩天楼の前', lobby: '摩天楼1階',
    middle: '中間階層', boss: '四天王の階', top: '最上階'
};
// だれが書いた文章か (画面設計書 4-2)
const AUTHOR = n => (n < 4 ? 'ユーザーの文章' : 'ユーザーの流れをもとに Claude が書いたセリフ');
// 題名がまだ仮の話 (画面設計書 9-3)
const TITLE_FIXED = n => n < 2;

const castName = c => {
    const id = typeof c === 'string' ? c : c.id;
    return typeof c === 'object' && c.hidden ? '？？？（影絵）' : characterName(id);
};
const lines = s => [{ who: s.who, line: s.line }, ...(s.then ? [].concat(s.then) : [])];
const games = (i, last) => (last ? `${50 - i * 5}〜0G` : `${50 - i * 5}〜${46 - i * 5}G`);

function notes(s) {
    const list = [];
    if (s.floor) list.push(s.floor);
    if (s.crowd) list.push(`${characterName(s.crowd)}の群れ`);
    if (s.chase) list.push('群れに追いかけ回される');
    if (s.brawl) list.push('大乱戦');
    if (s.vs) list.push('VS');
    if (s.clash) list.push('一騎打ち');
    if (s.special) list.push(`必殺技「${[].concat(s.special).join('」→「')}」`);
    if (s.gather) list.push('力を集める');
    if (s.awaken) list.push('覚醒');
    if (s.split) list.push('真っ二つ');
    if (s.treasure) list.push('財宝');
    if (s.tv) list.push(`テレビのニュース「${s.tv}」`);
    if (s.gurgle) list.push('お腹の音');
    if (s.tsuzuku) list.push('最後に「つづく」');
    return list;
}

const out = [
    '# エピソードBIG のストーリー（全話）',
    '',
    `${EPISODES.length}話。1話は10の会話で、ボーナスの 5G ごとに次の会話へ進みます（画面設計書 4-2）。`,
    'このファイルは `node tools/export-story.mjs` で `src/presentation/lcd/bonusStory.js` から作っています。セリフを直すときは bonusStory.js を直して、作り直してください。',
    '',
    '- （　）の中は、その会話の場所・出るキャラ・演出です。',
    '- 題名に「（仮）」とある話は、題名がまだ決まっていません。',
    ''
];
EPISODES.forEach((ep, n) => {
    out.push('---', '', `## 第${n + 1}話「${ep.title}」${TITLE_FIXED(n) ? '' : '（仮）'}`, '', `*${AUTHOR(n)}*`, '');
    ep.scenes.forEach((s, i) => {
        const cast = (s.cast || []).map(castName).join('・');
        const extra = notes(s);
        out.push(`**会話${i + 1}**（${games(i, i === ep.scenes.length - 1)}）（${PLACES[s.bg] || s.bg}／${cast}${extra.length ? '／' + extra.join('・') : ''}）`, '');
        lines(s).forEach(l => out.push(`> **${l.who}**「${l.line}」  `));
        out.push('');
    });
});
writeFileSync(join(root, 'docs/story.md'), out.join('\n').replace(/ {2}\n\n/g, '\n\n'));
console.log(`docs/story.md: ${EPISODES.length}話`);
