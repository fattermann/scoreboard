(function () {
    'use strict';

    // ===== STORAGE =====
    const STORAGE_KEY = 'frde_quiz_teams';
    const AUTH_KEY = 'frde_quiz_auth';
    const VALID_USER = 'Frank';
    const VALID_PASS = 'Fiete123';

    function loadTeams() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
    }
    function saveTeams(teams) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    }
    function isLoggedIn() { return sessionStorage.getItem(AUTH_KEY) === '1'; }
    function setLoggedIn(v) { v ? sessionStorage.setItem(AUTH_KEY, '1') : sessionStorage.removeItem(AUTH_KEY); }

    let teams = loadTeams();

    // ===== DOM REFS =====
    const loginPage = document.getElementById('login-page');
    const mainPage = document.getElementById('main-page');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const searchInput = document.getElementById('search-input');
    const scoreboardList = document.getElementById('scoreboard-list');
    const btnAddTeam = document.getElementById('btn-add-team');
    const btnResetAll = document.getElementById('btn-reset-all');
    const btnLogout = document.getElementById('btn-logout');

    const addModal = document.getElementById('add-modal');
    const newTeamNameInput = document.getElementById('new-team-name');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    // ===== CREATE CONFIRM MODAL DYNAMICALLY =====
    let confirmCallback = null;
    const confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-modal';
    confirmModal.className = 'modal hidden';
    confirmModal.innerHTML = `
        <div class="modal-content confirm-modal-content">
            <p id="confirm-message" class="confirm-text">Bist du sicher?</p>
            <div class="modal-actions">
                <button id="confirm-no" class="btn-secondary">Abbrechen</button>
                <button id="confirm-yes" class="btn-danger-full">Ja, löschen</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');

    // ===== CUSTOM CONFIRM =====
    function showConfirm(message, onYes) {
        confirmMessage.textContent = message;
        confirmCallback = onYes;
        confirmModal.classList.remove('hidden');
    }
    confirmNo.addEventListener('click', function () {
        confirmModal.classList.add('hidden');
        confirmCallback = null;
    });
    confirmYes.addEventListener('click', function () {
        confirmModal.classList.add('hidden');
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
    });
    confirmModal.addEventListener('click', function (e) {
        if (e.target === confirmModal) {
            confirmModal.classList.add('hidden');
            confirmCallback = null;
        }
    });

    // ===== PAGE NAVIGATION =====
    function showPage(page) {
        loginPage.classList.remove('active');
        mainPage.classList.remove('active');
        page.classList.add('active');
    }

    // ===== INIT =====
    function init() {
        updatePublicPodium();
        if (isLoggedIn()) {
            showPage(mainPage);
            renderScoreboard();
        } else {
            showPage(loginPage);
        }
    }

    // ===== LOGIN =====
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const u = usernameInput.value.trim();
        const p = passwordInput.value;
        if (u === VALID_USER && p === VALID_PASS) {
            setLoggedIn(true);
            loginError.textContent = '';
            showPage(mainPage);
            renderScoreboard();
        } else {
            loginError.textContent = 'Falscher Benutzername oder Passwort!';
            passwordInput.value = '';
        }
    });

    btnLogout.addEventListener('click', function () {
        setLoggedIn(false);
        usernameInput.value = '';
        passwordInput.value = '';
        showPage(loginPage);
        updatePublicPodium();
    });

    // ===== ADD TEAM MODAL =====
    btnAddTeam.addEventListener('click', function () {
        addModal.classList.remove('hidden');
        newTeamNameInput.value = '';
        setTimeout(() => newTeamNameInput.focus(), 100);
    });
    modalCancel.addEventListener('click', () => addModal.classList.add('hidden'));
    addModal.addEventListener('click', function (e) {
        if (e.target === addModal) addModal.classList.add('hidden');
    });
    modalConfirm.addEventListener('click', addTeam);
    newTeamNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addTeam(); }
    });

    function addTeam() {
        const name = newTeamNameInput.value.trim();
        if (!name) return;
        if (teams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            showConfirm('Dieses Team existiert bereits!', null);
            return;
        }
        teams.push({ name: name, score: 0, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
        saveTeams(teams);
        addModal.classList.add('hidden');
        renderScoreboard();
    }

    // ===== RESET =====
    btnResetAll.addEventListener('click', function () {
        showConfirm('Alle Teams und Scores wirklich löschen?', function () {
            teams = [];
            saveTeams(teams);
            renderScoreboard();
        });
    });

    // ===== SEARCH =====
    searchInput.addEventListener('input', function () {
        const q = searchInput.value.toLowerCase().trim();
        const rows = scoreboardList.querySelectorAll('.team-row');
        rows.forEach(row => {
            const name = row.dataset.name.toLowerCase();
            row.classList.toggle('hidden-search', q && !name.includes(q));
        });
    });

    // ===== SCORE CHANGE =====
    function changeScore(id, delta) {
        const team = teams.find(t => t.id === id);
        if (!team) return;
        team.score += delta;
        saveTeams(teams);
        renderScoreboard();

        // Pop animation on score
        setTimeout(() => {
            const el = scoreboardList.querySelector(`[data-id="${id}"] .col-score`);
            if (el) {
                el.classList.remove('score-pop');
                void el.offsetWidth; // reflow
                el.classList.add('score-pop');
            }
        }, 30);
    }

    // ===== DELETE TEAM =====
    function deleteTeam(id) {
        const team = teams.find(t => t.id === id);
        if (!team) return;
        showConfirm(`Team "${team.name}" wirklich löschen?`, function () {
            teams = teams.filter(t => t.id !== id);
            saveTeams(teams);
            renderScoreboard();
        });
    }

    // ===== RENDER SCOREBOARD =====
    function renderScoreboard() {
        // Sort by score descending, then alphabetically
        teams.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        saveTeams(teams); // keep sorted order

        scoreboardList.innerHTML = '';

        if (teams.length === 0) {
            scoreboardList.innerHTML = '<div class="empty-state"><span>📋</span>Noch keine Teams angelegt.<br>Drücke ＋ um ein Team hinzuzufügen.</div>';
        } else {
            teams.forEach((team, i) => {
                const row = document.createElement('div');
                row.className = 'team-row';
                row.dataset.id = team.id;
                row.dataset.name = team.name;
                row.style.animationDelay = `${i * 0.04}s`;

                row.innerHTML = `
                    <span class="col-rank">${i + 1}</span>
                    <span class="col-team" title="${escHtml(team.name)}">${escHtml(team.name)}</span>
                    <span class="col-score">${team.score}</span>
                    <span class="col-actions">
                        <button class="btn-score btn-minus" data-action="minus" title="−1">−</button>
                        <button class="btn-score btn-plus" data-action="plus" title="+1">＋</button>
                        <button class="btn-delete-team" data-action="delete" title="Löschen">🗑</button>
                    </span>
                `;
                scoreboardList.appendChild(row);
            });
        }

        // Re-apply search filter
        const q = searchInput.value.toLowerCase().trim();
        if (q) {
            scoreboardList.querySelectorAll('.team-row').forEach(row => {
                row.classList.toggle('hidden-search', !row.dataset.name.toLowerCase().includes(q));
            });
        }

        updateMainPodium();
        updatePublicPodium();
    }

    // Event delegation for score buttons
    scoreboardList.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const row = btn.closest('.team-row');
        if (!row) return;
        const id = row.dataset.id;
        const action = btn.dataset.action;
        if (action === 'plus') changeScore(id, 1);
        else if (action === 'minus') changeScore(id, -1);
        else if (action === 'delete') deleteTeam(id);
    });

    // ===== PODIUM UPDATE =====
    function updatePodium(prefix, sorted) {
        const slots = [
            { el: document.getElementById(`${prefix}-first`), idx: 0 },
            { el: document.getElementById(`${prefix}-second`), idx: 1 },
            { el: document.getElementById(`${prefix}-third`), idx: 2 },
        ];
        slots.forEach(({ el, idx }) => {
            const team = sorted[idx];
            const nameEl = el.querySelector('.podium-name');
            const scoreEl = el.querySelector('.podium-score');
            nameEl.textContent = team ? team.name : '—';
            nameEl.title = team ? team.name : '';
            scoreEl.textContent = team ? team.score : '0';
        });
    }

    function getSorted() {
        return [...teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    }
    function updateMainPodium() { updatePodium('main', getSorted()); }
    function updatePublicPodium() { updatePodium('pub', getSorted()); }

    // ===== HELPERS =====
    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // ===== START =====
    init();
})();
