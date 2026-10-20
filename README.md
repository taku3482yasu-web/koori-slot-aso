# こおりくんの大冒険～最凶のASO摩天楼への挑戦～

ゲーム数上乗せ型の AT 機（純増 約3枚、設定 1〜6）。React + Vite。

- **演出・見た目**（`src/presentation/`）：こちらで作っている
- **内部処理**（`src/logic/`）：今は演出を確認するための**仮組**。本物ができたら差しかえる

## 遊び方・確認のしかた

```sh
npm install
npm run dev        # http://localhost:5173 を開く
npm test           # 内部処理（仮組）のテスト
npm run build      # dist/ に作る（Railway は npm run build → npm start）
node tools/build-design.mjs   # 画面設計書・キャラ設計書のページ（docs/design.html）を作り直す
```

| 操作 | キー | 画面 |
|---|---|---|
| レバー（ベットも自動）・左から順に停止 | Space / Enter | リールをタップ |
| 停止（左・中・右） | Z X C、← ↓ → | 丸い停止ボタン |
| PUSH | B | PUSH ボタン |
| デバッグを出す・しまう | D | 「デバッグ」 |

デバッグ画面の機能：
- 内部の状態（モード・ステート・当たるところ・前兆）を見る
- 次のゲームの役を決める
- 前兆（本物・ガセ、相手チーム）・天井・AT 直撃・天国カットイン・ボーナスを起こす
- オートで回す

### 確認用の URL

URL に付けると、その状態から始まります（組み合わせられます）。

| 指定 | 中身 |
|---|---|
| `?state=high` | ステート（`low` `high` `super`） |
| `?mode=heaven` | モード（`A` `B` `C` `D` `heaven` `superHeaven`） |
| `?games=197` | 通常時のゲーム数 |
| `?zencho=real&team=muscle&length=5` | 前兆を始める（`real` / `gase`、チームは `fiveDX` `ask3` `muscle`） |
| `?ceiling=1` | 天井の5G前から |
| `?direct=1` | 最初のゲームで AT 直撃 |
| `?role=strongCherry` | 最初のゲームの役 |
| `?bonus=big` | ボーナス確定から |
| `?auto=1` | オートで回す |

## 作ってあるもの（2026-10-20）

**通常時**（画面設計書 3章）：
- 階のステージ：1〜10階・11階以上（夕方）・四天王の階・大魔王の間
- 状態が変わったときのエレベーターと、ふるカワのナビ
- 魔天ゾーンの黒い靄、天国のカットイン（ナイナイ・アルアル）
- 前兆：中間階層でライバルチームと対決 → 連続演出 → 「決着！」で PUSH → 撃破（ボーナス確定・狙え）／撃破ならず
- 前兆中のカットイン（青・緑・赤・金・虹）、レア役のフラッシュ・先バレ音・確定音
- PUSH ボタンの色・飛び出し
- 天井到達（ナイナイ・アルアル → BIG 確定）
- AT 直撃（高い先バレ音 → ノイズ → 暗転 → こおりいきていける！）
- BGM（階ごと・前兆）と効果音

**これから**：ボーナス中・AT・特化ゾーンの演出（今は仮の画面）。

## フォルダ

| 場所 | 中身 |
|---|---|
| `src/logic/` | 内部処理（仮組）。演出側が読むのは `index.js` だけ |
| `src/presentation/` | 演出：`App.jsx`（画面全体）・`game.js`（つなぐところ）・`lcd/`（液晶）・`reels/`（リール）・`sound/`（音）・`art/`（ドット絵）・`components/`（筐体・デバッグ） |
| `docs/events.md` | **内部処理と演出の約束**（台の窓口とイベント）。合体するときはここをそろえる |
| `docs/screen-design.md`・`docs/characters.md` | 画面設計書・キャラ設計書（絵つきは `docs/design.html`） |
| `tools/design/` | 設計書の画面イメージ |
| `tests/` | テスト |

## 内部処理と合体するには

1. 本物の内部処理を `src/logic/` に置き、`src/logic/index.js` から `createMachine` `EVENTS` `STRIPS` `REEL_LENGTH` `windowAt` を出す。
2. `createMachine` が返すもの（`on` `lever` `stop` `snapshot` `debug`）と、イベントの名前・データを `docs/events.md` にそろえる。
3. `npm run dev` で動かし、デバッグ画面で前兆・天井・AT 直撃などを起こして確認する。

演出側（`src/presentation/`）は、内部処理の中身を見ないで、イベントだけで動いています。
