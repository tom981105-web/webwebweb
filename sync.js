// sync.js
(function () {
    let resolveInitialSync;
    const initialSyncPromise = new Promise((resolve) => {
        resolveInitialSync = resolve;
    });
    function getApiBase() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000';
        }
        return '';
    }

    function getApiUrl(path) {
        return getApiBase() + path;
    }

    function safeStringify(value) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    function writeWithoutSync(key, value) {
        Storage.prototype.setItem.call(localStorage, key, value);
    }

    function applyServerState(db) {
        if (!db || typeof db !== 'object') return;

        Object.keys(db).forEach((key) => {
            if (key === 'current_user' || db[key] === undefined) return;
            writeWithoutSync(key, safeStringify(db[key]));
        });
    }

    async function initialSync() {
        try {
            const response = await fetch(getApiUrl('/api/sync?t=' + Date.now()), { cache: 'no-store' });
            if (!response.ok) return;
            const db = await response.json();
            applyServerState(db);
            window.dispatchEvent(new CustomEvent('sync:initial-complete'));
        } catch (error) {
            console.warn('[Sync] 초기 동기화에 실패했습니다.', error);
        } finally {
            if (typeof resolveInitialSync === 'function') {
                resolveInitialSync(true);
                resolveInitialSync = null;
            }
        }
    }

    async function pushChange(key, value) {
        try {
            await fetch(getApiUrl('/api/sync'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
        } catch (error) {
            console.warn('[Sync] 변경사항 전송에 실패했습니다.', error);
        }
    }

    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
        originalSetItem(key, value);
        if (key === 'current_user') return;
        pushChange(key, value);
    };

    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function (key) {
        originalRemoveItem(key);
        if (key === 'current_user') return;
        pushChange(key, null);
    };

    window.forceSync = async function () {
        try {
            const response = await fetch(getApiUrl('/api/sync?t=' + Date.now()));
            if (!response.ok) return false;
            const db = await response.json();
            applyServerState(db);
            window.dispatchEvent(new CustomEvent('sync:initial-complete'));
            return true;
        } catch (error) {
            console.warn('[Sync] 수동 동기화에 실패했습니다.', error);
            return false;
        }
    };

    window.waitForInitialSync = function () {
        return initialSyncPromise;
    };

    initialSync();
})();
