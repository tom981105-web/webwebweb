// auth.js

const POINT_STORE_ITEMS = [
    { id: 'forest_scout', title: '숲길 정찰대', cost: 10, description: '첫 번째 포인트 칭호입니다.' },
    { id: 'sunrise_hiker', title: '새벽 등반가', cost: 20, description: '꾸준히 모은 포인트로 열 수 있는 칭호입니다.' },
    { id: 'campfire_host', title: '캠프파이어 호스트', cost: 35, description: '커뮤니티 활동이 눈에 띄는 멤버를 위한 칭호입니다.' }
];
const RPG_STAT_LABELS = {
    strength: '힘',
    agility: '민첩',
    vitality: '체력',
    spirit: '정신력'
};
const RPG_MONSTERS = [
    { id: 'slime', name: '이끼 슬라임', reward: [5, 8], damage: [4, 9], xp: 8, requirement: 0 },
    { id: 'wolf', name: '들개 무리', reward: [9, 14], damage: [8, 16], xp: 14, requirement: 18 },
    { id: 'golem', name: '낡은 골렘', reward: [14, 22], damage: [12, 23], xp: 22, requirement: 35 }
];
const RPG_SHOP_ITEMS = [
    { id: 'potion', name: '회복약', cost: 6, heal: 35, description: '전투 후 잃은 HP를 회복합니다.' }
];
const NOTIFICATION_STORAGE_KEY = 'user_notifications';
const NOTIFICATION_SEEN_PREFIX = 'seen_notifications_';
const SERVICE_ACCESS_STORAGE_KEY = 'service_access_settings';
const DEFAULT_SERVICE_ACCESS_SETTINGS = {
    board: 'open',
    mountain: 'open',
    ai: 'open',
    stockSim: 'open'
};

function createDefaultRpgState() {
    return {
        level: 1,
        xp: 0,
        hp: 100,
        potions: 0,
        stats: {
            strength: 1,
            agility: 1,
            vitality: 1,
            spirit: 1
        },
        weaponLevel: 0,
        armorLevel: 0,
        monstersDefeated: 0,
        deaths: 0,
        battleLog: []
    };
}

function sanitizeBattleLog(logs) {
    if (!Array.isArray(logs)) return [];
    return logs
        .filter((entry) => entry && typeof entry === 'object')
        .slice(-8)
        .map((entry) => ({
            message: String(entry.message || ''),
            type: String(entry.type || 'info'),
            createdAt: entry.createdAt || new Date().toISOString()
        }));
}

function normalizeRpgState(value) {
    const base = createDefaultRpgState();
    const rawStats = value && typeof value === 'object' ? value.stats || {} : {};
    const stats = {
        strength: Math.max(1, Number(rawStats.strength || base.stats.strength)),
        agility: Math.max(1, Number(rawStats.agility || base.stats.agility)),
        vitality: Math.max(1, Number(rawStats.vitality || base.stats.vitality)),
        spirit: Math.max(1, Number(rawStats.spirit || base.stats.spirit))
    };
    const maxHp = 100 + (stats.vitality - 1) * 18 + Number((value && value.armorLevel) || 0) * 8;

    return {
        level: Math.max(1, Number(value && value.level != null ? value.level : base.level)),
        xp: Math.max(0, Number(value && value.xp != null ? value.xp : base.xp)),
        hp: Math.max(0, Math.min(maxHp, Number(value && value.hp != null ? value.hp : base.hp))),
        potions: Math.max(0, Number(value && value.potions != null ? value.potions : base.potions)),
        stats,
        weaponLevel: Math.max(0, Number(value && value.weaponLevel != null ? value.weaponLevel : base.weaponLevel)),
        armorLevel: Math.max(0, Number(value && value.armorLevel != null ? value.armorLevel : base.armorLevel)),
        monstersDefeated: Math.max(0, Number(value && value.monstersDefeated != null ? value.monstersDefeated : base.monstersDefeated)),
        deaths: Math.max(0, Number(value && value.deaths != null ? value.deaths : base.deaths)),
        battleLog: sanitizeBattleLog(value && value.battleLog)
    };
}

function getRpgMaxHp(rpg) {
    return 100 + (Number(rpg.stats.vitality || 1) - 1) * 18 + Number(rpg.armorLevel || 0) * 8;
}

function getRpgAttackPower(rpg) {
    return 8 + Number(rpg.stats.strength || 1) * 4 + Number(rpg.weaponLevel || 0) * 3;
}

function getRpgDefensePower(rpg) {
    return 3 + Number(rpg.stats.vitality || 1) * 2 + Number(rpg.armorLevel || 0) * 3 + Number(rpg.stats.agility || 1);
}

function getRpgDodgeRate(rpg) {
    return Math.min(0.28, 0.04 + Number(rpg.stats.agility || 1) * 0.018);
}

function getRpgNextLevelXp(rpg) {
    return 30 + (Number(rpg.level || 1) - 1) * 22;
}

function pushRpgBattleLog(rpg, message, type) {
    const nextLog = {
        message,
        type: type || 'info',
        createdAt: new Date().toISOString()
    };
    rpg.battleLog = [...sanitizeBattleLog(rpg.battleLog), nextLog].slice(-8);
}

function finalizeRpgLevel(rpg) {
    let leveledUp = 0;
    let requiredXp = getRpgNextLevelXp(rpg);

    while (rpg.xp >= requiredXp) {
        rpg.xp -= requiredXp;
        rpg.level += 1;
        leveledUp += 1;
        requiredXp = getRpgNextLevelXp(rpg);
        pushRpgBattleLog(rpg, `레벨이 ${rpg.level}로 올랐습니다.`, 'level');
    }

    const maxHp = getRpgMaxHp(rpg);
    rpg.hp = Math.min(maxHp, rpg.hp + leveledUp * 10);
    return leveledUp;
}

function updateCurrentUserWithRpg(mutator, eventName) {
    const record = getCurrentUserRecord();
    if (!record) return { ok: false, message: '로그인이 필요합니다.' };

    const { key, user, users } = record;
    const currentRpg = normalizeRpgState(user.rpg);
    const result = mutator({
        key,
        user,
        users,
        rpg: currentRpg
    });

    if (!result || result.ok === false) {
        return result || { ok: false, message: '처리에 실패했습니다.' };
    }

    users[key] = {
        ...user,
        ...result.userPatch,
        rpg: normalizeRpgState(result.rpg || currentRpg)
    };

    localStorage.setItem('users_db', JSON.stringify(users));
    window.dispatchEvent(new CustomEvent(eventName || 'rpg:updated', {
        detail: {
            userId: key,
            points: Number(users[key].points || 0),
            rpg: users[key].rpg,
            ...(result.eventDetail || {})
        }
    }));

    return {
        ...result,
        ok: true,
        profile: getCurrentUserProfile()
    };
}

