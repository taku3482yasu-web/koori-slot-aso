// =====================================================================
// 台をつなぐところ (内部処理・演出の進行役・リール・音)
// ---------------------------------------------------------------------
// 内部処理は ../logic/index.js の createMachine だけを使う (本物と入れ替えるときはそこを差しかえる)。
// 操作 (レバー・停止・PUSH) はここを通して内部処理に伝え、内部処理のイベントは進行役 (director) に渡す。
// =====================================================================

import { createMachine, STRIPS } from '../logic/index.js';
import { createDirector } from './lcd/director.js';
import { createReelView } from './reels/reelView.js';
import { Sound } from './sound/sound.js';

const MIN_SPIN_MS = 250;   // レバーから停止ボタンが効くまで

export function createGame({ setting = 1 } = {}) {
    const machine = createMachine({ setting });
    const reels = createReelView(STRIPS);
    const listeners = new Set();
    const notify = () => listeners.forEach(fn => fn());
    const director = createDirector({ sound: Sound, reels, onChange: notify });
    machine.on(e => director.receive(e));

    let stopped = [true, true, true];
    let spunAt = 0;
    let auto = false;
    let autoTimer = 0;

    function lever() {
        Sound.unlock();
        if (director.busy() || reels.anyMoving() || !stopped.every(Boolean)) return false;
        if (!machine.lever()) return false;
        stopped = [false, false, false];
        spunAt = performance.now();
        reels.spin();
        notify();
        return true;
    }

    function stop(reel) {
        Sound.unlock();
        if (stopped[reel] || performance.now() - spunAt < MIN_SPIN_MS) return false;
        const last = stopped.filter(Boolean).length === 2;
        if (last) director.holdForReels();
        const press = reels.pressIndex(reel);
        const top = machine.stop(reel, press);
        if (top === null) return false;
        stopped[reel] = true;
        reels.stopAt(reel, top);
        if (last) reels.whenSettled(() => director.reelsSettled());
        notify();
        return true;
    }

    // レバーか、次の停止 (左から順)
    function next() {
        const i = stopped.indexOf(false);
        if (i >= 0) return stop(i);
        return lever();
    }

    function push() {
        Sound.unlock();
        director.push();
        notify();
    }

    // オート (確認用): 一定の間隔でレバー・停止・PUSH を押す
    function autoStep() {
        if (!auto) return;
        if (director.snapshot().waitingPush) push();
        else next();
        autoTimer = setTimeout(autoStep, 180 + Math.random() * 120);
    }

    // 確認用の URL の指定 (例: ?state=high&zencho=real&team=muscle&auto=1)。docs/presentation.md に一覧がある
    function applyQuery(search) {
        const q = new URLSearchParams(search);
        const d = machine.debug;
        if (q.get('mode')) d.setMode(q.get('mode'));
        if (q.get('state')) d.setState(q.get('state'));
        if (q.get('games')) d.setGames(Number(q.get('games')));
        if (q.get('zencho')) d.startZencho({ real: q.get('zencho') !== 'gase', team: q.get('team'), length: Number(q.get('length')) || 8 });
        if (q.get('ceiling')) d.ceilingSoon();
        if (q.get('direct')) d.direct();
        if (q.get('bonus')) d.bonus(q.get('bonus'));
        if (q.get('role')) d.setNextRole(q.get('role'));
        if (q.get('auto')) setTimeout(() => game.setAuto(true), 300);
    }

    const game = {
        machine,
        director,
        reels,
        lever,
        stop,
        next,
        push,
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        get stopped() { return stopped.slice(); },
        get auto() { return auto; },
        setAuto(on) {
            auto = on;
            clearTimeout(autoTimer);
            if (on) autoStep();
            notify();
        },
        applyQuery
    };
    return game;
}
