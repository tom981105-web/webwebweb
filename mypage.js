// mypage.js
(function () {
    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getUsersDb() {
        try {
            return JSON.parse(localStorage.getItem('users_db') || '{}');
        } catch (error) {
            return {};
        }
    }

    function formatNotificationTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('ko-KR');
    }

    function renderNotifications() {
        const list = document.getElementById('notificationList');
        if (!list || typeof window.getUserNotifications !== 'function') return;

        const notifications = window.getUserNotifications();
        if (!notifications.length) {
            list.innerHTML = '<div class="notification-empty">아직 도착한 알림이 없습니다.</div>';
            return;
        }

        list.innerHTML = notifications.map((item) => `
            <article class="notification-item${item.read ? '' : ' unread'}">
                <div class="notification-copy">
                    <div class="notification-head">
                        <strong>${escapeHtml(item.title)}</strong>
                        ${item.read ? '' : '<span class="notification-badge">새 알림</span>'}
                    </div>
                    <div class="notification-message">${escapeHtml(item.message)}</div>
                    <span class="notification-time">${escapeHtml(formatNotificationTime(item.createdAt))}</span>
                </div>
                <div class="notification-actions">
                    ${item.link ? `<button class="btn-save btn-notification-muted" type="button" onclick="openNotificationLink('${escapeHtml(item.id)}', '${escapeHtml(item.link)}')">바로 보기</button>` : ''}
                    ${item.read ? '' : `<button class="btn-save" type="button" onclick="readNotification('${escapeHtml(item.id)}')">읽음 처리</button>`}
                </div>
            </article>
        `).join('');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const currentUser = localStorage.getItem('current_user');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        const users = getUsersDb();
        const userData = users[currentUser];
        if (userData && userData.nickname) {
            document.getElementById('nicknameInput').value = userData.nickname;
        }

        renderNotifications();
        window.addEventListener('notifications:updated', renderNotifications);

        if (window.location.hash === '#notifications') {
            setTimeout(() => {
                const target = document.getElementById('notifications');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
        }
    });

    window.updateNickname = function () {
        const currentUser = localStorage.getItem('current_user');
        const newNickname = document.getElementById('nicknameInput').value.trim();

        if (!newNickname) {
            alert('닉네임을 입력해 주세요.');
            return;
        }

        if (newNickname.length < 2) {
            alert('닉네임은 최소 2자 이상이어야 합니다.');
            return;
        }

        const users = getUsersDb();
        if (!users[currentUser]) return;
        users[currentUser].nickname = newNickname;
        localStorage.setItem('users_db', JSON.stringify(users));
        alert('닉네임이 저장되었습니다.');
    };

    window.updatePassword = function () {
        const currentUser = localStorage.getItem('current_user');
        const currentPw = document.getElementById('currentPw').value;
        const newPw = document.getElementById('newPw').value;
        const confirmPw = document.getElementById('confirmNewPw').value;

        if (!currentPw || !newPw || !confirmPw) {
            alert('모든 비밀번호 칸을 입력해 주세요.');
            return;
        }

        if (newPw.length < 4) {
            alert('새 비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }

        if (newPw !== confirmPw) {
            alert('새 비밀번호가 서로 일치하지 않습니다.');
            return;
        }

        const users = getUsersDb();
        if (!users[currentUser]) return;

        if (users[currentUser].password !== currentPw) {
            alert('현재 비밀번호가 올바르지 않습니다.');
            return;
        }

        if (currentPw === newPw) {
            alert('현재 비밀번호와 다른 비밀번호를 입력해 주세요.');
            return;
        }

        users[currentUser].password = newPw;
        localStorage.setItem('users_db', JSON.stringify(users));
        alert('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
        logout();
    };

    window.readNotification = function (notificationId) {
        if (typeof window.markNotificationRead === 'function') {
            window.markNotificationRead(notificationId);
            renderNotifications();
        }
    };

    window.markAllMyNotificationsRead = function () {
        if (typeof window.markAllNotificationsRead === 'function') {
            window.markAllNotificationsRead();
            renderNotifications();
        }
    };

    window.openNotificationLink = function (notificationId, link) {
        if (typeof window.markNotificationRead === 'function') {
            window.markNotificationRead(notificationId);
        }
        if (link) {
            window.location.href = link;
        }
    };
})();
