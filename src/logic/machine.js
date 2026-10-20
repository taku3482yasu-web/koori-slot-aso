// =====================================================================
// 台の内部処理 (仮組)
// ---------------------------------------------------------------------
// 演出の確認のための仮の内部処理。通常時 (モード・ゾーン・ステート・前兆・天井・AT直撃) は仕様書に沿って動き、
// ボーナス・AT は最小限 (ゲーム数を消化して戻る) だけ作ってある。
// 本物の内部処理と入れ替えるときは、createMachine が返すもの (下の「台の窓口」) とイベント (events.js) をそろえればよい。
// =====================================================================

import { CONFIG } from './config.js';
import { EVENTS as E } from './events.js';
import { createRng } from './rng.js';
import { createReelControl } from './reelControl.js';
import { gridAt, middleWin } from './reels.js';

const RARE = ['weakCherry', 'strongCherry', 'midCherry', 'weakSuika', 'strongSuika', 'chance'];
const BOSS_FLOORS = { 22: 30, 33: 25, 44: 20, 55: 15, 56: 10 };
const TEAMS = ['fiveDX', 'ask3', 'muscle'];

export function createMachine({ setting = 1, seed = Date.now(), config = CONFIG } = {}) {
    const rng = createRng(seed);
    const listeners = new Set();
    const emit = (type, data = {}) => listeners.forEach(fn => fn({ ...data, type }));

    const s = {
        setting,
        credit: 50,
        invested: 50,
        paidOut: 0,
        game: 0,
        free: false,
        phase: 'normal',
        normalGames: 0,
        mode: rng.weighted(config.initialMode),
        state: 'low',
        guard: 0,
        plan: null,
        zencho: null,
        zone: null,
        stock: [],
        bonus: null,
        at: null,
        tokka: null,        // 特化ゾーンの途中: { set, game, hit, guarantee, rate, total }
        tokkaStock: 0,      // 持っている特化ゾーンの数
        tokkaWon: false,    // このゲームで特化ゾーンに当たった (ゲームの終わりで告知する)
        floor: 1,
        place: 'floor',
        // 1ゲームの途中の情報
        spin: null,
        // デバッグ: 次のゲームの役・AT 直撃
        forcedRole: null,
        forceDirect: false,
        pendingAt: false
    };
    s.plan = makePlan(s.mode);

    // ----- 抽選の道具 -----
    function makePlan(mode) {
        const m = config.modes[mode];
        const key = rng.weighted(m.zones);
        const length = rng.int(...config.zenchoLength);
        if (key === 'ceiling') return { kind: 'ceiling', start: m.ceiling - length, length };
        return { kind: 'zone', start: Number(key), length };
    }

    // そのモードの、ガセも含めた前兆が始まるゾーンの開始G
    function zoneStarts(mode) {
        return Object.keys(config.modes[mode].zones).filter(k => k !== 'ceiling').map(Number);
    }

    function drawRole(table, boost) {
        const r = rng.next();
        let acc = 0;
        for (const [role, x] of Object.entries(table)) {
            const rare = RARE.includes(role);
            acc += (1 / x) * (rare ? boost : 1);
            if (r < acc) return role;
        }
        return 'none';
    }

    function bonusType(mode) {
        return rng.weighted(config.bonusSplit[mode]);
    }

    function shapeFor(role) {
        const v = config.variants[role];
        return v ? rng.pick(v) : role;
    }

    // ----- 階 (ステージ) -----
    function pickFloor() {
        if (s.state === 'super') return Number(rng.weighted(BOSS_FLOORS));
        if (s.state === 'high') {
            let f;
            do f = rng.int(11, 54); while (BOSS_FLOORS[f]);
            return f;
        }
        return rng.int(1, 10);
    }

    function floorFits(floor) {
        if (s.state === 'super') return Boolean(BOSS_FLOORS[floor]);
        if (s.state === 'high') return floor >= 11 && !BOSS_FLOORS[floor];
        return floor >= 1 && floor <= 10;
    }

    // ゲームの終わりに階を合わせる (状態が変わったとき・ときどき)
    function updateStage() {
        const place = s.zencho ? 'middle' : 'floor';
        let floor = s.floor;
        if (!floorFits(floor) || (place === 'floor' && rng.chance(1 / 20))) floor = pickFloor();
        if (place !== s.place || floor !== s.floor) {
            s.place = place;
            s.floor = floor;
            emit(E.STAGE, { place, floor, state: place === 'middle' ? null : s.state });
        }
    }

    function setState(next) {
        s.state = next;
        s.guard = next === 'high' ? config.stateFall.high.guard : next === 'super' ? config.stateFall.super.guard : 0;
    }

    // ----- 前兆 -----
    function startZencho({ real, cause, length, bonus = null }) {
        const key = real ? 'real' : 'gase';
        s.zencho = {
            real,
            cause,
            left: length,
            bonus,
            team: cause === 'tenjo' ? 'muscle' : rng.weighted(config.show.team[key]),
            rounds: Number(rng.weighted(config.show.rounds[key])),
            button: rng.weighted(config.show.button[key])
        };
        emit(E.ZENCHO_START, { team: s.zencho.team, games: length, cause });
    }

    function makeReal(zencho, bonus) {
        zencho.real = true;
        zencho.bonus = bonus;
        // 本物になったので、最後の演出を当たりの流れで抽選し直す
        zencho.rounds = Math.max(zencho.rounds, Number(rng.weighted(config.show.rounds.real)));
        zencho.button = rng.weighted(config.show.button.real);
    }

    // ボーナス当選 (前兆の終わり・天井)。モード移行とゲーム数のリセットはここで行う (仕様書)
    function winBonus(type) {
        s.mode = rng.weighted(config.modeMove[s.mode]);
        s.normalGames = 0;
        s.plan = makePlan(s.mode);
        s.phase = 'standby';
        s.bonus = { type, left: 0, atWon: false, nerae: false };
        emit(E.BONUS_STANDBY, { bonus: type, stock: s.stock.length });
    }

    // ----- 1ゲーム -----
    function normalGame(role) {
        s.normalGames++;
        const notices = [];
        const g = s.normalGames;

        // ゾーンの開始 (ガセを含めて必ず前兆に入る) と天井
        const plan = s.plan;
        if (plan.kind === 'ceiling' && g === plan.start + 1) {
            if (!s.zencho) {
                startZencho({ real: true, cause: 'tenjo', length: plan.length, bonus: 'big' });
            } else {
                // 前兆の途中で天井の前兆の始まりに来たら、その前兆を天井の前兆にする (ちょうど天井で当たる)
                makeReal(s.zencho, 'big');
                s.zencho.cause = 'tenjo';
                s.zencho.left = plan.length;
            }
        } else if (zoneStarts(s.mode).some(z => g === z + 1)) {
            const start = g - 1;
            const planned = plan.kind === 'zone' && plan.start === start;
            if (!s.zencho) {
                s.zone = { start };
                emit(E.ZONE, { active: true, start });
                startZencho({
                    real: planned,
                    cause: 'zone',
                    length: planned ? plan.length : rng.int(...config.zenchoLength),
                    bonus: planned ? bonusType(s.mode) : null
                });
            } else if (planned) {
                if (!s.zencho.real) makeReal(s.zencho, bonusType(s.mode));
                else s.stock.push(bonusType(s.mode));
            }
            if (start === 50 && s.mode === 'heaven') emit(E.HEAVEN, { who: rng.chance(config.show.aruaruShare) ? 'aruaru' : 'naitei' });
        }

        // 天国のカットイン
        if ((s.mode === 'heaven' || s.mode === 'superHeaven') && rng.chance(config.show.heavenCutinRate)) {
            emit(E.HEAVEN, { who: rng.chance(config.show.aruaruShare) ? 'aruaru' : 'naitei' });
        }

        // レア役
        if (RARE.includes(role)) {
            const won = rng.chance(config.rareBonus[s.state][role] / 100);
            if (won) {
                const type = role === 'weakSuika' ? 'epbig' : bonusType(s.mode);
                if (s.zencho && s.zencho.real) s.stock.push(type);
                else if (s.zencho) makeReal(s.zencho, type);
                else startZencho({ real: true, cause: 'rare', length: rng.int(...config.zenchoLength), bonus: type });
            } else if (s.state !== 'super') {
                const up = config.stateUp[s.state][role] || 0;
                if (rng.chance(up / 100)) setState(s.state === 'low' ? 'high' : 'super');
            }
            if (rng.chance(config.show.sakibare[role] || 0)) notices.push({ kind: 'sakibare', timing: 'lever', pitch: 'normal' });
            if (rng.chance(config.show.flashRate) || role === 'midCherry') notices.push({ kind: 'flash', timing: 'afterStop', level: config.show.flash[role] });
            if (role === 'midCherry') notices.push({ kind: 'kakutei', timing: 'afterStop' });
        }

        // ハズレで転落
        if (s.state !== 'low') {
            if (s.guard > 0) s.guard--;
            if (role === 'none') {
                const p = s.zencho && s.zencho.real ? config.stateFall.zenchoFall : s.guard === 0 ? config.stateFall[s.state].fall : 0;
                if (rng.chance(p / 100)) setState('low');
            }
        }

        // AT 直撃 (リプレイのごく一部)
        let direct = false;
        if (role === 'replay' && (s.forceDirect || (!s.zencho && rng.chance(config.directRate)))) {
            direct = true;
            s.forceDirect = false;
            emit(E.DIRECT);
            notices.push({ kind: 'sakibare', timing: 'lever', pitch: 'high' });
        }

        // 前兆の進み
        let zenchoEnd = null;
        if (s.zencho) {
            const z = s.zencho;
            z.left--;
            if (z.left < z.rounds) {
                const round = z.rounds - z.left;
                const final = z.left === 0;
                emit(E.ZENCHO_BATTLE, { round, of: z.rounds, final, win: final ? z.real : null, button: final ? z.button : null });
            } else if (rng.chance(config.show.cutinRate)) {
                notices.push({ kind: 'cutin', timing: 'lever', color: rng.weighted(config.show.cutin[z.real ? 'real' : 'gase']) });
            }
            if (z.left === 0) zenchoEnd = z;
        }

        return { notices, direct, zenchoEnd };
    }

    function finishNormal(result) {
        const z = result.zenchoEnd;
        if (z) {
            s.zencho = null;
            if (s.zone) {
                s.zone = null;
                emit(E.ZONE, { active: false });
            }
            emit(E.ZENCHO_END, { win: z.real, bonus: z.real ? z.bonus : null });
            if (z.real) {
                if (z.cause === 'tenjo') emit(E.TENJO, { who: rng.chance(config.show.tenjoAruaru) ? 'aruaru' : 'naitei' });
                winBonus(z.bonus);
            }
        }
        if (result.direct) startAt('direct');
        if (s.phase === 'normal') updateStage();
    }

    // ----- ボーナス (仮組の最小限) -----
    function bonusGame(role) {
        const b = s.bonus;
        b.left--;
        if (!b.atWon && RARE.concat('bell').includes(role) && rng.chance((config.bonusAt[role] || 0) / 100)) b.atWon = true;
        emit(E.BONUS_GAME, { bonus: b.type, left: b.left });
    }

    function finishBonus() {
        const b = s.bonus;
        if (b.left > 0) return;
        const at = b.atWon || b.type === 'epbig';
        emit(E.BONUS_END, { bonus: b.type, at, stock: s.stock.length });
        s.bonus = null;
        if (s.stock.length) {
            s.phase = 'standby';
            const type = s.stock.shift();
            s.bonus = { type, left: 0, atWon: false, nerae: false };
            s.pendingAt = s.pendingAt || at;
            emit(E.BONUS_STANDBY, { bonus: type, stock: s.stock.length });
            return;
        }
        if (at || s.pendingAt) {
            s.pendingAt = false;
            startAt('bonus');
            return;
        }
        s.phase = 'normal';
        updateStage();
    }

    // ----- AT (仮組の最小限) -----
    function startAt(cause) {
        s.phase = 'at';
        s.at = { left: config.at.games, total: config.at.games, payout: 0 };
        emit(E.AT_START, { games: config.at.games, cause });
    }

    function atGame(role) {
        const a = s.at;
        a.left--;
        const nav = role === 'bell' ? rng.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) : null;
        emit(E.AT_GAME, { left: a.left, nav });
        if (RARE.includes(role)) {
            // 特化ゾーン (仕様書: レア役はボーナス・特化ゾーン・直接上乗せのどれか1つ。仮組はボーナスなし)
            if (rng.chance((config.tokka.rate[role] || 0) / 100)) {
                s.tokkaWon = true;
                return;
            }
            const add = Number(rng.weighted(config.at.addTable));
            a.left += add;
            a.total += add;
            emit(E.AT_ADD, { games: add, left: a.left, ...attackFor(add) });
        }
    }

    // 上乗せの見せ方 (画面設計書 5-2 の案: 上乗せが大きいほど強い攻撃・強い相手)
    function attackFor(games) {
        if (games <= 30) return { attacker: rng.pick(['yasu', 'tamu', 'dake']), enemy: 'harry' };
        if (games <= 50) return { attacker: 'onioni', enemy: 'urashima' };
        if (games <= 100) return { attacker: 'sword', enemy: 'makibikon' };
        if (games <= 300) return { attacker: 'hammer', enemy: 'nakata' };
        return { attacker: 'kill', enemy: 'goldDog' };
    }

    function finishAt() {
        // 特化ゾーンのストックがあれば、次のゲームから特化ゾーン (AT のゲーム数が 0 でも)
        if (s.tokkaStock > 0) {
            startTokka();
            return;
        }
        if (s.at.left > 0) return;
        emit(E.AT_END, { games: s.at.total, payout: s.at.payout });
        s.at = null;
        s.phase = 'normal';
        updateStage();
    }

    // ----- 上乗せ特化ゾーン (仕様書。仮組は最小限: ボーナスのストックなし・ステートは見ない) -----
    function startTokka() {
        s.tokkaStock--;
        s.tokka = { set: 1, game: 0, hit: false, guarantee: 0, rate: Number(rng.weighted(config.tokka.contTable)), total: 0 };
        emit(E.TOKKA_START, { stock: s.tokkaStock });
    }

    function tokkaRole() {
        const r = config.tokka.roles;
        if (rng.chance(1 / r.rare)) return rng.pick(RARE);
        if (rng.chance(1 / r.replay)) return 'replay';
        if (rng.chance(1 / r.bell)) return 'bell';
        return 'none';
    }

    function tokkaGame(role) {
        const t = s.tokka;
        const cfg = config.tokka;
        t.game++;
        const add = Number(rng.weighted(cfg.addTable[role] || cfg.addTable.none));
        t.total += add;
        s.at.left += add;
        s.at.total += add;
        if (role === 'replay' || RARE.includes(role)) t.hit = true;
        t.guarantee += cfg.guarantee[role] || 0;
        // 特化ゾーン中も、レア役で特化ゾーンを抽選する (終わったら続けて始める)
        if (RARE.includes(role) && rng.chance((cfg.rate[role] || 0) / 100)) s.tokkaWon = true;
        emit(E.TOKKA_GAME, { set: t.set, game: t.game, add, guarantee: t.guarantee });
    }

    // セットの終わり: 継続確定 → リプレイ以上を引いた → 継続率テーブル (復活) の順に見る
    function finishTokkaGame() {
        const t = s.tokka;
        if (t.game < config.tokka.setGames) return;
        let cont = false;
        let revive = false;
        if (t.guarantee > 0) {
            t.guarantee--;
            cont = true;
        } else if (t.hit) cont = true;
        else if (rng.chance(t.rate / 100)) {
            cont = true;
            revive = true;
        }
        emit(E.TOKKA_SET, { set: t.set, cont, revive });
        if (cont) {
            t.set++;
            t.game = 0;
            t.hit = false;
            return;
        }
        emit(E.TOKKA_END, { total: t.total, sets: t.set, left: s.at.left });
        s.tokka = null;
        if (s.tokkaStock > 0) startTokka();
    }

    // ----- 台の窓口 -----
    return {
        on(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },

        // レバー ON (ベットも自動)。回せないときは false
        lever() {
            if (s.spin) return false;
            if (!s.free) {
                if (s.credit < config.bet) {
                    s.credit += 50;
                    s.invested += 50;
                }
                s.credit -= config.bet;
            }
            const free = s.free;
            s.free = false;
            s.game++;
            emit(E.LEVER, { game: s.game, phase: s.phase, free });

            let role;
            let shape;
            let result = null;
            if (s.phase === 'standby') {
                role = 'bonusAlign';
                shape = s.bonus.type;
            } else if (s.phase === 'bonus') {
                role = s.forcedRole || drawRole(config.bonusRoles, 1);
                if (s.bonus.atWon && !s.bonus.nerae) {
                    s.bonus.nerae = true;
                    emit(E.BONUS_NERAE, { color: rng.weighted(config.show.cutin.real), win: true });
                    shape = 'koori';
                }
                bonusGame(role);
            } else if (s.phase === 'at' && s.tokka) {
                role = s.forcedRole || tokkaRole();
                tokkaGame(role);
            } else if (s.phase === 'at') {
                role = s.forcedRole || (rng.chance(1 / config.at.rareRate) ? rng.pick(RARE) : rng.chance(1 / config.at.bellRate) ? 'bell' : 'none');
                atGame(role);
            } else {
                const boost = 1 + config.rareBoost * (s.setting - 1);
                role = s.forcedRole || drawRole(config.roles, boost);
                result = normalGame(role);
                result.notices.forEach(n => { if (n.timing === 'lever') emit(E.NOTICE, n); });
            }
            s.forcedRole = null;
            if (!shape) shape = role === 'none' ? 'none' : shapeFor(role);
            s.spin = { role, shape, control: createReelControl(shape), order: [], result };
            return true;
        },

        // 停止ボタン。press: 押したときに上段にあった番号。止まった位置 (上段の番号) を返す
        stop(reel, press) {
            const spin = s.spin;
            if (!spin || spin.order.includes(reel)) return null;
            const { top, slip } = spin.control.stop(reel, press);
            spin.order.push(reel);
            emit(E.REEL_STOP, { reel, top, slip, order: spin.order.length });
            if (spin.order.length === 3) endGame();
            return top;
        },

        snapshot() {
            return {
                credit: s.credit,
                invested: s.invested,
                paidOut: s.paidOut,
                game: s.game,
                phase: s.phase,
                normalGames: s.normalGames,
                spinning: Boolean(s.spin),
                free: s.free,
                bonus: s.bonus && { type: s.bonus.type, left: s.bonus.left },
                at: s.at && { left: s.at.left, total: s.at.total }
            };
        },

        // ----- デバッグ (演出の確認用。本物の内部処理にも同じものを用意してもらう) -----
        debug: {
            internal: () => ({
                setting: s.setting,
                mode: s.mode,
                state: s.state,
                guard: s.guard,
                plan: { ...s.plan },
                zencho: s.zencho && { ...s.zencho },
                stock: s.stock.slice(),
                floor: s.floor,
                tokka: s.tokka && { ...s.tokka },
                tokkaStock: s.tokkaStock
            }),
            setNextRole: role => { s.forcedRole = role; },
            setState: state => { setState(state); updateStage(); },
            setMode: mode => { s.mode = mode; s.plan = makePlan(mode); },
            setGames: n => { s.normalGames = n; },
            // 前兆を始める (real: 本物か / team: 相手チーム / length: ゲーム数)
            startZencho: ({ real = true, team = null, length = 8 } = {}) => {
                if (s.phase !== 'normal' || s.zencho) return;
                startZencho({ real, cause: 'zone', length, bonus: real ? bonusType(s.mode) : null });
                if (team && TEAMS.includes(team)) s.zencho.team = team;
                updateStage();
            },
            ceilingSoon: () => {
                const ceiling = config.modes[s.mode].ceiling;
                s.plan = { kind: 'ceiling', start: ceiling - 5, length: 5 };
                s.normalGames = ceiling - 6;
            },
            direct: () => { s.forcedRole = 'replay'; s.forceDirect = true; },
            bonus: type => { if (s.phase === 'normal' && !s.zencho) winBonus(type); },
            heaven: who => emit(E.HEAVEN, { who }),
            // 特化ゾーンをストックする (AT 中だけ。次のゲームの終わりで告知)
            tokka: () => { if (s.phase === 'at') s.tokkaWon = true; }
        }
    };

    function endGame() {
        const spin = s.spin;
        const cols = gridAt(spin.control.tops);
        const win = middleWin(cols);
        const payout = config.payout[spin.role] || 0;
        if (spin.role === 'replay' || (spin.shape === 'chanceA' && win === 'replay')) s.free = true;
        s.credit += payout;
        s.paidOut += payout;
        if (s.at) s.at.payout += payout;
        emit(E.GAME_END, { cols, win, payout, credit: s.credit });
        if (spin.result) spin.result.notices.forEach(n => { if (n.timing === 'afterStop') emit(E.NOTICE, n); });
        s.spin = null;

        if (s.phase === 'standby') {
            s.phase = 'bonus';
            s.bonus.left = config.bonusGames[s.bonus.type];
            emit(E.BONUS_START, { bonus: s.bonus.type, games: s.bonus.left });
        } else if (s.phase === 'bonus') finishBonus();
        else if (s.phase === 'at') {
            if (s.tokkaWon) {
                s.tokkaWon = false;
                s.tokkaStock++;
                emit(E.TOKKA_STOCK, { stock: s.tokkaStock });
            }
            if (s.tokka) finishTokkaGame();
            else finishAt();
        }
        else finishNormal(spin.result);
    }
}
