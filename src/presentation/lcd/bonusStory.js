// =====================================================================
// ボーナス中に流す中身 (画面設計書 4-1・4-2)
// ---------------------------------------------------------------------
// BIG: キャラ解説・ステージ解説を順に出す / REG: BIG の短い版 (主なものだけ)
// エピソードBIG: こおりくんのストーリーとほかのチームの話。引くたびに次の話へ進み、全部見たら1話に戻る。
// 文章はすべて Claude の案 (キャラ設計書・画面設計書をもとに書いた)。直したいところを教えてもらう。
// 期待度には関係しないので、演出側で選ぶ。
// =====================================================================

// キャラ解説・ステージ解説のカード。who: 描くキャラ (ART の id)。stage: ステージの絵 (tower / floor / middle / boss)
export const BIG_CARDS = [
    { kind: 'キャラ解説', who: 'koori', name: 'こおりくん', lines: ['氷のキューブの体を持つ主人公。', 'おにおにに借りたお金を返すため、', 'ASO摩天楼の財宝をねらう。'] },
    { kind: 'キャラ解説', who: 'onioni', name: 'おにおに', lines: ['こおりくんにお金を貸している赤鬼。', '取り立てのためについてきたが、', '戦えばとても頼りになる。'] },
    { kind: 'ステージ解説', stage: 'tower', name: 'ASO摩天楼', lines: ['やまぐっちとおかおかの境目に', '突然現れた塔。上の階ほど敵が強く、', '財宝が眠っているらしい。'] },
    { kind: 'キャラ解説', who: 'yasu', name: 'やすさん', lines: ['チームばりきつよめの仲間。', '眼鏡と青いパーカーがトレードマーク。', 'レア役の上乗せで攻撃する。'] },
    { kind: 'キャラ解説', who: 'tamu', name: 'たむさん', lines: ['チームばりきつよめの仲間。', '赤い帽子と緑のジャケット。', 'レア役の上乗せで攻撃する。'] },
    { kind: 'キャラ解説', who: 'dake', name: 'だけさん', lines: ['チームばりきつよめの仲間。', 'ハチマキとたくましい体。', 'レア役の上乗せで攻撃する。'] },
    { kind: 'ステージ解説', stage: 'floor', name: '1〜10階・11階より上', lines: ['1〜10階は明るいロビー (低確)。', '11階より上は夕方の回廊 (高確)。', '階の表示で状態がわかる！'] },
    { kind: 'キャラ解説', who: 'furukawa', name: 'ふるカワ', lines: ['ステージのナビ役。', '摩天楼のことなら何でも知っている。', '階が変わると教えてくれる。'] },
    { kind: 'キャラ解説', who: 'tomoishi', name: 'ともいし', lines: ['こおりくんのお母さん。', 'パーマ頭の石に黄色いエプロン。', 'こおりくんをいつも見守っている。'] },
    { kind: 'ステージ解説', stage: 'middle', name: '摩天楼 中間階層', lines: ['前兆のときに来る階。', 'ライバルチームとバトルになり、', '倒せばボーナス確定！'] },
    { kind: 'キャラ解説', who: 'okagappa', name: 'チーム5DX', lines: ['おかがっぱ・ひびきまくり・やまもぅ。', 'ライバルの中ではいちばん弱い。', 'ノリと勢いで摩天楼に来た。'] },
    { kind: 'キャラ解説', who: 'asahara', name: 'チームASK-3', lines: ['KING.ASAHARA・Mr.SASAKI・Mr.KOTANI。', 'しご出来のビジネスマンたち。', '財宝で会社を大きくしたい。'] },
    { kind: 'キャラ解説', who: 'ueno', name: 'チームお願いマッスル', lines: ['シバター・ウエノーブル・イケキム。', 'ライバルの中でいちばん強い。', '出てきたら熱い！'] },
    { kind: 'ステージ解説', stage: 'boss', name: '四天王の階', lines: ['22・33・44・55階には四天王、', '56階には大魔王ASO がいる。', 'ここにいるときは超高確！'] },
    { kind: 'キャラ解説', who: 'goldDog', name: 'ゴールド金面犬', lines: ['摩天楼に住み着いた敵の中で', 'いちばん強い黄金の犬。', '倒せば上乗せがいちばん多い。'] },
    { kind: 'キャラ解説', who: 'maou', name: '大魔王ASO', lines: ['56階にいる摩天楼の主。', '大量の金銀財宝を持っている', 'とうわさされている。'] },
    { kind: 'キャラ解説', who: 'naitei', name: 'ナイナイ・アルアル', lines: ['シーシャ・ナイテイの兄弟。', '天国にいると、カットインで', '教えてくれることがある。'] }
];

