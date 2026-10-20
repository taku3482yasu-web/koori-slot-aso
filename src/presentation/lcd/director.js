// =====================================================================
// 演出の進行役 (ディレクター)
// ---------------------------------------------------------------------
// 内部処理のイベントを受け取り、液晶・音・PUSH ボタン・押し順ナビをどう見せるかを決める。
// イベントは順番に処理する。演出に時間がかかるところ (リールが止まりきるまで・PUSH 待ち・暗転など) では
// 「待ち (hold)」を作り、終わるまで次のイベントを処理しない。待っている間はレバーを受け付けない (busy)。
// 画面に何を出すかの状態は view にまとめ、draw(ctx, now) で毎フレーム描く。
// =====================================================================

import { EVENTS as E, windowAt } from '../../logic/index.js';
import { W, H, haze, rect, text, rainbow } from './kit.js';
import {
    TEAMS, drawBattle, drawCutin, drawDirect, drawElevator, drawFlash, drawFloor, drawHeaven,
    drawMiddle, drawNavi, drawStandby, drawTenjo
} from './scenes.js';
import { END_MS, ENTRY_MS, KAKUTEI_MS, drawAtKakutei, drawBonusEnd, drawBonusScreen, drawNerae } from './bonus.js';
import { BIG_CARDS, EPISODES, REG_CARDS } from './bonusStory.js';
import { ATTACKS, ATTACK_MS, COUNT_MS, END_MS as AT_END_MS, START_MS, drawAtCount, drawAtEnd, drawAtMain, drawAtStart, drawAttack } from './at.js';

// 残りゲーム数を大きく出すとき (画面設計書 5-1 の案)
const COUNT_AT = [10, 5, 3, 2, 1];
const PUSH_WAIT_MS = 5000;     // 武器の攻撃で PUSH を待つ時間 (押さなくても進む)
const LONG_PRESS_MS = 900;     // コオリハンマーの長押しでゲージがたまる時間

// エピソードBIG は引くたびに次の話へ進む (このブラウザに覚えておく。覚えられないときは毎回1話から)
function nextEpisode() {
    let n = 0;
    try { n = Number(localStorage.getItem('koori-slot-episode')) || 0; } catch (e) { /* 保存できない環境 */ }
    try { localStorage.setItem('koori-slot-episode', String((n + 1) % EPISODES.length)); } catch (e) { /* 無視 */ }
    return n % EPISODES.length;
}
// BIG・REG の解説は、前のボーナスの続きのカードから出す
const nextCard = { big: 0, reg: 0 };
const REEL_SETTLE_MS = 180;   // 停止ボタンを押してから、リールが止まって見えるまで

const BOSS_NAMES = { 22: 'ダイシ', 33: 'ズミタニ', 44: 'ルナヤ', 55: 'ノゾエマ' };

// ふるカワのセリフ (期待度には関係しないので演出側で選ぶ)
function naviLine(stage) {
    const f = stage.floor;
    if (f === 56) return 'ここは大魔王の間…！気をつけて！';
    if (BOSS_NAMES[f]) return `四天王${BOSS_NAMES[f]}の気配がする…！`;
    if (stage.state === 'high') return pick([`夕方の${f}階…ここから上は高確だよ`, `${f}階。敵の気配が強くなってきた…`]);
    return pick([`ここはまだ${f}階。下の階は敵も弱いよ！`, `${f}階に着いたよ。上を目指そう！`]);
}
const pick = list => list[Math.floor(Math.random() * list.length)];

