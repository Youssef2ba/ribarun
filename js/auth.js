const SUPABASE_URL = window.SUPABASE_URL || 'https://dzsuzrmdlojgtleqxedl.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3V6cm1kbG9qZ3RsZXF4ZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDMyMjQsImV4cCI6MjA4NzYxOTIyNH0.vh8rpbiZDHKemHdt3Q71F-HRkHUpgwhd4OS9U9HDqJ8';

let supabaseClient = null;
let currentSession = null;
let currentUsername = '';
let authMode = 'login';
let scoreSubmittedForRun = false;
let pendingSurvivalMs = 0;
let latestSubmitResult = null;

const authOverlay = document.getElementById('authOverlay');
const authSubtitle = document.getElementById('authSubtitle');
const authUsernameField = document.getElementById('authUsernameField');
const authUsernameInput = document.getElementById('authUsernameInput');
const authEmailInput = document.getElementById('authEmailInput');
const authPasswordInput = document.getElementById('authPasswordInput');
const authPrimaryBtn = document.getElementById('authPrimaryBtn');
const authToggleBtn = document.getElementById('authToggleBtn');
const authStatus = document.getElementById('authStatus');
const logoutBtn = document.getElementById('logoutBtn');
const accountNameEl = document.getElementById('accountName');
const leaderboardOverlay = document.getElementById('leaderboardOverlay');
const leaderboardListEl = document.getElementById('leaderboardList');
const leaderboardStatusEl = document.getElementById('leaderboardStatus');
const leaderboardLogoutBtn = document.getElementById('leaderboardLogoutBtn');
const replayGameBtn = document.getElementById('replayGameBtn');
const survivalUserLineEl = document.getElementById('survivalUserLine');
const survivalSubmitStatusEl = document.getElementById('survivalSubmitStatus');
const survivalContinueBtn = document.getElementById('survivalContinueBtn');

function normalizeUsername(name) {
    return (name || '').trim().replace(/\s+/g, '_').toLowerCase();
}

function isUsernameValid(name) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(name || '');
}

function setAuthStatus(message, isError = false) {
    authStatus.textContent = message || '';
    authStatus.style.color = isError ? '#f87171' : '#f8fafc';
}

function setLeaderboardStatus(message, isError = false) {
    leaderboardStatusEl.textContent = message || '';
    leaderboardStatusEl.style.color = isError ? '#fca5a5' : '#cbd5e1';
}

function setSubmitStatus(message, isError = false) {
    survivalSubmitStatusEl.textContent = message || '';
    survivalSubmitStatusEl.style.color = isError ? '#fca5a5' : '#cbd5e1';
}

function setAuthBusy(isBusy) {
    authPrimaryBtn.disabled = isBusy;
    authToggleBtn.disabled = isBusy;
}

function setAuthMode(mode) {
    authMode = mode;
    authUsernameField.style.display = 'flex';
    authSubtitle.textContent = 'Use username, email, and password to log in, or create a new account.';
    authUsernameInput.placeholder = 'Your username';
    authPasswordInput.setAttribute('autocomplete', 'current-password');
    setAuthStatus('');
}

function enterSignedOutMode(message = '') {
    hideAllGameOverlays();
    isPlaying = false;
    isGameOver = false;
    authOverlay.style.display = 'flex';
    setAuthStatus(message);
    accountNameEl.textContent = '';
    currentUsername = '';
    currentSession = null;
    setSubmitStatus('');
}

function enterSignedInMode() {
    authOverlay.style.display = 'none';
    showIntroScreen();
}

async function refreshSession() {
    if (!supabaseClient) return null;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) currentSession = session;
    return session;
}

