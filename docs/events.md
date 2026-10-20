# 内部処理と演出の約束（台の窓口とイベント）

版: v0.1（2026-10-20）

演出（`src/presentation/`）と内部処理（`src/logic/`）は、ここに書いた約束だけでつながっています。
今の `src/logic/` は、演出を確認するための **仮組** です。本物の内部処理を作ったら、`src/logic/` を差しかえてください。この約束がそろっていれば、演出側を直さずに動きます。

- 演出側が読み込むのは `src/logic/index.js` だけです。
- 名前とデータを変えるときは、**このファイルを先に直して**、演出側に知らせてください。

---

## 1. 台の窓口（`createMachine` が返すもの）

```js
import { createMachine, EVENTS, STRIPS, REEL_LENGTH, windowAt } from '../logic/index.js';

const machine = createMachine({ setting: 1 });   // setting: 設定 1〜6
machine.on(event => { /* event.type でイベントの種類を見る */ });
```

| 名前 | 中身 |
|---|---|
| `on(listener)` | イベントを受け取る。`listener({ type, ...データ })`。戻り値を呼ぶと受け取るのをやめる |
| `lever()` | レバー ON（ベットも自動）。回せないときは `false` |
| `stop(reel, press)` | 停止ボタン。`reel` は 0〜2（左・中・右）、`press` は押したときに上段にかかっていた図柄の番号。止まる位置（上段の番号）を返す |
| `snapshot()` | 表示用の状態：`{ credit, invested, paidOut, game, phase, normalGames, spinning, free, bonus, at }` |
| `debug` | 演出の確認用（3章） |

- 内部処理は、止まる位置（すべり）まで決めます。演出側は返ってきた位置までリールを回して止めるだけです。
- `STRIPS` はリール配列 v1.0（各 21コマ、上から順の番号）です。止まる位置 `top` の上段は `STRIPS[reel][top]`、中段は `top+1`、下段は `top+2` です。
- リールは下へ回るので、押してから k コマ滑ると上段は `top - k` になります。

---

## 2. イベント

1ゲームの順番は、次のとおりです。

1. `lever`
2. `notice`（レバーのとき）
3. `reel:stop` × 3
4. `game:end`
5. `notice`（止まったあと）
6. `stage` / `zencho:end` / `bonus:…` など

演出側は、第3停止のリールが止まりきるまで、`game:end` から後を見せません（進行役が待つ）。

### 1ゲーム

| type | データ | いつ |
|---|---|---|
| `lever` | `{ game, phase, free }` | レバー ON。`phase`: `'normal'` `'standby'`（ボーナス図柄をそろえるゲーム）`'bonus'` `'at'` |
| `notice` | `{ kind, timing, … }` | 演出の抽選結果（下の表） |
| `reel:stop` | `{ reel, top, slip, order }` | リールが止まる位置が決まった。`order` は何番目に止めたか |
| `game:end` | `{ cols, win, payout, credit }` | 3つ止まった。`cols[リール][段]` は出目、`win` は中段の入賞（`'bell'` `'replay'` `'big'` `'reg'` `'epbig'` `'koori'` か `null`） |

`notice` の種類（期待度に関わるので、内部処理が抽選します）：

| kind | データ | 見せ方（演出側） |
|---|---|---|
| `sakibare` | `{ timing: 'lever', pitch }` | 先バレ音。`pitch: 'high'` は AT 直撃（高くした音） |
| `flash` | `{ timing: 'afterStop', level }` | レア役のフラッシュ。`level`: `'small'` `'big'` `'rainbow'` |
| `cutin` | `{ timing: 'lever', color }` | 前兆中のカットイン。`color`: `'blue'` `'green'` `'red'` `'gold'` `'rainbow'` |
| `kakutei` | `{ timing: 'afterStop' }` | 確定音 |

### 通常時