function getNotificationsDb() {
    try {
        const notifications = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || '{}');
        return notifications && typeof notifications === 'object' ? notifications : {};
    } catch (error) {
        return {};
    }
}

function getAuthApiBase() {
    return window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
}

function getAuthApiUrl(path) {
    return `${getAuthApiBase()}${path}`;
}

function normalizeServiceAccessMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === 'admin' || mode === 'maintenance') return mode;
    return 'open';
}

function normalizeServiceAccessSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        board: normalizeServiceAccessMode(source.board),
        mountain: normalizeServiceAccessMode(source.mountain),
        ai: normalizeServiceAccessMode(source.ai),
        stockSim: normalizeServiceAccessMode(source.stockSim)
    };
}

function getServiceAccessSettings() {
    try {
        return normalizeServiceAccessSettings(JSON.parse(localStorage.getItem(SERVICE_ACCESS_STORAGE_KEY) || '{}'));
    } catch (error) {
        return { ...DEFAULT_SERVICE_ACCESS_SETTINGS };
    }
}

function saveServiceAccessSettings(settings) {
    const normalized = normalizeServiceAccessSettings(settings);
    localStorage.setItem(SERVICE_ACCESS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('service-access:updated', { detail: normalized }));
    return normalized;
}

async function refreshServiceAccessSettings() {
    try {
        const response = await fetch(getAuthApiUrl(`/api/access-settings?t=${Date.now()}`), { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result && result.accessSettings) {
            return saveServiceAccessSettings(result.accessSettings);
        }
    } catch (error) {
    }
    try {
        const response = await fetch(getAuthApiUrl(`/api/admin/state?t=${Date.now()}`), { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result && result.accessSettings) {
            return saveServiceAccessSettings(result.accessSettings);
        }
    } catch (error) {
    }
    return getServiceAccessSettings();
}

function getServiceGateForPath(pathname) {
    const normalizedPath = String(pathname || '').toLowerCase();
    if (normalizedPath.includes('board.html')) return { key: 'board', label: '자유게시판' };
    if (normalizedPath.includes('mountain.html')) return { key: 'mountain', label: '등산' };
    if (normalizedPath.includes('ai.html')) return { key: 'ai', label: 'AI' };
    if (normalizedPath.includes('/stock-sim-app')) return { key: 'stockSim', label: '주식장' };
    if (normalizedPath.includes('/probability-forge-app')) return { key: 'stockSim', label: '확률조작게임' };
    if (normalizedPath.includes('/auto-pvp-app')) return { key: 'stockSim', label: 'Auto PvP' };
    return null;
}

function getServiceBlockedMessage(label, mode) {
    if (mode === 'admin') {
        return `${label}은 현재 관리자만 이용할 수 있습니다.`;
    }
    return `${label}은 현재 점검중입니다. 잠시 후 다시 확인해 주세요.`;
}

function resolveProfileImageUrl(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    if (rawValue.startsWith('data:image/')) return rawValue;
    const localhostMatch = rawValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
    const normalized = localhostMatch ? localhostMatch[1] : rawValue;
    if (/^\/uploads\//i.test(normalized)) {
        return window.location.protocol === 'file:' ? `${getAuthApiBase()}${normalized}` : normalized;
    }
    return /^https?:\/\//i.test(normalized) ? normalized : '';
}

function normalizeProfileFocusValue(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 50;
}

function getProfileObjectPosition(user) {
    const focusX = normalizeProfileFocusValue(user && user.profileFocusX);
    const focusY = normalizeProfileFocusValue(user && user.profileFocusY);
    return `${focusX}% ${focusY}%`;
}

function syncNotificationsDb(notifications, preferBeacon = false) {
    const payload = JSON.stringify({
        key: NOTIFICATION_STORAGE_KEY,
        value: JSON.stringify(notifications || {})
    });
    const url = getAuthApiUrl('/api/sync');

    if (preferBeacon && navigator.sendBeacon) {
        try {
            const sent = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
            if (sent) return;
        } catch (error) {
        }
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
    }).catch((error) => {
        console.warn('[Notifications] 서버 동기화에 실패했습니다.', error);
    });
}

function saveNotificationsDb(notifications) {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    syncNotificationsDb(notifications);
}

function resolveUserKeyCaseInsensitive(targetUserId) {
    const target = String(targetUserId || '').trim();
    if (!target) return '';
    const users = getUsersDb();
    return Object.keys(users).find((key) => key.toLowerCase() === target.toLowerCase()) || target;
}

function getUserNotifications(userId) {
    const targetUserId = resolveUserKeyCaseInsensitive(userId || localStorage.getItem('current_user'));
    if (!targetUserId) return [];
    const notifications = getNotificationsDb();
    const list = Array.isArray(notifications[targetUserId]) ? notifications[targetUserId] : [];
    return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function getUnreadNotificationCount(userId) {
    return getUserNotifications(userId).filter((item) => !item.read).length;
}

function dispatchNotificationUpdate(userId) {
    const notifications = getUserNotifications(userId);
    window.dispatchEvent(new CustomEvent('notifications:updated', {
        detail: {
            userId: userId || localStorage.getItem('current_user') || '',
            unreadCount: getUnreadNotificationCount(userId),
            latestNotification: notifications.find((item) => !item.read) || null
        }
    }));
}

function createUserNotification(userId, payload) {
    const targetUserId = resolveUserKeyCaseInsensitive(userId);
    if (!targetUserId) return null;

    const notifications = getNotificationsDb();
    const currentList = Array.isArray(notifications[targetUserId]) ? notifications[targetUserId] : [];
    const nextNotification = {
        id: `noti_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: payload && payload.type ? payload.type : 'general',
        title: payload && payload.title ? payload.title : '새 알림',
        message: payload && payload.message ? payload.message : '',
        link: payload && payload.link ? payload.link : '',
        read: false,
        createdAt: new Date().toISOString()
    };

    notifications[targetUserId] = [nextNotification, ...currentList].slice(0, 40);
    saveNotificationsDb(notifications);
    dispatchNotificationUpdate(targetUserId);
    return nextNotification;
}

function markNotificationRead(notificationId) {
    const currentUser = localStorage.getItem('current_user');
    const userKey = resolveUserKeyCaseInsensitive(currentUser);
    if (!userKey || !notificationId) return false;

    const notifications = getNotificationsDb();
    const currentList = Array.isArray(notifications[userKey]) ? notifications[userKey] : [];
    let updated = false;

    notifications[userKey] = currentList.map((item) => {
        if (item.id !== notificationId) return item;
        updated = true;
        return { ...item, read: true };
    });

    if (!updated) return false;
    saveNotificationsDb(notifications);
    dispatchNotificationUpdate(userKey);
    return true;
}

function markAllNotificationsRead() {
    const currentUser = localStorage.getItem('current_user');
    const userKey = resolveUserKeyCaseInsensitive(currentUser);
    if (!userKey) return false;

    const notifications = getNotificationsDb();
    const currentList = Array.isArray(notifications[userKey]) ? notifications[userKey] : [];
    notifications[userKey] = currentList.map((item) => ({ ...item, read: true }));
    saveNotificationsDb(notifications);
    dispatchNotificationUpdate(userKey);
    return true;
}

function getSeenNotificationIds(userId) {
    const targetUserId = resolveUserKeyCaseInsensitive(userId || localStorage.getItem('current_user'));
    if (!targetUserId) return [];
    try {
        const stored = JSON.parse(sessionStorage.getItem(`${NOTIFICATION_SEEN_PREFIX}${targetUserId}`) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function setSeenNotificationIds(userId, ids) {
    const targetUserId = resolveUserKeyCaseInsensitive(userId || localStorage.getItem('current_user'));
    if (!targetUserId) return;
    sessionStorage.setItem(`${NOTIFICATION_SEEN_PREFIX}${targetUserId}`, JSON.stringify(ids.slice(-50)));
}

function markNotificationSeen(userId, notificationId) {
    if (!notificationId) return;
    const seenIds = getSeenNotificationIds(userId);
    if (seenIds.includes(notificationId)) return;
    seenIds.push(notificationId);
    setSeenNotificationIds(userId, seenIds);
}

function escapeNotificationHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ensureNotificationToastHost() {
    if (document.getElementById('notificationToastHost')) {
        return document.getElementById('notificationToastHost');
    }

    const host = document.createElement('div');
    host.id = 'notificationToastHost';
    host.className = 'notification-toast-host';
    document.body.appendChild(host);
    return host;
}

function showNotificationToast(notification, userId) {
    if (!notification || !notification.id) return;
    const currentUser = resolveUserKeyCaseInsensitive(localStorage.getItem('current_user'));
    const targetUser = resolveUserKeyCaseInsensitive(userId || currentUser);
    if (!currentUser || currentUser !== targetUser) return;

    const host = ensureNotificationToastHost();
    const toast = document.createElement('button');
    toast.type = 'button';
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <span class="notification-toast-label">새 알림</span>
        <strong>${escapeNotificationHtml(notification.title || '새 알림')}</strong>
        <span>${escapeNotificationHtml(notification.message || '')}</span>
    `;
    toast.onclick = function () {
        markNotificationSeen(currentUser, notification.id);
        if (notification.link) {
            window.location.href = notification.link;
            return;
        }
        toggleNotificationPanel(true);
    };

    host.appendChild(toast);
    markNotificationSeen(currentUser, notification.id);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 260);
    }, 4200);
}

