document.addEventListener('DOMContentLoaded', async () => {
    let currentGrade = 1;
    let currentSubject = 'japanese';
    let currentMode = 'normal';
    let timeAttackSeconds = 60;
    let timeAttackPackReward = 2;

    // 累計データ
    let totalCoins = 0;
    let totalPacks = 0;

    let questions = [];
    let currentIndex = 0;
    let score = 0;

    // タイマー管理用
    let timerInterval = null;
    let remainingTime = 0;

    // ==========================================
    // 1. 音声ファイルの読み込みとBGM/SE制御
    // ==========================================
    // ホーム画面（index.html）と連動するためのキー 'bgmEnabled' を使用
    let isBGMEnabled = localStorage.getItem('bgmEnabled') !== 'false';

    const bgmNormal = new Audio('bgm/Notes_from_the_Study.mp3');
    bgmNormal.loop = true;
    bgmNormal.volume = 0.3; // BGM音量を30%にしてSEを聞きやすく調整

    const bgmTA = new Audio('bgm/Seconds_Left.mp3');
    bgmTA.loop = true;
    bgmTA.volume = 0.3;

    // 効果音設定
    const correctSound = new Audio('bgm/reversed_chime.wav');
    correctSound.volume = 1.0;
    const wrongSound = new Audio('bgm/quiz_buzzer_extended.wav');
    wrongSound.volume = 1.0;

    // 効果音再生用関数
    function playSE(sound) {
        try {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('SE再生エラー:', e));
        } catch(e) {
            console.log('SEエラー:', e);
        }
    }

    // BGMのオン/オフ切替（ホーム画面と完全連動）
    window.toggleBGM = function() {
        isBGMEnabled = !isBGMEnabled;
        localStorage.setItem('bgmEnabled', isBGMEnabled ? 'true' : 'false');
        updateBGMButton();
        if (!isBGMEnabled) {
            stopBGM();
        } else {
            const quizScreen = document.getElementById('quiz-screen');
            if (quizScreen && quizScreen.style.display === 'block') {
                playBGM(currentMode);
            }
        }
    };

    function updateBGMButton() {
        const btn = document.getElementById('bgm-toggle-btn');
        if (btn) {
            btn.textContent = isBGMEnabled ? '🔊' : '🔇';
        }
    }

    function playBGM(mode) {
        stopBGM(); 
        if (!isBGMEnabled) return; // BGMがOFFの場合は再生しない

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
    // 2. データロード＆保存処理（データの消失・初期化を防止）
    // ==========================================
    async function initData() {
        updateBGMButton();

        let loadedCoins = null;
        let loadedPacks = null;

        // Supabase / gameData からデータ取得を試みる
        if (typeof loadData === 'function') {
            const data = await loadData();
            if (data) {
                if (data.coins !== undefined) loadedCoins = parseInt(data.coins);
                if (data.packs !== undefined) loadedPacks = parseInt(data.packs);
            }
        }
        
        // フォールバック: 個別キーから読み込み
        if (loadedCoins === null || isNaN(loadedCoins)) {
            loadedCoins = parseInt(localStorage.getItem('coins') || '100');
        }
        if (loadedPacks === null || isNaN(loadedPacks)) {
            loadedPacks = parseInt(localStorage.getItem('packs') || '0');
        }

        totalCoins = loadedCoins;
        totalPacks = loadedPacks;

        // メニュー画面と共通のキーにも確実に同期保存
        await persistData();
        updateStatusDisplay();
    }

    async function persistData() {
        localStorage.setItem('coins', totalCoins.toString());
        localStorage.setItem('packs', totalPacks.toString());

        if (typeof saveData === 'function') {
            await saveData({ coins: totalCoins, packs: totalPacks });
        }
    }

    function updateStatusDisplay() {
        const coinEl = document.getElementById('coin-display');
        if (coinEl) coinEl.textContent = totalCoins;
        const packEl = document.getElementById('pack-display');
        if (packEl) packEl.textContent = totalPacks;
    }

    await initData();

    // ==========================================
    // 3. UI操作・選択用関数
    // ==========================================
    window.selectGrade = function(grade, btn) {
        currentGrade = grade;
        document.querySelectorAll('.grid-buttons-grades .btn-option').forEach(b => b.classList.remove('selected'));
        if (btn) btn.classList.add('selected');

        const scienceBtn = document.getElementById('sub-science');
        const socialBtn = document.getElementById('sub-social');

        if (grade === 1 || grade === 2) {
            if (scienceBtn) scienceBtn.style.display = 'none';
            if (socialBtn) scienceBtn.style.display = 'none';

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
    // 4. データロード＆クイズ進行
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
                explanation: q.explanation || q.exp || ''
            };
        });
    }

    function getFallbackData(grade, subject) {
        return [
            { question: `${grade}年生 ${subject} のおためし問題です。`, choices: ["正解", "不正解1", "不正解2", "不正解3"], answer: 0, explanation: "サンプル問題です。" }
        ];
    }

    // ==========================================
    // 5. クイズゲーム制御
    // ==========================================
    window.startQuiz = async function() {
        // クイズ開始時に最新のデータを再ロードして同期する
        await initData();

        questions = await loadQuizDataFile(currentGrade, currentSubject);
        currentIndex = 0;
        score = 0;

        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('quiz-screen').style.display = 'block';

        const subjectNames = { japanese: '国語', math: '算数', science: '理科', social: '社会', disaster: '防災' };
        document.getElementById('quiz-category-badge').textContent = `${currentGrade}年生 ${subjectNames[currentSubject] || currentSubject}`;

        const timerBadge = document.getElementById('quiz-timer-badge');
        if (currentMode === 'timeAttack') {
            remainingTime = timeAttackSeconds;
            timerBadge.textContent = `⏳ 残り: ${remainingTime}s`;
            timerBadge.style.display = 'inline-block';
            startTimer();
        } else {
            timerBadge.style.display = 'none';
        }

        playBGM(currentMode);
        showQuestion();
    };

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            remainingTime--;
            const timerBadge = document.getElementById('quiz-timer-badge');
            if (timerBadge) timerBadge.textContent = `⏳ 残り: ${remainingTime}s`;

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                finishQuiz();
            }
        }, 1000);
    }

    function showQuestion() {
        const q = questions[currentIndex];
        document.getElementById('quiz-progress').textContent = `第 ${currentIndex + 1} 問 / 全 ${questions.length} 問`;
        
        const progressPercent = ((currentIndex) / questions.length) * 100;
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;

        document.getElementById('question-text').textContent = q.question;

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';

        q.choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice;
            btn.onclick = () => checkAnswer(idx, btn);
            choicesContainer.appendChild(btn);
        });

        document.getElementById('feedback-msg').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
    }

    // 解答判定・効果音再生
    window.checkAnswer = function(selectedIndex, btn) {
        const btns = document.querySelectorAll('.choice-btn');
        btns.forEach(b => b.disabled = true);

        const q = questions[currentIndex];
        const isCorrect = (selectedIndex === q.answer);
        const feedbackEl = document.getElementById('feedback-msg');

        if (isCorrect) {
            score++;
            playSE(correctSound); // ピンポン音再生
            btn.style.background = '#2ed573';
            feedbackEl.className = 'msg-box msg-correct';
            feedbackEl.innerHTML = `⭕ 正解！<div class="explanation-text">${q.explanation}</div>`;
        } else {
            playSE(wrongSound); // ブッブー音再生
            btn.style.background = '#ff4757';
            feedbackEl.className = 'msg-box msg-wrong';
            feedbackEl.innerHTML = `❌ 残念... 正解は「${q.choices[q.answer]}」<div class="explanation-text">${q.explanation}</div>`;
        }

        feedbackEl.style.display = 'block';

        if (currentIndex < questions.length - 1) {
            document.getElementById('next-btn').style.display = 'block';
        } else {
            setTimeout(finishQuiz, 1800);
        }
    };

    window.nextQuestion = function() {
        currentIndex++;
        showQuestion();
    };

    // クイズ終了と報酬保存
    async function finishQuiz() {
        stopBGM();
        if (timerInterval) clearInterval(timerInterval);

        document.getElementById('quiz-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'block';

        const resultScore = document.getElementById('result-score');
        const resultReward = document.getElementById('result-reward');

        resultScore.textContent = `${questions.length}問中 ${score} 問 正解！`;

        let earnedCoins = 0;
        let earnedPacks = 0;

        if (currentMode === 'timeAttack') {
            if (score === questions.length && remainingTime > 0) {
                earnedCoins = 50;
                earnedPacks = timeAttackPackReward;
                resultReward.innerHTML = `⚡ タイムアタック成功！<br>🪙 コイン +${earnedCoins} / 📦 パック +${earnedPacks} GET！`;
            } else {
                earnedCoins = score * 5;
                resultReward.innerHTML = `⏱️ タイムアタック失敗...<br>🪙 コイン +${earnedCoins} GET！`;
            }
        } else {
            earnedCoins = score * 10;
            resultReward.innerHTML = `🪙 コイン +${earnedCoins} GET！`;
        }

        // クイズで得たコイン・パックを累計に加算
        totalCoins += earnedCoins;
        totalPacks += earnedPacks;

        // 加算後のデータを保存＆表示更新
        await persistData();
        updateStatusDisplay();
    }

    window.confirmQuitQuiz = function() {
        if (confirm("本当にちゅうだんしますか？")) {
            stopBGM();
            if (timerInterval) clearInterval(timerInterval);
            backToSetup();
        }
    };

    window.backToSetup = function() {
        stopBGM();
        document.getElementById('quiz-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('setup-screen').style.display = 'block';
        updateStatusDisplay();
    };
});