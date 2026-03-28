// sync.js
(function () {
    let resolveInitialSync;
    const volatileState = Object.create(null);
    const REMOTE_PUSH_EXCLUDED_KEYS = new Set(['current_user', 'board_posts', 'board_drafts']);
    const VOLATILE_ONLY_KEYS = new Set(['board_posts', 'board_drafts']);
    const quotaLimitedKeys = new Set();
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

    function isQuotaExceededError(error) {
        return !!error && (
            error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            error.code === 22 ||
            error.code === 1014
        );
    }

    function writeWithoutSync(key, value) {
        if (VOLATILE_ONLY_KEYS.has(key) || quotaLimitedKeys.has(key)) {
            volatileState[key] = value;
            return;
        }

        try {
            Storage.prototype.setItem.call(localStorage, key, value);
            delete volatileState[key];
        } catch (error) {
            if (isQuotaExceededError(error)) {
                quotaLimitedKeys.add(key);
                volatileState[key] = value;
                return;
            }
            throw error;
        }
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
    const originalGetItem = localStorage.getItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
        if (VOLATILE_ONLY_KEYS.has(key) || quotaLimitedKeys.has(key)) {
            volatileState[key] = value;
            if (REMOTE_PUSH_EXCLUDED_KEYS.has(key)) return;
            pushChange(key, value);
            return;
        }

        try {
            originalSetItem(key, value);
            delete volatileState[key];
        } catch (error) {
            if (isQuotaExceededError(error)) {
                quotaLimitedKeys.add(key);
                volatileState[key] = value;
            } else {
                throw error;
            }
        }
        if (REMOTE_PUSH_EXCLUDED_KEYS.has(key)) return;
        pushChange(key, value);
    };

    localStorage.getItem = function (key) {
        if (Object.prototype.hasOwnProperty.call(volatileState, key)) {
            return volatileState[key];
        }
        return originalGetItem(key);
    };

    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function (key) {
        delete volatileState[key];
        try {
            originalRemoveItem(key);
        } catch (error) {
            if (!isQuotaExceededError(error)) {
                throw error;
            }
        }
        if (REMOTE_PUSH_EXCLUDED_KEYS.has(key)) return;
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
