// mypage.js
(function () {
    let isDraggingFocus = false;

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

    function normalizeFocusValue(value) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 50;
    }

    function getFocusPosition() {
        return {
            x: normalizeFocusValue(document.getElementById('profileFocusXValue').value),
            y: normalizeFocusValue(document.getElementById('profileFocusYValue').value)
        };
    }

    function setFocusPosition(x, y) {
        document.getElementById('profileFocusXValue').value = normalizeFocusValue(x);
        document.getElementById('profileFocusYValue').value = normalizeFocusValue(y);
        syncFocusVisual();
    }

    function syncFocusVisual() {
        const focusEditor = document.getElementById('profileFocusEditor');
        const marker = document.getElementById('profileFocusMarker');
        const image = document.getElementById('profileFocusImage');
        const previewWrap = document.getElementById('profileImagePreviewWrap');
        const imageValue = document.getElementById('profileImageValue');
        const normalizedUrl = normalizeProfileDisplayUrl(imageValue.value || '');
        const { x, y } = getFocusPosition();

        if (!normalizedUrl) {
            focusEditor.classList.add('is-empty');
            previewWrap.className = 'profile-image-placeholder';
            previewWrap.textContent = '미리보기';
            return;
        }

        focusEditor.classList.remove('is-empty');
        image.src = normalizedUrl;
        image.style.objectPosition = `${x}% ${y}%`;
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        renderProfilePreview(normalizedUrl, x, y);
    }

    function renderProfilePreview(url, focusX, focusY) {
        const previewWrap = document.getElementById('profileImagePreviewWrap');
        if (!previewWrap) return;

        const normalizedUrl = normalizeProfileDisplayUrl(url);
        if (!normalizedUrl) {
            previewWrap.className = 'profile-image-placeholder';
            previewWrap.textContent = '미리보기';
            return;
        }

        const x = normalizeFocusValue(focusX);
        const y = normalizeFocusValue(focusY);
        previewWrap.className = 'profile-image-preview';
        previewWrap.innerHTML = `<img src="${normalizedUrl}" alt="프로필 이미지" style="object-position:${x}% ${y}%;">`;
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
            setFocusPosition(50, 50);
        } catch (error) {
            alert(error.message || '프로필 이미지를 업로드하지 못했습니다.');
        } finally {
            event.target.value = '';
        }
    }

    function clearProfileImage() {
        document.getElementById('profileImageValue').value = '';
        document.getElementById('profileFocusXValue').value = '50';
        document.getElementById('profileFocusYValue').value = '50';
        syncFocusVisual();
    }

    function moveFocusFromEvent(event) {
        const focusEditor = document.getElementById('profileFocusEditor');
        if (!focusEditor || focusEditor.classList.contains('is-empty')) return;

        const rect = focusEditor.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setFocusPosition(x, y);
    }

    function startFocusDrag(event) {
        const focusEditor = document.getElementById('profileFocusEditor');
        if (!focusEditor || focusEditor.classList.contains('is-empty')) return;
        isDraggingFocus = true;
        moveFocusFromEvent(event);
        event.preventDefault();
    }

    function handleFocusDrag(event) {
        if (!isDraggingFocus) return;
        moveFocusFromEvent(event);
    }

    function stopFocusDrag() {
        isDraggingFocus = false;
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
        const { x, y } = getFocusPosition();

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
                profileImage,
                profileFocusX: x,
                profileFocusY: y
            });

            applyLocalUserState(result.userId, result.user);
            refreshHeaderUser();
            setFocusPosition(result.user.profileFocusX, result.user.profileFocusY);
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
        const profileFocusEditor = document.getElementById('profileFocusEditor');

        nicknameInput.value = state.user.nickname || state.currentUser;
        document.getElementById('profileImageValue').value = state.user.profileImage || '';
        document.getElementById('profileFocusXValue').value = normalizeFocusValue(state.user.profileFocusX);
        document.getElementById('profileFocusYValue').value = normalizeFocusValue(state.user.profileFocusY);
        syncFocusVisual();

        if (profileImageInput) {
            profileImageInput.addEventListener('change', handleProfileImageInput);
        }

        if (clearButton) {
            clearButton.addEventListener('click', clearProfileImage);
        }

        if (profileFocusEditor) {
            profileFocusEditor.addEventListener('mousedown', startFocusDrag);
        }

        document.addEventListener('mousemove', handleFocusDrag);
        document.addEventListener('mouseup', stopFocusDrag);
    });

    window.clearProfileImage = clearProfileImage;
    window.updateProfile = updateProfile;
    window.updatePassword = updatePassword;
})();