| type | データ | いつ |
|---|---|---|
| `stage` | `{ place, floor, state }` | ゲームの終わりに階が変わった。`place`: `'floor'`（階）か `'middle'`（前兆の中間階層）。`state`: `'low'` `'high'` `'super'`（階で状態が確定する） |
| `zone` | `{ active, start }` | 魔天ゾーンに入った・出た（黒い靄） |
| `zencho:start` | `{ team, games, cause }` | 前兆が始まった（本物・ガセは教えない）。`team`: `'fiveDX'` `'ask3'` `'muscle'`、`cause`: `'zone'` `'rare'` `'tenjo'` |
| `zencho:battle` | `{ round, of, final, win, button }` | 前兆の最後の連続演出（1ゲームに1回）。`final` のときだけ `win`（倒せるか）と `button`（PUSH ボタンの色：`'white'` `'blue'` `'red'` `'gold'` `'rainbow'`）が入る |
| `zencho:end` | `{ win, bonus }` | 前兆の終わり |
| `heaven` | `{ who }` | 天国のカットイン（`'naitei'` `'aruaru'`） |
| `tenjo` | `{ who }` | 天井到達。BIG 確定 |
| `at:direct` | `{}` | AT 直撃（このゲームの演出のあと `at:start` が来る） |

### 疑似ボーナス

| type | データ | いつ |
|---|---|---|
| `bonus:standby` | `{ bonus, stock }` | ボーナス確定。次のゲームで図柄がそろう。`bonus`: `'big'` `'reg'` `'epbig'`、`stock`: 残りの 1G連 の数 |
| `bonus:start` | `{ bonus, games }` | ボーナス開始 |
| `bonus:game` | `{ bonus, left }` | ボーナスの1ゲーム |
| `bonus:nerae` | `{ color, win }` | 「こおりを狙え」カットイン |
| `bonus:end` | `{ bonus, at, stock }` | ボーナス終了。`at`: AT へ行く |

### AT（仮組は最小限）

| type | データ | いつ |
|---|---|---|
| `at:start` | `{ games, cause }` | AT 開始。`cause`: `'bonus'` `'direct'` |
| `at:game` | `{ left, nav }` | AT の1ゲーム。`nav`: 押し順 `[リール, …]`（ナビのないゲームは `null`） |
| `at:add` | `{ games, left, attacker, enemy }` | 上乗せ。`attacker`: `'yasu'` `'tamu'` `'dake'` `'onioni'` `'sword'` `'hammer'` `'kill'`、`enemy`: キャラの id |
| `at:end` | `{ games, payout }` | AT 終了 |

---

## 3. デバッグ（`machine.debug`）

演出の確認に使います。本物の内部処理にも同じものを用意してください（仕様書「演出確認用のデバッグ機能」）。

| 名前 | 中身 |
|---|---|
| `internal()` | 内部の状態（モード・ステート・当たるところ・前兆・ストック）。デバッグ画面に出すだけ |
| `setNextRole(role)` | 次のゲームの役（`'none'` `'bell'` `'replay'` `'weakCherry'` `'strongCherry'` `'midCherry'` `'weakSuika'` `'strongSuika'` `'chance'`） |
| `setState(state)` / `setMode(mode)` / `setGames(n)` | ステート・モード・ゲーム数を変える |
| `startZencho({ real, team, length })` | 前兆を始める |
| `ceilingSoon()` | 天井の5G前にする |
| `direct()` | 次のゲームで AT 直撃 |
| `bonus(type)` | ボーナス確定にする |
| `heaven(who)` | 天国のカットインを出す |

---

## 4. 仮組の内部処理について

- 仕様書の表（モード・ゾーン・ステート・レア役の当選率・ボーナスの振り分けなど）は写してあります。
- 決まっていない値は「仮」です（`src/logic/config.js` の【仮】）。
- ボーナス・AT は、ゲーム数を消化して戻るだけの最小限です。
- 仕様書のチャンス目A は、リール配列 v1.0 だと中段にリプレイが並びます（仕様書の確認待ち。仮組ではリプレイとして次のゲームを無料にしている）。