function surfaceUnreadNotifications() {
    const currentUser = resolveUserKeyCaseInsensitive(localStorage.getItem('current_user'));
    if (!currentUser) return;

    const notifications = getUserNotifications(currentUser).filter((item) => !item.read);
    const seenIds = getSeenNotificationIds(currentUser);
    notifications
        .filter((item) => !seenIds.includes(item.id))
        .slice(0, 2)
        .reverse()
        .forEach((item) => showNotificationToast(item, currentUser));
}

function ensureNotificationPanel() {
    if (document.getElementById('notificationPanel')) {
        return document.getElementById('notificationPanel');
    }

    const panel = document.createElement('div');
    panel.id = 'notificationPanel';
    panel.className = 'notification-panel';
    panel.innerHTML = `
        <div class="notification-panel-head">
            <div>
                <strong>알림</strong>
                <span>최근 소식을 바로 확인합니다.</span>
            </div>
            <button type="button" class="notification-panel-close" onclick="toggleNotificationPanel(false)">닫기</button>
        </div>
        <div id="notificationPanelList" class="notification-panel-list"></div>
        <div class="notification-panel-actions">
            <button type="button" class="notification-panel-action" onclick="markAllNotificationsRead(); renderNotificationPanel();">전체 읽음 처리</button>
        </div>
    `;
    document.body.appendChild(panel);
    document.addEventListener('click', (event) => {
        const panelEl = document.getElementById('notificationPanel');
        if (!panelEl || !panelEl.classList.contains('is-open')) return;
        const trigger = event.target.closest('.hero-notice-link, [data-notification-toggle]');
        if (trigger || panelEl.contains(event.target)) return;
        toggleNotificationPanel(false);
    });
    return panel;
}

function renderNotificationPanel() {
    const list = document.getElementById('notificationPanelList');
    if (!list) return;

    const notifications = getUserNotifications();
    if (!notifications.length) {
        list.innerHTML = '<div class="notification-panel-empty">아직 도착한 알림이 없습니다.</div>';
        return;
    }

    list.innerHTML = notifications.map((item) => `
        <article class="notification-panel-item${item.read ? '' : ' unread'}">
            <div class="notification-panel-copy">
                <div class="notification-panel-title-row">
                    <strong>${escapeNotificationHtml(item.title)}</strong>
                    ${item.read ? '' : '<span class="notification-panel-badge">새 알림</span>'}
                </div>
                <p>${escapeNotificationHtml(item.message)}</p>
                <span>${escapeNotificationHtml(new Date(item.createdAt).toLocaleString('ko-KR'))}</span>
            </div>
            <div class="notification-panel-buttons">
                ${item.link ? `<button type="button" class="notification-inline-button" onclick="openNotificationItem('${escapeNotificationHtml(item.id)}', '${escapeNotificationHtml(item.link)}')">바로 보기</button>` : ''}
                ${item.read ? '' : `<button type="button" class="notification-inline-button primary" onclick="markNotificationRead('${escapeNotificationHtml(item.id)}'); renderNotificationPanel();">읽음</button>`}
            </div>
        </article>
    `).join('');
}

