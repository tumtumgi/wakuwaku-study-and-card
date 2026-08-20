document.addEventListener('DOMContentLoaded', async () => {
    let currentGrade = 1;
    let currentSubject = 'japanese';
    let currentMode = 'normal';
    let timeAttackSeconds = 60;
    let timeAttackPackReward = 2;

    // 本当の累計データ（DB/LocalStorageに保存される値）
    let totalCoins = 0;
    let totalPacks = 0;
    
    // このクイズ画面（セッション）で獲得しただけのデータ（画面表示用）
    let sessionCoins = 0;
    let sessionPacks = 0;

    let questions = [];
    let currentIndex = 0;
    let score = 0;

    // タイマー管理用
    let timerInterval = null;
    let remainingTime = 0;

    // ==========================================
    // 音声ファイルの読み込み
    // ==========================================
    const correctSound = new Audio('bgm/reversed_chime.wav');
    const wrongSound = new Audio('bgm/quiz_buzzer_extended.wav');
    const bgmNormal = new Audio('bgm/Notes_from_the_Study.mp3');
    bgmNormal.loop = true;
    const bgmTA = new Audio('bgm/Seconds_Left.mp3');
    bgmTA.loop = true;

    function playBGM(mode) {
        stopBGM(); // 先に止める
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
        
        // クイズ画面に入った時点では、表示用のセッションコインを0にする
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

    // 表示は「このクイズ画面で獲得した分（session）」のみにする
    function updateStatusDisplay() {
        const coinEl = document.getElementById('coin-display');
        if (coinEl) coinEl.textContent = sessionCoins;
        const packEl = document.getElementById('pack-display');
        if (packEl) packEl.textContent = sessionPacks;
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
            // q.Answer も認識できるように条件を追加
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
                explanation: q.explanation || q.exp || "解説はありません。"
            };
        });
    }

    function getFallbackData(grade, subject) {
        const subjectNames = { japanese: '国語', math: '算数', science: '理科', social: '社会', disaster: '防災' };
        return [
            {
                question: `${grade}年生の${subjectNames[subject] || subject}（準備中）の問題です`,
                choices: ["次へすすむ", "ダミー選択肢2", "ダミー選択肢3", "ダミー選択肢4"],
                answer: 0,
                explanation: `js/data/g${grade}_${subject}.js ファイルを作成すると問題が表示されます。`
            }
        ];
    }

    // ==========================================
    // クイズの進行＆タイマーロジック
    // ==========================================

    window.startQuiz = async function() {
        const setupScreen = document.getElementById('setup-screen');
        const quizScreen = document.getElementById('quiz-screen');
        if (setupScreen) setupScreen.style.display = 'none';
        if (quizScreen) quizScreen.style.display = 'block';

        const categoryBadge = document.getElementById('quiz-category-badge');
        if (categoryBadge) {
            const subjectNames = { japanese: '国語', math: '算数', science: '理科', social: '社会', disaster: '防災' };
            categoryBadge.textContent = `${currentGrade}年生 ${subjectNames[currentSubject] || currentSubject}`;
        }

        questions = await loadQuizDataFile(currentGrade, currentSubject);
        currentIndex = 0;
        score = 0;

        // BGMを再生
        playBGM(currentMode);

        // タイムアタックタイマー初期化
        const timerBadge = document.getElementById('quiz-timer-badge');
        if (currentMode === 'timeAttack') {
            remainingTime = timeAttackSeconds;
            if (timerBadge) {
                timerBadge.style.display = 'inline-block';
                timerBadge.textContent = `⏳ 残り: ${remainingTime}s`;
            }
            startTimer();
        } else {
            if (timerBadge) timerBadge.style.display = 'none';
        }

        showQuestion();
    };

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            remainingTime--;
            const timerBadge = document.getElementById('quiz-timer-badge');
            if (timerBadge) timerBadge.textContent = `⏳ 残り: ${remainingTime}s`;

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                alert("⏰ タイムアップ！");
                showResult(true);
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    window.confirmQuitQuiz = function() {
        if (confirm('クイズをちゅうだんして、はじめの画面に戻りますか？')) {
            stopTimer();
            stopBGM(); // BGM停止
            window.backToSetup();
        }
    };

    window.backToSetup = function() {
        stopTimer();
        stopBGM(); // BGM停止
        const setupScreen = document.getElementById('setup-screen');
        const quizScreen = document.getElementById('quiz-screen');
        const resultScreen = document.getElementById('result-screen');
        if (setupScreen) setupScreen.style.display = 'block';
        if (quizScreen) quizScreen.style.display = 'none';
        if (resultScreen) resultScreen.style.display = 'none';
    };

    function showQuestion() {
        const q = questions[currentIndex];
        
        const progressEl = document.getElementById('quiz-progress');
        if (progressEl) progressEl.textContent = `第 ${currentIndex + 1} 問 / 全 ${questions.length} 問`;

        const barEl = document.getElementById('progress-bar');
        if (barEl) barEl.style.width = `${(currentIndex / questions.length) * 100}%`;

        const qTextEl = document.getElementById('question-text');
        if (qTextEl) qTextEl.textContent = q.question;

        const choicesContainer = document.getElementById('choices-container');
        if (choicesContainer) {
            choicesContainer.innerHTML = '';
            q.choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.textContent = `${index + 1}. ${choice}`;
                btn.onclick = () => selectAnswer(index);
                choicesContainer.appendChild(btn);
            });
        }

        const feedbackMsg = document.getElementById('feedback-msg');
        if (feedbackMsg) feedbackMsg.style.display = 'none';

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.style.display = 'none';
    }

    function selectAnswer(selectedIndex) {
        const q = questions[currentIndex];
        const isCorrect = (selectedIndex === q.answer);
        
        // 効果音の再生
        if (isCorrect) {
            score++;
            correctSound.currentTime = 0;
            correctSound.play().catch(e => console.log('SEエラー:', e));
        } else {
            wrongSound.currentTime = 0;
            wrongSound.play().catch(e => console.log('SEエラー:', e));
        }

        // タイムアタックモード：解説中はタイマーを一時停止
        if (currentMode === 'timeAttack') {
            stopTimer();
        }

        const choiceBtns = document.querySelectorAll('.choice-btn');
        choiceBtns.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === q.answer) {
                btn.style.background = '#2ed573';
                btn.style.boxShadow = '0 2px 0 #1b8a45';
            } else if (idx === selectedIndex && !isCorrect) {
                btn.style.background = '#ff4757';
                btn.style.boxShadow = '0 2px 0 #c23616';
            }
        });

        const feedbackMsg = document.getElementById('feedback-msg');
        if (feedbackMsg) {
            feedbackMsg.style.display = 'block';
            if (isCorrect) {
                feedbackMsg.className = 'msg-box msg-correct';
                feedbackMsg.innerHTML = `⭕ せいかい！<div class="explanation-text">${q.explanation}</div>`;
            } else {
                feedbackMsg.className = 'msg-box msg-wrong';
                feedbackMsg.innerHTML = `❌ ざんねん…（正解は ${q.answer + 1}番 です）<div class="explanation-text">${q.explanation}</div>`;
            }
        }

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.style.display = 'block';
            if (currentIndex === questions.length - 1) {
                nextBtn.textContent = '結果を見る ➔';
            } else {
                nextBtn.textContent = 'つぎの問題へ ➔';
            }
        }
    }

    window.nextQuestion = function() {
        currentIndex++;
        if (currentIndex < questions.length) {
            showQuestion();
            // タイムアタックモード：次の問題へ進んだらタイマーを再開
            if (currentMode === 'timeAttack') {
                startTimer();
            }
        } else {
            stopTimer();
            showResult(false);
        }
    };

    async function showResult(isTimeUp = false) {
        stopTimer();
        stopBGM(); // クイズ終了時にBGM停止
        
        const quizScreen = document.getElementById('quiz-screen');
        const resultScreen = document.getElementById('result-screen');
        if (quizScreen) quizScreen.style.display = 'none';
        if (resultScreen) resultScreen.style.display = 'block';

        const scoreEl = document.getElementById('result-score');
        if (scoreEl) scoreEl.textContent = `正解数: ${score} / ${questions.length}問`;

        let earnedCoins = 0;
        let earnedPacks = 0;

        const rewardEl = document.getElementById('result-reward');
        if (rewardEl) {
            let rewardMsg = "";

            if (currentMode === 'timeAttack') {
                if (!isTimeUp && score === questions.length) {
                    earnedPacks = timeAttackPackReward;
                    earnedCoins = 150;
                    rewardMsg = `⚡ タイムアタック成功！すごすぎる！<br><b>🪙 150コイン ＆ 📦 ${earnedPacks}パックをゲット！</b>`;
                } else if (isTimeUp) {
                    earnedCoins = 20;
                    rewardMsg = `⌛ タイムオーバー！<br><b>🪙 20コイン をゲット！</b>`;
                } else {
                    earnedCoins = 50;
                    rewardMsg = `時間内クリア！(全問正解でパックGET)<br><b>🪙 50コイン をゲット！</b>`;
                }
            } else {
                // 正解数に応じた報酬（時間無制限）
                if (score === questions.length) {
                    earnedPacks = 1;
                    earnedCoins = 100;
                    rewardMsg = `✨ 全問正解！すごい！<br><b>🪙 100コイン ＆ 📦 1パックをゲット！</b>`;
                } else if (score >= 7) {
                    earnedCoins = 60;
                    rewardMsg = `やったね！高得点！<br><b>🪙 60コイン をゲット！</b>`;
                } else if (score >= 4) {
                    earnedCoins = 40;
                    rewardMsg = `クリア！<br><b>🪙 40コイン をゲット！</b>`;
                } else if (score >= 1) {
                    earnedCoins = 10;
                    rewardMsg = `がんばったね！<br><b>🪙 10コイン をゲット！</b>`;
                } else {
                    earnedCoins = 0;
                    rewardMsg = `ざんねん…次はがんばろう！`;
                }
            }

            rewardEl.innerHTML = rewardMsg;
        }

        // セッション用（表示用）とトータル用（保存用）の両方に加算する
        sessionCoins += earnedCoins;
        sessionPacks += earnedPacks;
        totalCoins += earnedCoins;
        totalPacks += earnedPacks;

        await persistData();
        updateStatusDisplay();
    }
});