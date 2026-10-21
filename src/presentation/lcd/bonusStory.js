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
    { kind: 'キャラ解説', who: 'asahara', name: 'チームASK-3', lines: ['KING.ASAHARA・Mr.SASAKI・Mr.KOTANI。', 'CS城の主 ASAHARA は策略家で、', 'おにおにのライバル。'] },
    { kind: 'キャラ解説', who: 'ueno', name: 'チームお願いマッスル', lines: ['シバター・ウエノーブル・イケキム。', '筋肉の貴族とアイドル盗賊がいる', 'いちばん強いチーム。出たら熱い！'] },
    { kind: 'ステージ解説', stage: 'boss', name: '四天王の階', lines: ['22・33・44・55階には四天王、', '56階には大魔王ASO がいる。', 'ここにいるときは超高確！'] },
    { kind: 'キャラ解説', who: 'goldDog', name: 'ゴールド金面犬', lines: ['摩天楼に住み着いた敵の中で', 'いちばん強い黄金の犬。', '倒せば上乗せがいちばん多い。'] },
    { kind: 'キャラ解説', who: 'maou', name: '大魔王ASO', lines: ['ASOの壺の封印から', 'よみがえった摩天楼の主。', '無から宝や武器を生み出す。'] },
    { kind: 'キャラ解説', who: 'naitei', name: 'ナイナイ・アルアル', lines: ['シーシャ・ナイテイの兄弟。', '天国にいると、カットインで', '教えてくれることがある。'] }
];

// REG は短い版: 主人公・摩天楼・階・中間階層だけ
export const REG_CARDS = BIG_CARDS.filter(c => ['koori', 'onioni'].includes(c.who) || c.stage);