function toggleNotificationPanel(forceOpen) {
    const panel = ensureNotificationPanel();
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', shouldOpen);
    if (shouldOpen) {
        renderNotificationPanel();
    }
}

function openNotificationItem(notificationId, link) {
    markNotificationRead(notificationId);
    renderNotificationPanel();
    toggleNotificationPanel(false);
    if (link) {
        window.location.href = link;
    }
}

function getUsersDb() {
    let users = {};

    try {
        users = JSON.parse(localStorage.getItem('users_db') || '{}');
    } catch (error) {
        users = {};
    }

    users.admin = {
        ...(users.admin || {}),
        password: '1105',
        isAdmin: true,
        status: 'regular',
        signupDate: users.admin?.signupDate || new Date().toLocaleString('ko-KR')
    };

    Object.keys(users).forEach((key) => {
        users[key] = {
            ...users[key],
            points: Number(users[key].points || 0),
            lastAttendanceDate: users[key].lastAttendanceDate || '',
            attendanceStreak: Number(users[key].attendanceStreak || 0),
            maxAttendanceStreak: Number(users[key].maxAttendanceStreak || 0),
            unlockedTitles: Array.isArray(users[key].unlockedTitles) ? users[key].unlockedTitles : [],
            activeTitleId: users[key].activeTitleId || '',
            profileImage: users[key].profileImage || '',
            profileFocusX: normalizeProfileFocusValue(users[key].profileFocusX),
            profileFocusY: normalizeProfileFocusValue(users[key].profileFocusY),
            rpg: normalizeRpgState(users[key].rpg)
        };
    });

    return users;
}

function getTodayAttendanceKey() {
    return getAttendanceKeyFromOffset(0);
}

function getAttendanceKeyFromOffset(offsetDays) {
    const baseDate = new Date(Date.now() + offsetDays * 86400000);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(baseDate);
}

function getCurrentUserRecord() {
    const currentUser = localStorage.getItem('current_user');
    if (!currentUser) return null;

    const users = getUsersDb();
    const userKey = Object.keys(users).find((key) => key.toLowerCase() === currentUser.toLowerCase());
    if (!userKey) return null;

    return {
        key: userKey,
        user: users[userKey],
        users
    };
}

function getRpgProfileFromState(rpgState) {
    const rpg = normalizeRpgState(rpgState);
    const maxHp = getRpgMaxHp(rpg);
    const attack = getRpgAttackPower(rpg);
    const defense = getRpgDefensePower(rpg);
    const nextLevelXp = getRpgNextLevelXp(rpg);

    return {
        level: rpg.level,
        xp: rpg.xp,
        nextLevelXp,
        hp: Math.min(maxHp, rpg.hp),
        maxHp,
        potions: rpg.potions,
        weaponLevel: rpg.weaponLevel,
        armorLevel: rpg.armorLevel,
        monstersDefeated: rpg.monstersDefeated,
        deaths: rpg.deaths,
        attack,
        defense,
        dodgeRate: getRpgDodgeRate(rpg),
        stats: { ...rpg.stats },
        battleLog: sanitizeBattleLog(rpg.battleLog),
        monsters: RPG_MONSTERS.map((monster) => ({
            ...monster,
            locked: attack < monster.requirement
        })),
        shopItems: RPG_SHOP_ITEMS.map((item) => ({ ...item }))
    };
}

function getCurrentUserProfile() {
    const record = getCurrentUserRecord();
    if (!record) return null;

    const { key, user } = record;
    const activeTitle = POINT_STORE_ITEMS.find((item) => item.id === user.activeTitleId);
    return {
        id: key,
        nickname: user.nickname || key,
        points: Number(user.points || 0),
        lastAttendanceDate: user.lastAttendanceDate || '',
        canAttendToday: (user.lastAttendanceDate || '') !== getTodayAttendanceKey(),
        attendanceStreak: Number(user.attendanceStreak || 0),
        maxAttendanceStreak: Number(user.maxAttendanceStreak || 0),
        unlockedTitles: Array.isArray(user.unlockedTitles) ? user.unlockedTitles : [],
        activeTitleId: user.activeTitleId || '',
        activeTitle: activeTitle ? activeTitle.title : '',
        profileImage: user.profileImage || '',
        profileFocusX: normalizeProfileFocusValue(user.profileFocusX),
        profileFocusY: normalizeProfileFocusValue(user.profileFocusY),
        rpg: getRpgProfileFromState(user.rpg)
    };
}

function claimDailyAttendance() {
    const record = getCurrentUserRecord();
    if (!record) {
        return { ok: false, message: '로그인이 필요합니다.' };
    }

    const todayKey = getTodayAttendanceKey();
    const yesterdayKey = getAttendanceKeyFromOffset(-1);
    const { key, user, users } = record;

    if ((user.lastAttendanceDate || '') === todayKey) {
        return {
            ok: false,
            alreadyClaimed: true,
            points: Number(user.points || 0),
            message: '오늘은 이미 출석체크를 완료했습니다.'
        };
    }

    const basePoints = Math.floor(Math.random() * 3) + 1;
    const nextStreak = (user.lastAttendanceDate || '') === yesterdayKey ? Number(user.attendanceStreak || 0) + 1 : 1;
    const streakBonus = nextStreak > 0 && nextStreak % 7 === 0 ? 2 : 0;
    const earnedPoints = basePoints + streakBonus;
    users[key] = {
        ...user,
        points: Number(user.points || 0) + earnedPoints,
        lastAttendanceDate: todayKey,
        attendanceStreak: nextStreak,
        maxAttendanceStreak: Math.max(Number(user.maxAttendanceStreak || 0), nextStreak)
    };

    localStorage.setItem('users_db', JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('attendance:updated', {
        detail: {
            earnedPoints,
            basePoints,
            streakBonus,
            totalPoints: users[key].points,
            userId: key,
            attendanceStreak: nextStreak
        }
    }));

    return {
        ok: true,
        earnedPoints,
        basePoints,
        streakBonus,
        attendanceStreak: nextStreak,
        totalPoints: users[key].points,
        message: streakBonus > 0
            ? `${earnedPoints}pt를 획득했습니다. 7일 연속 출석 보너스 +${streakBonus}pt!`
            : `${earnedPoints}pt를 획득했습니다.`
    };
}

