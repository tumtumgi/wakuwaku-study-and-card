document.addEventListener('DOMContentLoaded', async () => {
    let currentGrade = 1;
    let currentSubject = 'japanese';
    let currentMode = 'normal';
    let timeAttackSeconds = 60;
    let timeAttackPackReward = 2;

    // 累計データ
    let totalCoins = 0;
    let totalPacks = 0;
    // 今回獲得用（結果画面での計算用）
    let sessionCoins = 0;
    let sessionPacks = 0;

    let questions = [];
    let currentIndex = 0;
    let score = 0;

    // タイマー管理用
    let timerInterval = null;
    let remainingTime = 0;

    // ==========================================
    // 音声ファイルの読み込みとBGM制御
    // ==========================================
    // ホーム画面と連動するためのミュート設定
    let isBGMMuted = localStorage.getItem('bgmMuted') === 'true';

    // BGMの音量を下げてSEを目立たせる
    const bgmNormal = new Audio('bgm/Notes_from_the_Study.mp3');
    bgmNormal.loop = true;
    bgmNormal.volume = 0.3; // 音量を30%に

    const bgmTA = new Audio('bgm/Seconds_Left.mp3');
    bgmTA.loop = true;
    bgmTA.volume = 0.3;     // 音量を30%に

    const correctSound = new Audio('bgm/reversed_chime.wav');
    correctSound.volume = 1.0;
    const wrongSound = new Audio('bgm/quiz_buzzer_extended.wav');
    wrongSound.volume = 1.0;

    window.toggleBGM = function() {
        isBGMMuted = !isBGMMuted;
        localStorage.setItem('bgmMuted', isBGMMuted ? 'true' : 'false');
        updateBGMButton();
        if (isBGMMuted) {
            stopBGM();
        } else {
            // クイズ画面が表示されている場合のみBGMを再開
            const quizScreen = document.getElementById('quiz-screen');
            if (quizScreen && quizScreen.style.display === 'block') {
                playBGM(currentMode);
            }
        }
    };

    function updateBGMButton() {
        const btn = document.getElementById('bgm-toggle-btn');
        if (btn) {
            btn.textContent = isBGMMuted ? '🔇' : '🔊';
        }
    }

    function playBGM(mode) {
        stopBGM(); 
        if (isBGMMuted) return; // ミュート時は再生しない

        if (mode === 'normal') {
            bgmNormal.play().catch(e => console.log('BGM再生エラー:', e));
        } else if (mode === 'timeAttack') {
            bgmTA.play().catch(e => console.log('BGM再生エラー:', e));
        }
    }

    function stopBGM() {
        bgmNormal.pause();
        bgmNormal.currentTime = 0;
        bgmTA.pause();
        bgmTA.currentTime = 0;
    }

    // ==========================================
    // データロード処理
    // ==========================================
    async function initData() {
        updateBGMButton(); // ロード時にBGMボタンの表示を更新

        if (typeof loadData === 'function') {
            const data = await loadData();
            if (data) {
                totalCoins = data.coins !== undefined ? data.coins : parseInt(localStorage.getItem('coins') || '100');
                totalPacks = data.packs !== undefined ? data.packs : parseInt(localStorage.getItem('packs') || '0');
            }
        } else {
            totalCoins = parseInt(localStorage.getItem('coins') || '100');
            totalPacks = parseInt(localStorage.getItem('packs') || '0');
        }
        
        sessionCoins = 0;
        sessionPacks = 0;
        updateStatusDisplay();
    }

    async function persistData() {
        localStorage.setItem('coins', totalCoins.toString());
        localStorage.setItem('packs', totalPacks.toString());

        if (typeof saveData === 'function') {
            await saveData({ coins: totalCoins, packs: totalPacks });
        }
    }

    // 常に累計（totalCoins）を表示するように変更！
    function updateStatusDisplay() {
        const coinEl = document.getElementById('coin-display');
        if (coinEl) coinEl.textContent = totalCoins;
        const packEl = document.getElementById('pack-display');
        if (packEl) packEl.textContent = totalPacks;
    }

    await initData();

    // ==========================================
    // UI操作・選択用関数
    // ==========================================
    window.selectGrade = function(grade, btn) {
        currentGrade = grade;
        document.querySelectorAll('.grid-buttons-grades .btn-option').forEach(b => b.classList.remove('selected'));
        if (btn) btn.classList.add('selected');

        const scienceBtn = document.getElementById('sub-science');
        const socialBtn = document.getElementById('sub-social');

        if (grade === 1 || grade === 2) {
            if (scienceBtn) scienceBtn.style.display = 'none';
            if (socialBtn) socialBtn.style.display = 'none';

            if (currentSubject === 'science' || currentSubject === 'social') {
                currentSubject = 'japanese';
                document.querySelectorAll('.grid-buttons-subjects .btn-option').forEach(b => b.classList.remove('selected'));
                const japBtn = document.getElementById('sub-japanese');
                if (japBtn) japBtn.classList.add('selected');
            }
        } else {
            if (scienceBtn) scienceBtn.style.display = 'block';
            if (socialBtn) socialBtn.style.display = 'block';
        }
        updateGradeStatus();
    };

    window.selectSubject = function(subject, btn) {
        currentSubject = subject;
        document.querySelectorAll('.grid-buttons-subjects .btn-option').forEach(b => b.classList.remove('selected'));
        if (btn) btn.classList.add('selected');
        updateGradeStatus();
    };

    window.selectMode = function(mode, btn) {
        currentMode = mode;
        document.querySelectorAll('.grid-buttons-modes .btn-option').forEach(b => b.classList.remove('selected'));
        if (btn) btn.classList.add('selected');
        
        const taInfo = document.getElementById('time-attack-info');
        const taBtn = document.getElementById('ta-setting-btn');
        if (mode === 'timeAttack') {
            if (taInfo) taInfo.style.display = 'block';
            if (taBtn) taBtn.style.display = 'inline-block';
        } else {
            if (taInfo) taInfo.style.display = 'none';
            if (taBtn) taBtn.style.display = 'none';
        }
    };

    window.openTimeAttackModal = function() {
        const modal = document.getElementById('ta-modal');
        if (modal) modal.style.display = 'flex';
    };

    window.setTimeAttackOption = function(sec, label, rewardPacks) {
        timeAttackSeconds = sec;
        timeAttackPackReward = rewardPacks;
        const timeLabel = document.getElementById('ta-time-label');
        const rewardLabel = document.getElementById('ta-reward-label');
        if (timeLabel) timeLabel.textContent = `${label} (${sec}秒)`;
        if (rewardLabel) rewardLabel.textContent = `${rewardPacks}パック`;
        const modal = document.getElementById('ta-modal');
        if (modal) modal.style.display = 'none';
    };

    function updateGradeStatus() {
        const statusEl = document.getElementById('grade-status');
        if (statusEl) {
            const subjectNames = { japanese: '国語', math: '算数', science: '理科', social: '社会', disaster: '防災' };
            statusEl.textContent = `現在選択中: ${currentGrade}年生 ${subjectNames[currentSubject] || currentSubject}`;
        }
    }
    updateGradeStatus();

    // ==========================================
    // データロード＆フォーマット
    // ==========================================
    function loadQuizDataFile(grade, subject) {
        return new Promise((resolve) => {
            const dataKey = `${grade}_${subject}`;
            let rawData = null;
            if (window.QUIZ_DATA) {
                if (window.QUIZ_DATA[dataKey] && Array.isArray(window.QUIZ_DATA[dataKey])) {
                    rawData = window.QUIZ_DATA[dataKey];
                } else if (Array.isArray(window.QUIZ_DATA.questions)) {
                    rawData = window.QUIZ_DATA.questions;
                }
            }

            if (rawData) {
                resolve(formatQuestions(rawData));
                return;
            }

            const scriptId = 'dynamic-quiz-script';
            const oldScript = document.getElementById(scriptId);
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `js/data/g${grade}_${subject}.js`;

            script.onload = () => {
                let loadedData = null;
                if (window.QUIZ_DATA) {
                    if (window.QUIZ_DATA[dataKey] && Array.isArray(window.QUIZ_DATA[dataKey])) {
                        loadedData = window.QUIZ_DATA[dataKey];
                    } else if (Array.isArray(window.QUIZ_DATA.questions)) {
                        loadedData = window.QUIZ_DATA.questions;
                    }
                }
                if (loadedData) {
                    resolve(formatQuestions(loadedData));
                } else {
                    resolve(getFallbackData(grade, subject));
                }
            };
            script.onerror = () => {
                resolve(getFallbackData(grade, subject));
            };
            document.head.appendChild(script);
        });
    }

    function formatQuestions(rawList) {
        const shuffled = [...rawList].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 10);

        return selected.map(q => {
            const choices = q.choices ? [...q.choices] : [];
            const originalAnswerIndex = (q.answer !== undefined) ? q.answer : (q.Answer !== undefined ? q.Answer : q.a);

            const indexedChoices = choices.map((choice, idx) => ({
                text: choice,
                isCorrect: (idx === originalAnswerIndex)
            }));

            indexedChoices.sort(() => Math.random() - 0.5);

            return {
                question: q.question || q.q,
                choices: indexedChoices.map(item => item.text),
                answer: indexedChoices.findIndex(item => item.isCorrect),
                explanation: q.ご提示いただいたコードを拝見しました！素晴らしい学習アプリが形になってきていますね。
ご要望いただいた3つの修正（効果音の調整、コイン表示の修正、BGMの連動と個別ボタンの追加）を反映しました[cite: 1, 2]。

### 修正のポイント
1. **効果音について**
   BGMが鳴っていると効果音が聞こえなくなる原因は、「BGMの音が大きすぎてかき消されている」か「同時に再生する際の音量バランスの問題」であることが多いです。そのため、**BGMの音量を `0.3`（30%）に下げ、効果音の音量を `1.0`（100%）にする** 設定を追加しました[cite: 2]。
2. **コインとパックの表示**
   クイズ画面専用の「その時のセッションだけのコイン（`sessionCoins`）」を表示する仕組みになっていたため、これまで集めたコインが一時的に0になっているように見えていました。これを廃止し、**常に「今まで集めたトータルのコイン（`totalCoins`）」を表示** するように修正しました[cite: 2]。
3. **BGMの連動とボタン追加**
   ブラウザの `localStorage`（保存領域）を使って、BGMのオン/オフ状態（`bgmMuted`）を記憶するようにしました。これにより**ホーム画面とBGMの設定が連動**します。さらに、画面上部の**ステータスバー（コインの横）に個別のBGMオン/オフボタン（🔊/🔇）も追加**しました[cite: 1, 2]。

---

以下が修正済みのコードです。そのままコピーして上書き保存してください。

### 1. HTMLファイル（画面側の修正）
ステータスバーにBGMボタンを追加しています[cite: 1]。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>✏️ クイズに挑戦 - わくわく学習＆カード</title>

    <!-- Supabase & 共通管理スクリプト -->
    <script src="[https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2)"></script>
    <script src="js/supabase_client.js"></script>
    <script src="js/data_manager.js"></script>
    <script src="js/auth_controller.js"></script>

    <!-- フォント -->
    <link href="[https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;900&display=swap](https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;900&display=swap)" rel="stylesheet">

    <style>
        body {
            font-family: 'M PLUS Rounded 1c', sans-serif;
            margin: 0; padding: 20px; color: #4a4a4a; text-align: center; min-height: 100vh;
            transition: background 0.5s ease;
        }
        body.dark { background: linear-gradient(135deg, #1e272e 0%, #4bcffa 100%); }
        body.pop { background: linear-gradient(135deg, #ff9ff3 0%, #feca57 100%); }

        .screen-card {
            background: rgba(255, 255, 255, 0.95); max-width: 680px; margin: 0 auto;
            padding: 25px; border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.2);
        }

        #status-bar {
            display: flex; justify-content: space-around; align-items: center; background: rgba(255, 255, 255, 0.9);
            color: #2f3640; padding: 12px; border-radius: 20px; margin: 0 auto 20px auto;
            max-width: 680px; font-size: 18px; font-weight: 900;
        }

        .select-group { margin: 15px 0; text-align: left; }
        .select-group label { display: block; font-weight: 900; margin-bottom: 8px; color: #2f3640; font-size: 16px; }
        
        .grid-buttons-grades { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
        .grid-buttons-subjects { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 15px; }
        .grid-buttons-modes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }

        .btn-option {
            background: #f1f2f6; border: 3px solid #dfe4ea; border-radius: 12px;
            padding: 10px 5px; font-size: 14px; font-weight: 900; cursor: pointer;
            font-family: 'M PLUS Rounded 1c', sans-serif; transition: all 0.2s;
        }
        .btn-option.selected { background: #ff4757; color: white; border-color: #ff4757; }
        .btn-option:disabled { opacity: 0.4; cursor: not-allowed; background: #e0e0e0; }

        .quiz-stage-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px dashed #dfe4ea;
        }
        .stage-badge {
            background: #3742fa; color: white; padding: 6px 14px; border-radius: 20px;
            font-size: 15px; font-weight: 900;
        }
        .timer-badge {
            background: #ff4757; color: white; padding: 6px 14px; border-radius: 20px;
            font-size: 16px; font-weight: 900; animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.05); }
        }

        .question-text {
            font-size: 20px; font-weight: 900; color: #2f3542; margin: 20px 0;
            line-height: 1.5; min-height: 60px; display: flex; align-items: center; justify-content: center;
        }

        .choice-btn {
            display: block; width: 100%; padding: 14px; margin: 10px 0; font-size: 17px;
            font-weight: 900; font-family: 'M PLUS Rounded 1c', sans-serif;
            background: #3498db; color: white; border: none; border-radius: 50px;
            box-shadow: 0 5px 0 #2980b9; cursor: pointer; transition: transform 0.1s;
        }
        .choice-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #2980b9; }
        .choice-btn:disabled { opacity: 0.7; cursor: default; }

        .msg-box { font-size: 16px; font-weight: 900; margin: 15px 0; padding: 12px; border-radius: 12px; text-align: left; }
        .msg-correct { background: #d4edda; color: #155724; border: 2px solid #c3e6cb; }
        .msg-wrong { background: #f8d7da; color: #721c24; border: 2px solid #f5c6cb; }
        .explanation-text { font-size: 14px; margin-top: 8px; font-weight: normal; line-height: 1.4; color: #2f3640; }

        .btn-container { display: flex; gap: 10px; justify-content: center; align-items: center; margin-top: 15px; }

        button.main-btn {
            background: linear-gradient(180deg, #2ed573, #26af5f); color: white; border: none;
            padding: 14px 28px; font-size: 18px; font-family: 'M PLUS Rounded 1c', sans-serif;
            font-weight: 900; border-radius: 50px; cursor: pointer; box-shadow: 0 6px 0 #1b8a45; flex: 1;
        }
        button.sub-btn {
            background: #ff9f43; color: white; border: none; padding: 14px 20px;
            font-size: 15px; font-family: 'M PLUS Rounded 1c', sans-serif; font-weight: 900;
            border-radius: 50px; cursor: pointer; box-shadow: 0 6px 0 #e67e22;
        }
        button.quit-btn {
            background: #a4b0be; color: white; border: none; padding: 8px 18px;
            font-size: 14px; font-family: 'M PLUS Rounded 1c', sans-serif; font-weight: 700;
            border-radius: 20px; cursor: pointer;
        }
        button.back-btn {
            background: #7f8fa6; color: white; border: none; padding: 10px 24px;
            font-size: 16px; font-family: 'M PLUS Rounded 1c', sans-serif; font-weight: 700;
            border-radius: 50px; cursor: pointer; box-shadow: 0 4px 0 #718093; margin-top: 20px;
        }
        .progress-bar-bg { background: #e0e0e0; border-radius: 10px; height: 14px; width: 100%; margin-bottom: 12px; overflow: hidden; }
        .progress-bar-fill { background: #2ed573; height: 100%; width: 0%; transition: width 0.3s; }

        .modal-overlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 1000; justify-content: center; align-items: center;
        }
        .modal-content {
            background: white; padding: 25px; border-radius: 20px; width: 85%; max-width: 400px;
            text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        .modal-btn {
            display: block; width: 100%; padding: 12px; margin: 10px 0; font-size: 16px;
            font-weight: 900; border-radius: 12px; border: 2px solid #3498db; background: #ebf7ff;
            color: #2980b9; cursor: pointer; font-family: 'M PLUS Rounded 1c', sans-serif;
        }
        .modal-btn.selected { background: #3498db; color: white; }
    </style>
</head>
<body id="body-quiz">

    <!-- テーマ（背景色）設定の反映 -->
    <script>
        const currentTheme = localStorage.getItem('theme') || 'dark';
        document.getElementById('body-quiz').className = currentTheme;
    </script>

    <div id="status-bar">
        <div>🪙 コイン: <span id="coin-display">0</span></div>
        <div>📦 パック: <span id="pack-display">0</span>個</div>
        <button id="bgm-toggle-btn" onclick="toggleBGM()" style="background:transparent; border:none; font-size:24px; cursor:pointer;" title="BGMのオン/オフ">🔊</button>
    </div>

    <!-- 1. 学年・教科・モード選択画面 -->
    <div id="setup-screen" class="screen-card">
        <h2 style="color:#3498db; margin-top:0;">✏️ 学年と教科をえらぼう</h2>

        <div class="select-group">
            <label>🎓 学年:</label>
            <div class="grid-buttons-grades">
                <button class="btn-option selected" onclick="selectGrade(1, this)">1年生</button>
                <button class="btn-option" onclick="selectGrade(2, this)">2年生</button>
                <button class="btn-option" onclick="selectGrade(3, this)">3年生</button>
                <button class="btn-option" onclick="selectGrade(4, this)">4年生</button>
                <button class="btn-option" onclick="selectGrade(5, this)">5年生</button>
                <button class="btn-option" onclick="selectGrade(6, this)">6年生</button>
            </div>
        </div>

        <div class="select-group">
            <label>📚 教科:</label>
            <div class="grid-buttons-subjects">
                <button id="sub-japanese" class="btn-option selected" onclick="selectSubject('japanese', this)">📖 国語</button>
                <button id="sub-math" class="btn-option" onclick="selectSubject('math', this)">🔢 算数</button>
                <button id="sub-science" class="btn-option" style="display:none;" onclick="selectSubject('science', this)">🌱 理科</button>
                <button id="sub-social" class="btn-option" style="display:none;" onclick="selectSubject('social', this)">🗺️ 社会</button>
                <button id="sub-disaster" class="btn-option" onclick="selectSubject('disaster', this)">🚨 防災</button>
            </div>
        </div>

        <div class="select-group">
            <label>⏱️ モード選択:</label>
            <div class="grid-buttons-modes">
                <button class="btn-option selected" onclick="selectMode('normal', this)">⏳ 時間無制限</button>
                <button class="btn-option" onclick="selectMode('timeAttack', this)">⚡ タイムアタック</button>
            </div>
        </div>

        <div id="time-attack-info" style="display:none; font-size:14px; color:#e67e22; font-weight:bold; margin-bottom:10px;">
            設定時間: <span id="ta-time-label">1分 (60秒)</span> 【全問正解で <span id="ta-reward-label">2パック</span>】
        </div>

        <div id="grade-status" style="font-size:15px; color:#2f3542; margin:15px 0; font-weight:bold; background:#f1f2f6; padding:10px; border-radius:12px;"></div>

        <div class="btn-container">
            <button id="start-btn" class="main-btn" onclick="startQuiz()">🚀 問題をとく！（全10問）</button>
            <button id="ta-setting-btn" class="sub-btn" onclick="openTimeAttackModal()" style="display:none;">⏱️ 時間を選ぶ</button>
        </div>
        <br>
        <button class="back-btn" onclick="location.href='index.html'">🏠 メニューにもどる</button>
    </div>

    <!-- タイムアタック時間選択モーダル -->
    <div id="ta-modal" class="modal-overlay">
        <div class="modal-content">
            <h3 style="margin-top:0; color:#2f3542;">⏱️ 制限時間を選んでね</h3>
            <p style="font-size:13px; color:#7f8fa6;">全問正解＆時間内クリアでパックGET！</p>
            <button class="modal-btn" onclick="setTimeAttackOption(60, '1分', 2)">1分 (報酬: 2パック)</button>
            <button class="modal-btn" onclick="setTimeAttackOption(45, '45秒', 3)">45秒 (報酬: 3パック)</button>
            <button class="modal-btn" onclick="setTimeAttackOption(30, '30秒', 4)">30秒 (報酬: 4パック)</button>
            <button class="modal-btn" onclick="setTimeAttackOption(10, '10秒', 5)">10秒 (報酬: 5パック)</button>
        </div>
    </div>

    <!-- 2. 問題解答画面 -->
    <div id="quiz-screen" class="screen-card" style="display:none;">
        <div class="quiz-stage-header">
            <span id="quiz-category-badge" class="stage-badge">1年生 国語</span>
            <span id="quiz-timer-badge" class="timer-badge" style="display:none;">⏳ 残り: 60s</span>
            <button class="quit-btn" onclick="confirmQuitQuiz()">✕ ちゅうだんする</button>
        </div>

        <div class="progress-bar-bg"><div id="progress-bar" class="progress-bar-fill"></div></div>
        <div id="quiz-progress" style="font-weight: 900; color: #7f8fa6; margin-bottom: 5px;">第 1 問 / 全10問</div>

        <div id="question-text" class="question-text"></div>
        <div id="choices-container"></div>
        <div id="feedback-msg" class="msg-box" style="display:none;"></div>

        <button id="next-btn" class="main-btn" onclick="nextQuestion()" style="display:none; width:100%; margin-top:15px;">つぎの問題へ ➔</button>
    </div>

    <!-- 3. 結果画面 -->
    <div id="result-screen" class="screen-card" style="display:none;">
        <h2 id="result-title" style="color:#3498db; margin-top:0;">🎉 結果発表</h2>
        <div id="result-score" style="font-size:24px; font-weight:900; margin:20px 0; color:#2f3542;"></div>
        <div id="result-reward" style="font-size:18px; font-weight:bold; background:#ebf7ff; padding:15px; border-radius:15px; margin:15px 0;"></div>
        <button class="main-btn" onclick="backToSetup()" style="width:85%; margin-top:15px;">もう一度ちょうせんする</button>
        <br>
        <button class="back-btn" onclick="location.href='index.html'">🏠 メニューにもどる</button>
    </div>

    <!-- 外部クイズエンジン -->
    <script src="js/quiz_engine.js" defer></script>
</body>
</html>