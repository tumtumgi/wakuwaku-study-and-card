document.addEventListener('DOMContentLoaded', () => {
    let currentGrade = 1;
    let currentSubject = 'japanese';
    let currentMode = 'normal';
    let timeAttackSeconds = 60;
    let timeAttackReward = '2パック';
    let coins = 0;
    let packs = 0;

    let questions = [];
    let currentIndex = 0;
    let score = 0;

    function updateStatusDisplay() {
        const coinEl = document.getElementById('coin-display');
        if (coinEl) coinEl.textContent = coins;
        const packEl = document.getElementById('pack-display');
        if (packEl) packEl.textContent = packs;
    }
    updateStatusDisplay();

    // ==========================================
    // グローバル関数（HTMLのonclickから呼び出される関数群）
    // ==========================================

    window.selectGrade = function(grade, btn) {
        currentGrade = grade;
        document.querySelectorAll('.grid-buttons-grades .btn-option').forEach(b => b.classList.remove('selected'));
        if (btn) btn.classList.add('selected');

        // 1年生・2年生の場合は「理科」「社会」を非表示にし、選択中であれば国語に戻す
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

    window.setTimeAttackOption = function(sec, label, reward) {
        timeAttackSeconds = sec;
        timeAttackReward = reward;
        const timeLabel = document.getElementById('ta-time-label');
        const rewardLabel = document.getElementById('ta-reward-label');
        if (timeLabel) timeLabel.textContent = `${label} (${sec}秒)`;
        if (rewardLabel) rewardLabel.textContent = reward;
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
    // データファイルの読み込み関数（各種データ形式に対応）
    // ==========================================
    function loadQuizDataFile(grade, subject) {
        return new Promise((resolve) => {
            const dataKey = `${grade}_${subject}`;
            
            // 既に読み込まれている場合
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
        // 配列をシャッフルしてランダムにし、先頭から10問に絞り込む
        const shuffled = [...rawList].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 10);

        return selected.map(q => {
            const choices = q.choices ? [...q.choices] : [];
            const originalAnswerIndex = (q.answer !== undefined) ? q.answer : q.a;

            // 選択肢と正解フラグをペアにして保持
            const indexedChoices = choices.map((choice, idx) => ({
                text: choice,
                isCorrect: (idx === originalAnswerIndex)
            }));

            // 選択肢をランダムにシャッフル
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
    // クイズの進行ロジック
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
        showQuestion();
    };

    window.confirmQuitQuiz = function() {
        if (confirm('クイズをちゅうだんして、はじめの画面に戻りますか？')) {
            window.backToSetup();
        }
    };

    window.backToSetup = function() {
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
        if (isCorrect) score++;

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
        } else {
            showResult();
        }
    };

    function showResult() {
        const quizScreen = document.getElementById('quiz-screen');
        const resultScreen = document.getElementById('result-screen');
        if (quizScreen) quizScreen.style.display = 'none';
        if (resultScreen) resultScreen.style.display = 'block';

        const scoreEl = document.getElementById('result-score');
        if (scoreEl) scoreEl.textContent = `正解数: ${score} / ${questions.length}問`;

        const rewardEl = document.getElementById('result-reward');
        if (rewardEl) {
            if (score === questions.length) {
                packs += 2;
                coins += 100;
                rewardEl.innerHTML = `✨ 全問正解！すごい！<br><b>🪙 100コイン ＆ 📦 パックをゲット！</b>`;
            } else {
                coins += 30;
                rewardEl.innerHTML = `よくがんばりました！<br><b>🪙 30コイン をゲット！</b>`;
            }
        }
        updateStatusDisplay();
    }
});