// REG は短い版: 主人公・摩天楼・階・中間階層だけ
export const REG_CARDS = BIG_CARDS.filter(c => ['koori', 'onioni'].includes(c.who) || c.stage);

// エピソードBIG の話。scenes は順に流れる場面 (bg: 背景 / cast: 出るキャラ [id, 向き] / who: 話す人 / line: セリフ)
//   bg: 'home' (こおりくんの家) / 'town' (夕焼けの町) / 'tower' (摩天楼の前) / 'middle' (中間階層) / 'boss' (四天王の階) / 'top' (最上階)
export const EPISODES = [
    {
        title: '借金',
        scenes: [
            { bg: 'home', cast: ['koori', 'onioni'], who: 'おにおに', line: 'こおり、今月の返済はまだか？' },
            { bg: 'home', cast: ['koori', 'onioni'], who: 'こおりくん', line: 'ご、ごめん…お金がないんだ…' },
            { bg: 'home', cast: ['koori', 'onioni'], who: 'おにおに', line: '3万6千円、利子つきで待ってるぞ' },
            { bg: 'home', cast: ['tomoishi', 'koori'], who: 'ともいし', line: 'こおり、なにしよっと！' },
            { bg: 'home', cast: ['tomoishi', 'koori'], who: 'こおりくん', line: 'なんとかしてお金を作らなきゃ…' }
        ]
    },
    {
        title: 'うわさ',
        scenes: [
            { bg: 'town', cast: ['koori', 'furukawa'], who: 'ふるカワ', line: 'ねえ、ASO摩天楼って知ってる？' },
            { bg: 'tower', cast: ['koori', 'furukawa'], who: 'ふるカワ', line: '山口と福岡の境目に、急に建ったんだって' },
            { bg: 'tower', cast: ['koori', 'furukawa'], who: 'ふるカワ', line: 'てっぺんに大量の財宝があるらしいよ' },
            { bg: 'tower', cast: ['koori', 'furukawa'], who: 'こおりくん', line: '財宝…！それなら借金が返せる！' },
            { bg: 'tower', cast: ['koori', 'furukawa'], who: 'ふるカワ', line: 'でも四天王と大魔王がいるって…' }
        ]
    },
    {
        title: '仲間集め',
        scenes: [
            { bg: 'town', cast: ['koori', 'yasu'], who: 'こおりくん', line: 'やすさん、いっしょに摩天楼へ行こう！' },
            { bg: 'town', cast: ['koori', 'yasu', 'tamu'], who: 'たむさん', line: 'おもしろそうやん、行く行く' },
            { bg: 'town', cast: ['koori', 'yasu', 'tamu', 'dake'], who: 'だけさん', line: '力仕事ならまかせとけ！' },
            { bg: 'town', cast: ['koori', 'yasu', 'tamu', 'dake', 'onioni'], who: 'おにおに', line: '金を返すまで、おれも見張りでついていく' },
            { bg: 'tower', cast: ['dake', 'tamu', 'yasu', 'onioni', 'koori'], who: 'こおりくん', line: 'チームばりきつよめ、出発だ！' }
        ]
    },
    {
        title: 'ライバル',
        scenes: [
            { bg: 'middle', cast: ['okagappa', 'hibikimakuri', 'yamamou'], who: 'おかがっぱ', line: '財宝はノリでいただくっぴ！' },
            { bg: 'middle', cast: ['sasaki', 'asahara', 'kotani'], who: 'KING.ASAHARA', line: '財宝で、わが社をもっと大きくする' },
            { bg: 'middle', cast: ['sasaki', 'asahara', 'kotani'], who: 'Mr.KOTANI', line: '計算では、勝率は 99% です' },
            { bg: 'middle', cast: ['shibata', 'ueno', 'ikekimu'], who: 'ウエノーブル', line: '筋肉こそ、最強の財宝なのだ！' },
            { bg: 'middle', cast: ['koori', 'onioni'], who: 'こおりくん', line: 'みんな強そう…でも負けない！' }
        ]
    },
    {
        title: '四天王',
        scenes: [
            { bg: 'boss', cast: ['daishi'], who: 'ダイシ', line: '22階を通りたくば、修行を積め' },
            { bg: 'boss', cast: ['zumitani'], who: 'ズミタニ', line: '33階…影からおまえを見ている' },
            { bg: 'boss', cast: ['runaya'], who: 'ルナヤ', line: '44階は月の魔法でおもてなし♪' },
            { bg: 'boss', cast: ['nozoema'], who: 'ノゾエマ', line: '55階、この刀を越えてみせよ' },
            { bg: 'top', cast: ['maou'], who: '大魔王ASO', line: '財宝がほしければ、56階まで来るがいい' }
        ]
    }
];