async function loadLeaderboard() {
    if (!supabaseClient) return;

    await refreshSession();

    setLeaderboardStatus('Loading leaderboard...');
    const { data, error } = await supabaseClient
        .from('leaderboard_best')
        .select('username_snapshot,best_survived_ms,updated_at')
        .order('best_survived_ms', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(10);

    if (error) {
        renderLeaderboardRows([]);
        setLeaderboardStatus('Could not load leaderboard.', true);
        return;
    }

    renderLeaderboardRows(data || []);
    setLeaderboardStatus('');
}

async function loadCurrentProfile() {
    if (!supabaseClient || !currentSession?.user?.id) return null;

    const { data, error } = await supabaseClient
        .from('player_profiles')
        .select('username')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

    if (error) return null;
    return data;
}

async function upsertCurrentProfile(username) {
    if (!supabaseClient || !currentSession?.user?.id) {
        throw new Error('Not authenticated.');
    }

    const normalized = normalizeUsername(username);
    const clean = (username || '').trim();

    if (!isUsernameValid(clean)) {
        throw new Error('Username must be 3-20 characters (letters, numbers, underscore).');
    }

    const { error } = await supabaseClient
        .from('player_profiles')
        .upsert({
            user_id: currentSession.user.id,
            username: clean,
            username_normalized: normalized
        }, { onConflict: 'user_id' });

    if (error) {
        if (error.code === '23505') {
            throw new Error('Username already taken. Choose another one.');
        }
        throw new Error(error.message || 'Could not save username.');
    }

    currentUsername = clean;
    accountNameEl.textContent = currentUsername;
}

async function submitBestScore(survivedMs) {
    const session = await refreshSession();
    if (!supabaseClient || !session?.user?.id) {
        latestSubmitResult = { status: 'error' };
        return latestSubmitResult;
    }
    if (scoreSubmittedForRun && latestSubmitResult) return latestSubmitResult;

    scoreSubmittedForRun = true;
    setSubmitStatus('Submitting score...');

    try {
        const ms = Math.max(0, Math.floor(survivedMs));
        const { data: existing, error: readError } = await supabaseClient
            .from('leaderboard_best')
            .select('best_survived_ms')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();

        if (readError) {
            throw readError;
        }

        if (existing && ms <= existing.best_survived_ms) {
            latestSubmitResult = {
                status: 'kept-best',
                survivedMs: ms,
                bestMs: existing.best_survived_ms
            };
            return latestSubmitResult;
        }

        const { error: upsertError } = await supabaseClient
            .from('leaderboard_best')
            .upsert({
                user_id: currentSession.user.id,
                username_snapshot: currentUsername || 'player',
                best_survived_ms: ms
            }, { onConflict: 'user_id' });

        if (upsertError) {
            throw upsertError;
        }

        latestSubmitResult = {
            status: 'new-best',
            survivedMs: ms,
            bestMs: ms
        };
        return latestSubmitResult;
    } catch (_error) {
        setSubmitStatus('Could not submit score.', true);
        scoreSubmittedForRun = false;
        latestSubmitResult = { status: 'error' };
        return latestSubmitResult;
    }
}

async function processSurvivalSummary() {
    survivalContinueBtn.style.display = 'inline-block';
    survivalContinueBtn.disabled = true;

    try {
        const result = await Promise.race([
            submitBestScore(pendingSurvivalMs),
            new Promise(resolve => setTimeout(() => resolve({ status: 'timeout' }), 8000))
        ]);

        if (!result || result.status === 'error' || result.status === 'timeout') {
            setSubmitStatus('Could not check your best time.');
        }
        else if (result.status === 'new-best') {
            setSubmitStatus(`Well done! ${formatRunTime(result.bestMs)} is your new best time.`);
        }
        else {
            setSubmitStatus(`Survived ${formatRunTime(result.survivedMs)}\nYour best time is ${formatRunTime(result.bestMs)}.`);
        }
    } catch (_error) {
        setSubmitStatus('Could not check your best time.');
    } finally {
        survivalContinueBtn.style.display = 'inline-block';
        survivalContinueBtn.disabled = false;
    }
}

async function handleLogin() {
    const username = authUsernameInput.value.trim();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!isUsernameValid(username)) {
        setAuthStatus('Enter your username (3-20 letters, numbers, underscore).', true);
        return;
    }

    if (!email || !password) {
        setAuthStatus('Enter your username, email, and password.', true);
        return;
    }

    setAuthBusy(true);
    setAuthStatus('Logging in...');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    setAuthBusy(false);
    if (error) {
        setAuthStatus(error.message || 'Login failed.', true);
        return;
    }

    currentSession = data.session;
    const profile = await loadCurrentProfile();

    if (!profile?.username) {
        setAuthBusy(false);
        await supabaseClient.auth.signOut();
        enterSignedOutMode('Profile not found for this account. Contact support.');
        return;
    }

    if (normalizeUsername(profile.username) !== normalizeUsername(username)) {
        setAuthBusy(false);
        await supabaseClient.auth.signOut();
        enterSignedOutMode('Username does not match this email/password.');
        return;
    }

    currentUsername = profile?.username || (email.split('@')[0] || 'player');
    accountNameEl.textContent = `${currentUsername}`;
    setAuthStatus('');
    enterSignedInMode();
}