// エピソードBIG の話。scenes は5G ごとに進む場面 (50G で10場面。セリフは長いと折り返し、3行まで)
//   bg: 背景 / cast: 出るキャラ ('id' か { id, hidden: true } = 正体不明の影絵) / who: 話す人 / line: セリフ
//   then: { who, line } か、その配列。同じ場面でセリフのあとに順に出す / cast の drop: true で上から落ちてくる / crowd: 群れで出すキャラ (右側に並ぶ) / chase: true で群れに追いかけ回される
//   brawl: true で大乱戦 (土けむりのまわりで cast がもみ合う) / vs: true で cast の2人がにらみ合い、まんなかに「VS」
//   bg: 'home' (こおりくんの家) / 'town' (夕焼けの町) / 'tower' (摩天楼の前・全体) / 'lobby' (摩天楼1階) / 'middle' (中間階層) / 'boss' (四天王の階) / 'top' (最上階)
export const EPISODES = [
    {
        title: '借金',
        scenes: [
            // 第1話はユーザーが書いた文章 (2026-10-21)
            { bg: 'home', cast: ['koori', 'onioni'], who: 'おにおに', line: 'おいこおり、今月の返済はまだか' },
            { bg: 'home', cast: ['koori', 'onioni'], who: 'こおりくん', line: 'もうちょっとだけ待って！もうちょっとだけ！おねがいおにおに～' },
            { bg: 'home', cast: ['koori', 'onioni'], who: 'おにおに', line: 'たく...仕方ないな。もう少しだけだぞ。破ったらパンツ見せろよ。' },
            { bg: 'home', cast: ['koori', 'onioni'], who: 'こおりくん', line: 'ええ～～～！' },
            { bg: 'home', cast: ['koori', 'tomoishi'], who: 'ともいし', line: 'こおりなにしよっと！' },
            { bg: 'home', cast: ['koori', 'tomoishi'], who: 'こおりくん', line: 'なんとかしないと...！こおり尊厳の危機！' },
            { bg: 'town', cast: ['koori', 'furukawa'], who: 'ふるカワ', line: 'ねえ、こおりくんASO摩天楼って知ってる？' },
            { bg: 'town', cast: ['koori', 'furukawa'], who: 'こおりくん', line: 'ASO摩天楼？なにそれ？' },
            { bg: 'tower', cast: ['koori', 'furukawa'], who: 'ふるカワ', line: 'やまぐっちとおかおかの境目に急に現れたんだって。そこには危ない怪物もいるけど、てっぺんには大量の財宝があるらしいよ！' },
            { bg: 'town', cast: ['koori', 'furukawa'], who: 'こおりくん', line: '財宝...!それなら借金を返せる！こおり生きていける！' }
        ]
    },
    {
        title: '仲間集め',
        scenes: [
            // 第2話はユーザーが書いた文章 (2026-10-21)
            { bg: 'town', cast: ['koori'], who: 'こおりくん', line: 'そうと決まれば仲間集めだ！' },
            { bg: 'town', cast: ['koori', 'yasu'], who: 'こおりくん', line: 'やすさん！急だがじゃんけんだ！' },
            { bg: 'town', cast: ['koori', 'yasu'], who: 'やすさん', line: 'え！？急になんですの！？' },
            { bg: 'town', cast: ['koori', 'yasu'], who: 'こおりくん', line: 'じゃんけんポン！...こおりの勝ち～！というわけで一緒に摩天楼に行くよ！' },
            { bg: 'town', cast: ['koori', 'yasu'], who: 'やすさん', line: 'ええ！？本気で言ってる！？あそこ危ないって噂だよ！？' },
            { bg: 'town', cast: ['koori', 'yasu', 'dake'], who: 'だけさん', line: '話はこの鍛えた地獄耳で聞かせてもらった！' },
            { bg: 'town', cast: ['koori', 'yasu', 'dake'], who: 'だけさん', line: '私もついていくぞ！この鍛え上げたこぶしでなんでもぶっ飛ばしてあげよう！' },
            { bg: 'town', cast: ['koori', 'yasu', 'dake', 'tamu'], who: 'たむさん', line: '俺もついてくよ。面白そうやし。暇つぶしにもなるでしょ。' },
            { bg: 'town', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'おにおに', line: 'こおりが金を返すまで、不安だから俺も見張りでついていくぞ。' },
            { bg: 'tower', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'こおりくん', line: 'よーし！それじゃあチームばりきつよめ！出発だ', then: { who: '全員', line: 'おおーー！' } }
        ]
    },
    {
        title: 'ASO摩天楼',   // 題名は仮 (ユーザーに確認する)
        scenes: [
            // 第3話はユーザーが書いた文章 (2026-10-21)
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'こおりくん', line: 'ここが摩天楼か' },
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'おにおに', line: '気をつけろよ。うわさだと他にも財宝を狙ってここにいるやつらもいるらしいからな。' },
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'だけさん', line: '大丈夫だ！なにがこようと私がたたきつぶしてくれる！' },
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni', { id: 'harry', hidden: true }], who: '？？？', line: 'ハリー！' },
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni', 'harry'], who: 'やすさん', line: 'ん？何今の' },
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], crowd: 'harry', who: 'ハリー', line: 'メンキョナイー！！' },
            // ハリーの群れに追いかけ回される
            { bg: 'lobby', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], crowd: 'harry', chase: true, who: 'こおりくん', line: 'うわああああああ！？' },
            { bg: 'boss', cast: [{ id: 'zumitani', hidden: true }, { id: 'daishi', hidden: true }], who: '？？？', line: '来るものには試練を', then: { who: '？？？', line: '逃げるものには死を' } },
            { bg: 'boss', cast: [{ id: 'runaya', hidden: true }, { id: 'nozoema', hidden: true }], who: '？？？', line: 'このASO四天王が', then: { who: '？？？', line: '貴様らに与えよう' } },
            { bg: 'tower', cast: [{ id: 'daishi', hidden: true }, { id: 'zumitani', hidden: true }, { id: 'runaya', hidden: true }, { id: 'nozoema', hidden: true }], who: '？？？', line: 'さあ、来たれ！挑戦者たちよ！' }
        ]
    },
    {
        title: 'ライバル',   // 題名は前の仮の案のまま (ユーザーに確認する)
        scenes: [
            // 第4話はユーザーが書いた文章 (2026-10-21)
            { bg: 'middle', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'たむさん', line: 'なんとかまいたね' },
            { bg: 'middle', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'こおりくん', line: 'ちょ、ちょっと休憩．．．' },
            { bg: 'middle', cast: [{ id: 'okagappa', hidden: true }], who: '？？？', line: 'あ～らあらあら　ま～えを見れば　こおりいるねおかピポ　イェア！' },
            { bg: 'middle', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni', { id: 'okagappa', hidden: true }], who: 'おにおに', line: '...おまえたちは...' },
            {
                bg: 'middle', cast: ['okagappa', 'hibikimakuri', 'yamamou'], who: 'おかがっぱ', line: 'お宝は俺たちのもの　イェア！',
                then: [{ who: 'ひびきまくり', line: 'ここすっごいひびくよ～' }, { who: 'やまもぅ', line: 'お宝は俺たち５DXのものだ！' }]
            },
            { bg: 'middle', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'こおりくん', line: 'おかがっぱたち！君たちもきてたんだ！' },
            { bg: 'middle', cast: ['okagappa', 'hibikimakuri', 'yamamou'], who: 'ひびきまくり', line: 'ぼくたちだけじゃないよ～。ほかにもお宝を狙ってほかのチームを倒そうとしてるひとたちもいるよ～。' },
            // ウエノーブルが上から落ちてくる
            { bg: 'middle', cast: [{ id: 'ueno', hidden: true, drop: true }], who: '？？？', line: 'そのと～～～～～り！！' },
            {
                bg: 'middle', cast: ['shibata', 'ueno', 'ikekimu'], who: 'ウエノーブル', line: '今やこの摩天楼にいるだれもがライバルなのだ！',
                then: [{ who: 'シバター', line: 'チームが３つ集まった！？良い絵になる予感！んなああ～' }, { who: 'イケキム', line: 'シバター、鳴くな。気が散るだろうが。' }]
            },
            { bg: 'middle', cast: ['shibata', 'ueno', 'ikekimu'], who: 'ウエノーブル', line: 'さあ始めよう！財宝を賭けたデスマッチを！！' }
        ]
    },
    {
        title: '大乱戦',   // 題名は仮 (ユーザーに確認する)
        scenes: [
            // 第5話はユーザーが決めた流れ (2026-10-21) をもとに Claude が書いたセリフ。直してもらう
            // 3チーム (ばりきつよめ・5DX・お願いマッスル) の戦い
            {
                bg: 'middle', brawl: true, cast: ['koori', 'okagappa', 'dake', 'ueno', 'yamamou', 'ikekimu'], who: 'だけさん', line: 'この鍛え上げたこぶしを受けてみろ！',
                then: { who: 'ウエノーブル', line: '甘い！我が筋肉の前では、すべてがそよ風よ！' }
            },
            {
                bg: 'middle', brawl: true, cast: ['tamu', 'hibikimakuri', 'yasu', 'shibata', 'onioni', 'yamamou'], who: 'やまもぅ', line: 'モォーーッ！牛の底力を思い知れ！',
                then: { who: 'イケキム', line: 'チッ…しつこい奴らだ。' }
            },
            // チームASK-3 が乱入
            {
                bg: 'middle', cast: ['sasaki', { id: 'asahara', drop: true }, 'kotani'], who: 'KING.ASAHARA', line: 'フハハハ！ずいぶん楽しそうではないか。財宝は、このCS城の主がいただく！',
                then: [{ who: 'Mr.KOTANI', line: '現在、3チームとも消耗しています。我々の勝率は87.4%です。' }, { who: 'Mr.SASAKI', line: 'よっしゃ！いっちょやったりますか！' }]
            },
            {
                bg: 'middle', cast: ['koori', 'yasu', 'dake', 'tamu', 'onioni'], who: 'おにおに', line: 'ASAHARA…！やはり来ていたか。',
                then: { who: 'こおりくん', line: 'ちょ、ちょっと！？チームが4つになっちゃったよ！？' }
            },
            // 大乱戦
            {
                bg: 'middle', brawl: true, cast: ['koori', 'okagappa', 'sasaki', 'ueno', 'onioni', 'asahara', 'hibikimakuri', 'ikekimu'], who: '全員', line: 'うおおおおおお！！',
                then: [{ who: 'ひびきまくり', line: 'ここすっごいひびくよ～～！' }, { who: 'シバター', line: '4チームの大乱戦！撮れ高しかない！んなああ～' }]
            },
            // こおりくんの提案
            { bg: 'middle', cast: ['koori'], who: 'こおりくん', line: 'みんな、ちょっと待って！！こんなことしてたら、四天王のところに着く前にみんなボロボロだよ！' },
            {
                bg: 'middle', cast: ['koori', 'okagappa', 'ueno', 'asahara'], who: 'こおりくん', line: '財宝はみんなで山分けしよう！それで、みんなで協力して摩天楼のてっぺんを目指すんだ！',
                then: { who: 'Mr.KOTANI', line: '4チームで協力した場合…突破率は大きく上がります。' }
            },
            // 5DX とお願いマッスルは合意
            {
                bg: 'middle', cast: ['okagappa', 'hibikimakuri', 'yamamou', 'shibata', 'ueno', 'ikekimu'], who: 'ウエノーブル', line: '山分けか…よかろう！妻への黄金のネックレスさえ手に入れば、それでよい！',
                then: [{ who: 'おかがっぱ', line: '俺たち5DXも乗ったぜ　イェア！' }, { who: 'やまもぅ', line: '牛は群れで生きる生き物だからな！' }]
            },
            // KING.ASAHARA は拒否
            {
                bg: 'middle', cast: ['sasaki', 'asahara', 'kotani'], who: 'KING.ASAHARA', line: 'くだらん！このワシが、ほかの者と仲良く山分けだと！？ふざけるな！',
                then: { who: 'KING.ASAHARA', line: '…だが、ワシに勝てたら協力してやってもよい。さあ、だれが相手だ？' }
            },
            // おにおにが受けて立つ
            {
                bg: 'middle', vs: true, cast: ['onioni', 'asahara'], who: 'おにおに', line: 'その勝負、SE城の主、このおにおにが受けて立つ！',
                then: { who: 'KING.ASAHARA', line: 'おにおに…！望むところだ！' }
            }
        ]
    }
];
