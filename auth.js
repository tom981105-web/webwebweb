// auth.js

const POINT_STORE_ITEMS = [
    { id: 'forest_scout', title: '숲길 정찰대', cost: 10, description: '첫 번째 포인트 칭호입니다.' },
    { id: 'sunrise_hiker', title: '새벽 등반가', cost: 20, description: '꾸준히 모은 포인트로 열 수 있는 칭호입니다.' },
    { id: 'campfire_host', title: '캠프파이어 호스트', cost: 35, description: '커뮤니티 활동이 눈에 띄는 멤버를 위한 칭호입니다.' }
];

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
            activeTitleId: users[key].activeTitleId || ''
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
        activeTitle: activeTitle ? activeTitle.title : ''
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
            }
        } catch (error) {
            console.error('[Auth] 권한 체크 오류:', error);
        }
    }
}

function logout() {
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
        activeTitleId: ''
    };

    localStorage.setItem('users_db', JSON.stringify(users));

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
        localStorage.setItem('current_user', userKey);
        users[userKey].lastLogin = new Date().toLocaleString('ko-KR');
        localStorage.setItem('users_db', JSON.stringify(users));
        window.location.href = 'index.html';
        return true;
    }

    alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    return false;
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
        const points = Number(userObj.points || 0);
        const activeTitle = POINT_STORE_ITEMS.find((item) => item.id === userObj.activeTitleId);
        const activeTitleHtml = activeTitle ? `<span class="hero-title-badge">${activeTitle.title}</span>` : '';
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
                ${activeTitleHtml}
                <a href="points.html" class="hero-points">${points}pt</a>
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
            <a href="points.html" style="color:#fde68a; font-size:0.88rem; margin-right:12px; font-weight:700; text-decoration:none; padding:6px 12px; border:1px solid rgba(253,230,138,0.34); border-radius:999px; background:rgba(253,230,138,0.08);">${points}pt</a>
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

window.getCurrentUserProfile = getCurrentUserProfile;
window.claimDailyAttendance = claimDailyAttendance;
window.injectLogoutButton = injectLogoutButton;
window.getPointStoreItems = getPointStoreItems;
window.purchaseStoreItem = purchaseStoreItem;
window.equipStoreItem = equipStoreItem;
window.unequipStoreItem = unequipStoreItem;
window.getCommunityRanking = getCommunityRanking;

if (!window.location.pathname.endsWith('login.html')) {
    document.addEventListener('DOMContentLoaded', injectLogoutButton);
}