function getPointStoreItems() {
    return POINT_STORE_ITEMS.map((item) => ({ ...item }));
}

function getCommunityRanking() {
    const users = getUsersDb();

    return Object.keys(users)
        .map((key) => {
            const user = users[key] || {};
            const activeTitle = POINT_STORE_ITEMS.find((item) => item.id === user.activeTitleId);
            return {
                id: key,
                nickname: user.nickname || key,
                points: Number(user.points || 0),
                attendanceStreak: Number(user.attendanceStreak || 0),
                activeTitle: activeTitle ? activeTitle.title : ''
            };
        })
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.attendanceStreak - a.attendanceStreak;
        });
}

function purchaseStoreItem(itemId) {
    const record = getCurrentUserRecord();
    if (!record) return { ok: false, message: '로그인이 필요합니다.' };

    const item = POINT_STORE_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, message: '존재하지 않는 아이템입니다.' };

    const { key, user, users } = record;
    const unlockedTitles = Array.isArray(user.unlockedTitles) ? [...user.unlockedTitles] : [];

    if (unlockedTitles.includes(itemId)) {
        return equipStoreItem(itemId);
    }

    if (Number(user.points || 0) < item.cost) {
        return { ok: false, message: `${item.cost}pt가 필요합니다.` };
    }

    unlockedTitles.push(itemId);
    users[key] = {
        ...user,
        points: Number(user.points || 0) - item.cost,
        unlockedTitles,
        activeTitleId: itemId
    };

    localStorage.setItem('users_db', JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('points:updated', {
        detail: {
            userId: key,
            points: users[key].points,
            activeTitleId: itemId
        }
    }));

    return {
        ok: true,
        purchased: true,
        totalPoints: users[key].points,
        item
    };
}

function equipStoreItem(itemId) {
    const record = getCurrentUserRecord();
    if (!record) return { ok: false, message: '로그인이 필요합니다.' };

    const item = POINT_STORE_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, message: '존재하지 않는 아이템입니다.' };

    const { key, user, users } = record;
    const unlockedTitles = Array.isArray(user.unlockedTitles) ? user.unlockedTitles : [];

    if (!unlockedTitles.includes(itemId)) {
        return { ok: false, message: '먼저 구매해야 장착할 수 있습니다.' };
    }

    users[key] = {
        ...user,
        activeTitleId: itemId
    };

    localStorage.setItem('users_db', JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('points:updated', {
        detail: {
            userId: key,
            points: users[key].points,
            activeTitleId: itemId
        }
    }));

    return {
        ok: true,
        equipped: true,
        item
    };
}

function unequipStoreItem() {
    const record = getCurrentUserRecord();
    if (!record) return { ok: false, message: '로그인이 필요합니다.' };

    const { key, user, users } = record;
    if (!user.activeTitleId) {
        return { ok: false, message: '현재 장착 중인 칭호가 없습니다.' };
    }

    users[key] = {
        ...user,
        activeTitleId: ''
    };

    localStorage.setItem('users_db', JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('points:updated', {
        detail: {
            userId: key,
            points: users[key].points,
            activeTitleId: ''
        }
    }));

    return {
        ok: true,
        unequipped: true
    };
}

function getRpgProfile() {
    const record = getCurrentUserRecord();
    if (!record) return null;
    return getRpgProfileFromState(record.user.rpg);
}

function huntRpgMonster(monsterId) {
    return updateCurrentUserWithRpg(({ user, rpg }) => {
        const monster = RPG_MONSTERS.find((entry) => entry.id === monsterId);
        if (!monster) return { ok: false, message: '존재하지 않는 몬스터입니다.' };

        const attack = getRpgAttackPower(rpg);
        if (attack < monster.requirement) {
            return { ok: false, message: '전투력이 부족합니다. 먼저 강화해 보세요.' };
        }

        const dodgeRate = getRpgDodgeRate(rpg);
        const rawDamage = monster.damage[0] + Math.floor(Math.random() * (monster.damage[1] - monster.damage[0] + 1));
        const mitigatedDamage = Math.max(0, rawDamage - Math.floor(getRpgDefensePower(rpg) / 4));
        const dodged = Math.random() < dodgeRate;
        const damageTaken = dodged ? 0 : mitigatedDamage;
        const reward = monster.reward[0] + Math.floor(Math.random() * (monster.reward[1] - monster.reward[0] + 1));

        rpg.hp = Math.max(0, rpg.hp - damageTaken);

        if (rpg.hp <= 0) {
            const lostPoints = Math.min(Number(user.points || 0), Math.max(3, Math.floor(Number(user.points || 0) * 0.15)));
            rpg.deaths += 1;
            rpg.hp = Math.max(45, Math.floor(getRpgMaxHp(rpg) * 0.45));
            pushRpgBattleLog(rpg, `${monster.name}에게 쓰러져 ${lostPoints}pt를 잃었습니다.`, 'danger');
            return {
                ok: true,
                rpg,
                userPatch: {
                    points: Math.max(0, Number(user.points || 0) - lostPoints)
                },
                eventDetail: {
                    action: 'death',
                    lostPoints
                },
                message: `전투에서 패배했습니다. ${lostPoints}pt를 잃고 마을로 돌아왔습니다.`
            };
        }

        rpg.monstersDefeated += 1;
        rpg.xp += monster.xp;
        const leveledUp = finalizeRpgLevel(rpg);
        pushRpgBattleLog(
            rpg,
            `${monster.name} 처치: +${reward}pt, 피해 ${damageTaken}, 경험치 +${monster.xp}`,
            'success'
        );

        return {
            ok: true,
            rpg,
            userPatch: {
                points: Number(user.points || 0) + reward
            },
            eventDetail: {
                action: 'hunt',
                monsterId,
                reward,
                damageTaken,
                leveledUp
            },
            message: `${monster.name} 처치 성공. ${reward}pt를 획득했습니다.`
        };
    }, 'rpg:updated');
}

