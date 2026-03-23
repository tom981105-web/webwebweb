// mypage.js
(function () {
    function getUsersDb() {
        try {
            return JSON.parse(localStorage.getItem('users_db') || '{}');
        } catch (error) {
            return {};
        }
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
})();
