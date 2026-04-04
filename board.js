// board.js
(function () {
    function getApiBase() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000';
        }
        return '';
    }

    function getApiUrl(path) {
        return getApiBase() + path;
    }

    function safeParse(value, fallback) {
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    }

    function clampNumber(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    let boardPosts = safeParse(localStorage.getItem('board_posts') || '[]', []);
    const currentUser = localStorage.getItem('current_user') || '익명';
    let currentOpenPostId = null;
    let likedPosts = safeParse(localStorage.getItem('liked_posts') || '[]', []);
    let dislikedPosts = safeParse(localStorage.getItem('disliked_posts') || '[]', []);
    const defaultBoardCategories = ['카테고리 1', '카테고리 2', '카테고리 3', '카테고리 4'];
    let boardCategories = defaultBoardCategories.slice();
    let activeCategory = boardCategories[0];
    let currentSearchType = 'title';
    let currentSearchQuery = '';
    let currentSortType = 'latest';
    let currentEditingPostId = null;
    let selectedEditorImage = null;
    let isResizingImage = false;
    let resizeStartX = 0;
    let resizeStartWidth = 0;
    let boardReady = false;
    let boardDraftSaveTimer = null;
    let boardDraftIntervalId = null;
    let boardDraftRemoteTimer = null;
    let boardDraftRestoreToken = 0;
    let boardDraftRemoteChain = Promise.resolve();
    const BOARD_DRAFT_STORAGE_PREFIX = 'board_draft_';
    const inMemoryBoardDrafts = Object.create(null);
    const boardDraftRemoteFingerprints = Object.create(null);
    const boardDraftRemoteVersions = Object.create(null);

    function clearLegacyBoardStorageCaches() {
        const removeKeys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (!key) continue;
            if (key === 'board_posts' || key.startsWith(BOARD_DRAFT_STORAGE_PREFIX)) {
                removeKeys.push(key);
            }
        }
        removeKeys.forEach((key) => Storage.prototype.removeItem.call(localStorage, key));

        const removeSessionKeys = [];
        for (let index = 0; index < sessionStorage.length; index += 1) {
            const key = sessionStorage.key(index);
            if (!key) continue;
            if (key.startsWith(BOARD_DRAFT_STORAGE_PREFIX)) {
                removeSessionKeys.push(key);
            }
        }
        removeSessionKeys.forEach((key) => Storage.prototype.removeItem.call(sessionStorage, key));
    }

    clearLegacyBoardStorageCaches();

    function getBoardDraftStorageKey(postId = currentEditingPostId) {
        return `${BOARD_DRAFT_STORAGE_PREFIX}${currentUser}_${postId ? `edit_${postId}` : 'new'}`;
    }

    function parseDraftUpdatedAt(draft) {
        const timestamp = Date.parse(draft && draft.updatedAt ? draft.updatedAt : '');
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function getBoardDraftFingerprint(draft) {
        if (!draft) return '';
        return JSON.stringify([
            draft.postId || null,
            draft.title || '',
            draft.content || '',
            draft.category || '',
            Boolean(draft.isNotice)
        ]);
    }

    function buildCurrentBoardDraft() {
        const writeModal = document.getElementById('writeModal');
        if (!writeModal || writeModal.style.display !== 'block') return null;

        const titleInput = document.getElementById('postTitle');
        const editor = document.getElementById('richEditor');
        const categoryInput = document.getElementById('postCategory');
        const noticeInput = document.getElementById('isNotice');
        if (!titleInput || !editor || !categoryInput) return null;

        const title = titleInput.value.trim();
        const content = normalizeContentForStorage(editor.innerHTML.trim());
        const isEffectivelyEmpty = !title && (!content || content === '<p><br></p>');
        if (isEffectivelyEmpty) return null;

        return {
            userId: currentUser,
            postId: currentEditingPostId || null,
            title,
            content,
            category: categoryInput.value || activeCategory,
            isNotice: Boolean(noticeInput && noticeInput.checked),
            updatedAt: new Date().toISOString()
        };
    }

    function readBoardDraft(postId = currentEditingPostId) {
        const storageKey = getBoardDraftStorageKey(postId);
        const rawValue = inMemoryBoardDrafts[storageKey];
        return safeParse(rawValue || 'null', null);
    }

    function cacheBoardDraftLocally(draft, postId = currentEditingPostId) {
        const storageKey = getBoardDraftStorageKey(postId);
        const serializedDraft = JSON.stringify(draft);
        inMemoryBoardDrafts[storageKey] = serializedDraft;
    }

    async function fetchBoardDraftFromServer(postId = currentEditingPostId) {
        const params = new URLSearchParams({ user: currentUser });
        if (postId) params.set('postId', String(postId));
        const response = await fetch(getApiUrl(`/api/board/drafts?${params.toString()}`), {
            cache: 'no-store'
        });

        let result = {};
        try {
            result = await response.json();
        } catch (error) {
        }

        if (!response.ok || result.success === false) {
            throw new Error(result.message || '임시저장 데이터를 불러오지 못했습니다.');
        }

        return result.draft || null;
    }

    async function saveBoardDraftToServer(draft, options = {}) {
        if (!draft) return;
        const body = JSON.stringify({
            userId: currentUser,
            postId: draft.postId || null,
            title: draft.title || '',
            content: draft.content || '',
            category: draft.category || activeCategory,
            isNotice: Boolean(draft.isNotice),
            updatedAt: draft.updatedAt || new Date().toISOString()
        });

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        };

        if (options.keepalive && body.length < 60000) {
            requestOptions.keepalive = true;
        }

        const response = await fetch(getApiUrl('/api/board/drafts'), requestOptions);
        if (!response.ok) {
            let result = {};
            try {
                result = await response.json();
            } catch (error) {
            }
            throw new Error(result.message || '임시저장 데이터를 서버에 저장하지 못했습니다.');
        }
    }

    async function deleteBoardDraftFromServer(postId = currentEditingPostId, options = {}) {
        const params = new URLSearchParams({ user: currentUser });
        if (postId) params.set('postId', String(postId));
        const requestOptions = { method: 'DELETE' };
        if (options.keepalive) {
            requestOptions.keepalive = true;
        }
        await fetch(getApiUrl(`/api/board/drafts?${params.toString()}`), requestOptions);
    }

    function queueRemoteBoardDraftSave(draft, options = {}) {
        if (!draft) return;
        const storageKey = getBoardDraftStorageKey(draft.postId);
        const fingerprint = getBoardDraftFingerprint(draft);
        const version = boardDraftRemoteVersions[storageKey] || 0;
        if (!options.force && boardDraftRemoteFingerprints[storageKey] === fingerprint) {
            return;
        }

        const runSave = () => {
            boardDraftRemoteChain = boardDraftRemoteChain.then(async () => {
                if ((boardDraftRemoteVersions[storageKey] || 0) !== version) {
                    return;
                }
                try {
                    await saveBoardDraftToServer(draft, options);
                    boardDraftRemoteFingerprints[storageKey] = fingerprint;
                } catch (error) {
                    console.warn('[Board] 서버 임시저장에 실패했습니다.', error);
                }
            });
        };

        if (options.immediate) {
            runSave();
            return;
        }

        window.clearTimeout(boardDraftRemoteTimer);
        boardDraftRemoteTimer = window.setTimeout(runSave, 350);
    }

    async function hydrateBoardDraftFromServer(postId = currentEditingPostId) {
        const restoreToken = ++boardDraftRestoreToken;
        const localDraft = readBoardDraft(postId);

        try {
            const remoteDraft = await fetchBoardDraftFromServer(postId);
            const writeModal = document.getElementById('writeModal');
            if (!writeModal || writeModal.style.display !== 'block' || restoreToken !== boardDraftRestoreToken) {
                return false;
            }
            if ((postId || null) !== (currentEditingPostId || null)) {
                return false;
            }
            if (!remoteDraft) {
                return Boolean(localDraft);
            }

            const remoteFingerprint = getBoardDraftFingerprint(remoteDraft);
            boardDraftRemoteFingerprints[getBoardDraftStorageKey(postId)] = remoteFingerprint;
            cacheBoardDraftLocally(remoteDraft, postId);

            if (!localDraft || parseDraftUpdatedAt(remoteDraft) >= parseDraftUpdatedAt(localDraft)) {
                const titleInput = document.getElementById('postTitle');
                const editor = document.getElementById('richEditor');
                const categoryInput = document.getElementById('postCategory');
                const noticeInput = document.getElementById('isNotice');
                if (!titleInput || !editor || !categoryInput) return false;

                titleInput.value = remoteDraft.title || '';
                editor.innerHTML = resolveContentForDisplay(remoteDraft.content || '<p><br></p>');
                categoryInput.value = remoteDraft.category || activeCategory;
                if (noticeInput) noticeInput.checked = Boolean(remoteDraft.isNotice);
                bindEditorImages();
                return true;
            }
        } catch (error) {
            console.warn('[Board] 서버 임시저장을 불러오지 못했습니다.', error);
        }

        return Boolean(localDraft);
    }

    function clearBoardDraft(postId = currentEditingPostId, options = {}) {
        const storageKey = getBoardDraftStorageKey(postId);
        const hadDraft = Boolean(
            inMemoryBoardDrafts[storageKey]
            || boardDraftRemoteFingerprints[storageKey]
            || options.force
        );

        boardDraftRemoteVersions[storageKey] = (boardDraftRemoteVersions[storageKey] || 0) + 1;
        window.clearTimeout(boardDraftRemoteTimer);
        delete inMemoryBoardDrafts[storageKey];
        delete boardDraftRemoteFingerprints[storageKey];

        if (options.remote !== false && hadDraft) {
            void deleteBoardDraftFromServer(postId, {
                keepalive: Boolean(options.keepalive)
            }).catch((error) => {
                console.warn('[Board] 서버 임시저장 삭제에 실패했습니다.', error);
            });
        }
    }

    function persistBoardDraft(options = {}) {
        const draft = buildCurrentBoardDraft();
        if (!draft) {
            clearBoardDraft(currentEditingPostId, {
                remote: options.remote !== false,
                keepalive: Boolean(options.keepalive)
            });
            return null;
        }

        cacheBoardDraftLocally(draft, currentEditingPostId);
        if (options.remote !== false) {
            queueRemoteBoardDraftSave(draft, {
                immediate: Boolean(options.immediateRemote),
                keepalive: Boolean(options.keepalive),
                force: Boolean(options.forceRemote)
            });
        }
        return draft;
    }

    function queueBoardDraftSave() {
        window.clearTimeout(boardDraftSaveTimer);
        boardDraftSaveTimer = window.setTimeout(persistBoardDraft, 150);
    }

    function startBoardDraftInterval() {
        window.clearInterval(boardDraftIntervalId);
        boardDraftIntervalId = window.setInterval(() => {
            persistBoardDraft();
        }, 3000);
    }

    function stopBoardDraftInterval() {
        window.clearInterval(boardDraftIntervalId);
        boardDraftIntervalId = null;
    }

    function restoreBoardDraft(postId = currentEditingPostId) {
        const draft = readBoardDraft(postId);
        if (!draft) return false;

        const titleInput = document.getElementById('postTitle');
        const editor = document.getElementById('richEditor');
        const categoryInput = document.getElementById('postCategory');
        const noticeInput = document.getElementById('isNotice');
        if (!titleInput || !editor || !categoryInput) return false;

        titleInput.value = draft.title || '';
        editor.innerHTML = resolveContentForDisplay(draft.content || '<p><br></p>');
        categoryInput.value = draft.category || activeCategory;
        if (noticeInput) noticeInput.checked = Boolean(draft.isNotice);
        bindEditorImages();
        return true;
    }

    function ensureBoardReady() {
        if (boardReady) return true;
        alert('잠시만 기다려주시면 곧 게시물이 올라옵니다.');
        return false;
    }

    function getUsersDb() {
        return safeParse(localStorage.getItem('users_db') || '{}', {});
    }

    function normalizeProfileImageUrl(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';
        const localhostMatch = rawValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
        const normalized = localhostMatch ? localhostMatch[1] : rawValue;
        if (/^\/uploads\//i.test(normalized)) {
            return window.location.protocol === 'file:' ? `${getApiBase()}${normalized}` : normalized;
        }
        return /^https?:\/\//i.test(normalized) ? normalized : '';
    }

    function normalizeProfileFocusValue(value) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 50;
    }

    function getUserProfileMeta(userId) {
        const users = getUsersDb();
        const author = String(userId || '').trim();
        const user = users[author] || {};
        return {
            name: user.nickname || author || '익명',
            image: normalizeProfileImageUrl(user.profileImage || ''),
            focusX: normalizeProfileFocusValue(user.profileFocusX),
            focusY: normalizeProfileFocusValue(user.profileFocusY)
        };
    }

    function loadBoardCategories() {
        const saved = safeParse(localStorage.getItem('board_categories') || '[]', []);
        if (Array.isArray(saved) && saved.length === 4) {
            const normalized = saved.map((item, index) => String(item || '').trim() || defaultBoardCategories[index]);
            boardCategories = normalized;
        } else {
            boardCategories = defaultBoardCategories.slice();
        }
        if (!boardCategories.includes(activeCategory)) {
            activeCategory = boardCategories[0];
        }
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
            reader.readAsDataURL(file);
        });
    }

    async function uploadInlineImage(file) {
        const dataUrl = await fileToDataUrl(file);
        const response = await fetch(getApiUrl('/api/uploads/image'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder: 'board-inline',
                fileName: file.name || '',
                dataUrl
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false || !result.url) {
            throw new Error(result.message || '이미지 업로드에 실패했습니다.');
        }
        return result.url;
    }

    function normalizeStoredUploadUrl(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';
        const localhostMatch = rawValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
        if (localhostMatch) return localhostMatch[1];
        return rawValue;
    }

    function normalizeContentForStorage(html) {
        return String(html || '').replace(/https?:\/\/localhost:\d+(\/uploads\/[^"' )]+)/gi, '$1');
    }

    function resolveContentForDisplay(html) {
        const content = String(html || '');
        if (window.location.protocol !== 'file:') return content;
        return content.replace(/(["'])\/uploads\/([^"')\s>]+)\1/gi, (match, quote, pathValue) => {
            return `${quote}${getApiBase()}/uploads/${pathValue}${quote}`;
        });
    }

    function readPixelValue(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue || /min\(|max\(|calc\(/i.test(rawValue)) return NaN;
        const parsed = Number.parseFloat(rawValue.replace(/px$/i, ''));
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    function getImageContainer(target) {
        return target ? target.closest('#richEditor, #detailContent, .post-detail-body') : null;
    }

    function getImageContainerWidth(target) {
        const container = getImageContainer(target);
        return Math.max(220, container ? container.clientWidth : 860);
    }

    function getStoredImageWidth(target, fallbackWidth = 820) {
        if (!target) return fallbackWidth;
        const containerWidth = getImageContainerWidth(target);
        const dataWidth = Number.parseFloat(target.dataset.imageWidth || '');
        const attrWidth = Number.parseFloat(target.getAttribute('width') || '');
        const styleWidth = readPixelValue(target.style.width);
        const rectWidth = target.getBoundingClientRect ? target.getBoundingClientRect().width : NaN;
        const width = Number.isFinite(dataWidth)
            ? dataWidth
            : Number.isFinite(attrWidth)
                ? attrWidth
            : Number.isFinite(styleWidth)
                ? styleWidth
                : Number.isFinite(rectWidth) && rectWidth > 0
                    ? rectWidth
                    : Math.min(containerWidth, fallbackWidth);
        return clampNumber(width, 140, containerWidth);
    }

    function getStoredImagePosition(target, width) {
        if (!target) return 50;
        const containerWidth = getImageContainerWidth(target);
        const dataPosition = Number.parseFloat(target.dataset.imagePosition || '');
        if (Number.isFinite(dataPosition)) {
            return clampNumber(dataPosition, 0, 100);
        }

        const marginLeft = readPixelValue(target.style.marginLeft);
        const available = Math.max(0, containerWidth - width);
        if (Number.isFinite(marginLeft) && available > 0) {
            return clampNumber((marginLeft / available) * 100, 0, 100);
        }

        return 50;
    }

    function applyEditorImageLayout(target, options = {}) {
        if (!target) return;

        const containerWidth = options.containerWidth || getImageContainerWidth(target);
        const width = clampNumber(
            Number.isFinite(options.width) ? options.width : getStoredImageWidth(target),
            140,
            containerWidth
        );
        const position = clampNumber(
            Number.isFinite(options.position) ? options.position : getStoredImagePosition(target, width),
            0,
            100
        );
        const available = Math.max(0, containerWidth - width);
        const marginLeft = available * (position / 100);

        target.dataset.imageWidth = String(Math.round(width));
        target.dataset.imagePosition = String(Math.round(position));
        target.setAttribute('width', String(Math.round(width)));
        target.classList.add('editor-inline-image');
        target.style.setProperty('width', `${Math.round(width)}px`, 'important');
        target.style.maxWidth = '100%';
        target.style.height = 'auto';
        target.style.display = 'block';
        target.style.borderRadius = '8px';
        target.style.marginTop = '18px';
        target.style.marginBottom = '18px';
        target.style.setProperty('margin-left', `${Math.round(marginLeft)}px`, 'important');
        target.style.setProperty('margin-right', '0', 'important');
        target.style.objectFit = 'contain';
    }

    function normalizeEditorImagesForSave(editor) {
        if (!editor) return;
        const containerWidth = editor.clientWidth || getImageContainerWidth(editor);
        editor.querySelectorAll('img').forEach((img) => {
            const computedWidth = getStoredImageWidth(img);
            const computedPosition = getStoredImagePosition(img, computedWidth);
            applyEditorImageLayout(img, {
                width: computedWidth,
                position: computedPosition,
                containerWidth
            });
        });
    }

    function applyContentImageLayouts(container) {
        if (!container) return;
        container.querySelectorAll('img').forEach((img) => {
            applyEditorImageLayout(img, {
                containerWidth: container.clientWidth || getImageContainerWidth(img)
            });
            img.classList.remove('selected-editor-image');
            img.style.outline = '';
            img.style.boxShadow = '';
            img.style.cursor = 'default';
        });
    }

    function normalizeLinkHref(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';
        return /^www\./i.test(rawValue) ? `https://${rawValue}` : rawValue;
    }

    function splitTrailingPunctuation(value) {
        let core = String(value || '');
        let trailing = '';
        while (/[)\],.!?]$/.test(core)) {
            trailing = core.slice(-1) + trailing;
            core = core.slice(0, -1);
        }
        return { core, trailing };
    }

    function createLinkifiedTextFragment(text) {
        const source = String(text || '');
        const pattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(source)) !== null) {
            const matchedText = match[0];
            const startIndex = match.index;
            const { core, trailing } = splitTrailingPunctuation(matchedText);

            if (startIndex > lastIndex) {
                fragment.appendChild(document.createTextNode(source.slice(lastIndex, startIndex)));
            }

            const anchor = document.createElement('a');
            anchor.href = normalizeLinkHref(core);
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.textContent = core;
            fragment.appendChild(anchor);

            if (trailing) {
                fragment.appendChild(document.createTextNode(trailing));
            }

            lastIndex = startIndex + matchedText.length;
        }

        if (lastIndex === 0) return null;
        if (lastIndex < source.length) {
            fragment.appendChild(document.createTextNode(source.slice(lastIndex)));
        }
        return fragment;
    }

    function linkifyRichHtml(html) {
        const container = document.createElement('div');
        container.innerHTML = resolveContentForDisplay(html);

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (['A', 'SCRIPT', 'STYLE', 'TEXTAREA', 'IFRAME', 'BUTTON'].includes(parent.nodeName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return /(?:https?:\/\/|www\.)/i.test(node.nodeValue || '')
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });

        const targets = [];
        while (walker.nextNode()) {
            targets.push(walker.currentNode);
        }

        targets.forEach((node) => {
            const fragment = createLinkifiedTextFragment(node.nodeValue || '');
            if (fragment && node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        });

        return container.innerHTML;
    }

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const COMMENT_STICKERS = [
    { id: 'basic-1-smile', label: '미소', emoji: '🙂', group: 'basic-1' },
    { id: 'basic-1-happy', label: '해맑음', emoji: '😄', group: 'basic-1' },
    { id: 'basic-1-blush', label: '방긋', emoji: '😊', group: 'basic-1' },
    { id: 'basic-1-kiss', label: '쪽', emoji: '😘', group: 'basic-1' },
    { id: 'basic-1-love', label: '하트눈', emoji: '😍', group: 'basic-1' },
    { id: 'basic-1-soft', label: '수줍', emoji: '☺️', group: 'basic-1' },
    { id: 'basic-1-wink', label: '윙크', emoji: '😉', group: 'basic-1' },
    { id: 'basic-1-tongue', label: '메롱', emoji: '😛', group: 'basic-1' },
    { id: 'basic-1-lol', label: '빵터짐', emoji: '😂', group: 'basic-1' },
    { id: 'basic-1-cool', label: '쿨', emoji: '😎', group: 'basic-1' },
    { id: 'basic-1-dizzy', label: '멍', emoji: '😵', group: 'basic-1' },
    { id: 'basic-1-sick', label: '울렁', emoji: '🤢', group: 'basic-1' },
    { id: 'basic-1-gasp', label: '헉', emoji: '😮', group: 'basic-1' },
    { id: 'basic-1-worried', label: '걱정', emoji: '😟', group: 'basic-1' },
    { id: 'basic-1-shock', label: '충격', emoji: '😳', group: 'basic-1' },
    { id: 'basic-1-sad', label: '시무룩', emoji: '☹️', group: 'basic-1' },
    { id: 'basic-1-angry', label: '화남', emoji: '😠', group: 'basic-1' },
    { id: 'basic-1-hurt', label: '다침', emoji: '🤕', group: 'basic-1' },
    { id: 'basic-1-blue', label: '우울', emoji: '😞', group: 'basic-1' },
    { id: 'basic-1-cry', label: '엉엉', emoji: '😭', group: 'basic-1' }
];

const COMMENT_STICKER_TABS = [
    { id: 'recent', label: '최근사용', icon: '🕘' },
    { id: 'basic-1', label: '기본-1', icon: '🙂' }
];

const COMMENT_STICKER_RECENT_KEY = 'comment_recent_stickers';

function getStickerToken(id) {
    return `[[sticker:${id}]]`;
}

function getStickerDefinition(id) {
    return COMMENT_STICKERS.find((item) => item.id === id) || null;
}

function getRecentStickerIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem(COMMENT_STICKER_RECENT_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((id) => getStickerDefinition(id)) : [];
    } catch (error) {
        return [];
    }
}

function pushRecentSticker(stickerId) {
    const nextRecent = [stickerId, ...getRecentStickerIds().filter((id) => id !== stickerId)].slice(0, 12);
    localStorage.setItem(COMMENT_STICKER_RECENT_KEY, JSON.stringify(nextRecent));
}

function getStickerListByTab(tabId) {
    if (tabId === 'recent') {
        return getRecentStickerIds().map((id) => getStickerDefinition(id)).filter(Boolean);
    }
    return COMMENT_STICKERS.filter((item) => item.group === tabId);
}

function getStickerAssetUrl(emoji) {
    const codepoints = Array.from(emoji)
        .map((char) => char.codePointAt(0).toString(16))
        .filter((codepoint) => codepoint !== 'fe0f')
        .join('-');
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints}.png`;
}

function renderStickerImage(id, sizeClass = '') {
    const sticker = getStickerDefinition(id);
    if (!sticker) return '';
    const className = ['comment-sticker-image', sizeClass].filter(Boolean).join(' ');
    return `<img class="${className}" src="${getStickerAssetUrl(sticker.emoji)}" alt="${escapeHtml(sticker.label)}" title="${escapeHtml(sticker.label)}" loading="lazy">`;
}

function renderCommentRichText(value) {
    const text = String(value || '');
    const escaped = escapeHtml(text);
    return escaped
        .replace(/\[\[sticker:([a-z0-9_-]+)\]\]/gi, (match, id) => renderStickerImage(id))
        .replace(/\n/g, '<br>');
}

function renderStickerPanelBody(tabId) {
    const stickers = getStickerListByTab(tabId);
    const tabMeta = COMMENT_STICKER_TABS.find((item) => item.id === tabId) || COMMENT_STICKER_TABS[0];
    if (!stickers.length) {
        return `
            <div class="comment-sticker-section-title">${escapeHtml(tabMeta.label)}</div>
            <div class="comment-sticker-empty">아직 최근에 사용한 스티커가 없습니다.</div>
        `;
    }

    return `
        <div class="comment-sticker-section-title">${escapeHtml(tabMeta.label)}</div>
        <div class="comment-sticker-grid">
            ${stickers.map((sticker) => `
                <button type="button" class="comment-sticker-option" data-sticker-id="${sticker.id}" title="${escapeHtml(sticker.label)}">
                    ${renderStickerImage(sticker.id)}
                </button>
            `).join('')}
        </div>
    `;
}

function resetPendingCommentStickers() {
    return;
}

function closeCommentStickerPanel() {
    const panel = document.getElementById('commentStickerPanel');
    const toggle = document.getElementById('commentStickerToggle');
    if (!panel || !toggle) return;
    panel.classList.remove('is-open');
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
}

function openCommentStickerPanel() {
    const panel = document.getElementById('commentStickerPanel');
    const toggle = document.getElementById('commentStickerToggle');
    if (!panel || !toggle) return;
    panel.classList.add('is-open');
    toggle.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
}

function setupCommentStickerPicker() {
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    if (!commentForm || !commentInput || document.getElementById('commentStickerToggle')) return;

    commentForm.classList.add('comment-form-has-sticker');

    const input = commentInput;
    const submitButton = commentForm.querySelector('button[type="submit"]');
    const stickerButton = document.createElement('button');
    stickerButton.type = 'button';
    stickerButton.id = 'commentStickerToggle';
    stickerButton.className = 'comment-sticker-toggle';
    stickerButton.setAttribute('aria-expanded', 'false');
    stickerButton.setAttribute('aria-label', '스티커 선택');
    stickerButton.innerHTML = '<span aria-hidden="true">😊</span>';

    if (submitButton) {
        commentForm.insertBefore(stickerButton, submitButton);
    } else {
        commentForm.appendChild(stickerButton);
    }

    const panel = document.createElement('div');
    panel.id = 'commentStickerPanel';
    panel.className = 'comment-sticker-panel';
    panel.innerHTML = `
        <div class="comment-sticker-tabs">
            ${COMMENT_STICKER_TABS.map((tab, index) => `
                <button type="button" class="comment-sticker-tab ${index === 0 ? 'is-active' : ''}" data-sticker-tab="${tab.id}" title="${escapeHtml(tab.label)}">
                    <span>${tab.icon}</span>
                </button>
            `).join('')}
        </div>
        <div class="comment-sticker-body" id="commentStickerBody">
            ${renderStickerPanelBody('basic-1')}
        </div>
    `;

    commentForm.appendChild(panel);

    stickerButton.addEventListener('click', () => {
        if (panel.classList.contains('is-open')) {
            closeCommentStickerPanel();
        } else {
            openCommentStickerPanel();
        }
    });
    const panelBody = panel.querySelector('#commentStickerBody');

    panel.addEventListener('click', (event) => {
        const tabButton = event.target.closest('[data-sticker-tab]');
        if (tabButton) {
            const nextTab = tabButton.getAttribute('data-sticker-tab');
            panel.querySelectorAll('[data-sticker-tab]').forEach((button) => {
                button.classList.toggle('is-active', button === tabButton);
            });
            if (panelBody) panelBody.innerHTML = renderStickerPanelBody(nextTab);
            return;
        }

        const option = event.target.closest('[data-sticker-id]');
        if (!option) return;
        const stickerId = option.getAttribute('data-sticker-id');
        if (!getStickerDefinition(stickerId)) return;
        pushRecentSticker(stickerId);
        const token = getStickerToken(stickerId);
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        input.value = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
        const nextCursor = start + token.length;
        input.setSelectionRange(nextCursor, nextCursor);
        closeCommentStickerPanel();
        input.focus();
    });

    document.addEventListener('click', (event) => {
        if (!commentForm.contains(event.target)) {
            closeCommentStickerPanel();
        }
    });
}

    function savePosts() {
        // Board posts are now protected through server APIs and server-side snapshots.
        // Avoid browser storage writes here so very large post bodies or many images
        // never trigger repeated localStorage quota warnings during normal editing.
    }

    async function persistPostToServer(payload) {
        const isEditing = Boolean(currentEditingPostId);
        const response = await fetch(getApiUrl(isEditing ? `/api/board/posts/${currentEditingPostId}` : '/api/board/posts'), {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let result = {};
        try {
            result = await response.json();
        } catch (error) {
        }

        if (!response.ok || !result.post) {
            throw new Error(result.message || '게시글 저장에 실패했습니다.');
        }

        return normalizePost(result.post);
    }

    async function fetchBoardPostsFromServer() {
        const response = await fetch(getApiUrl('/api/board/posts'), { cache: 'no-store' });
        let result = {};
        try {
            result = await response.json();
        } catch (error) {
        }

        if (!response.ok || !Array.isArray(result.posts)) {
            throw new Error(result.message || '게시글 목록을 불러오지 못했습니다.');
        }

        return result.posts.map(normalizePost);
    }

    async function fetchBoardMetaFromServer() {
        const response = await fetch(getApiUrl('/api/board/meta'), { cache: 'no-store' });
        let result = {};
        try {
            result = await response.json();
        } catch (error) {
        }

        if (!response.ok || !Array.isArray(result.categories)) {
            throw new Error(result.message || '게시판 메타 정보를 불러오지 못했습니다.');
        }

        return result;
    }

    async function retryAsync(task, attempts = 3, delayMs = 250) {
        let lastError = null;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                return await task();
            } catch (error) {
                lastError = error;
                if (attempt < attempts - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }
        throw lastError || new Error('요청에 실패했습니다.');
    }

    async function persistExistingPost(post) {
        if (!post || !post.id) throw new Error('저장할 게시글이 없습니다.');
        const response = await fetch(getApiUrl(`/api/board/posts/${post.id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post)
        });

        let result = {};
        try {
            result = await response.json();
        } catch (error) {
        }

        if (!response.ok || !result.post) {
            throw new Error(result.message || '게시글 변경을 저장하지 못했습니다.');
        }

        return normalizePost(result.post);
    }

    async function deletePostFromServer(postId) {
        const response = await fetch(getApiUrl(`/api/board/posts/${postId}`), {
            method: 'DELETE'
        });

        let result = {};
        try {
            result = await response.json();
        } catch (error) {
        }

        if (!response.ok || result.success === false) {
            throw new Error(result.message || '게시글을 삭제하지 못했습니다.');
        }
    }

    function replaceBoardPost(savedPost) {
        boardPosts = boardPosts.map((post) => post.id === savedPost.id ? savedPost : post);
        return savedPost;
    }

    function createBoardCommentId() {
        return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function getCommentDomKey(commentId) {
        return String(commentId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function normalizeCommentNodes(value) {
        const comments = Array.isArray(value) ? value : [];
        return comments.map((comment) => {
            const source = comment && typeof comment === 'object' ? comment : {};
            const legacyReplies = source.reply && typeof source.reply === 'object' ? [source.reply] : [];
            const repliesSource = Array.isArray(source.replies) ? source.replies : legacyReplies;
            return {
                id: String(source.id || createBoardCommentId()),
                author: String(source.author || '익명').trim() || '익명',
                text: String(source.text || ''),
                date: String(source.date || ''),
                editedAt: source.editedAt ? String(source.editedAt) : '',
                replies: normalizeCommentNodes(repliesSource)
            };
        });
    }

    function createCommentNode(author, text) {
        return {
            id: createBoardCommentId(),
            author,
            text,
            date: new Date().toLocaleString('ko-KR'),
            editedAt: '',
            replies: []
        };
    }

    function findCommentNodeById(comments, commentId) {
        if (!Array.isArray(comments)) return null;
        for (const comment of comments) {
            if (String(comment.id) === String(commentId)) {
                return comment;
            }
            const childMatch = findCommentNodeById(comment.replies, commentId);
            if (childMatch) return childMatch;
        }
        return null;
    }

    function removeCommentNodeById(comments, commentId) {
        if (!Array.isArray(comments)) return false;
        const targetIndex = comments.findIndex((comment) => String(comment.id) === String(commentId));
        if (targetIndex >= 0) {
            comments.splice(targetIndex, 1);
            return true;
        }
        return comments.some((comment) => removeCommentNodeById(comment.replies, commentId));
    }

    function normalizePost(post) {
        return {
            ...post,
            category: boardCategories.includes(post && post.category) ? post.category : boardCategories[0],
            comments: normalizeCommentNodes(post && post.comments)
        };
    }

    function clearSelectedEditorImage() {
        if (selectedEditorImage) {
            selectedEditorImage.classList.remove('selected-editor-image');
            selectedEditorImage.style.outline = '';
            selectedEditorImage.style.boxShadow = '';
        }
        selectedEditorImage = null;
        const resizeControls = document.getElementById('editorImageResizeControls');
        if (resizeControls) resizeControls.style.display = 'none';
        updateEditorImageControlState();
    }

    function selectEditorImage(img) {
        clearSelectedEditorImage();
        selectedEditorImage = img;
        applyEditorImageLayout(selectedEditorImage);
        selectedEditorImage.classList.add('selected-editor-image');
        selectedEditorImage.style.outline = '2px solid #60a5fa';
        selectedEditorImage.style.boxShadow = '0 0 0 4px rgba(96, 165, 250, 0.2)';
        const resizeControls = document.getElementById('editorImageResizeControls');
        if (resizeControls) resizeControls.style.display = 'inline-flex';
        updateEditorImageControlState();
    }

    function adjustSelectedEditorImage(delta) {
        if (!selectedEditorImage) return;
        const editorWidth = getImageContainerWidth(selectedEditorImage);
        const currentWidth = getStoredImageWidth(selectedEditorImage);
        const nextWidth = clampNumber(currentWidth + delta, 140, editorWidth);
        applyEditorImageLayout(selectedEditorImage, { width: nextWidth });
        updateEditorImageControlState();
        queueBoardDraftSave();
    }

    function setSelectedEditorImageWidth(width) {
        if (!selectedEditorImage) return;
        const editorWidth = getImageContainerWidth(selectedEditorImage);
        applyEditorImageLayout(selectedEditorImage, {
            width: clampNumber(width, 140, editorWidth)
        });
        updateEditorImageControlState();
        queueBoardDraftSave();
    }

    function setSelectedEditorImagePosition(position) {
        if (!selectedEditorImage) return;
        applyEditorImageLayout(selectedEditorImage, {
            position: clampNumber(position, 0, 100)
        });
        updateEditorImageControlState();
        queueBoardDraftSave();
    }

    function nudgeSelectedEditorImagePosition(delta) {
        if (!selectedEditorImage) return;
        const currentPosition = getStoredImagePosition(selectedEditorImage, getStoredImageWidth(selectedEditorImage));
        setSelectedEditorImagePosition(currentPosition + delta);
    }

    function updateEditorImageControlState() {
        const controls = document.getElementById('editorImageResizeControls');
        const widthSlider = document.getElementById('editorImageWidthSlider');
        const widthValue = document.getElementById('editorImageWidthValue');
        const positionSlider = document.getElementById('editorImagePositionSlider');
        const alignButtons = document.querySelectorAll('[data-image-align]');

        if (!controls || !widthSlider || !widthValue || !positionSlider) return;

        if (!selectedEditorImage) {
            controls.style.display = 'none';
            widthSlider.value = '820';
            widthValue.textContent = '선택 없음';
            positionSlider.value = '50';
            alignButtons.forEach((button) => button.classList.remove('is-active'));
            return;
        }

        const width = Math.round(getStoredImageWidth(selectedEditorImage));
        const position = Math.round(getStoredImagePosition(selectedEditorImage, width));
        const editorWidth = getImageContainerWidth(selectedEditorImage);
        widthSlider.max = String(Math.max(220, Math.round(editorWidth)));
        widthSlider.value = String(clampNumber(width, 140, editorWidth));
        widthValue.textContent = `${width}px`;
        positionSlider.value = String(position);
        alignButtons.forEach((button) => {
            const value = Number(button.getAttribute('data-image-align'));
            button.classList.toggle('is-active', Math.abs(value - position) <= 3);
        });
    }

    function focusEditorForInsertion() {
        const editor = document.getElementById('richEditor');
        if (!editor) return;
        editor.focus();
        const selection = window.getSelection();
        if (!selection) return;
        const anchorNode = selection.anchorNode;
        if (selection.rangeCount && anchorNode && editor.contains(anchorNode)) {
            return;
        }
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function ensureEditorImageControls() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar || document.getElementById('editorImageResizeControls')) return;
        const controls = document.createElement('div');
        controls.id = 'editorImageResizeControls';
        controls.className = 'editor-image-controls';
        controls.style.display = 'none';
        controls.innerHTML = `
            <div class="editor-image-controls__group">
                <span class="editor-image-controls__label">크기</span>
                <button type="button" class="tool-btn" id="shrinkEditorImageBtn" title="이미지 줄이기">-</button>
                <input type="range" id="editorImageWidthSlider" min="140" max="960" step="10" value="820">
                <button type="button" class="tool-btn" id="growEditorImageBtn" title="이미지 키우기">+</button>
                <span class="editor-image-controls__value" id="editorImageWidthValue">선택 없음</span>
            </div>
            <div class="editor-image-controls__group">
                <span class="editor-image-controls__label">위치</span>
                <div class="editor-image-align-buttons">
                    <button type="button" class="tool-btn tool-btn--compact" data-image-align="0">왼쪽</button>
                    <button type="button" class="tool-btn tool-btn--compact" data-image-align="50">가운데</button>
                    <button type="button" class="tool-btn tool-btn--compact" data-image-align="100">오른쪽</button>
                </div>
                <button type="button" class="tool-btn tool-btn--compact" id="nudgeEditorImageLeftBtn" title="왼쪽으로 이동">←</button>
                <input type="range" id="editorImagePositionSlider" min="0" max="100" step="1" value="50">
                <button type="button" class="tool-btn tool-btn--compact" id="nudgeEditorImageRightBtn" title="오른쪽으로 이동">→</button>
            </div>
        `;
        toolbar.appendChild(controls);
        document.getElementById('shrinkEditorImageBtn').onclick = () => adjustSelectedEditorImage(-60);
        document.getElementById('growEditorImageBtn').onclick = () => adjustSelectedEditorImage(60);
        document.getElementById('editorImageWidthSlider').oninput = (event) => {
            setSelectedEditorImageWidth(Number(event.target.value));
        };
        document.getElementById('editorImagePositionSlider').oninput = (event) => {
            setSelectedEditorImagePosition(Number(event.target.value));
        };
        document.getElementById('nudgeEditorImageLeftBtn').onclick = () => nudgeSelectedEditorImagePosition(-8);
        document.getElementById('nudgeEditorImageRightBtn').onclick = () => nudgeSelectedEditorImagePosition(8);
        controls.querySelectorAll('[data-image-align]').forEach((button) => {
            button.addEventListener('click', () => {
                setSelectedEditorImagePosition(Number(button.getAttribute('data-image-align')));
            });
        });
        updateEditorImageControlState();
    }

    function bindEditorImages() {
        const editor = document.getElementById('richEditor');
        if (!editor) return;

        editor.querySelectorAll('img').forEach((img) => {
            applyEditorImageLayout(img, {
                containerWidth: editor.clientWidth || getImageContainerWidth(img)
            });
            img.style.cursor = 'pointer';
            img.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                selectEditorImage(img);
            };
            img.onmousemove = (event) => {
                const rect = img.getBoundingClientRect();
                const isNearCorner = rect.right - event.clientX < 18 && rect.bottom - event.clientY < 18;
                img.style.cursor = isNearCorner ? 'nwse-resize' : 'pointer';
            };
            img.onmousedown = (event) => {
                const rect = img.getBoundingClientRect();
                const isNearCorner = rect.right - event.clientX < 18 && rect.bottom - event.clientY < 18;
                if (!isNearCorner) return;
                event.preventDefault();
                event.stopPropagation();
                selectEditorImage(img);
                isResizingImage = true;
                resizeStartX = event.clientX;
                resizeStartWidth = getStoredImageWidth(img);
                document.body.style.userSelect = 'none';
            };
        });

        updateEditorImageControlState();
    }

    async function insertInlineImage(file) {
        const imageUrl = normalizeStoredUploadUrl(await uploadInlineImage(file));
        const displayUrl = imageUrl.startsWith('/uploads/') && window.location.protocol === 'file:'
            ? `${getApiBase()}${imageUrl}`
            : imageUrl;
        focusEditorForInsertion();
        const editor = document.getElementById('richEditor');
        const editorWidth = editor ? editor.clientWidth || 860 : 860;
        const initialWidth = Math.min(editorWidth, 820);
        const html = `<img src="${displayUrl}" data-upload-path="${imageUrl}" data-image-width="${Math.round(initialWidth)}" data-image-position="50" style="width:${Math.round(initialWidth)}px; max-width:100%; height:auto; border-radius:8px; margin:18px auto; display:block;">`;
        document.execCommand('insertHTML', false, html);
        window.requestAnimationFrame(() => {
            bindEditorImages();
            const insertedImage = [...(editor ? editor.querySelectorAll('img') : [])]
                .reverse()
                .find((img) => img.dataset.uploadPath === imageUrl || img.getAttribute('src') === displayUrl);
            if (insertedImage) {
                selectEditorImage(insertedImage);
            }
            queueBoardDraftSave();
        });
    }

    function extractYoutubeVideoId(value) {
        const url = String(value || '').trim();
        if (!url) return '';

        const patterns = [
            /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/i,
            /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
            /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i,
            /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) return match[1];
        }

        return '';
    }

    function createYoutubeEmbedHtml(videoId, sourceUrl) {
        const safeId = escapeHtml(videoId);
        const safeUrl = escapeHtml(sourceUrl);
        return `
            <div class="youtube-embed" contenteditable="false">
                <iframe src="https://www.youtube.com/embed/${safeId}" title="유튜브 미리보기" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
                <span class="youtube-caption">유튜브 링크 미리보기 · ${safeUrl}</span>
            </div>
            <p><br></p>
        `;
    }

    function insertYoutubeEmbedFromUrl(url) {
        const videoId = extractYoutubeVideoId(url);
        if (!videoId) return false;
        focusEditorForInsertion();
        document.execCommand('insertHTML', false, createYoutubeEmbedHtml(videoId, url));
        queueBoardDraftSave();
        return true;
    }

    function ensureSeedPosts() {
        if (boardPosts.length > 0) return;
        boardPosts = [
            {
                id: 2,
                title: '주말에 본 영화 어땠나요?',
                content: '결말이 꽤 인상적이었어요. 다른 분들 생각도 궁금합니다.',
                category: '카테고리 2',
                author: 'admin',
                date: '2024-03-20 14:30',
                views: 42,
                likes: 5,
                dislikes: 0,
                comments: [
                    { author: '철수', text: '저는 중반부 전개가 좋았어요.', date: '2024-03-20 15:00' }
                ]
            },
            {
                id: 1,
                title: '가입 인사 드립니다!',
                content: '초대 코드를 받아서 가입했습니다. 잘 부탁드려요.',
                category: '카테고리 1',
                author: '철수',
                date: '2024-03-19 09:15',
                views: 105,
                likes: 12,
                dislikes: 0,
                comments: [
                    { author: 'admin', text: '환영합니다. 편하게 이용해 주세요.', date: '2024-03-19 09:20' }
                ]
            }
        ];
        boardPosts = boardPosts.map(normalizePost);
        savePosts();
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const [datePart, timePart] = String(dateString).split(' ');
        const today = new Date().toISOString().split('T')[0];
        if (datePart === today && timePart) return timePart;
        return (datePart || '').replace(/-/g, '.');
    }

    function getCommentCount(post) {
        if (!Array.isArray(post.comments)) return 0;
        const countNodes = (comments) => comments.reduce((sum, comment) => {
            return sum + 1 + countNodes(Array.isArray(comment.replies) ? comment.replies : []);
        }, 0);
        return countNodes(post.comments);
    }

    function getAuthorDisplayName(authorId) {
        return getUserProfileMeta(authorId).name;
    }

    function renderAuthorWithAvatar(authorId) {
        const meta = getUserProfileMeta(authorId);
        const avatarHtml = meta.image
            ? `<img src="${meta.image}" alt="${escapeHtml(meta.name)}" class="board-avatar-image" style="object-position:${meta.focusX}% ${meta.focusY}%;">`
            : `<span class="board-avatar-fallback">${escapeHtml((meta.name || '익명').slice(0, 1))}</span>`;

        return `
            <span class="board-author-chip">
                <span class="board-avatar">${avatarHtml}</span>
                <span class="board-author-name">${escapeHtml(meta.name)}</span>
            </span>
        `;
    }

    function getSortedPosts() {
        return [...boardPosts].map(normalizePost).sort((a, b) => {
            if (a.isNotice && !b.isNotice) return -1;
            if (!a.isNotice && b.isNotice) return 1;
            if (currentSortType === 'likes') {
                return (b.likes || 0) - (a.likes || 0) || (b.id || 0) - (a.id || 0);
            }
            if (currentSortType === 'views') {
                return (b.views || 0) - (a.views || 0) || (b.id || 0) - (a.id || 0);
            }
            return (b.id || 0) - (a.id || 0);
        });
    }

    function getCategoryPosts(category = activeCategory) {
        return getSortedPosts().filter((post) => post.category === category);
    }

    function updateCategoryChrome() {
        const title = document.getElementById('boardCategoryTitle');
        const description = document.getElementById('boardCategoryDescription');
        const searchTypeSelect = document.getElementById('searchType');
        const sortTypeSelect = document.getElementById('sortType');
        if (title) title.innerText = activeCategory;
        if (description) description.innerText = `${activeCategory}에 올라온 공지와 최신 글을 한 흐름으로 보고, 검색과 글쓰기까지 바로 이어갈 수 있게 구성했습니다.`;
        if (searchTypeSelect) searchTypeSelect.value = currentSearchType;
        if (sortTypeSelect) sortTypeSelect.value = currentSortType;
        document.querySelectorAll('#boardCategoryMenu .board-menu-item').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-category') === activeCategory);
        });
    }

    function renderCategoryControls() {
        const menu = document.getElementById('boardCategoryMenu');
        const select = document.getElementById('postCategory');
        if (menu) {
            menu.innerHTML = boardCategories.map((category, index) => `
                <button type="button" class="board-menu-item${index === 0 && category === activeCategory ? ' active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
            `).join('');
        }
        if (select) {
            select.innerHTML = boardCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
            select.value = activeCategory;
        }
        updateCategoryChrome();
    }

    function truncateText(value, maxLength) {
        const text = String(value || '').replace(/<[^>]*>/g, '').trim();
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength)}...`;
    }

    function renderSidebarSummary() {
        const totalCount = document.getElementById('boardTotalCount');
        const noticeCount = document.getElementById('boardNoticeCount');
        const noticeList = document.getElementById('boardNoticeList');
        const popularList = document.getElementById('boardPopularList');
        const sortedPosts = getCategoryPosts();
        const notices = sortedPosts.filter((post) => post.isNotice).slice(0, 5);
        const popularPosts = [...sortedPosts]
            .filter((post) => !post.isNotice)
            .sort((a, b) => {
                const scoreA = (a.likes || 0) * 10 + (a.views || 0);
                const scoreB = (b.likes || 0) * 10 + (b.views || 0);
                return scoreB - scoreA;
            })
            .slice(0, 5);

        if (totalCount) totalCount.innerText = String(sortedPosts.length);
        if (noticeCount) noticeCount.innerText = String(sortedPosts.filter((post) => post.isNotice).length);

        function fillList(container, posts, emptyText, metaBuilder) {
            if (!container) return;
            if (!posts.length) {
                container.innerHTML = `<div class="sidebar-empty">${emptyText}</div>`;
                return;
            }

            container.innerHTML = posts.map((post) => `
                <a href="javascript:void(0)" class="sidebar-link-item" onclick="openPostDetail(${post.id})">
                    <strong>${escapeHtml(truncateText(post.title, 34))}</strong>
                    <span>${metaBuilder(post)}</span>
                </a>
            `).join('');
        }

        fillList(
            noticeList,
            notices,
            '등록된 공지가 없습니다.',
            (post) => `조회 ${post.views || 0} · 추천 ${post.likes || 0}`
        );

        fillList(
            popularList,
            popularPosts,
            '아직 인기 글이 없습니다.',
            (post) => `${escapeHtml(getAuthorDisplayName(post.author))} · 조회 ${post.views || 0}`
        );
    }

    function renderBoardLoadingState(message = '잠시만 기다려주시면 곧 게시물이 올라옵니다.') {
        const tbody = document.getElementById('boardBody');
        const pinnedNotice = document.getElementById('boardPinnedNotice');
        if (!tbody) return;
        tbody.innerHTML = `<tr class="board-loading-row"><td colspan="7" class="board-loading-cell">${escapeHtml(message)}</td></tr>`;
        if (pinnedNotice) {
            pinnedNotice.style.display = 'none';
            pinnedNotice.innerHTML = '';
        }
    }

    function renderBoard(filterType = '', filterQuery = '') {
        const tbody = document.getElementById('boardBody');
        const pinnedNotice = document.getElementById('boardPinnedNotice');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (filterType) currentSearchType = filterType;
        if (typeof filterQuery === 'string') currentSearchQuery = filterQuery;
        updateCategoryChrome();

        let sortedList = getCategoryPosts();
        const query = String(currentSearchQuery || '').trim().toLowerCase();

        if (query) {
            sortedList = sortedList.filter((post) => {
                const title = String(post.title || '').toLowerCase();
                const content = String(post.content || '').toLowerCase();
                const author = String(post.author || '').toLowerCase();
                if (currentSearchType === 'author') return author.includes(query);
                return title.includes(query) || content.includes(query);
            });
        }

        if (!sortedList.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding:60px; color:rgba(47,31,24,0.52); font-size:1.05rem;">작성된 게시글이 없습니다.</td></tr>';
            if (pinnedNotice) pinnedNotice.style.display = 'none';
            renderSidebarSummary();
            return;
        }

        const leadNotice = sortedList.find((post) => post.isNotice);
        if (pinnedNotice) {
            if (leadNotice) {
                pinnedNotice.style.display = 'block';
                pinnedNotice.innerHTML = `
                    <button type="button" onclick="openPostDetail(${leadNotice.id})">
                        <span class="board-pinned-label">고정 공지</span>
                        <strong class="board-pinned-title">${escapeHtml(leadNotice.title || '제목 없음')}</strong>
                        <span class="board-pinned-meta">${escapeHtml(getAuthorDisplayName(leadNotice.author))} · 조회 ${leadNotice.views || 0} · 추천 ${leadNotice.likes || 0}</span>
                    </button>
                `;
            } else {
                pinnedNotice.style.display = 'none';
                pinnedNotice.innerHTML = '';
            }
        }

        sortedList.forEach((post) => {
            const comments = getCommentCount(post);
            const commentBadge = comments > 0 ? `<span class="comment-count">[${comments}]</span>` : '';
            const hotTag = post.isNotice
                ? '<span class="hot-tag" style="background:rgba(245, 158, 11, 0.2); color:#fbbf24; border:1px solid rgba(245, 158, 11, 0.4);">공지</span> '
                : ((post.likes || 0) >= 10 ? '<span class="hot-tag">인기</span> ' : '');
            const imageIcon = post.image ? ' <span style="font-size:0.8rem;">🖼️</span>' : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${post.id}</td>
                <td class="title-cell" onclick="openPostDetail(${post.id})">${hotTag}${post.title || '제목 없음'} ${imageIcon} ${commentBadge}</td>
                <td><span class="post-category-badge">${escapeHtml(post.category || boardCategories[0])}</span></td>
                <td>${renderAuthorWithAvatar(post.author)}</td>
                <td>${formatDate(post.date)}</td>
                <td>${post.views || 0}</td>
                <td>${post.likes || 0}</td>
            `;
            tbody.appendChild(tr);
        });

        renderSidebarSummary();
    }

    window.searchPosts = function () {
        currentSortType = document.getElementById('sortType').value;
        currentSearchType = document.getElementById('searchType').value;
        currentSearchQuery = document.getElementById('searchInput').value;
        renderBoard(currentSearchType, currentSearchQuery);
    };

    const writeModal = document.getElementById('writeModal');
    window.openWriteModal = function (options = {}) {
        if (!ensureBoardReady()) return;
        if (!writeModal) return;
        writeModal.style.display = 'block';
        startBoardDraftInterval();
        clearSelectedEditorImage();
        document.getElementById('postTitle').focus();
        const noticeToggle = document.getElementById('noticeToggleContainer');
        if (noticeToggle) {
            noticeToggle.style.display = currentUser === 'admin' ? 'flex' : 'none';
            document.getElementById('isNotice').checked = false;
        }
        const categorySelect = document.getElementById('postCategory');
        if (categorySelect) categorySelect.value = activeCategory;
        currentEditingPostId = null;
        const submitButton = document.querySelector('#writeForm .board-submit');
        if (submitButton) submitButton.innerText = '등록하기';
        document.getElementById('richEditor').innerHTML = '<p><br></p>';
        if (options.restoreDraft !== false) {
            restoreBoardDraft(null);
            void hydrateBoardDraftFromServer(null);
        }
    };

    window.closeWriteModal = function (options = {}) {
        if (!writeModal) return;
        stopBoardDraftInterval();
        if (options.preserveDraft !== false) {
            persistBoardDraft();
        }
        writeModal.style.display = 'none';
        document.getElementById('writeForm').reset();
        document.getElementById('richEditor').innerHTML = '<p><br></p>';
        clearSelectedEditorImage();
        currentEditingPostId = null;
        const submitButton = document.querySelector('#writeForm .board-submit');
        if (submitButton) submitButton.innerText = '등록하기';
    };

    window.execCommand = function (command, value = null) {
        document.execCommand(command, false, value);
        document.getElementById('richEditor').focus();
    };

    window.insertImageTrigger = function () {
        document.getElementById('inlineImageInput').click();
    };

    window.insertYoutubePrompt = function () {
        const url = prompt('유튜브 링크를 입력해 주세요.');
        if (!url) return;
        const inserted = insertYoutubeEmbedFromUrl(url);
        if (!inserted) {
            alert('유효한 유튜브 링크를 입력해 주세요.');
        }
    };

    window.handleInlineImage = async function (input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        try {
            await insertInlineImage(file);
        } catch (error) {
            alert('이미지를 첨부하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            input.value = '';
        }
    };

    document.getElementById('writeForm').onsubmit = async function (event) {
        event.preventDefault();
        if (!ensureBoardReady()) return;
        const title = document.getElementById('postTitle').value.trim();
        const editor = document.getElementById('richEditor');
        normalizeEditorImagesForSave(editor);
        const content = normalizeContentForStorage(editor.innerHTML.trim());
        const isNotice = currentUser === 'admin' && document.getElementById('isNotice').checked;
        const category = document.getElementById('postCategory').value || activeCategory;
        if (!title || !content || content === '<p><br></p>') {
            alert('제목과 내용을 입력해 주세요.');
            return;
        }
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const targetPost = currentEditingPostId
            ? boardPosts.find((post) => post.id === currentEditingPostId)
            : null;
        if (currentEditingPostId && !targetPost) return;
        if (targetPost && targetPost.author !== currentUser && currentUser !== 'admin') {
            alert('수정 권한이 없습니다.');
            return;
        }

        const payload = {
            ...(targetPost || {}),
            title,
            content,
            category,
            author: targetPost ? targetPost.author : currentUser,
            date: targetPost ? targetPost.date : dateStr,
            views: targetPost ? (targetPost.views || 0) : 0,
            likes: targetPost ? (targetPost.likes || 0) : 0,
            dislikes: targetPost ? (targetPost.dislikes || 0) : 0,
            comments: targetPost ? (targetPost.comments || []) : [],
            isNotice,
            isRich: true
        };

        try {
            const savedPost = await persistPostToServer(payload);
            if (currentEditingPostId) {
                boardPosts = boardPosts.map((post) => post.id === currentEditingPostId ? savedPost : post);
            } else {
                boardPosts.unshift(savedPost);
            }
        } catch (error) {
            persistBoardDraft();
            alert(`${error.message || '게시글 저장에 실패했습니다.'}\n작성 중인 내용은 임시 저장되었습니다.`);
            return;
        }

        savePosts();
        clearBoardDraft(currentEditingPostId);
        activeCategory = category;
        renderBoard(currentSearchType, currentSearchQuery);
        clearBoardDraft(currentEditingPostId, {
            remote: true,
            keepalive: true,
            force: true
        });
        closeWriteModal({ preserveDraft: false });
    };

    document.getElementById('postTitle').addEventListener('input', queueBoardDraftSave);
    document.getElementById('postCategory').addEventListener('change', queueBoardDraftSave);
    document.getElementById('isNotice').addEventListener('change', queueBoardDraftSave);
    document.getElementById('richEditor').addEventListener('input', queueBoardDraftSave);
    window.addEventListener('beforeunload', () => {
        persistBoardDraft({
            remote: true,
            immediateRemote: true,
            keepalive: true
        });
    });

    const boardListView = document.getElementById('boardListView');
    const boardDetailView = document.getElementById('boardDetailView');

    function getCurrentVisiblePosts() {
        let sortedList = getCategoryPosts(activeCategory);
        const query = String(currentSearchQuery || '').trim().toLowerCase();
        if (!query) return sortedList;
        return sortedList.filter((post) => {
            const title = String(post.title || '').toLowerCase();
            const content = String(post.content || '').toLowerCase();
            const author = String(post.author || '').toLowerCase();
            if (currentSearchType === 'author') return author.includes(query);
            return title.includes(query) || content.includes(query);
        });
    }

    function updateDetailNavigation(postId) {
        const visiblePosts = getCurrentVisiblePosts();
        const currentIndex = visiblePosts.findIndex((post) => post.id === postId);
        const prevPost = currentIndex >= 0 ? visiblePosts[currentIndex - 1] : null;
        const nextPost = currentIndex >= 0 ? visiblePosts[currentIndex + 1] : null;
        const prevButton = document.getElementById('prevPostButton');
        const nextButton = document.getElementById('nextPostButton');

        if (prevButton) {
            prevButton.disabled = !prevPost;
            prevButton.innerText = prevPost ? `이전글 · ${truncateText(prevPost.title, 22)}` : '이전글 없음';
        }
        if (nextButton) {
            nextButton.disabled = !nextPost;
            nextButton.innerText = nextPost ? `다음글 · ${truncateText(nextPost.title, 22)}` : '다음글 없음';
        }
    }

    function renderRelatedPosts(postId) {
        const relatedPostsList = document.getElementById('relatedPostsList');
        if (!relatedPostsList) return;

        const relatedPosts = getCategoryPosts(activeCategory)
            .filter((post) => post.id !== postId)
            .slice(0, 5);

        if (!relatedPosts.length) {
            relatedPostsList.innerHTML = '<div class="sidebar-empty">같은 카테고리의 다른 게시글이 아직 없습니다.</div>';
            return;
        }

        relatedPostsList.innerHTML = relatedPosts.map((post) => `
            <a href="javascript:void(0)" class="related-post-link" onclick="openPostDetail(${post.id})">
                <strong>${escapeHtml(truncateText(post.title, 42))}</strong>
                <span>${escapeHtml(getAuthorDisplayName(post.author))} · ${formatDate(post.date)}</span>
            </a>
        `).join('');
    }

    function updateVoteUI(post) {
        document.getElementById('btnLikeCount').innerText = post.likes || 0;
        document.getElementById('detailLikes').innerText = post.likes || 0;
        document.getElementById('btnDislikeCount').innerText = post.dislikes || 0;
        document.getElementById('detailDislikes').innerText = post.dislikes || 0;
        document.getElementById('likeBtn').classList.toggle('active', likedPosts.includes(post.id));
        document.getElementById('dislikeBtn').classList.toggle('active', dislikedPosts.includes(post.id));
    }

    function renderComments(post) {
        const commentsList = document.getElementById('commentsList');
        const count = getCommentCount(post);
        document.getElementById('commentCount').innerText = count;
        const detailCommentMeta = document.getElementById('detailCommentMeta');
        if (detailCommentMeta) detailCommentMeta.innerText = `댓글 ${count}`;
        commentsList.innerHTML = '';
        if (!Array.isArray(post.comments) || !post.comments.length) {
            commentsList.innerHTML = '<div style="color:#94a3b8; padding:12px 0;">첫 댓글을 남겨보세요.</div>';
            return;
        }

        const renderNode = (comment, depth = 0) => {
            const domKey = getCommentDomKey(comment.id);
            const authorChip = renderAuthorWithAvatar(comment.author);
            const commentText = renderCommentRichText(comment.text || '');
            const commentDate = escapeHtml(comment.date || '');
            const editedDate = comment.editedAt ? ` · 수정 ${escapeHtml(comment.editedAt)}` : '';
            const canReply = Boolean(currentUser && currentUser !== '익명');
            const canManageComment = currentUser === 'admin' || currentUser === comment.author;
            const wrapper = document.createElement('div');
            wrapper.className = 'comment-thread';
            wrapper.innerHTML = `
                <div class="${depth > 0 ? 'comment-reply' : 'comment-item'}" style="${depth > 0 ? `margin-left:${Math.min(depth, 5) * 28}px;` : ''}">
                    <div class="comment-meta">
                        <div class="c-author ${depth > 0 ? 'author-marker' : ''}">${authorChip}</div>
                        <div>${commentDate}${editedDate}</div>
                        <div class="comment-action-group">
                            ${canReply ? `<button type="button" class="btn-reply" onclick='toggleReplyForm(${JSON.stringify(comment.id)})'>답글 달기</button>` : ''}
                            ${canManageComment ? `<button type="button" class="btn-reply" onclick='toggleCommentEditForm(${JSON.stringify(comment.id)})'>수정</button>` : ''}
                            ${canManageComment ? `<button type="button" class="btn-reply" onclick='deleteComment(${JSON.stringify(comment.id)})'>삭제</button>` : ''}
                        </div>
                    </div>
                    <div class="comment-body">${commentText}</div>
                    ${canReply ? `
                        <form class="reply-form-container" id="replyForm-${domKey}" onsubmit='submitReply(event, ${JSON.stringify(comment.id)})'>
                            <textarea id="replyInput-${domKey}" placeholder="답글을 입력해 주세요." autocomplete="off" rows="3" maxlength="5000"></textarea>
                            <button type="submit">등록</button>
                        </form>
                    ` : ''}
                    ${canManageComment ? `
                        <form class="comment-edit-form" id="commentEditForm-${domKey}" onsubmit='submitCommentEdit(event, ${JSON.stringify(comment.id)})'>
                            <textarea id="commentEditInput-${domKey}" autocomplete="off" rows="3" maxlength="5000">${escapeHtml(comment.text || '')}</textarea>
                            <button type="submit">저장</button>
                        </form>
                    ` : ''}
                </div>
            `;

            const replies = Array.isArray(comment.replies) ? comment.replies : [];
            replies.forEach((reply) => {
                wrapper.appendChild(renderNode(reply, depth + 1));
            });
            return wrapper;
        };

        post.comments.forEach((comment) => {
            commentsList.appendChild(renderNode(comment, 0));
        });
    }

    window.toggleReplyForm = function (commentId) {
        const domKey = getCommentDomKey(commentId);
        const targetForm = document.getElementById(`replyForm-${domKey}`);
        if (!targetForm) return;

        document.querySelectorAll('.reply-form-container').forEach((form) => {
            if (form !== targetForm) form.style.display = 'none';
        });

        targetForm.style.display = targetForm.style.display === 'flex' ? 'none' : 'flex';
        if (targetForm.style.display === 'flex') {
            const input = document.getElementById(`replyInput-${domKey}`);
            if (input) input.focus();
        }
    };

    window.toggleCommentEditForm = function (commentId) {
        const domKey = getCommentDomKey(commentId);
        const targetForm = document.getElementById(`commentEditForm-${domKey}`);
        if (!targetForm) return;
        document.querySelectorAll('.comment-edit-form').forEach((form) => {
            if (form !== targetForm) form.style.display = 'none';
        });
        targetForm.style.display = targetForm.style.display === 'flex' ? 'none' : 'flex';
        if (targetForm.style.display === 'flex') {
            const input = document.getElementById(`commentEditInput-${domKey}`);
            if (input) input.focus();
        }
    };

    window.toggleReplyEditForm = window.toggleCommentEditForm;

    window.submitReply = async function (event, commentId) {
        event.preventDefault();
        if (!ensureBoardReady() || !currentOpenPostId || !currentUser || currentUser === '익명') return;

        const domKey = getCommentDomKey(commentId);
        const input = document.getElementById(`replyInput-${domKey}`);
        const text = input ? input.value.trim() : '';
        if (!text) return;

        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        const targetComment = post ? findCommentNodeById(post.comments, commentId) : null;
        if (!post || !targetComment) return;
        const previousPost = JSON.parse(JSON.stringify(post));

        targetComment.replies = Array.isArray(targetComment.replies) ? targetComment.replies : [];
        targetComment.replies.push(createCommentNode(currentUser, text));

        if (typeof window.createUserNotification === 'function' && targetComment.author && targetComment.author !== currentUser) {
            window.createUserNotification(targetComment.author, {
                type: 'reply',
                title: '댓글에 새 답글이 도착했습니다.',
                message: `"${post.title || '게시글'}" 댓글에 ${getAuthorDisplayName(currentUser)}님이 답글을 남겼습니다.`,
                link: `board.html?id=${post.id}`
            });
        }

        try {
            replaceBoardPost(await persistExistingPost(post));
        } catch (error) {
            replaceBoardPost(previousPost);
            alert(error.message || '답글 저장에 실패했습니다.');
            return;
        }

        savePosts();
        renderComments(boardPosts.find((item) => item.id === currentOpenPostId));
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
    };

    window.submitCommentEdit = async function (event, commentId) {
        event.preventDefault();
        if (!ensureBoardReady() || !currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        const targetComment = post ? findCommentNodeById(post.comments, commentId) : null;
        if (!post || !targetComment) return;
        if (currentUser !== 'admin' && currentUser !== targetComment.author) return;
        const input = document.getElementById(`commentEditInput-${getCommentDomKey(commentId)}`);
        const text = input ? input.value.trim() : '';
        if (!text) return;
        const previousPost = JSON.parse(JSON.stringify(post));
        targetComment.text = text;
        targetComment.editedAt = new Date().toLocaleString('ko-KR');
        try {
            replaceBoardPost(await persistExistingPost(post));
        } catch (error) {
            replaceBoardPost(previousPost);
            alert(error.message || '댓글 수정에 실패했습니다.');
            return;
        }
        savePosts();
        renderComments(boardPosts.find((item) => item.id === currentOpenPostId));
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
    };

    window.submitReplyEdit = window.submitCommentEdit;

    window.deleteComment = async function (commentId) {
        if (!ensureBoardReady() || !currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        const targetComment = post ? findCommentNodeById(post.comments, commentId) : null;
        if (!post || !targetComment) return;
        if (currentUser !== 'admin' && currentUser !== targetComment.author) return;
        if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
        const previousPost = JSON.parse(JSON.stringify(post));
        removeCommentNodeById(post.comments, commentId);
        try {
            replaceBoardPost(await persistExistingPost(post));
        } catch (error) {
            replaceBoardPost(previousPost);
            alert(error.message || '댓글 삭제에 실패했습니다.');
            return;
        }
        savePosts();
        renderComments(boardPosts.find((item) => item.id === currentOpenPostId));
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
    };

    window.deleteReply = window.deleteComment;

    window.openPostDetail = function (id) {
        if (!ensureBoardReady()) return;
        const post = boardPosts.find((item) => item.id === id);
        if (!post || !boardDetailView) return;
        post.views = (post.views || 0) + 1;
        savePosts();
        persistExistingPost(post).then((savedPost) => {
            replaceBoardPost(savedPost);
            if (currentOpenPostId === savedPost.id) {
                document.getElementById('detailViews').innerText = savedPost.views || 0;
                renderBoard(currentSearchType, currentSearchQuery);
                updateDetailNavigation(savedPost.id);
            }
        }).catch(() => {});
        currentOpenPostId = id;
        activeCategory = post.category || boardCategories[0];
        document.getElementById('detailTitle').innerText = post.title || '제목 없음';
        document.getElementById('detailCategory').innerText = post.category || boardCategories[0];
        document.getElementById('detailPostType').innerText = post.isNotice ? '공지글' : '일반글';
        document.getElementById('detailCommentMeta').innerText = `댓글 ${getCommentCount(post)}`;
        document.getElementById('detailAuthor').innerHTML = renderAuthorWithAvatar(post.author);
        document.getElementById('detailTime').innerText = formatDate(post.date);
        document.getElementById('detailViews').innerText = post.views || 0;
        document.getElementById('detailContent').innerHTML = post.isRich
            ? linkifyRichHtml(post.content || '')
            : linkifyRichHtml(escapeHtml(post.content || '').replace(/\n/g, '<br>'));
        applyContentImageLayouts(document.getElementById('detailContent'));
        document.getElementById('authorActions').style.display = post.author === currentUser || currentUser === 'admin' ? 'flex' : 'none';
        updateVoteUI(post);
        renderComments(post);
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
        renderRelatedPosts(post.id);
        if (boardListView) boardListView.classList.add('is-hidden');
        boardDetailView.style.display = 'block';
        boardDetailView.classList.add('is-active');
        boardDetailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

window.closeDetailModal = function () {
    if (boardListView) boardListView.classList.remove('is-hidden');
    if (boardDetailView) {
        boardDetailView.style.display = 'none';
        boardDetailView.classList.remove('is-active');
    }
    currentOpenPostId = null;
    document.getElementById('commentForm').reset();
    resetPendingCommentStickers();
    closeCommentStickerPanel();
};

    window.openAdjacentPost = function (direction) {
        if (!currentOpenPostId) return;
        const visiblePosts = getCurrentVisiblePosts();
        const currentIndex = visiblePosts.findIndex((post) => post.id === currentOpenPostId);
        if (currentIndex < 0) return;
        const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        const targetPost = visiblePosts[nextIndex];
        if (!targetPost) return;
        openPostDetail(targetPost.id);
    };

    window.editCurrentPost = function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        if (post.author !== currentUser && currentUser !== 'admin') return;

        openWriteModal({ restoreDraft: false });
        currentEditingPostId = post.id;
        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('richEditor').innerHTML = resolveContentForDisplay(post.content || '<p><br></p>');
        document.getElementById('postCategory').value = post.category || activeCategory;
        if (currentUser === 'admin') {
            document.getElementById('isNotice').checked = Boolean(post.isNotice);
        }
        const submitButton = document.querySelector('#writeForm .board-submit');
        if (submitButton) submitButton.innerText = '수정 저장';
        bindEditorImages();
        restoreBoardDraft(post.id);
        void hydrateBoardDraftFromServer(post.id);
    };

    async function persistVotes(post, fallbackPost) {
        localStorage.setItem('liked_posts', JSON.stringify(likedPosts));
        localStorage.setItem('disliked_posts', JSON.stringify(dislikedPosts));
        try {
            if (post) {
                replaceBoardPost(await persistExistingPost(post));
            }
        } catch (error) {
            if (fallbackPost) {
                replaceBoardPost(fallbackPost);
            }
            alert(error.message || '추천 상태 저장에 실패했습니다.');
            return false;
        }
        savePosts();
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(currentOpenPostId);
        return true;
    }

    window.toggleLike = async function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        const previousPost = JSON.parse(JSON.stringify(post));
        const previousLikedPosts = [...likedPosts];
        const previousDislikedPosts = [...dislikedPosts];
        if (likedPosts.includes(post.id)) {
            post.likes = Math.max(0, (post.likes || 0) - 1);
            likedPosts = likedPosts.filter((id) => id !== post.id);
        } else {
            post.likes = (post.likes || 0) + 1;
            likedPosts.push(post.id);
            if (dislikedPosts.includes(post.id)) {
                post.dislikes = Math.max(0, (post.dislikes || 0) - 1);
                dislikedPosts = dislikedPosts.filter((id) => id !== post.id);
            }
        }
        updateVoteUI(post);
        const success = await persistVotes(post, previousPost);
        if (!success) {
            likedPosts = previousLikedPosts;
            dislikedPosts = previousDislikedPosts;
            updateVoteUI(previousPost);
        }
    };

    window.toggleDislike = async function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        const previousPost = JSON.parse(JSON.stringify(post));
        const previousLikedPosts = [...likedPosts];
        const previousDislikedPosts = [...dislikedPosts];
        if (dislikedPosts.includes(post.id)) {
            post.dislikes = Math.max(0, (post.dislikes || 0) - 1);
            dislikedPosts = dislikedPosts.filter((id) => id !== post.id);
        } else {
            post.dislikes = (post.dislikes || 0) + 1;
            dislikedPosts.push(post.id);
            if (likedPosts.includes(post.id)) {
                post.likes = Math.max(0, (post.likes || 0) - 1);
                likedPosts = likedPosts.filter((id) => id !== post.id);
            }
        }
        updateVoteUI(post);
        const success = await persistVotes(post, previousPost);
        if (!success) {
            likedPosts = previousLikedPosts;
            dislikedPosts = previousDislikedPosts;
            updateVoteUI(previousPost);
        }
    };

document.getElementById('commentForm').onsubmit = async function (event) {
    event.preventDefault();
    if (!ensureBoardReady() || !currentOpenPostId) return;
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;
    const post = boardPosts.find((item) => item.id === currentOpenPostId);
    if (!post) return;
    const previousPost = JSON.parse(JSON.stringify(post));
    post.comments = normalizeCommentNodes(post.comments);
    post.comments.push(createCommentNode(currentUser, text));
        if (typeof window.createUserNotification === 'function' && post.author && post.author !== currentUser) {
            window.createUserNotification(post.author, {
                type: 'comment',
                title: '내 글에 새 댓글이 달렸습니다.',
                message: `"${post.title || '게시글'}"에 ${getAuthorDisplayName(currentUser)}님이 댓글을 남겼습니다.`,
                link: `board.html?id=${post.id}`
            });
        }
    try {
        replaceBoardPost(await persistExistingPost(post));
    } catch (error) {
        replaceBoardPost(previousPost);
        alert(error.message || '댓글 저장에 실패했습니다.');
        return;
    }
    savePosts();
    renderComments(boardPosts.find((item) => item.id === currentOpenPostId));
    input.value = '';
    closeCommentStickerPanel();
    renderBoard(currentSearchType, currentSearchQuery);
    updateDetailNavigation(post.id);
};

setupCommentStickerPicker();
ensureEditorImageControls();

document.getElementById('richEditor').addEventListener('click', (event) => {
        if (event.target.tagName !== 'IMG') {
            clearSelectedEditorImage();
        }
    });

    document.getElementById('richEditor').addEventListener('dragover', (event) => {
        if ([...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) {
            event.preventDefault();
        }
    });

    document.getElementById('richEditor').addEventListener('drop', async (event) => {
        const imageFile = [...event.dataTransfer.files].find((file) => file.type.startsWith('image/'));
        if (!imageFile) return;
        event.preventDefault();
        document.getElementById('richEditor').focus();
        try {
            await insertInlineImage(imageFile);
        } catch (error) {
            alert('이미지를 첨부하지 못했습니다. 다시 시도해 주세요.');
        }
    });

    document.getElementById('richEditor').addEventListener('paste', (event) => {
        const pastedText = event.clipboardData && event.clipboardData.getData
            ? event.clipboardData.getData('text/plain').trim()
            : '';

        if (!pastedText) return;
        if (!extractYoutubeVideoId(pastedText)) return;

        event.preventDefault();
        insertYoutubeEmbedFromUrl(pastedText);
    });

    document.addEventListener('mousemove', (event) => {
        if (!isResizingImage || !selectedEditorImage) return;
        const deltaX = event.clientX - resizeStartX;
        const editorWidth = getImageContainerWidth(selectedEditorImage);
        const nextWidth = clampNumber(resizeStartWidth + deltaX, 140, editorWidth);
        applyEditorImageLayout(selectedEditorImage, { width: nextWidth });
        updateEditorImageControlState();
    });

    document.addEventListener('mouseup', () => {
        if (!isResizingImage) return;
        isResizingImage = false;
        document.body.style.userSelect = '';
        queueBoardDraftSave();
    });

    window.addEventListener('resize', () => {
        bindEditorImages();
        applyContentImageLayouts(document.getElementById('detailContent'));
    });

    window.deleteCurrentPost = function () {
        if (!ensureBoardReady() || !currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        if (post.author !== currentUser && currentUser !== 'admin') return;
        if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
        deletePostFromServer(currentOpenPostId).then(() => {
            boardPosts = boardPosts.filter((item) => item.id !== currentOpenPostId);
            savePosts();
            closeDetailModal();
            renderBoard(currentSearchType, currentSearchQuery);
        }).catch((error) => {
            alert(error.message || '게시글 삭제에 실패했습니다.');
        });
    };

    document.getElementById('boardCategoryMenu').addEventListener('click', (event) => {
        const target = event.target.closest('[data-category]');
        if (!target) return;
        activeCategory = target.getAttribute('data-category') || boardCategories[0];
        currentOpenPostId = null;
        currentSearchQuery = '';
        document.getElementById('searchInput').value = '';
        if (boardListView) boardListView.classList.remove('is-hidden');
        if (boardDetailView) {
            boardDetailView.style.display = 'none';
            boardDetailView.classList.remove('is-active');
        }
        renderBoard(currentSearchType, currentSearchQuery);
    });

    document.getElementById('searchInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') searchPosts();
    });

    document.getElementById('sortType').addEventListener('change', (event) => {
        currentSortType = event.target.value || 'latest';
        renderBoard(currentSearchType, currentSearchQuery);
    });

    async function initializeBoard() {
        loadBoardCategories();
        renderCategoryControls();
        renderBoardLoadingState();
        try {
            const meta = await retryAsync(() => fetchBoardMetaFromServer(), 4, 300);
            if (Array.isArray(meta.categories) && meta.categories.length === 4) {
                boardCategories = meta.categories.map((item, index) => String(item || '').trim() || defaultBoardCategories[index]);
                if (!boardCategories.includes(activeCategory)) {
                    activeCategory = boardCategories[0];
                }
            }
        } catch (error) {
        }

        let loadedFromServer = false;
        try {
            boardPosts = await retryAsync(() => fetchBoardPostsFromServer(), 4, 300);
            loadedFromServer = true;
        } catch (error) {
            boardPosts = safeParse(localStorage.getItem('board_posts') || '[]', []).map(normalizePost);
        }
        if (!boardPosts.length) {
            if (window.location.protocol === 'file:') {
                ensureSeedPosts();
                savePosts();
            }
        }
        savePosts();

        renderCategoryControls();
        renderBoard(currentSearchType, currentSearchQuery);
        bindEditorImages();
        boardReady = true;

        const params = new URLSearchParams(window.location.search);
        const postId = Number(params.get('id'));
        if (postId) {
            setTimeout(() => openPostDetail(postId), 0);
        }
    }

    initializeBoard();
})();