async function handleSignup() {
    const username = authUsernameInput.value.trim();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!isUsernameValid(username)) {
        setAuthStatus('Username must be 3-20 characters (letters, numbers, underscore).', true);
        return;
    }
    if (!email || !password || password.length < 6) {
        setAuthStatus('Enter valid email and password (min 6 chars).', true);
        return;
    }

    setAuthBusy(true);
    setAuthStatus('Creating account...');

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        setAuthBusy(false);
        setAuthStatus(error.message || 'Sign up failed.', true);
        return;
    }

    if (!data.session) {
        setAuthBusy(false);
        setAuthStatus('Check your email for verification, then log in.');
        setAuthMode('login');
        return;
    }

    currentSession = data.session;
    try {
        await upsertCurrentProfile(username);
    } catch (profileError) {
        setAuthBusy(false);
        setAuthStatus(profileError.message, true);
        await supabaseClient.auth.signOut();
        enterSignedOutMode('Sign up created, but username failed. Try another username.');
        return;
    }

    setAuthBusy(false);
    setAuthStatus('');
    enterSignedInMode();
}

async function initializeAuth() {
    if (!window.supabase?.createClient || SUPABASE_URL.includes('YOUR_SUPABASE') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
        enterSignedOutMode('Set SUPABASE_URL and SUPABASE_ANON_KEY in window before loading the game.');
        authPrimaryBtn.disabled = true;
        authToggleBtn.disabled = true;
        return;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: sessionData } = await supabaseClient.auth.getSession();
    currentSession = sessionData.session;

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        currentSession = session;
        if (!session) {
            enterSignedOutMode('Session ended. Please log in again.');
            return;
        }
        const profile = await loadCurrentProfile();
        currentUsername = profile?.username || (session.user?.email?.split('@')[0] || 'player');
        accountNameEl.textContent = `@${currentUsername}`;
        if (authOverlay.style.display !== 'none') {
            enterSignedInMode();
        }
    });

    if (!currentSession) {
        enterSignedOutMode('Log in or sign up to play.');
        return;
    }

    const profile = await loadCurrentProfile();
    currentUsername = profile?.username || (currentSession.user?.email?.split('@')[0] || 'player');
    accountNameEl.textContent = `@${currentUsername}`;
    enterSignedInMode();
}

authPrimaryBtn.addEventListener('click', async () => {
    if (!supabaseClient) {
        setAuthStatus('Supabase is not configured.', true);
        return;
    }
    await handleLogin();
});

authToggleBtn.addEventListener('click', async () => {
    if (!supabaseClient) {
        setAuthStatus('Supabase is not configured.', true);
        return;
    }
    await handleSignup();
});

[authUsernameInput, authEmailInput, authPasswordInput].forEach(input => {
    input.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        authPrimaryBtn.click();
    });
});

logoutBtn.addEventListener('click', async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    resetGameState();
    enterSignedOutMode('Logged out.');
});

replayGameBtn.addEventListener('click', () => {
    leaderboardOverlay.style.display = 'none';
    resetGameState();
    showStartOverlay();
});

leaderboardLogoutBtn.addEventListener('click', async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    resetGameState();
    enterSignedOutMode('Logged out.');
});

survivalContinueBtn.addEventListener('click', () => {
    showLeaderboardScreen();
});

setAuthMode('login');
initializeAuth();
