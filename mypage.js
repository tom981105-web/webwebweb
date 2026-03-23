// mypage.js
(function () {
    function getUsersDb() {
        try {
            return JSON.parse(localStorage.getItem('users_db') || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveUsersDb(users) {
        localStorage.setItem('users_db', JSON.stringify(users));
    }

    function getApiBase() {
        return window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
    }

    function getApiUrl(path) {
        return `${getApiBase()}${path}`;
    }

    function normalizeProfileDisplayUrl(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';
        if (rawValue.startsWith('data:image/')) return rawValue;

        const localhostMatch = rawValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
        const normalized = localhostMatch ? localhostMatch[1] : rawValue;

        if (/^\/uploads\//i.test(normalized)) {
            return window.location.protocol === 'file:' ? `${getApiBase()}${normalized}` : normalized;
        }

        return /^https?:\/\//i.test(normalized) ? normalized : '';
    }

    function renderProfilePreview(url) {
        const previewWrap = document.getElementById('profileImagePreviewWrap');
        if (!previewWrap) return;

        const normalizedUrl = normalizeProfileDisplayUrl(url);
        if (!normalizedUrl) {
            previewWrap.className = 'profile-image-placeholder';
            previewWrap.textContent = '미리보기';
            return;
        }

        previewWrap.className = 'profile-image-preview';
        previewWrap.innerHTML = `<img src="${normalizedUrl}" alt="프로필 이미지">`;
    }

    function readCurrentUserState() {
        const currentUser = localStorage.getItem('current_user');
        if (!currentUser) return null;

        const users = getUsersDb();
        const userKey = Object.keys(users).find((key) => key.toLowerCase() === currentUser.toLowerCase());
        if (!userKey || !users[userKey]) return null;

        return {
            currentUser: userKey,
            users,
            user: users[userKey]
        };
    }

    async function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
            reader.readAsDataURL(file);
        });
    }

    async function uploadProfileImage(file) {
        const dataUrl = await fileToDataUrl(file);
        const response = await fetch(getApiUrl('/api/uploads/image'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folder: 'profile',
                fileName: file.name || 'profile-image',
                dataUrl
            })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !result.url) {
            throw new Error(result.message || '프로필 이미지를 업로드하지 못했습니다.');
        }

        return result.url;
    }

    async function syncUserPatch(userId, payload) {
        const response = await fetch(getApiUrl(`/api/users/${encodeURIComponent(userId)}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !result.user) {
            throw new Error(result.message || '회원 정보를 저장하지 못했습니다.');
        }

        return {
            userId: result.userId || userId,
            user: result.user
        };
    }

    function applyLocalUserState(userId, user) {
        const users = getUsersDb();
        users[userId] = {
            ...(users[userId] || {}),
            ...user
        };
        saveUsersDb(users);
    }

    function refreshHeaderUser() {
        if (typeof window.injectLogoutButton === 'function') {
            window.injectLogoutButton();
        }
    }

    async function handleProfileImageInput(event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;

        try {
            const savedUrl = await uploadProfileImage(file);
            document.getElementById('profileImageValue').value = savedUrl;
            renderProfilePreview(savedUrl);
        } catch (error) {
            alert(error.message || '프로필 이미지를 업로드하지 못했습니다.');
        } finally {
            event.target.value = '';
        }
    }

    function clearProfileImage() {
        const profileImageValue = document.getElementById('profileImageValue');
        if (profileImageValue) {
            profileImageValue.value = '';
        }
        renderProfilePreview('');
    }

    async function updateProfile() {
        const state = readCurrentUserState();
        if (!state) {
            window.location.href = 'login.html';
            return;
        }

        const nicknameInput = document.getElementById('nicknameInput');
        const profileImageValue = document.getElementById('profileImageValue');
        const nickname = String(nicknameInput.value || '').trim();
        const profileImage = String(profileImageValue.value || '').trim();

        if (!nickname) {
            alert('닉네임을 입력해 주세요.');
            return;
        }

        if (nickname.length < 2) {
            alert('닉네임은 최소 2자 이상이어야 합니다.');
            return;
        }

        try {
            const result = await syncUserPatch(state.currentUser, {
                nickname,
                profileImage
            });

            applyLocalUserState(result.userId, result.user);
            refreshHeaderUser();
            renderProfilePreview(result.user.profileImage || '');
            alert('프로필이 저장되었습니다.');
        } catch (error) {
            alert(error.message || '프로필을 저장하지 못했습니다.');
        }
    }

    async function updatePassword() {
        const state = readCurrentUserState();
        if (!state) {
            window.location.href = 'login.html';
            return;
        }

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

        if (state.user.password !== currentPw) {
            alert('현재 비밀번호가 올바르지 않습니다.');
            return;
        }

        if (currentPw === newPw) {
            alert('현재 비밀번호와 다른 비밀번호를 입력해 주세요.');
            return;
        }

        try {
            const result = await syncUserPatch(state.currentUser, { password: newPw });
            applyLocalUserState(result.userId, result.user);
            alert('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
            logout();
        } catch (error) {
            alert(error.message || '비밀번호를 변경하지 못했습니다.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const state = readCurrentUserState();
        if (!state) {
            window.location.href = 'login.html';
            return;
        }

        const nicknameInput = document.getElementById('nicknameInput');
        const profileImageInput = document.getElementById('profileImageInput');
        const clearButton = document.getElementById('clearProfileImageButton');
        const profileImageValue = document.getElementById('profileImageValue');

        nicknameInput.value = state.user.nickname || state.currentUser;
        profileImageValue.value = state.user.profileImage || '';
        renderProfilePreview(state.user.profileImage || '');

        if (profileImageInput) {
            profileImageInput.addEventListener('change', handleProfileImageInput);
        }

        if (clearButton) {
            clearButton.addEventListener('click', clearProfileImage);
        }
    });

    window.clearProfileImage = clearProfileImage;
    window.updateProfile = updateProfile;
    window.updatePassword = updatePassword;
})();