function upgradeRpgStat(statKey) {
    return updateCurrentUserWithRpg(({ user, rpg }) => {
        if (!Object.prototype.hasOwnProperty.call(RPG_STAT_LABELS, statKey)) {
            return { ok: false, message: '강화할 수 없는 능력치입니다.' };
        }

        const currentValue = Number(rpg.stats[statKey] || 1);
        const cost = 8 + (currentValue - 1) * 5;
        if (Number(user.points || 0) < cost) {
            return { ok: false, message: `${cost}pt가 필요합니다.` };
        }

        rpg.stats[statKey] = currentValue + 1;
        if (statKey === 'vitality') {
            rpg.hp = Math.min(getRpgMaxHp(rpg), rpg.hp + 18);
        }
        pushRpgBattleLog(rpg, `${RPG_STAT_LABELS[statKey]} 강화에 성공했습니다.`, 'info');

        return {
            ok: true,
            rpg,
            userPatch: {
                points: Number(user.points || 0) - cost
            },
            eventDetail: {
                action: 'upgrade',
                statKey,
                cost
            },
            message: `${RPG_STAT_LABELS[statKey]}이(가) 강화되었습니다.`
        };
    }, 'rpg:updated');
}

function buyRpgShopItem(itemId) {
    return updateCurrentUserWithRpg(({ user, rpg }) => {
        const item = RPG_SHOP_ITEMS.find((entry) => entry.id === itemId);
        if (!item) return { ok: false, message: '존재하지 않는 아이템입니다.' };
        if (Number(user.points || 0) < item.cost) {
            return { ok: false, message: `${item.cost}pt가 필요합니다.` };
        }

        if (item.id === 'potion') {
            rpg.potions += 1;
        }
        pushRpgBattleLog(rpg, `${item.name}을(를) 구매했습니다.`, 'info');

        return {
            ok: true,
            rpg,
            userPatch: {
                points: Number(user.points || 0) - item.cost
            },
            eventDetail: {
                action: 'shop',
                itemId
            },
            message: `${item.name} 구매 완료.`
        };
    }, 'rpg:updated');
}

function useRpgPotion() {
    return updateCurrentUserWithRpg(({ rpg }) => {
        if (rpg.potions <= 0) {
            return { ok: false, message: '보유한 회복약이 없습니다.' };
        }

        const maxHp = getRpgMaxHp(rpg);
        if (rpg.hp >= maxHp) {
            return { ok: false, message: '이미 HP가 가득합니다.' };
        }

        const potion = RPG_SHOP_ITEMS.find((item) => item.id === 'potion');
        const healAmount = potion ? potion.heal : 35;
        const beforeHp = rpg.hp;
        rpg.potions -= 1;
        rpg.hp = Math.min(maxHp, rpg.hp + healAmount);
        pushRpgBattleLog(rpg, `회복약을 사용해 HP를 ${rpg.hp - beforeHp} 회복했습니다.`, 'success');

        return {
            ok: true,
            rpg,
            userPatch: {},
            eventDetail: {
                action: 'use-potion'
            },
            message: '회복약을 사용했습니다.'
        };
    }, 'rpg:updated');
}

function restRpgAtCamp() {
    return updateCurrentUserWithRpg(({ user, rpg }) => {
        const maxHp = getRpgMaxHp(rpg);
        if (rpg.hp >= maxHp) {
            return { ok: false, message: '이미 충분히 쉬었습니다.' };
        }

        const cost = 4;
        if (Number(user.points || 0) < cost) {
            return { ok: false, message: `${cost}pt가 필요합니다.` };
        }

        rpg.hp = maxHp;
        pushRpgBattleLog(rpg, '마을에서 휴식하며 HP를 모두 회복했습니다.', 'info');

        return {
            ok: true,
            rpg,
            userPatch: {
                points: Number(user.points || 0) - cost
            },
            eventDetail: {
                action: 'rest'
            },
            message: '휴식을 마쳤습니다.'
        };
    }, 'rpg:updated');
}

function getInviteCodes() {
    try {
        const codes = JSON.parse(localStorage.getItem('invite_codes') || 'null');
        return Array.isArray(codes) && codes.length ? codes : ['FRIENDS2026'];
    } catch (error) {
        return ['FRIENDS2026'];
    }
}

