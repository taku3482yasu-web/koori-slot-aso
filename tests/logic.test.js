// 仮組の内部処理のテスト (node --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMachine, EVENTS, REEL_LENGTH } from '../src/logic/index.js';
import { SHAPES, combosFor, createReelControl } from '../src/logic/reelControl.js';
import { gridAt, middleWin } from '../src/logic/reels.js';
import { createRng } from '../src/logic/rng.js';

// 1ゲーム回す (押す位置はでたらめ、押し順もでたらめ)
function play(m, rng) {
    assert.ok(m.lever());
    const order = rng.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]);
    order.forEach(reel => m.stop(reel, rng.int(0, REEL_LENGTH - 1)));
}

test('どの出目の形も、どこを押しても作れる', () => {
    const rng = createRng(1);
    for (const shape of Object.keys(SHAPES)) {
        assert.ok(combosFor(shape).length > 0, shape);
        for (let i = 0; i < 200; i++) {
            const ctrl = createReelControl(shape);
            const order = rng.pick([[0, 1, 2], [2, 1, 0], [1, 0, 2]]);
            order.forEach(reel => ctrl.stop(reel, rng.int(0, 20)));
            assert.ok(SHAPES[shape](gridAt(ctrl.tops)), shape);
        }
    }
});

test('ベル・リプレイ・ボーナスは中段にそろう', () => {
    for (const [shape, win] of [['bell', 'bell'], ['replay', 'replay'], ['big', 'big'], ['reg', 'reg'], ['epbig', 'epbig'], ['koori', 'koori']]) {
        const ctrl = createReelControl(shape);
        [0, 1, 2].forEach(reel => ctrl.stop(reel, 7));
        assert.equal(middleWin(gridAt(ctrl.tops)), win);
    }
});

test('通常時を長く回しても止まらず、前兆・ボーナス・AT が起きる', () => {
    const m = createMachine({ setting: 1, seed: 42 });
    const rng = createRng(7);
    const count = {};
    m.on(e => { count[e.type] = (count[e.type] || 0) + 1; });
    for (let i = 0; i < 60000; i++) play(m, rng);
    for (const type of [EVENTS.ZENCHO_START, EVENTS.ZENCHO_END, EVENTS.BONUS_START, EVENTS.BONUS_END, EVENTS.STAGE, EVENTS.ZONE, EVENTS.AT_START, EVENTS.AT_END]) {
        assert.ok(count[type] > 0, `${type} が起きない`);
    }
    // 前兆は必ず終わる
    assert.ok(Math.abs(count[EVENTS.ZENCHO_START] - count[EVENTS.ZENCHO_END]) <= 1);
});

test('前兆の最後のバトルは、本物なら勝ち・ガセなら負け', () => {
    for (const real of [true, false]) {
        const m = createMachine({ seed: 3 });
        const rng = createRng(5);
        let final = null;
        let end = null;
        m.on(e => {
            if (e.type === EVENTS.ZENCHO_BATTLE && e.final) final = e;
            if (e.type === EVENTS.ZENCHO_END && !end) end = e;
        });
        m.debug.setGames(5);
        m.debug.startZencho({ real, length: 6 });
        for (let i = 0; i < 6; i++) {
            m.debug.setNextRole('none');
            play(m, rng);
        }
        assert.equal(final.win, real);
        assert.equal(end.win, real);
    }
});

test('天井はちょうどの G で当たり、BIG になる', () => {
    const m = createMachine({ seed: 9 });
    const rng = createRng(2);
    let standby = null;
    let tenjo = false;
    m.on(e => {
        if (e.type === EVENTS.TENJO) tenjo = true;
        if (e.type === EVENTS.BONUS_STANDBY && !standby) standby = e;
    });
    m.debug.ceilingSoon();
    for (let i = 0; i < 10 && !standby; i++) {
        m.debug.setNextRole('none');
        play(m, rng);
    }
    assert.ok(tenjo);
    assert.equal(standby.bonus, 'big');
});

test('AT 直撃 (デバッグ) で AT が始まる', () => {
    const m = createMachine({ seed: 11 });
    const rng = createRng(4);
    let start = null;
    m.on(e => { if (e.type === EVENTS.AT_START) start = e; });
    m.debug.direct();
    play(m, rng);
    assert.equal(start.cause, 'direct');
    assert.equal(m.snapshot().phase, 'at');
});
