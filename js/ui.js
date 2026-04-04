const introOverlay = document.getElementById('introOverlay');
const introVideo = document.getElementById('introVideo');
const introPlayButton = document.getElementById('introPlayButton');
const introProceedButton = document.getElementById('introProceedButton');
const introSkip = document.getElementById('introSkip');
const introContinue = document.getElementById('introContinue');
const mapOverlay = document.getElementById('mapOverlay');
const mapStartButton = document.getElementById('mapStartButton');
const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialImage = document.getElementById('tutorialImage');
const tutorialNextButton = document.getElementById('tutorialNextButton');
const startOverlay = document.getElementById('startOverlay');
const playBtn = document.getElementById('startRunButton');
const countDownEl = document.getElementById('countdown');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const survivalOverlay = document.getElementById('survivalOverlay');
const survivalTimeEl = document.getElementById('survivalTime');
const runTimerEl = document.getElementById('runTimer');
const timerLockEl = document.getElementById('timerLock');
const timerInstructionEl = document.getElementById('timerInstruction');

const gameOverFramesBySavingsState = {
    enough: [
        'assets/game-end/enoughsavings1.png',
        'assets/game-end/enoughsavings2.png'
    ],
    none: [
        'assets/game-end/nosavings1.png',
        'assets/game-end/nosavings2.png'
    ]
};
let gameOverFrameIndex = 0;
let gameOverFrameTimer = null;
let runElapsedMs = 0;
let runTimerRunning = false;
let runTimerLastMs = 0;
let startCountdownTimer = null;

let currentTutorialIndex = 0;
const tutorialSlides = [
    'assets/tutorial/tut1.jpeg',
    'assets/tutorial/tut2.jpeg',
    'assets/tutorial/tut3.jpeg'
];

function hideAllGameOverlays() {
    introOverlay.style.display = 'none';
    mapOverlay.style.display = 'none';
    startOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    survivalOverlay.style.display = 'none';
    leaderboardOverlay.style.display = 'none';
    runTimerEl.classList.add('hidden');
}

function showIntroScreen() {
    hideAllGameOverlays();
    introOverlay.style.display = 'flex';
    setSubmitStatus('');
}

function renderLeaderboardRows(rows) {
    leaderboardListEl.innerHTML = '';

    if (!rows || rows.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No scores yet';
        leaderboardListEl.appendChild(emptyItem);
        return;
    }

    rows.forEach((row, index) => {
        const item = document.createElement('li');
        const left = document.createElement('span');
        const right = document.createElement('span');
        left.textContent = `${index + 1}. ${row.username_snapshot}`;
        right.textContent = formatRunTime(row.best_survived_ms);
        item.appendChild(left);
        item.appendChild(right);
        leaderboardListEl.appendChild(item);
    });
}

async function showLeaderboardScreen() {
    survivalOverlay.style.display = 'none';
    leaderboardOverlay.style.display = 'flex';
    await loadLeaderboard();
}

function formatRunTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let mm = String(minutes).padStart(2, '0');
    let ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}`;
}

function resetRunTimer() {
    runElapsedMs = 0;
    runTimerRunning = false;
    runTimerLastMs = 0;
    runTimerEl.textContent = '00:00';
    runTimerEl.classList.add('hidden');
}

function startRunTimer() {
    runTimerRunning = true;
    runTimerLastMs = performance.now();
    runTimerEl.classList.remove('hidden');
}

function stopRunTimer() {
    runTimerRunning = false;
}

function showMapScreen() {
    if (!currentSession) {
        enterSignedOutMode('Log in or sign up to continue.');
        return;
    }
    introOverlay.style.display = 'none';
    mapOverlay.style.display = 'flex';
}

function showStartOverlay() {
    mapOverlay.style.display = 'none';
    startOverlay.style.display = 'flex';
    if (startCountdownTimer) {
        clearInterval(startCountdownTimer);
        startCountdownTimer = null;
    }
    countDownEl.textContent = '';
    countDownEl.classList.remove('active');
    resetRunTimer();
}

function showTutorialSequence() {
    mapOverlay.style.display = 'none';
    tutorialOverlay.style.display = 'flex';
    currentTutorialIndex = 0;
    loadTutorialSlide();
}

function loadTutorialSlide() {
    tutorialImage.style.animation = 'none';
    void tutorialImage.offsetWidth;
    tutorialImage.src = tutorialSlides[currentTutorialIndex];
    tutorialImage.style.animation = 'fadeInTutorial 1.5s ease-in forwards';
    
    if (currentTutorialIndex === tutorialSlides.length - 1) {
        tutorialNextButton.style.backgroundImage = "url('assets/tutorial/continue.png')";
    } else {
        tutorialNextButton.style.backgroundImage = "url('assets/tutorial/next.png')";
    }
}

function advanceTutorial() {
    if (currentTutorialIndex < tutorialSlides.length - 1) {
        currentTutorialIndex++;
        loadTutorialSlide();
    } else {
        tutorialOverlay.style.display = 'none';
        showStartOverlay();
    }
}

function triggerGameOver() {
    isGameOver = true;
    isPlaying = false;
    liquidity = 0;
    stopRunTimer();
    gameOverOverlay.style.display = 'flex';
    const gameOverImage = document.getElementById('gameOverImage');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const gameOverButtons = document.querySelectorAll('.gameOverButton, #bankruptcyBadge');
    const hasSavings = savings >= 150;
    const gameOverFrames = hasSavings
        ? gameOverFramesBySavingsState.enough
        : gameOverFramesBySavingsState.none;
    gameOverImage.classList.remove('fade-in');
    gameOverMessage.classList.remove('fade-in');
    gameOverButtons.forEach(btn => btn.classList.remove('fade-in'));
    if (gameOverFrameTimer) {
        clearInterval(gameOverFrameTimer);
        gameOverFrameTimer = null;
    }
    gameOverFrameIndex = 0;
    gameOverImage.src = gameOverFrames[gameOverFrameIndex];
    gameOverMessage.textContent = hasSavings
        ? ''
        : '';
    gameOverFrameTimer = setInterval(() => {
        gameOverFrameIndex = (gameOverFrameIndex + 1) % gameOverFrames.length;
        gameOverImage.src = gameOverFrames[gameOverFrameIndex];
    }, 240);
    setTimeout(() => {
        gameOverImage.classList.add('fade-in');
        gameOverMessage.classList.add('fade-in');
        gameOverButtons.forEach(btn => btn.classList.add('fade-in'));
    }, 10);
    document.getElementById('btnLoan').onclick = () => {
        liquidity = 100;
        savings = -100;
        gameSpeed = 10.5;
        if (syncDebtState()) {
            ribaRound++;
        }
        resumeGame();
    };
    const btnSavings = document.getElementById('btnSavings');
    btnSavings.disabled = !hasSavings;
    btnSavings.style.backgroundImage = hasSavings
        ? "url('assets/game-end/150savings.png')"
        : "url('assets/game-end/nosavings.png')";
    btnSavings.onclick = () => {
        if(savings >= 150) {
            savings -= 150;
            syncDebtState();
            liquidity = 100;
            resumeGame();
        }
    };
    document.getElementById('btnRestart').onclick = () => {
        pendingSurvivalMs = runElapsedMs;
        runTimerEl.classList.add('hidden');
        survivalTimeEl.textContent = `SURVIVED ${formatRunTime(pendingSurvivalMs)}`;
        survivalUserLineEl.textContent = `Username: ${currentUsername || 'player'}`;
        setSubmitStatus('');
        survivalContinueBtn.style.display = 'inline-block';
        survivalContinueBtn.disabled = true;
        scoreSubmittedForRun = false;
        latestSubmitResult = null;
        if (gameOverFrameTimer) {
            clearInterval(gameOverFrameTimer);
            gameOverFrameTimer = null;
        }
        gameOverOverlay.style.display = 'none';
        survivalOverlay.style.display = 'flex';
        processSurvivalSummary();
    };
}

function resumeGame() {
    gameOverOverlay.style.display = 'none';
    const gameOverImage = document.getElementById('gameOverImage');
    const gameOverMessage = document.getElementById('gameOverMessage');
    gameOverImage.classList.remove('fade-in');
    gameOverMessage.classList.remove('fade-in');
    document.querySelectorAll('.gameOverButton, #bankruptcyBadge').forEach(btn => btn.classList.remove('fade-in'));
    if (gameOverFrameTimer) {
        clearInterval(gameOverFrameTimer);
        gameOverFrameTimer = null;
    }
    isGameOver = false;
    isPlaying = true;
    startRunTimer();
    loop();
}

let videoStartTime = Date.now();
let continueOpacityInterval = setInterval(() => {
    const elapsed = (Date.now() - videoStartTime) / 1000; // seconds
    const opacity = Math.min(elapsed / 30, 1); // 0 to 1 over 30 seconds
    introContinue.style.opacity = opacity;
    if (opacity >= 1) clearInterval(continueOpacityInterval);
}, 100);

tutorialNextButton.addEventListener('click', advanceTutorial);

introProceedButton.addEventListener('click', () => {
    showMapScreen();
});

mapStartButton.addEventListener('click', () => {
    showTutorialSequence();
});

introPlayButton.addEventListener('click', () => {
    // Streamable iframe has built-in controls, so this is disabled
});

introVideo.addEventListener('play', () => {
    // introPlayButton.classList.add('hidden');
});

introVideo.addEventListener('pause', () => {
    // if (introVideo.currentTime < introVideo.duration) {
    //     introPlayButton.classList.remove('hidden');
    // }
});

introSkip.addEventListener('click', () => {
    clearInterval(continueOpacityInterval);
    introVideo.src = '';
    showMapScreen();
});

introContinue.addEventListener('click', () => {
    clearInterval(continueOpacityInterval);
    introVideo.src = '';
    showMapScreen();
});

setTimeout(() => {
    introContinue.style.opacity = '1';
}, 35000);

playBtn.addEventListener('click', () => {
    if (!currentSession) {
        enterSignedOutMode('Log in to start a run.');
        return;
    }
    startOverlay.style.display = 'none';
    let count = 3;
    countDownEl.textContent = count;
    countDownEl.classList.add('active');
    if (startCountdownTimer) {
        clearInterval(startCountdownTimer);
    }
    startCountdownTimer = setInterval(() => {
        count--;
        if(count > 0) {
            countDownEl.textContent = count;
        } 
        else {
            clearInterval(startCountdownTimer);
            startCountdownTimer = null;
            countDownEl.textContent = '';
            countDownEl.classList.remove('active');
            isPlaying = true;
            startRunTimer();
            loop();
        }
    }, 1000);
});