export function createDirector({ sound, reels, onChange = () => {} }) {
    const v = {
        phase: 'normal',
        stage: { place: 'floor', floor: 1, state: 'low' },
        zone: false,
        zencho: null,
        battle: null,
        standby: null,
        bonus: null,
        nerae: null,       // 「こおりを狙え」のゲーム: { color, win, stops, order, phase, endAt }
        kakutei: null,     // AT確定 (こおりくん揃い): { since, label }
        bonusEnd: null,    // ボーナス終了の画面: { bonus, payout, at, stock, since }
        atStart: null,     // AT 突入の画面: { since, games }
        atCount: null,     // 残りゲーム数の大きな数字: { left, since }
        attack: null,      // 上乗せの攻撃: { attacker, enemy, games, left, phase, since, gauge, pushes }
        pendingAdd: null,  // レバーで届いた上乗せ。リールが止まってから攻撃を見せる
        atEnd: null,       // AT 終了の画面
        at: null,
        direct: null,
        tenjo: null,
        navi: null,
        overlays: [],
        banner: null,
        button: { color: 'white', lit: false, pop: false },
        nav: null,
        credit: 50,
        lastPayout: 0
    };
    const queue = [];
    let hold = null;      // { reels } | { until, then } | { push: 'battle' | 'attack', timeout }
    let pressing = false; // PUSH ボタンを押しているあいだ (コオリハンマーの長押し)
    let now = performance.now();
    const timers = [];

    const changed = () => onChange(snapshot());
    const after = (ms, fn) => timers.push({ at: now + ms, fn });
    const overlay = (kind, dur, data = {}, delay = 0) => v.overlays.push({ kind, since: now + delay, until: now + delay + dur, ...data });
    const wait = (ms, then = null) => { hold = { until: now + ms, then }; };

    function setButton(color, { lit = true, pop = false } = {}) {
        v.button = { color, lit, pop };
        changed();
    }

    // ----- 「こおりを狙え」(画面設計書 4-3) -----
    // 押し順で確定がわかるタイミングが変わる (仕様書): 中押しは中リールにこおりくんが止まった時点 (1確)、
    // はさみ押しは左右でテンパイした時点 (2確)、順押しは第3停止まで引っ張る。
    // ガセのときは、内部処理が中押しで中リールにこおりくんを止めず、はさみ押しでテンパイさせない
    function neraeStop(reel, top) {
        const n = v.nerae;
        n.order.push(reel);
        n.stops[reel] = windowAt(reel, top)[1] === 'koori';
        if (n.phase !== 'aim' && n.phase !== 'tenpai') return;
        const [first, second] = n.order;
        const kooriAll = n.order.every(r => n.stops[r]);
        if (n.order.length === 1 && first === 1 && kooriAll) return revealKoori();
        if (n.order.length === 2 && first !== 1 && second !== 1 && kooriAll) return revealKoori();
        if (n.order.length === 2 && kooriAll) {
            n.phase = 'tenpai';
            sound.play('tenpai');
            setButton('red', { pop: true });
        }
    }

    function flushNerae(all = false) {
        const n = v.nerae;
        while (n && n.pending.length && (all || n.pending[0].at <= now)) {
            const { reel, top } = n.pending.shift();
            neraeStop(reel, top);
        }
    }

    function revealKoori() {
        v.nerae.phase = 'hit';
        if (v.bonus) v.bonus.at = true;
        v.kakutei = { since: now, label: atLabel() };
        sound.play('kooriAlign');
        after(250, () => sound.play('atKakutei'));
        setButton('rainbow', { pop: true });
    }

    // ----- 上乗せの攻撃 (画面設計書 5-2) -----
    // 相手が出てくる → (武器のときは PUSH を待つ: ソード 1回 / ハンマー 長押し / 絶対殺す剣 4回) → 攻撃 → +〇G
    function startAttack(e) {
        const atk = ATTACKS[e.attacker] || ATTACKS.yasu;
        pressing = false;
        v.attack = { attacker: e.attacker, enemy: e.enemy, games: e.games, left: e.left, phase: 'appear', since: now, gauge: 0, pushes: 0 };
        sound.play('cutin');
        wait(ATTACK_MS.appear, () => {
            if (!atk.weapon) return hitAttack();
            v.attack.phase = 'push';
            v.attack.since = now;
            setButton(atk.weapon === 'kill' ? 'rainbow' : atk.weapon === 'hammer' ? 'blue' : 'white', { pop: atk.weapon === 'kill' });
            hold = { push: 'attack', timeout: now + PUSH_WAIT_MS };
        });
    }

    function attackPush() {
        const a = v.attack;
        const atk = ATTACKS[a.attacker];
        sound.play('push');
        if (atk.button === 'long') {
            a.gauge = Math.min(1, a.gauge + 0.2);   // 長押しのほか、連打でもたまる
            if (a.gauge >= 1) hitAttack();
            return;
        }
        a.pushes++;
        if (a.pushes >= atk.pushes) hitAttack();
    }

    function hitAttack() {
        const a = v.attack;
        hold = null;
        a.phase = 'hit';
        a.since = now;
        setButton(a.games >= 300 ? 'rainbow' : 'gold', { pop: a.games >= 300 });
        after(300, () => sound.play('clash'));
        wait(ATTACK_MS.hit, () => {
            a.phase = 'result';
            a.since = now;
            // 上乗せ音は大きさで3段階 (画面設計書 7-2)
            sound.play(a.games >= 100 ? 'addBig' : a.games >= 50 ? 'addMid' : 'addSmall');
            if (v.at) {
                v.at.left = a.left;
                v.at.adds++;
                v.at.addTotal += a.games;
                v.at.best = Math.max(v.at.best, a.games);
            }
            wait(ATTACK_MS.result, () => {
                v.attack = null;
                if (v.at) v.at.add = { games: a.games, at: now };
                setButton('white', { lit: false });
            });
        });
    }

    // AT 中のボーナスでは、こおりくん揃いは特化ゾーン確定の告知 (仕様書)
    const atLabel = () => (v.at ? '特化ゾーン確定' : 'AT確定');

    // ----- イベントごとの見せ方 -----
    const handlers = {
        [E.LEVER]() {
            sound.play('lever');
            v.lastPayout = 0;
            v.battle = null;
            v.nerae = null;
            if (!v.direct) setButton('white', { lit: false });
            changed();
        },

        [E.NOTICE](e) {
            if (e.kind === 'sakibare') {
                sound.sakibare(e.pitch);
                setButton(e.pitch === 'high' ? 'rainbow' : 'red');
                after(900, () => { if (!v.direct) setButton('white', { lit: false }); });
            } else if (e.kind === 'cutin') {
                overlay('cutin', 1800, { color: e.color });
                sound.play('cutin');
                if (e.color === 'gold' || e.color === 'rainbow') setButton(e.color, { pop: e.color === 'rainbow' });
            } else if (e.kind === 'flash') {
                overlay('flash', 700, { level: e.level });
                sound.play(e.level === 'rainbow' ? 'flashRainbow' : e.level === 'big' ? 'flashBig' : 'flashSmall');
            } else if (e.kind === 'kakutei') {
                sound.play('kakutei');
                setButton('rainbow', { pop: true });
            }
        },

        [E.DIRECT]() {
            v.direct = { phase: 'noise', since: now };
            sound.play('noise');
        },

        [E.REEL_STOP](e) {
            sound.play('stop');
            // 第1・第2停止のイベントは押した瞬間に来るので、リールが止まって見えてから判定する。
            // 第3停止は止まりきってから来るので、残っている分もまとめて止めた順に判定する
            if (v.nerae) {
                v.nerae.pending.push({ reel: e.reel, top: e.top, at: now + REEL_SETTLE_MS });
                flushNerae(e.order === 3);
            }
        },

        [E.GAME_END](e) {
            v.credit = e.credit;
            v.lastPayout = e.payout;
            if (v.bonus) v.bonus.payout += e.payout;
            if (v.at) v.at.payout += e.payout;
            if (e.win) reels.highlight([[0, 1], [1, 1], [2, 1]], e.win === 'replay' ? '#3a86ff' : '#ffe040');
            if (e.payout) sound.play('payout');
            else if (e.win === 'replay') sound.play('replay');
            changed();

            // 「こおりを狙え」の結果: そろったら AT確定 を見せきるまで待つ。そろわなければガセ
            if (v.nerae) {
                if (e.win === 'koori' && v.nerae.phase !== 'hit') revealKoori();
                if (v.nerae.phase === 'hit') {
                    wait(Math.max(0, KAKUTEI_MS - (now - v.kakutei.since)), () => { v.kakutei = null; });
                } else {
                    v.nerae.phase = 'miss';
                    v.nerae.endAt = now;
                    sound.play('lose');
                    setButton('white', { lit: false });
                }
                return;
            }

            // AT: 押し順ナビを消して、上乗せがあれば攻撃を見せる
            if (v.at) {
                v.nav = null;
                v.at.nav = null;
                changed();
                if (v.pendingAdd) startAttack(v.pendingAdd);
                v.pendingAdd = null;
                return;
            }

            // 前兆の最後のバトル: PUSH を待つ
            if (v.battle && v.battle.final) {
                v.battle.phase = 'push';
                setButton(v.battle.button, { pop: v.battle.button === 'gold' || v.battle.button === 'rainbow' });
                hold = { push: 'battle', timeout: now + 6000 };
                return;
            }
            // AT 直撃: 暗転 → こおりいきていける！
            if (v.direct) {
                v.direct = { phase: 'black', since: now };
                sound.play('blackout');
                wait(900, () => {
                    v.direct = { phase: 'reveal', since: now };
                    sound.sakibare('high');
                    sound.play('fanfare');
                    wait(2800, () => { v.direct = null; });
                });
            }
        },

        [E.ZENCHO_START](e) {
            v.zencho = { team: e.team, cause: e.cause, since: now + 1300 };
            overlay('elevator', 1300, { from: v.stage.floor, to: null });
            sound.play('elevator');
        },

        [E.ZENCHO_BATTLE](e) {
            v.battle = { ...e, since: now, phase: 'clash' };
            after(650, () => sound.play('clash'));
        },

        [E.ZENCHO_END](e) {
            if (!e.win) {
                v.zencho = null;
                v.battle = null;
            }
        },

        [E.STAGE](e) {
            if (e.place === 'middle') {
                v.stage = { ...v.stage, place: 'middle' };
                return;
            }
            const from = v.stage.floor;
            const moved = from !== e.floor || v.stage.place !== 'floor';
            const next = { place: 'floor', floor: e.floor, state: e.state };
            if (!moved || v.phase !== 'normal') {
                v.stage = next;
            } else {
                // レア役のフラッシュを見せてから動く。扉が閉まりきったところで階を変える
                const delay = v.overlays.some(o => o.kind === 'flash') ? 700 : 0;
                after(delay + 450, () => { v.stage = next; });
                overlay('elevator', 1300, { from, to: e.floor }, delay);
                after(delay, () => sound.play('elevator'));
                after(delay + 1300, () => { v.navi = { line: naviLine(v.stage), since: now, until: now + 3500 }; });
            }
        },

        [E.ZONE](e) {
            v.zone = e.active;
        },

        [E.HEAVEN](e) {
            overlay('heaven', 1900, { who: e.who });
            sound.play('cutin');
        },

        [E.TENJO](e) {
            v.tenjo = { who: e.who, since: now };
            sound.play('fanfare');
            setButton('rainbow', { pop: true });
            wait(3200, () => { v.tenjo = null; });
        },

        [E.BONUS_STANDBY](e) {
            v.phase = 'standby';
            v.standby = { bonus: e.bonus, stock: e.stock };
            v.zencho = null;
            v.battle = null;
            v.zone = false;
            setButton('gold');
            sound.play('fanfare');
        },

        [E.BONUS_START](e) {
            v.phase = 'bonus';
            v.standby = null;
            const cards = e.bonus === 'big' ? BIG_CARDS : REG_CARDS;
            const cardStart = e.bonus === 'epbig' ? 0 : nextCard[e.bonus] % cards.length;
            // 解説は 1G に約1枚進むとして、次のボーナスはその続きから
            if (e.bonus !== 'epbig') nextCard[e.bonus] = cardStart + Math.ceil(e.games / 3);
            v.bonus = {
                bonus: e.bonus, games: e.games, left: e.games, payout: 0, since: now, cardStart,
                episode: e.bonus === 'epbig' ? nextEpisode() : 0,
                // エピソードBIG は AT 確定 (仕様書。AT 中は特化ゾーン確定)
                at: e.bonus === 'epbig', atLabel: atLabel()
            };
            setButton(e.bonus === 'epbig' ? 'rainbow' : 'gold');
            sound.play('fanfare');
            wait(ENTRY_MS - 400, () => setButton('white', { lit: false }));
        },

        [E.BONUS_GAME](e) {
            if (v.bonus) v.bonus.left = e.left;
        },

        // 「こおりを狙え」カットイン。色は内部処理が抽選する (成功率は未定)。win は見せ方には使わず、リールの出目で判定する
        [E.BONUS_NERAE](e) {
            v.nerae = { color: e.color, win: e.win, stops: [null, null, null], order: [], pending: [], phase: 'aim', endAt: 0 };
            overlay('cutin', 1300, { color: e.color, line: 'こおりを狙え！' });   // 停止ボタンを押す前に抜ける長さ
            sound.play('cutin');
            if (e.color === 'gold' || e.color === 'rainbow') setButton(e.color, { pop: e.color === 'rainbow' });
        },

        [E.BONUS_END](e) {
            const b = v.bonus;
            v.bonusEnd = { bonus: e.bonus, payout: b ? b.payout : 0, at: e.at, stock: e.stock, since: now };
            v.bonus = null;
            v.nerae = null;
            if (!e.at && !e.stock) v.phase = 'normal';
            sound.play(e.stock || e.at ? 'fanfare' : 'bonusEnd');
            if (e.stock) setButton('gold');
            wait(END_MS, () => { v.bonusEnd = null; });
        },

        [E.AT_START](e) {
            v.phase = 'at';
            v.at = { left: e.games, payout: 0, add: null, nav: null, adds: 0, addTotal: 0, best: 0 };
            v.atStart = { since: now, games: e.games };
            sound.play('fanfare');
            setButton('blue');
            wait(START_MS, () => {
                v.atStart = null;
                setButton('white', { lit: false });
            });
        },

        [E.AT_GAME](e) {
            if (v.at) {
                v.at.left = e.left;
                v.at.nav = e.nav;
            }
            v.nav = e.nav;
            if (COUNT_AT.includes(e.left)) {
                v.atCount = { left: e.left, since: now };
                sound.play('count');
            }
            changed();
        },

        // 上乗せはレバーのときに届くが、レア役の出目を見せてから攻撃する (ゲームの終わりで startAttack)
        [E.AT_ADD](e) {
            v.pendingAdd = { ...e };
        },

        [E.AT_END](e) {
            const a = v.at || { adds: 0, addTotal: 0, best: 0 };
            v.atEnd = { games: e.games, payout: e.payout, adds: a.adds, addTotal: a.addTotal, best: a.best, since: now };
            v.at = null;
            v.nav = null;
            v.atCount = null;
            v.phase = 'normal';
            sound.play('atEnd');
            changed();
            wait(AT_END_MS, () => { v.atEnd = null; });
        }
    };

    function handle(e) {
        const fn = handlers[e.type];
        if (fn) fn(e);
    }

    function pump() {
        while (!hold && queue.length) handle(queue.shift());
        changed();
    }

    // 前兆の最後のバトルの結果を見せる
    function revealBattle() {
        const b = v.battle;
        hold = null;
        b.phase = 'result';
        b.resultAt = now;
        sound.play(b.win ? 'win' : 'lose');
        setButton(b.win ? 'rainbow' : 'white', { lit: b.win });
        wait(b.win ? 1800 : 1600);
    }

    function bgmFor() {
        if (v.bonusEnd) return v.bonusEnd.at || v.bonusEnd.stock ? 'bonus' : null;
        // 画面設計書 7-2: BIG 豪華な曲 / REG 短い明るい曲 / エピソードBIG しっとりした曲
        if (v.phase === 'bonus' && v.bonus) return { big: 'bonus', reg: 'reg', epbig: 'epbig' }[v.bonus.bonus];
        if (v.phase === 'bonus' || v.phase === 'standby') return 'bonus';
        if (v.atEnd) return 'atEnd';
        if (v.phase === 'at') return 'at';
        if (v.zencho) return 'zencho';
        if (v.stage.state === 'super') return 'super';
        if (v.stage.state === 'high') return 'high';
        return 'low';
    }

    function update(t) {
        now = t;
        for (let i = timers.length - 1; i >= 0; i--) {
            if (t >= timers[i].at) {
                const { fn } = timers[i];
                timers.splice(i, 1);
                fn();
            }
        }
        if (hold && hold.until && t >= hold.until) {
            const then = hold.then;
            hold = null;
            if (then) then();
        }
        if (hold && hold.push && t >= hold.timeout) {
            if (hold.push === 'battle') revealBattle();
            else hitAttack();
        }
        // コオリハンマー: 押しているあいだゲージがたまる
        if (hold && hold.push === 'attack' && pressing && ATTACKS[v.attack.attacker].button === 'long') {
            v.attack.gauge = Math.min(1, v.attack.gauge + (t - (v.attack.lastTick || t)) / LONG_PRESS_MS);
            if (v.attack.gauge >= 1) hitAttack();
        }
        if (v.attack) v.attack.lastTick = t;
        if (v.atCount && t - v.atCount.since > COUNT_MS) v.atCount = null;
        flushNerae();
        if (!hold && queue.length) pump();
        v.overlays = v.overlays.filter(o => o.until > t);
        if (v.navi && v.navi.until < t) v.navi = null;
        sound.bgm(bgmFor());
    }

    function draw(ctx, t) {
        update(t);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();
        // 場面
        if (v.phase === 'standby' && v.standby) drawStandby(ctx, t, v.standby);
        else if (v.phase === 'bonus' && v.bonus) drawBonusScreen(ctx, t, v.bonus);
        else if (v.phase === 'at' && v.at) {
            if (v.attack) drawAttack(ctx, t, v.attack);
            else drawAtMain(ctx, t, v.at);
            if (v.atCount && !v.attack) drawAtCount(ctx, t, t - v.atCount.since, v.atCount.left);
            if (v.atStart) drawAtStart(ctx, t, t - v.atStart.since, v.atStart.games);
        }
        else if (v.battle && v.zencho) drawBattle(ctx, t, v.zencho, v.battle);
        else if (v.zencho && t >= v.zencho.since - 650) drawMiddle(ctx, t, v.zencho);
        else drawFloor(ctx, t, v.stage);
        if (v.zone && v.phase === 'normal' && !(v.battle && v.battle.phase === 'result')) haze(ctx);
        if (v.navi && v.phase === 'normal' && !v.zencho) drawNavi(ctx, v.navi.line, t - v.navi.since);
        // 重ねる演出 (エレベーター → カットイン → フラッシュの順に上へ重ねる)
        const order = ['elevator', 'heaven', 'cutin', 'flash'];
        v.overlays.slice().sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).forEach(o => {
            const since = t - o.since;
            if (since < 0) return;
            if (o.kind === 'elevator') drawElevator(ctx, since, o.from, o.to);
            else if (o.kind === 'cutin') drawCutin(ctx, since, o.color, 'koori', o.line);
            else if (o.kind === 'heaven') drawHeaven(ctx, since, o.who);
            else if (o.kind === 'flash') drawFlash(ctx, since, o.level);
        });
        // 「こおりを狙え」はカットインが抜けてから
        if (v.nerae && !v.overlays.some(o => o.kind === 'cutin')) drawNerae(ctx, t, v.nerae);
        if (v.kakutei) drawAtKakutei(ctx, t, t - v.kakutei.since, v.kakutei.label);
        if (v.bonusEnd) drawBonusEnd(ctx, t, t - v.bonusEnd.since, v.bonusEnd);
        if (v.atEnd) drawAtEnd(ctx, t, t - v.atEnd.since, v.atEnd);
        if (v.tenjo) drawTenjo(ctx, t, t - v.tenjo.since, v.tenjo.who);
        if (v.direct) drawDirect(ctx, t, t - v.direct.since, v.direct.phase);
        if (v.banner) {
            rect(ctx, 0, 70, W, 40, 'rgba(0,0,0,.75)');
            text(ctx, v.banner.text, W / 2, 90, { size: 16, color: v.banner.rainbow ? rainbow(ctx, 60, 0, 260, 0) : '#ffffff', lw: 4 });
        }
        ctx.restore();
    }

    function snapshot() {
        return { button: v.button, nav: v.nav, credit: v.credit, lastPayout: v.lastPayout, phase: v.phase, waitingPush: Boolean(hold && hold.push) };
    }

    return {
        // 内部処理のイベントを受け取る
        receive(e) {
            queue.push(e);
            if (!hold) pump();
        },
        // 最後のリールを止める前に呼ぶ (止まりきるまで、そのゲームの結果を見せない)
        holdForReels() {
            hold = { reels: true };
        },
        reelsSettled() {
            if (hold && hold.reels) {
                hold = null;
                pump();
            }
        },
        // PUSH ボタン
        push() {
            pressing = true;
            if (hold && hold.push === 'attack') {
                attackPush();
                return true;
            }
            if (hold && hold.push) {
                sound.play('push');
                revealBattle();
                return true;
            }
            sound.play('push');
            return false;
        },
        // PUSH ボタンを離した (コオリハンマーの長押しを止める)
        release() {
            pressing = false;
        },
        busy: () => Boolean(hold) || queue.length > 0,
        draw,
        snapshot,
        view: v
    };
}

export { TEAMS };