function checkAuth() {
    const currentUser = localStorage.getItem('current_user');
    const pathname = window.location.pathname.toLowerCase();
    const isLoginPage = pathname.endsWith('login.html');
    const isIndexPage = pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/');

    if (!currentUser && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    if (currentUser && isLoginPage) {
        window.location.href = 'index.html';
        return;
    }

    if (currentUser) {
        try {
            const users = getUsersDb();
            const userKey = Object.keys(users).find((key) => key.toLowerCase() === currentUser.toLowerCase());
            const user = userKey ? users[userKey] : null;
            const isAdmin = currentUser.toLowerCase() === 'admin' || Boolean(user && user.isAdmin);
            const requiresApproval = !isLoginPage && !isIndexPage;

            if (currentUser.toLowerCase() !== 'admin' && user && user.status !== 'regular' && !isAdmin && requiresApproval) {
                alert('승인된 회원만 이용 가능합니다. 관리자 승인 후 다시 시도해 주세요.');
                window.location.href = 'index.html';
                return;
            }

            const gate = getServiceGateForPath(pathname);
            if (gate && !isAdmin) {
                const accessSettings = getServiceAccessSettings();
                const mode = accessSettings[gate.key] || 'open';
                if (mode !== 'open') {
                    alert(getServiceBlockedMessage(gate.label, mode));
                    window.location.href = 'index.html';
                    return;
                }
            }
        } catch (error) {
            console.error('[Auth] 권한 체크 오류:', error);
        }
    }
}

function logout() {
    try {
        syncNotificationsDb(getNotificationsDb(), true);
    } catch (error) {
    }
    localStorage.removeItem('current_user');
    window.location.href = 'login.html';
}

function handleSignup(id, pw, code) {
    if (pw.length < 4) {
        alert('비밀번호는 최소 4자 이상이어야 합니다.');
        return false;
    }

    const validCodes = getInviteCodes();
    const codeIndex = validCodes.indexOf(code);

    if (codeIndex === -1) {
        alert('초대 코드가 올바르지 않습니다.');
        return false;
    }

    const users = getUsersDb();

    if (users[id]) {
        alert('이미 존재하는 아이디입니다.');
        return false;
    }

    const reuseCodes = localStorage.getItem('settings_reuse_code') === 'true';

    users[id] = {
        password: pw,
        status: 'pending',
        signupDate: new Date().toLocaleString('ko-KR'),
        points: 0,
        lastAttendanceDate: '',
        attendanceStreak: 0,
        maxAttendanceStreak: 0,
        unlockedTitles: [],
        activeTitleId: '',
        rpg: createDefaultRpgState()
    };

    localStorage.setItem('users_db', JSON.stringify(users));
    createUserNotification('admin', {
        type: 'signup',
        title: '새 회원 가입 신청',
        message: `${id}님이 가입했고 관리자 승인을 기다리고 있습니다.`,
        link: 'admin.html'
    });

    if (!reuseCodes) {
        validCodes.splice(codeIndex, 1);
        localStorage.setItem('invite_codes', JSON.stringify(validCodes));
    }

    alert('가입이 완료되었습니다. 로그인해 주세요.');
    return true;
}

function handleLogin(id, pw) {
    const normalizedId = (id || '').trim();
    const normalizedPw = (pw || '').trim();
    const users = getUsersDb();
    const userKey = Object.keys(users).find((key) => key.toLowerCase() === normalizedId.toLowerCase());

    if (userKey && users[userKey].password === normalizedPw) {
        users[userKey].lastLogin = new Date().toLocaleString('ko-KR');
        localStorage.setItem('users_db', JSON.stringify(users));
        finalizeLoginSession(userKey);
        return true;
    }

    alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    return false;
}

async function handleSignupRequest(id, pw, code) {
    const normalizedId = String(id || '').trim();
    const normalizedPw = String(pw || '').trim();
    const normalizedCode = String(code || '').trim();

    try {
        const response = await fetch(getAuthApiUrl('/api/auth/signup'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: normalizedId,
                password: normalizedPw,
                code: normalizedCode
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
            throw new Error(result.message || '회원가입에 실패했습니다.');
        }

        if (result.users && typeof result.users === 'object') {
            localStorage.setItem('users_db', JSON.stringify(result.users));
        }
        if (Array.isArray(result.inviteCodes)) {
            localStorage.setItem('invite_codes', JSON.stringify(result.inviteCodes));
        }

        alert('가입이 완료되었습니다. 로그인해 주세요.');
        return true;
    } catch (error) {
        if (getAuthApiBase()) {
            alert(error.message || '회원가입에 실패했습니다.');
            return false;
        }
        return handleSignup(normalizedId, normalizedPw, normalizedCode);
    }
}

async function handleLoginRequest(id, pw) {
    const normalizedId = String(id || '').trim();
    const normalizedPw = String(pw || '').trim();

    try {
        const response = await fetch(getAuthApiUrl('/api/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: normalizedId,
                password: normalizedPw
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false || !result.userId) {
            throw new Error(result.message || '로그인에 실패했습니다.');
        }

        if (result.users && typeof result.users === 'object') {
            localStorage.setItem('users_db', JSON.stringify(result.users));
        }
        finalizeLoginSession(result.userId);
        return true;
    } catch (error) {
        if (getAuthApiBase()) {
            alert(error.message || '로그인에 실패했습니다.');
            return false;
        }
        return handleLogin(normalizedId, normalizedPw);
    }
}

function finalizeLoginSession(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    localStorage.setItem('current_user', normalizedUserId);
    window.dispatchEvent(new CustomEvent('auth:login-success', {
        detail: {
            userId: normalizedUserId
        }
    }));

    const targetUrl = new URL('index.html', window.location.href).href;
    window.location.replace(targetUrl);

    window.setTimeout(() => {
        if (window.location.pathname.toLowerCase().endsWith('login.html')) {
            window.location.href = targetUrl;
        }
    }, 120);
}

function injectLogoutButton() {
    try {
        const currentUser = localStorage.getItem('current_user');
        const pathname = window.location.pathname.toLowerCase();

        if (!currentUser) {
            return;
        }

        const header = document.querySelector('.banner') || document.querySelector('.page-header');
        const heroUtilityNav = document.getElementById('heroUtilityNav');

        const users = getUsersDb();
        const userKey = Object.keys(users).find((key) => key.toLowerCase() === currentUser.toLowerCase());
        const userObj = userKey ? users[userKey] : {};
        const isAdmin = currentUser.toLowerCase() === 'admin' || Boolean(userObj.isAdmin);
        const isRegular = isAdmin || userObj.status === 'regular';
        const displayName = userObj.nickname ? userObj.nickname : currentUser;
        const profileImageUrl = resolveProfileImageUrl(userObj.profileImage || '');
        const profileObjectPosition = getProfileObjectPosition(userObj);
        const avatarHtml = profileImageUrl ? `<img src="${profileImageUrl}" alt="${displayName}" class="hero-avatar" style="object-position:${profileObjectPosition};">` : '';
        const points = Number(userObj.points || 0);
        const activeTitle = POINT_STORE_ITEMS.find((item) => item.id === userObj.activeTitleId);
        const activeTitleHtml = activeTitle ? `<span class="hero-title-badge">${activeTitle.title}</span>` : '';
        const unreadCount = getUnreadNotificationCount(userKey || currentUser);
        const notificationHtml = `<button type="button" class="hero-notice-link" data-notification-toggle onclick="toggleNotificationPanel()"><span>알림</span>${unreadCount > 0 ? `<span class="hero-notice-badge">${unreadCount}</span>` : ''}</button>`;
        const isBoardPage = pathname.includes('board.html');
        const isAiPage = pathname.includes('ai.html');
        const isMountainPage = pathname.includes('mountain.html');
        const isPointsPage = pathname.includes('points.html');
        const isMyPage = pathname.includes('mypage.html');
        const isPatchNotesPage = pathname.includes('patch-notes.html');

        if (heroUtilityNav) {
            let accountLinkHtml = '';

            if (isAdmin) {
                accountLinkHtml = `<a href="admin.html" class="hero-pill admin">관리자 페이지</a>`;
            } else if (isRegular) {
                accountLinkHtml = `<a href="mypage.html" class="hero-pill">마이페이지</a>`;
            } else {
                accountLinkHtml = `<span class="hero-pill pending">승인 대기중</span>`;
            }

            if (isBoardPage) {
                heroUtilityNav.innerHTML = '';
                return;
            }

            if (isAiPage) {
                heroUtilityNav.innerHTML = '';
                return;
            }

            if (isMountainPage) {
                heroUtilityNav.innerHTML = '';
                return;
            }

            if (isPointsPage) {
                heroUtilityNav.innerHTML = '';
                return;
            }

            if (isMyPage) {
                heroUtilityNav.innerHTML = '';
                return;
            }

            if (isPatchNotesPage) {
                heroUtilityNav.innerHTML = '';
                return;
            }

            heroUtilityNav.innerHTML = `
                <a href="patch-notes.html" class="hero-link">패치 노트</a>
                ${accountLinkHtml}
                ${notificationHtml}
                ${activeTitleHtml}
                <a href="points.html" class="hero-points">${points}pt</a>
                ${avatarHtml}
                <span class="hero-user">${displayName}님</span>
                <button onclick="logout()" class="hero-pill danger" type="button">로그아웃</button>
            `;
            return;
        }

        if (!header) {
            return;
        }

        header.style.position = 'relative';

        const userDiv = document.createElement('div');
        userDiv.style.position = 'absolute';
        userDiv.style.top = '25px';
        userDiv.style.right = '25px';
        userDiv.style.display = 'flex';
        userDiv.style.alignItems = 'center';
        userDiv.style.zIndex = '100';
        let myPageBtnHtml = '';

        if (isAdmin) {
            myPageBtnHtml = `<a href="admin.html" style="color:#fcd34d; font-size:0.9rem; margin-right:15px; font-weight:600; text-decoration:none; padding:6px 12px; border:1px solid #fcd34d; border-radius:8px; transition:0.2s;" onmouseover="this.style.background='rgba(252,211,77,0.1)'" onmouseout="this.style.background='transparent'">관리자 페이지</a>`;
        } else if (isRegular) {
            myPageBtnHtml = `<a href="mypage.html" style="color:#60a5fa; font-size:0.9rem; margin-right:15px; font-weight:600; text-decoration:none; padding:6px 12px; border:1px solid #60a5fa; border-radius:8px; transition:0.2s;" onmouseover="this.style.background='rgba(96,165,250,0.1)'" onmouseout="this.style.background='transparent'">마이페이지</a>`;
        } else {
            myPageBtnHtml = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:#94a3b8; font-size:0.85rem; background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">승인 대기중</span>
                    <button onclick="window.forceSync().then(r => r && location.reload())" style="background:none; border:none; color:#60a5fa; cursor:pointer; font-size:0.8rem; text-decoration:underline; padding:0;">새로고침</button>
                </div>
            `;
        }

        userDiv.innerHTML = `
            ${myPageBtnHtml}
            <button onclick="toggleNotificationPanel()" type="button" style="color:#f8efe4; font-size:0.88rem; margin-right:12px; font-weight:700; text-decoration:none; padding:6px 12px; border:1px solid rgba(255,255,255,0.2); border-radius:999px; background:rgba(255,255,255,0.08); cursor:pointer;">알림${unreadCount > 0 ? ` ${unreadCount}` : ''}</button>
            <a href="points.html" style="color:#fde68a; font-size:0.88rem; margin-right:12px; font-weight:700; text-decoration:none; padding:6px 12px; border:1px solid rgba(253,230,138,0.34); border-radius:999px; background:rgba(253,230,138,0.08);">${points}pt</a>
            ${profileImageUrl ? `<img src="${profileImageUrl}" alt="${displayName}" style="width:34px; height:34px; object-fit:cover; object-position:${profileObjectPosition}; border-radius:999px; margin-right:10px; border:1px solid rgba(255,255,255,0.24);">` : ''}
            <span style="color:#e2e8f0; font-size:0.95rem; margin-right:15px; font-weight:500;">${displayName}님</span>
            <button onclick="logout()" style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:6px 16px; border-radius:8px; cursor:pointer; font-weight:600; font-family:inherit; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'">로그아웃</button>
        `;

        header.appendChild(userDiv);
    } catch (error) {
        console.error('[Auth] 로그아웃 버튼 주입 오류:', error);
    }
}

checkAuth();
window.addEventListener('sync:initial-complete', checkAuth);
window.addEventListener('auth:login-success', checkAuth);

window.getCurrentUserProfile = getCurrentUserProfile;
window.claimDailyAttendance = claimDailyAttendance;
window.injectLogoutButton = injectLogoutButton;
window.getPointStoreItems = getPointStoreItems;
window.purchaseStoreItem = purchaseStoreItem;
window.equipStoreItem = equipStoreItem;
window.unequipStoreItem = unequipStoreItem;
window.getCommunityRanking = getCommunityRanking;
window.getRpgProfile = getRpgProfile;
window.huntRpgMonster = huntRpgMonster;
window.upgradeRpgStat = upgradeRpgStat;
window.buyRpgShopItem = buyRpgShopItem;
window.useRpgPotion = useRpgPotion;
window.restRpgAtCamp = restRpgAtCamp;
window.getUserNotifications = getUserNotifications;
window.getUnreadNotificationCount = getUnreadNotificationCount;
window.createUserNotification = createUserNotification;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.toggleNotificationPanel = toggleNotificationPanel;
window.renderNotificationPanel = renderNotificationPanel;
window.openNotificationItem = openNotificationItem;
window.handleSignupRequest = handleSignupRequest;
window.handleLoginRequest = handleLoginRequest;
window.getServiceAccessSettings = getServiceAccessSettings;
window.refreshServiceAccessSettings = refreshServiceAccessSettings;

if (!window.location.pathname.endsWith('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        injectLogoutButton();
        surfaceUnreadNotifications();
        refreshServiceAccessSettings().then(() => {
            checkAuth();
            if (window.location.pathname.toLowerCase().endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                window.dispatchEvent(new CustomEvent('service-access:updated', {
                    detail: getServiceAccessSettings()
                }));
            }
        });
    });
    window.addEventListener('notifications:updated', (event) => {
        injectLogoutButton();
        const detail = event && event.detail ? event.detail : {};
        const currentUser = resolveUserKeyCaseInsensitive(localStorage.getItem('current_user'));
        if (detail.latestNotification && currentUser && currentUser === resolveUserKeyCaseInsensitive(detail.userId)) {
            showNotificationToast(detail.latestNotification, detail.userId);
        }
    });
    window.addEventListener('service-access:updated', checkAuth);
}
