require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const {
    APP_DIR,
    DATA_DIR,
    DB_FILE,
    UPLOADS_DIR,
    LOGIN_HERO_DIR,
    BANNER_DIR,
    BOARD_INLINE_DIR,
    PROFILE_DIR,
    ensureDataLayout
} = require('./paths');
const storage = require('./storage');
const { uploadBackupToR2 } = require('./r2-backup');
const LIVE_DB_KEY = 'system/database.json';
const BOARD_POST_STATE_PREFIX = 'system/board-posts/';
const BOARD_DRAFT_STATE_PREFIX = 'system/board-drafts/';
const STOCK_SIM_PARTICIPANT_LIMIT = 12;
const STOCK_SIM_STALE_MS = 1000 * 60 * 60 * 24 * 14;
const DEFAULT_SERVICE_ACCESS_SETTINGS = Object.freeze({
    board: 'open',
    mountain: 'open',
    ai: 'open',
    stockSim: 'open'
});
const DEFAULT_PROTOTYPE_SLOT_STATE = Object.freeze({
    activeKey: 'stockSim'
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '150mb' }));

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self' https: data: blob:",
            "script-src 'self' https: 'unsafe-inline'",
            "style-src 'self' https: 'unsafe-inline'",
            "img-src 'self' https: data: blob:",
            "font-src 'self' https: data:",
            "connect-src 'self' https: http://localhost:3000"
        ].join('; ')
    );
    next();
});

ensureDataLayout();

const STOCK_SIM_DIST_DIR = path.resolve(APP_DIR, '13', 'dist');
const RELIC_SEAL_DIST_DIR = path.resolve(APP_DIR, '14', 'dist');
const AUTO_PVP_DIST_DIR = path.resolve(APP_DIR, '15', 'dist');
const PROBABILITY_FORGE_DIST_DIR = path.resolve(APP_DIR, '16', 'dist');

app.use('/stock-sim-app', express.static(STOCK_SIM_DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
        }
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
    }
}));

app.get(['/stock-sim-app', '/stock-sim-app/'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(STOCK_SIM_DIST_DIR, 'index.html'));
});

app.use('/relic-seal-app', express.static(RELIC_SEAL_DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
        }
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
    }
}));

app.get(['/relic-seal-app', '/relic-seal-app/'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(RELIC_SEAL_DIST_DIR, 'index.html'));
});

app.use('/auto-pvp-app', express.static(AUTO_PVP_DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
        }
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
    }
}));

app.get(['/auto-pvp-app', '/auto-pvp-app/'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(AUTO_PVP_DIST_DIR, 'index.html'));
});

app.use('/probability-forge-app', express.static(PROBABILITY_FORGE_DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
        }
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
    }
}));

app.get(['/probability-forge-app', '/probability-forge-app/'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(PROBABILITY_FORGE_DIST_DIR, 'index.html'));
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.resolve(APP_DIR)));

app.get('/uploads/board-inline/:fileName', async (req, res, next) => {
    const fileName = String(req.params.fileName || '').trim();
    if (!fileName) return next();

    try {
        const matchedEntry = await storage.findStoredEntryByFileName('board-inline', fileName);
        if (matchedEntry && matchedEntry.url) {
            return res.redirect(matchedEntry.url);
        }
    } catch (error) {
    }

    return next();
});

let bootState = {
    startedAt: null,
    readyAt: null,
    error: null
};

app.get('/health', (req, res) => {
    res.json({
        ok: true,
        booting: !bootState.readyAt,
        startedAt: bootState.startedAt,
        readyAt: bootState.readyAt,
        error: bootState.error
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(APP_DIR, 'index.html'));
});

const DEFAULT_CATEGORIES = ['移댄뀒怨좊━ 1', '移댄뀒怨좊━ 2', '移댄뀒怨좊━ 3', '移댄뀒怨좊━ 4'];

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

function normalizePrototypeSlotState(value) {
    const source = value && typeof value === 'object' ? value : {};
    const hasActiveKey = Object.prototype.hasOwnProperty.call(source, 'activeKey');
    const activeKey = String(hasActiveKey ? source.activeKey : DEFAULT_PROTOTYPE_SLOT_STATE.activeKey).trim();
    if (activeKey === 'stockSim' || activeKey === 'relicSeal' || activeKey === 'probabilityForge' || activeKey === 'autoPvp') {
        return { activeKey };
    }
    return { activeKey: '' };
}


function safeParseJson(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function normalizeCategories(value) {
    if (!Array.isArray(value) || value.length !== 4) {
        return DEFAULT_CATEGORIES.slice();
    }
    return value.map((item, index) => String(item || '').trim() || DEFAULT_CATEGORIES[index]);
}

function normalizeUsers(value) {
    const users = value && typeof value === 'object' ? value : {};
    const normalized = { ...users };

    normalized.admin = {
        ...(normalized.admin || {}),
        password: normalized.admin && normalized.admin.password ? normalized.admin.password : '1105',
        isAdmin: true,
        status: 'regular',
        signupDate: normalized.admin && normalized.admin.signupDate ? normalized.admin.signupDate : new Date().toLocaleString('ko-KR')
    };

    Object.keys(normalized).forEach((key) => {
        const focusX = Number(normalized[key].profileFocusX);
        const focusY = Number(normalized[key].profileFocusY);
        normalized[key] = {
            ...normalized[key],
            points: Number(normalized[key].points || 0),
            lastAttendanceDate: normalized[key].lastAttendanceDate || '',
            attendanceStreak: Number(normalized[key].attendanceStreak || 0),
            maxAttendanceStreak: Number(normalized[key].maxAttendanceStreak || 0),
            unlockedTitles: Array.isArray(normalized[key].unlockedTitles) ? normalized[key].unlockedTitles : [],
            activeTitleId: normalized[key].activeTitleId || '',
            profileImage: normalized[key].profileImage || '',
            profileFocusX: Number.isFinite(focusX) ? Math.min(100, Math.max(0, focusX)) : 50,
            profileFocusY: Number.isFinite(focusY) ? Math.min(100, Math.max(0, focusY)) : 50
        };
    });

    return normalized;
}

function createBoardCommentId() {
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBoardComments(value) {
    const comments = Array.isArray(value) ? value : [];
    return comments.map((comment) => {
        const source = comment && typeof comment === 'object' ? comment : {};
        const legacyReplies = source.reply && typeof source.reply === 'object' ? [source.reply] : [];
        const repliesSource = Array.isArray(source.replies) ? source.replies : legacyReplies;
        return {
            id: String(source.id || createBoardCommentId()),
            author: String(source.author || '익명').trim() || '익명',
            text: String(source.text || ''),
            date: String(source.date || source.createdAt || ''),
            editedAt: source.editedAt ? String(source.editedAt) : '',
            replies: normalizeBoardComments(repliesSource)
        };
    });
}

function normalizeBoardPosts(value, categories) {
    const posts = Array.isArray(value) ? value : [];
    return posts.map((post) => ({
        ...post,
        id: Number(post.id || 0),
        title: post.title || '',
        content: normalizeBoardContent(post.content || ''),
        author: post.author || '?듬챸',
        date: post.date || '',
        views: Number(post.views || 0),
        likes: Number(post.likes || 0),
        dislikes: Number(post.dislikes || 0),
        isNotice: Boolean(post.isNotice),
        isRich: Boolean(post.isRich),
        comments: normalizeBoardComments(post.comments),
        category: categories.includes(post.category) ? post.category : categories[0]
    }));
}

function createBoardDraftKey(userId, postId) {
    const normalizedUserId = String(userId || '').trim();
    const normalizedPostId = Number(postId || 0);
    return `${normalizedUserId}::${normalizedPostId > 0 ? `edit_${normalizedPostId}` : 'new'}`;
}

function normalizeBoardDrafts(value, categories) {
    const source = value && typeof value === 'object' ? value : {};
    const normalized = {};

    Object.entries(source).forEach(([key, draft]) => {
        if (!draft || typeof draft !== 'object') return;
        const userId = String(draft.userId || '').trim();
        if (!userId) return;

        const normalizedPostId = Number(draft.postId || 0);
        const normalizedKey = createBoardDraftKey(userId, normalizedPostId);
        normalized[normalizedKey] = {
            userId,
            postId: normalizedPostId > 0 ? normalizedPostId : null,
            title: String(draft.title || ''),
            content: normalizeBoardContent(draft.content || ''),
            category: categories.includes(draft.category) ? draft.category : categories[0],
            isNotice: Boolean(draft.isNotice),
            updatedAt: draft.updatedAt || new Date().toISOString()
        };
    });

    return normalized;
}

function remapBoardCategoriesInState(nextCategories) {
    const previousCategories = Array.isArray(state.board && state.board.categories)
        ? state.board.categories.slice()
        : DEFAULT_CATEGORIES.slice();
    const normalizedNextCategories = normalizeCategories(nextCategories);

    const remapCategoryName = (value) => {
        const raw = String(value || '').trim();
        const matchedIndex = previousCategories.findIndex((entry) => entry === raw);
        if (matchedIndex >= 0) {
            return normalizedNextCategories[matchedIndex] || normalizedNextCategories[0];
        }
        if (normalizedNextCategories.includes(raw)) {
            return raw;
        }
        return normalizedNextCategories[0];
    };

    state.board.categories = normalizedNextCategories;
    state.board.posts = normalizeBoardPosts(
        state.board.posts.map((post) => ({
            ...post,
            category: remapCategoryName(post.category)
        })),
        state.board.categories
    );
    state.board.drafts = normalizeBoardDrafts(
        Object.fromEntries(
            Object.entries(state.board.drafts || {}).map(([key, draft]) => [
                key,
                {
                    ...draft,
                    category: remapCategoryName(draft && draft.category)
                }
            ])
        ),
        state.board.categories
    );
}

function normalizeMountainRecords(value) {
    const mountains = Array.isArray(value) ? value : [];
    return mountains.map((mountain) => {
        const normalizePhotoEntry = (entry) => {
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                const url = String(entry.url || entry.src || '').trim();
                if (!url) return null;
                const numericWidth = Number(entry.width);
                return {
                    url,
                    width: Number.isFinite(numericWidth)
                        ? Math.min(520, Math.max(180, Math.round(numericWidth)))
                        : 280
                };
            }

            const url = String(entry || '').trim();
            if (!url) return null;
            return { url, width: 280 };
        };

        const photos = Array.isArray(mountain && mountain.photos)
            ? mountain.photos.map(normalizePhotoEntry).filter(Boolean).slice(0, 4)
            : (mountain && mountain.photo ? [normalizePhotoEntry(mountain.photo)].filter(Boolean) : []);
        return {
            ...mountain,
            id: mountain && mountain.id ? String(mountain.id) : `m_${Date.now()}`,
            title: String((mountain && (mountain.title || mountain.name)) || '?고뻾 湲곕줉').slice(0, 15),
            name: String((mountain && (mountain.name || mountain.title)) || '?고뻾 湲곕줉').slice(0, 15),
            lat: mountain && mountain.lat !== undefined ? mountain.lat : '',
            lng: mountain && mountain.lng !== undefined ? mountain.lng : '',
            alt: String(mountain && mountain.alt || ''),
            date: String(mountain && mountain.date || ''),
            members: String(mountain && mountain.members || ''),
            desc: String(mountain && mountain.desc || ''),
            photos,
            photo: photos[0] ? photos[0].url : '',
            author: String(mountain && mountain.author || 'admin').trim() || 'admin',
            createdAt: mountain && mountain.createdAt ? mountain.createdAt : new Date().toISOString(),
            updatedAt: mountain && mountain.updatedAt ? mountain.updatedAt : new Date().toISOString()
        };
    });
}

function normalizeAiPromptEntries(value) {
    const prompts = Array.isArray(value) ? value : [];
    return prompts.map((prompt) => {
        const numericId = Number(prompt && prompt.id);
        const id = Number.isFinite(numericId) ? numericId : Date.now();
        const inferredDate = id > 1000000000000 ? new Date(id).toISOString() : '';
        return {
            ...prompt,
            id,
            title: String(prompt && prompt.title || ''),
            category: String(prompt && prompt.category || '湲고?'),
            description: String(prompt && prompt.description || ''),
            text: String(prompt && prompt.text || ''),
            author: String(prompt && prompt.author || 'admin').trim() || 'admin',
            createdAt: String(prompt && prompt.createdAt || inferredDate || ''),
            updatedAt: String(prompt && prompt.updatedAt || prompt && prompt.createdAt || inferredDate || '')
        };
    });
}

function getStockSimSummaryTimestamp(value) {
    const timestamp = Date.parse(String(value || ''));
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getStockSimFocusSectorsFromSnapshot(snapshot) {
    const simulation = snapshot && snapshot.simulation && typeof snapshot.simulation === 'object'
        ? snapshot.simulation
        : {};
    const stocks = Array.isArray(simulation.stocks) ? simulation.stocks : [];
    const holdings = simulation.player && Array.isArray(simulation.player.holdings)
        ? simulation.player.holdings
        : [];
    const stockMap = new Map(
        stocks.map((stock) => [
            String(stock && stock.id || ''),
            {
                sector: String(stock && stock.sector || ''),
                currentPrice: Number(stock && stock.currentPrice || 0)
            }
        ])
    );
    const sectorScores = new Map();

    holdings.forEach((holding) => {
        const stockInfo = stockMap.get(String(holding && holding.stockId || ''));
        if (!stockInfo || !stockInfo.sector) return;
        const score = Number(holding && holding.quantity || 0) * Number(stockInfo.currentPrice || 0);
        sectorScores.set(stockInfo.sector, (sectorScores.get(stockInfo.sector) || 0) + score);
    });

    return Array.from(sectorScores.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([sector]) => sector);
}

function createEmptyStockSimState() {
    return {
        roomId: 'main',
        updatedAt: '',
        participants: {}
    };
}

function createStockSimSummaryFromSnapshot(userId, snapshot, previousSummary, usersSource = {}) {
    const simulation = snapshot && snapshot.simulation && typeof snapshot.simulation === 'object'
        ? snapshot.simulation
        : {};
    const leaderboard = Array.isArray(simulation.leaderboard) ? simulation.leaderboard : [];
    const currentUserEntry = leaderboard.find((entry) => entry && entry.kind === 'current-user');
    const player = simulation.player && typeof simulation.player === 'object' ? simulation.player : {};
    const cash = Number(player.cash || 0);
    const netWorth = Number(currentUserEntry && currentUserEntry.netWorth);
    const returnRate = Number(currentUserEntry && currentUserEntry.returnRate);
    const normalizedNetWorth = Number.isFinite(netWorth) ? netWorth : cash;
    const normalizedReturnRate = Number.isFinite(returnRate) ? returnRate : 0;
    const previousReturnRate = previousSummary && Number.isFinite(Number(previousSummary.returnRate))
        ? Number(previousSummary.returnRate)
        : normalizedReturnRate;
    const user = usersSource && usersSource[userId] ? usersSource[userId] : null;
    const displayName = String(
        user && (user.nickname || user.displayName || userId) || userId
    ).trim() || userId;

    return {
        userId,
        name: displayName,
        cash,
        netWorth: normalizedNetWorth,
        returnRate: normalizedReturnRate,
        tick: Number(simulation.tick || 0),
        focusSectors: getStockSimFocusSectorsFromSnapshot(snapshot),
        lastDelta: normalizedReturnRate - previousReturnRate,
        savedAt: Number(snapshot && snapshot.savedAt || Date.now()),
        updatedAt: new Date().toISOString()
    };
}

function normalizeStockSimParticipant(userId, participant, usersSource = {}) {
    if (!participant || typeof participant !== 'object') return null;

    const snapshot =
        participant.snapshot && typeof participant.snapshot === 'object'
            ? participant.snapshot
            : null;
    if (!snapshot || !snapshot.simulation || typeof snapshot.simulation !== 'object') {
        return null;
    }

    const previousSummary =
        participant.summary && typeof participant.summary === 'object'
            ? participant.summary
            : null;
    const summary = createStockSimSummaryFromSnapshot(userId, snapshot, previousSummary, usersSource);

    return {
        userId,
        updatedAt: String(participant.updatedAt || summary.updatedAt || ''),
        lastActiveAt: String(participant.lastActiveAt || participant.updatedAt || summary.updatedAt || ''),
        snapshot,
        summary
    };
}

function normalizeStockSimState(value, usersSource = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const participants = {};
    const participantSource =
        source.participants && typeof source.participants === 'object'
            ? source.participants
            : {};
    const staleThreshold = Date.now() - STOCK_SIM_STALE_MS;

    Object.entries(participantSource).forEach(([userId, participant]) => {
        const normalized = normalizeStockSimParticipant(String(userId || '').trim(), participant, usersSource);
        if (!normalized || !normalized.userId) return;

        const lastActiveAt = getStockSimSummaryTimestamp(normalized.lastActiveAt || normalized.updatedAt);
        if (lastActiveAt && lastActiveAt < staleThreshold) {
            return;
        }

        participants[normalized.userId] = normalized;
    });

    const trimmedParticipants = Object.fromEntries(
        Object.entries(participants)
            .sort((left, right) => {
                const rightTimestamp = getStockSimSummaryTimestamp(right[1].lastActiveAt || right[1].updatedAt);
                const leftTimestamp = getStockSimSummaryTimestamp(left[1].lastActiveAt || left[1].updatedAt);
                return rightTimestamp - leftTimestamp;
            })
            .slice(0, STOCK_SIM_PARTICIPANT_LIMIT)
    );

    return {
        roomId: String(source.roomId || 'main'),
        updatedAt: String(source.updatedAt || ''),
        participants: trimmedParticipants
    };
}

function createStockSimLeaderboardEntries(currentUserId) {
    const participants = state.stockSim && state.stockSim.participants && typeof state.stockSim.participants === 'object'
        ? Object.values(state.stockSim.participants)
        : [];

    return participants
        .map((participant) => {
            const userId = String(participant && participant.userId || '');
            const summary = participant && participant.summary && typeof participant.summary === 'object'
                ? participant.summary
                : {};
            return {
                id: `stock-sim-${userId}`,
                name: String(summary.name || userId || '참가자'),
                kind: currentUserId && userId.toLowerCase() === currentUserId.toLowerCase()
                    ? 'current-user'
                    : 'friend-preview',
                netWorth: Number(summary.netWorth || 0),
                returnRate: Number(summary.returnRate || 0),
                style: state.users && state.users[userId] && state.users[userId].isAdmin
                    ? '실시간 관리자'
                    : '실시간 참가자',
                focusSectors: Array.isArray(summary.focusSectors) ? summary.focusSectors : [],
                volatility: 0,
                lastDelta: Number(summary.lastDelta || 0),
                tick: Number(summary.tick || 0),
                updatedAt: String(summary.updatedAt || participant.updatedAt || '')
            };
        })
        .sort((left, right) => {
            if (right.netWorth !== left.netWorth) {
                return right.netWorth - left.netWorth;
            }
            return getStockSimSummaryTimestamp(right.updatedAt) - getStockSimSummaryTimestamp(left.updatedAt);
        });
}

function canAccessStockSim(userId) {
    if (!state.prototypeSlot || state.prototypeSlot.activeKey !== 'stockSim') return false;
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return false;
    const matchedUserId = Object.keys(state.users || {}).find(
        (entry) => entry.toLowerCase() === normalizedUserId.toLowerCase()
    );
    const userEntry = matchedUserId ? state.users[matchedUserId] : null;
    return Boolean(
        userEntry && (userEntry.isAdmin || String(userEntry.status || '').toLowerCase() === 'regular')
    );
}

function normalizeBanners(value) {
    return value && typeof value === 'object'
        ? value
        : {
            top: { title: '우리들의 아지트', desc: '우리만의 소중한 공간에 오신 것을 환영합니다.', bg: '', posX: 4, posY: 50 },
            left: { url: '', link: '#' },
            right: { url: '', link: '#' }
        };
}

function normalizeUploadPath(value) {
    const stringValue = String(value || '').trim();
    if (!stringValue) return '';

    const localhostMatch = stringValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
    if (localhostMatch) return localhostMatch[1];

    if (/^\/uploads\//i.test(stringValue)) return stringValue;
    if (/^https?:\/\//i.test(stringValue)) return stringValue;

    return '';
}

function normalizeBoardContent(content) {
    let imageIndex = 0;
    return String(content || '')
        .replace(/https?:\/\/localhost:\d+(\/uploads\/[^"' )]+)/gi, '$1')
        .replace(/(<img\b[^>]*\bsrc=["'])(data:image\/[a-zA-Z0-9.+-]+;base64,[^"']+)(["'][^>]*>)/gi, (match, prefix, dataUrl, suffix) => {
            const savedPath = writeImageDataUrl(dataUrl, 'board-inline', BOARD_INLINE_DIR, '/uploads/board-inline', 'board-inline', imageIndex++);
            return savedPath ? `${prefix}${savedPath}${suffix}` : match;
        });
}

async function resolveBoardInlineLegacyUrl(value) {
    const normalized = normalizeUploadPath(value);
    if (!normalized || !normalized.startsWith('/uploads/board-inline/')) {
        return value;
    }

    const fileName = path.basename(normalized);
    const localFilePath = path.join(BOARD_INLINE_DIR, fileName);

    if (fs.existsSync(localFilePath)) {
        try {
            const mimeType = getMimeTypeFromExtension(localFilePath);
            const buffer = fs.readFileSync(localFilePath);
            return await storage.saveImageDataUrl({
                dataUrl: bufferToDataUrl(buffer, mimeType),
                originalName: fileName,
                folder: 'board-inline',
                fallbackName: 'board-inline',
                index: 0
            });
        } catch (error) {
            return value;
        }
    }

    try {
        const matchedEntry = await storage.findStoredEntryByFileName('board-inline', fileName);
        if (matchedEntry && matchedEntry.url) {
            return matchedEntry.url;
        }
    } catch (error) {
    }

    return value;
}

async function repairBoardContentUploads(content) {
    const originalContent = String(content || '');
    if (!/\/uploads\/board-inline\//i.test(originalContent)) {
        return originalContent;
    }

    const pattern = /(["'])((?:https?:\/\/localhost:\d+)?\/uploads\/board-inline\/([^"' )]+))\1/gi;
    let nextContent = originalContent;
    let match;

    while ((match = pattern.exec(originalContent)) !== null) {
        const quote = match[1];
        const fullMatch = match[0];
        const storedUrl = match[2];
        const repairedUrl = await resolveBoardInlineLegacyUrl(storedUrl);

        if (repairedUrl && repairedUrl !== storedUrl) {
            nextContent = nextContent.replace(fullMatch, `${quote}${repairedUrl}${quote}`);
        }
    }

    return nextContent;
}

async function repairBoardPostsInState() {
    if (!Array.isArray(state.board.posts) || !state.board.posts.length) return;
    if (!state.board.posts.some((post) => /\/uploads\/board-inline\//i.test(String(post.content || '')))) return;

    for (const post of state.board.posts) {
        const repairedContent = await repairBoardContentUploads(post.content || '');
        if (repairedContent !== post.content) {
            post.content = repairedContent;
        }
    }
}

function getMimeExtension(mimeType) {
    const normalizedMime = String(mimeType || '').toLowerCase();
    if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') return '.jpg';
    if (normalizedMime === 'image/png') return '.png';
    if (normalizedMime === 'image/webp') return '.webp';
    if (normalizedMime === 'image/gif') return '.gif';
    return '.png';
}

function getMimeTypeFromExtension(fileName) {
    const ext = String(path.extname(fileName || '') || '').toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    return 'application/octet-stream';
}

function sanitizeBaseName(value, fallback) {
    return String(value || fallback || 'upload')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback || 'upload';
}

function writeImageDataUrl(dataUrl, originalName, dirPath, urlPrefix, fallbackName, index) {
    const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return '';

    const extension = getMimeExtension(match[1]);
    const baseName = sanitizeBaseName(originalName, `${fallbackName}-${index + 1}`);
    const fileName = `${Date.now()}-${index + 1}-${baseName}${extension}`;

    fs.writeFileSync(path.join(dirPath, fileName), Buffer.from(match[2], 'base64'));
    return `${urlPrefix}/${fileName}`;
}

function bufferToDataUrl(buffer, mimeType) {
    return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
}

function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
    }
}

function deleteLoginHeroFiles(imageList) {
    const files = Array.isArray(imageList) ? imageList : [];
    files.forEach((entry) => {
        const normalized = normalizeUploadPath(entry);
        if (!normalized || !normalized.startsWith('/uploads/login-hero/')) return;
        const filePath = path.join(LOGIN_HERO_DIR, path.basename(normalized));
        safeUnlink(filePath);
    });
}

async function deleteStoredImageList(imageList) {
    const files = Array.isArray(imageList) ? imageList : [];
    for (const entry of files) {
        try {
            await storage.deleteStoredUrl(entry);
        } catch (error) {
        }
    }
}

function deleteMatchingUploadedFiles(imageList, prefix) {
    const files = Array.isArray(imageList) ? imageList : [];
    files.forEach((entry) => {
        const normalized = normalizeUploadPath(entry);
        if (!normalized || !normalized.startsWith(prefix)) return;
        const filePath = path.join(UPLOADS_DIR, normalized.replace(/^\/uploads\//, '').replace(/\//g, path.sep));
        safeUnlink(filePath);
    });
}

function writeLoginHeroImageFromDataUrl(dataUrl, originalName, index) {
    return writeImageDataUrl(dataUrl, originalName, LOGIN_HERO_DIR, '/uploads/login-hero', 'login-hero', index);
}

function normalizeLoginHeroImages(entries) {
    const list = Array.isArray(entries) ? entries : [];
    const normalized = [];

    list.forEach((entry, index) => {
        if (!entry) return;

        if (typeof entry === 'string') {
            const trimmed = entry.trim();
            if (!trimmed) return;

            if (trimmed.startsWith('data:image/')) {
                const savedPath = writeLoginHeroImageFromDataUrl(trimmed, '', index);
                if (savedPath) normalized.push(savedPath);
                return;
            }

            const uploadPath = normalizeUploadPath(trimmed);
            if (uploadPath) {
                normalized.push(uploadPath);
            }
            return;
        }

        if (typeof entry === 'object' && typeof entry.dataUrl === 'string') {
            const savedPath = writeLoginHeroImageFromDataUrl(entry.dataUrl, entry.name || '', index);
            if (savedPath) normalized.push(savedPath);
        }
    });

    return normalized;
}

async function persistLoginHeroImages(entries) {
    const list = Array.isArray(entries) ? entries : [];
    const normalized = [];

    for (let index = 0; index < list.length; index += 1) {
        const entry = list[index];
        if (!entry) continue;

        if (typeof entry === 'string') {
            const trimmed = entry.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data:image/')) {
                const savedPath = await storage.saveImageDataUrl({
                    dataUrl: trimmed,
                    originalName: '',
                    folder: 'login-hero',
                    fallbackName: 'login-hero',
                    index
                });
                if (savedPath) normalized.push(savedPath);
                continue;
            }

            const uploadPath = normalizeUploadPath(trimmed);
            if (uploadPath) {
                normalized.push(uploadPath);
            }
            continue;
        }

        if (typeof entry === 'object' && typeof entry.dataUrl === 'string') {
            const savedPath = await storage.saveImageDataUrl({
                dataUrl: entry.dataUrl,
                originalName: entry.name || '',
                folder: 'login-hero',
                fallbackName: 'login-hero',
                index
            });
            if (savedPath) normalized.push(savedPath);
        }
    }

    return normalized;
}

function normalizeBannerImageValue(value, nameHint, index) {
    if (!value) return '';

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('data:image/')) {
            return writeImageDataUrl(trimmed, nameHint, BANNER_DIR, '/uploads/banners', nameHint, index);
        }
        return normalizeUploadPath(trimmed);
    }

    if (typeof value === 'object' && typeof value.dataUrl === 'string') {
        return writeImageDataUrl(value.dataUrl, value.name || nameHint, BANNER_DIR, '/uploads/banners', nameHint, index);
    }

    return '';
}

function normalizeBannerState(value) {
    const base = normalizeBanners(value);
    return {
        top: {
            ...base.top,
            bg: normalizeBannerImageValue(base.top && base.top.bg, 'top-banner', 0)
        },
        left: {
            ...base.left,
            url: normalizeBannerImageValue(base.left && base.left.url, 'left-banner', 1)
        },
        right: {
            ...base.right,
            url: normalizeBannerImageValue(base.right && base.right.url, 'right-banner', 2)
        }
    };
}

function getBannerUploadPaths(banners) {
    const state = banners && typeof banners === 'object' ? banners : {};
    return [
        state.top && state.top.bg,
        state.left && state.left.url,
        state.right && state.right.url
    ].map(normalizeUploadPath).filter((entry) => entry && entry.startsWith('/uploads/banners/'));
}

function normalizeRawDb(raw) {
    const categories = normalizeCategories(safeParseJson(raw.board_categories, raw.board_categories || []));
    const users = normalizeUsers(safeParseJson(raw.users_db, raw.users_db || {}));
    const normalized = {
        users,
        board: {
            categories,
            posts: normalizeBoardPosts(safeParseJson(raw.board_posts, raw.board_posts || []), categories),
            drafts: normalizeBoardDrafts(safeParseJson(raw.board_drafts, raw.board_drafts || {}), categories),
            likedPosts: safeParseJson(raw.liked_posts, raw.liked_posts || []),
            dislikedPosts: safeParseJson(raw.disliked_posts, raw.disliked_posts || [])
        },
        inviteCodes: safeParseJson(raw.invite_codes, raw.invite_codes || ['FRIENDS2026']),
        ai: {
            directory: safeParseJson(raw.my_ai_directory, raw.my_ai_directory || []),
            prompts: normalizeAiPromptEntries(safeParseJson(raw.my_prompt_directory, raw.my_prompt_directory || []))
        },
        mountains: normalizeMountainRecords(safeParseJson(raw.mountains_db, raw.mountains_db || [])),
        banners: normalizeBannerState(safeParseJson(raw.site_banners, raw.site_banners || {})),
        loginHero: {
            images: normalizeLoginHeroImages(Array.isArray(raw.login_hero_images) ? raw.login_hero_images : []),
            intervalSeconds: Number.isFinite(Number(raw.login_hero_interval_seconds)) ? Math.min(120, Math.max(3, Number(raw.login_hero_interval_seconds))) : 10,
            randomOrder: Boolean(raw.login_hero_random_order)
        },
        stockSim: normalizeStockSimState(safeParseJson(raw.stock_sim_state, raw.stock_sim_state || {}), users),
        currentUser: raw.current_user || null,
        notifications: safeParseJson(raw.user_notifications, raw.user_notifications || {}),
        reuseInviteCode: raw.settings_reuse_code === true || raw.settings_reuse_code === 'true' || raw.settings_reuse_code === 1 || raw.settings_reuse_code === '1',
        accessSettings: normalizeServiceAccessSettings(safeParseJson(raw.service_access_settings, raw.service_access_settings || DEFAULT_SERVICE_ACCESS_SETTINGS)),
        prototypeSlot: normalizePrototypeSlotState(safeParseJson(raw.prototype_slot_state, raw.prototype_slot_state || DEFAULT_PROTOTYPE_SLOT_STATE))
    };

    return normalized;
}

function createLegacyPayloadFromState(state) {
    return {
        board_posts: state.board.posts,
        liked_posts: state.board.likedPosts,
        disliked_posts: state.board.dislikedPosts,
        site_banners: state.banners,
        users_db: state.users,
        current_user: state.currentUser,
        invite_codes: state.inviteCodes,
        my_ai_directory: state.ai.directory,
        my_prompt_directory: state.ai.prompts,
        mountains_db: state.mountains,
        board_categories: state.board.categories,
        login_hero_images: state.loginHero.images,
        login_hero_interval_seconds: state.loginHero.intervalSeconds,
        login_hero_random_order: state.loginHero.randomOrder,
        stock_sim_state: state.stockSim,
        user_notifications: state.notifications,
        settings_reuse_code: state.reuseInviteCode,
        service_access_settings: state.accessSettings,
        prototype_slot_state: state.prototypeSlot,
        __meta: {
            updatedAt: new Date().toISOString()
        }
    };
}

function createPersistedRawDbFromState(state) {
    return {
        ...createLegacyPayloadFromState(state),
        board_drafts: state.board.drafts
    };
}

function getEntryUpdatedAt(entry) {
    const timestamp = Date.parse(entry && entry.updatedAt ? entry.updatedAt : '');
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getBoardPostSnapshotKey(postId) {
    return `${BOARD_POST_STATE_PREFIX}${Number(postId || 0)}.json`;
}

function getBoardDraftSnapshotKey(userId, postId) {
    const safeUserId = encodeURIComponent(String(userId || '').trim() || 'anonymous');
    return `${BOARD_DRAFT_STATE_PREFIX}${safeUserId}-${Number(postId || 0) > 0 ? `edit_${Number(postId)}` : 'new'}.json`;
}

let rawDb = {};
let state = normalizeRawDb({});

function getDbUpdatedAt(db) {
    const value = db && db.__meta && db.__meta.updatedAt ? Date.parse(db.__meta.updatedAt) : NaN;
    return Number.isFinite(value) ? value : 0;
}

async function hydrateDatabaseFromRemote() {
    const storageStatus = storage.getStorageStatus();
    if (storageStatus.provider !== 'r2' || !storageStatus.isR2Configured) {
        return false;
    }

    try {
        const remoteText = await storage.readTextByKey(LIVE_DB_KEY);
        if (!remoteText) return false;

        const remoteDb = safeParseJson(remoteText, null);
        if (!remoteDb || typeof remoteDb !== 'object') return false;

        const localDb = fs.existsSync(DB_FILE)
            ? safeParseJson(fs.readFileSync(DB_FILE, 'utf8'), {})
            : {};
        const localUpdatedAt = getDbUpdatedAt(localDb);
        const remoteUpdatedAt = getDbUpdatedAt(remoteDb);

        if (localUpdatedAt && localUpdatedAt >= remoteUpdatedAt) {
            return false;
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(remoteDb, null, 2));
        return true;
    } catch (error) {
        console.warn('[DB] ?먭꺽 理쒖떊 ?곹깭 蹂듦뎄???ㅽ뙣?덉뒿?덈떎.', error.message || error);
        return false;
    }
}

async function mirrorDatabaseToRemote() {
    const storageStatus = storage.getStorageStatus();
    if (storageStatus.provider !== 'r2' || !storageStatus.isR2Configured) {
        return;
    }

    try {
        await storage.saveTextByKey({
            key: LIVE_DB_KEY,
            content: JSON.stringify(rawDb, null, 2),
            contentType: 'application/json'
        });
    } catch (error) {
        console.warn('[DB] ?먭꺽 理쒖떊 ?곹깭 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.', error.message || error);
    }
}

let remoteMirrorTimer = null;
let remoteMirrorQueue = Promise.resolve();
let deferredDbPersistTimer = null;
let deferredDbPersistQueue = Promise.resolve();
let hasPendingDeferredDbPersist = false;

function scheduleRemoteDatabaseMirror() {
    clearTimeout(remoteMirrorTimer);
    remoteMirrorTimer = setTimeout(() => {
        remoteMirrorQueue = remoteMirrorQueue
            .then(() => mirrorDatabaseToRemote())
            .catch((error) => {
                console.warn('[DB] 吏???먭꺽 誘몃윭留곸뿉 ?ㅽ뙣?덉뒿?덈떎.', error.message || error);
            });
    }, 350);
}

function refreshRawDbFromState() {
    rawDb = createPersistedRawDbFromState(state);
}

function flushRawDbToDisk() {
    fs.writeFileSync(DB_FILE, JSON.stringify(rawDb));
}

function scheduleDeferredDbPersist() {
    hasPendingDeferredDbPersist = true;
    refreshRawDbFromState();

    clearTimeout(deferredDbPersistTimer);
    deferredDbPersistTimer = setTimeout(() => {
        deferredDbPersistTimer = null;
        deferredDbPersistQueue = deferredDbPersistQueue
            .then(async () => {
                if (!hasPendingDeferredDbPersist) return;
                await repairBoardPostsInState();
                refreshRawDbFromState();
                flushRawDbToDisk();
                hasPendingDeferredDbPersist = false;
                scheduleRemoteDatabaseMirror();
            })
            .catch((error) => {
                console.warn('[DB] 吏????μ뿉 ?ㅽ뙣?덉뒿?덈떎.', error.message || error);
            });
    }, 450);
}

async function saveBoardPostSnapshot(post) {
    if (!post || !post.id) return;
    await storage.saveTextByKey({
        key: getBoardPostSnapshotKey(post.id),
        content: JSON.stringify(post),
        contentType: 'application/json'
    });
}

async function saveBoardPostTombstone(postId, updatedAt) {
    await storage.saveTextByKey({
        key: getBoardPostSnapshotKey(postId),
        content: JSON.stringify({
            id: Number(postId || 0),
            deleted: true,
            updatedAt: updatedAt || new Date().toISOString()
        }),
        contentType: 'application/json'
    });
}

async function saveBoardDraftSnapshot(draft) {
    if (!draft || !draft.userId) return;
    await storage.saveTextByKey({
        key: getBoardDraftSnapshotKey(draft.userId, draft.postId),
        content: JSON.stringify(draft),
        contentType: 'application/json'
    });
}

async function deleteBoardDraftSnapshot(userId, postId) {
    await storage.deleteByKey(getBoardDraftSnapshotKey(userId, postId));
}

async function reconcileBoardArtifactsInState() {
    let changed = false;

    const postKeys = await storage.listKeysByPrefix(BOARD_POST_STATE_PREFIX);
    for (const key of postKeys) {
        const text = await storage.readTextByKey(key);
        const snapshot = safeParseJson(text, null);
        if (!snapshot || typeof snapshot !== 'object') continue;

        const snapshotUpdatedAt = getEntryUpdatedAt(snapshot);
        const index = state.board.posts.findIndex((post) => Number(post.id) === Number(snapshot.id));

        if (snapshot.deleted) {
            if (index >= 0) {
                const existingPost = state.board.posts[index];
                if (snapshotUpdatedAt >= getEntryUpdatedAt(existingPost)) {
                    state.board.posts.splice(index, 1);
                    changed = true;
                }
            }
            continue;
        }

        const normalizedPost = normalizeBoardPosts([snapshot], state.board.categories)[0];
        if (index < 0) {
            state.board.posts.push(normalizedPost);
            changed = true;
            continue;
        }

        if (snapshotUpdatedAt >= getEntryUpdatedAt(state.board.posts[index])) {
            state.board.posts[index] = normalizedPost;
            changed = true;
        }
    }

    const draftKeys = await storage.listKeysByPrefix(BOARD_DRAFT_STATE_PREFIX);
    for (const key of draftKeys) {
        const text = await storage.readTextByKey(key);
        const snapshot = safeParseJson(text, null);
        if (!snapshot || typeof snapshot !== 'object' || !snapshot.userId) continue;

        const normalizedDraftMap = normalizeBoardDrafts({
            [createBoardDraftKey(snapshot.userId, snapshot.postId)]: snapshot
        }, state.board.categories);
        const [normalizedDraft] = Object.values(normalizedDraftMap);
        if (!normalizedDraft) continue;

        const draftKey = createBoardDraftKey(normalizedDraft.userId, normalizedDraft.postId);
        const existingDraft = state.board.drafts[draftKey];

        if (!existingDraft || getEntryUpdatedAt(normalizedDraft) >= getEntryUpdatedAt(existingDraft)) {
            state.board.drafts[draftKey] = normalizedDraft;
            changed = true;
        }
    }

    return changed;
}

function loadStateFromDisk() {
    rawDb = safeParseJson(fs.readFileSync(DB_FILE, 'utf8'), {});
    state = normalizeRawDb(rawDb);
}

async function persistDb(options = {}) {
    clearTimeout(deferredDbPersistTimer);
    deferredDbPersistTimer = null;
    hasPendingDeferredDbPersist = false;
    if (!options.skipBoardRepair) {
        await repairBoardPostsInState();
    }
    refreshRawDbFromState();
    flushRawDbToDisk();

    if (options.deferRemote) {
        scheduleRemoteDatabaseMirror();
        return;
    }

    await mirrorDatabaseToRemote();
}

function persistDbInBackground(options = {}) {
    setTimeout(() => {
        persistDb(options).catch((error) => {
            console.error('[Persist] 諛깃렇?쇱슫????μ뿉 ?ㅽ뙣?덉뒿?덈떎.', error);
        });
    }, 0);
}

function migrateLoginHeroStorageIfNeeded() {
    const rawImages = Array.isArray(rawDb.login_hero_images) ? rawDb.login_hero_images : [];
    const hasInlineImages = rawImages.some((entry) => typeof entry === 'string' && entry.startsWith('data:image/'));
    if (!hasInlineImages) return;
    persistDb();
}

function migrateBannerStorageIfNeeded() {
    const serialized = JSON.stringify(rawDb.site_banners || {});
    if (!serialized.includes('data:image/')) return;
    persistDb();
}

async function migrateBoardInlineStorageIfNeeded() {
    const storageStatus = storage.getStorageStatus();
    if (storageStatus.provider !== 'r2' || !storageStatus.isR2Configured) return;
    const before = JSON.stringify(state.board.posts.map((post) => post.content || ''));
    await repairBoardPostsInState();
    const after = JSON.stringify(state.board.posts.map((post) => post.content || ''));

    if (before !== after) {
        await persistDb();
    }
}

function reloadDb() {
    if (hasPendingDeferredDbPersist || deferredDbPersistTimer) {
        return;
    }
    loadStateFromDisk();
    migrateLoginHeroStorageIfNeeded();
    migrateBannerStorageIfNeeded();
}

function isReuseCodeEnabled() {
    return Boolean(state.reuseInviteCode);
}

function applyLegacySyncWrite(key, value) {
    switch (key) {
    case 'users_db':
        state.users = normalizeUsers(safeParseJson(value, {}));
        break;
    case 'board_posts':
        // Board posts are now managed only through the dedicated /api/board/posts APIs.
        // Ignoring legacy sync writes here prevents stale browser caches from overwriting
        // live posts during redeploys, reloads, or cross-feature localStorage sync flows.
        break;
    case 'board_drafts':
        break;
    case 'liked_posts':
        state.board.likedPosts = safeParseJson(value, []);
        break;
    case 'disliked_posts':
        state.board.dislikedPosts = safeParseJson(value, []);
        break;
    case 'site_banners': {
        const previousPaths = getBannerUploadPaths(state.banners);
        const nextBanners = normalizeBannerState(safeParseJson(value, {}));
        const nextPaths = new Set(getBannerUploadPaths(nextBanners));
        previousPaths.forEach((entry) => {
            if (!nextPaths.has(entry)) {
                deleteMatchingUploadedFiles([entry], '/uploads/banners/');
            }
        });
        state.banners = nextBanners;
        break;
    }
    case 'invite_codes':
        state.inviteCodes = safeParseJson(value, ['FRIENDS2026']);
        break;
    case 'user_notifications':
        state.notifications = safeParseJson(value, {});
        break;
    case 'settings_reuse_code':
        state.reuseInviteCode = value === true || value === 'true' || value === 1 || value === '1';
        break;
    case 'service_access_settings':
        state.accessSettings = normalizeServiceAccessSettings(safeParseJson(value, DEFAULT_SERVICE_ACCESS_SETTINGS));
        break;
    case 'prototype_slot_state':
        state.prototypeSlot = normalizePrototypeSlotState(safeParseJson(value, DEFAULT_PROTOTYPE_SLOT_STATE));
        break;
    case 'my_ai_directory':
        state.ai.directory = safeParseJson(value, []);
        break;
    case 'my_prompt_directory':
        state.ai.prompts = normalizeAiPromptEntries(safeParseJson(value, []));
        break;
    case 'mountains_db':
        state.mountains = normalizeMountainRecords(safeParseJson(value, []));
        break;
    case 'board_categories':
        remapBoardCategoriesInState(safeParseJson(value, []));
        break;
    case 'login_hero_images': {
        const nextImages = normalizeLoginHeroImages(Array.isArray(value) ? value : safeParseJson(value, []));
        deleteLoginHeroFiles(state.loginHero.images);
        state.loginHero.images = nextImages;
        break;
    }
    case 'login_hero_interval_seconds':
        state.loginHero.intervalSeconds = Number.isFinite(Number(value)) ? Math.min(120, Math.max(3, Number(value))) : 10;
        break;
    case 'login_hero_random_order':
        state.loginHero.randomOrder = Boolean(value);
        break;
    case 'current_user':
        state.currentUser = value || null;
        break;
    default:
        rawDb[key] = value;
        return;
    }
}

app.get('/api/sync', (req, res) => {
    try {
        reloadDb();
        res.json(createLegacyPayloadFromState(state));
    } catch (error) {
        res.json(createLegacyPayloadFromState(state));
    }
});

app.get('/api/sync', (req, res) => {
    reloadDb();
    res.json(createLegacyPayloadFromState(state));
});

app.post('/api/sync', async (req, res) => {
    const { key, value } = req.body || {};

    if (key) {
        if (value === null) {
            if (key === 'current_user') {
                state.currentUser = null;
            } else {
                delete rawDb[key];
            }
        } else {
            applyLegacySyncWrite(key, value);
        }

        await persistDb();
    }

    res.json({ success: true });
});

app.post('/api/auth/signup', async (req, res) => {
    reloadDb();

    const id = String(req.body && req.body.id ? req.body.id : '').trim();
    const password = String(req.body && req.body.password ? req.body.password : '').trim();
    const inviteCode = String(req.body && req.body.code ? req.body.code : '').trim();

    if (!id) {
        return res.status(400).json({ success: false, message: '?꾩씠?붾? ?낅젰??二쇱꽭??' });
    }

    if (password.length < 4) {
        return res.status(400).json({ success: false, message: '鍮꾨?踰덊샇??理쒖냼 4???댁긽?댁뼱???⑸땲??' });
    }

    const duplicateKey = Object.keys(state.users).find((key) => key.toLowerCase() === id.toLowerCase());
    if (duplicateKey) {
        return res.status(400).json({ success: false, message: '?대? 議댁옱?섎뒗 ?꾩씠?붿엯?덈떎.' });
    }

    const codeIndex = state.inviteCodes.indexOf(inviteCode);
    if (codeIndex < 0) {
        return res.status(400).json({ success: false, message: '珥덈? 肄붾뱶媛 ?щ컮瑜댁? ?딆뒿?덈떎.' });
    }

    state.users[id] = {
        password,
        status: 'pending',
        signupDate: new Date().toLocaleString('ko-KR'),
        points: 0,
        lastAttendanceDate: '',
        attendanceStreak: 0,
        maxAttendanceStreak: 0,
        unlockedTitles: [],
        activeTitleId: '',
        profileImage: '',
        profileFocusX: 50,
        profileFocusY: 50
    };
    state.users = normalizeUsers(state.users);

    if (!isReuseCodeEnabled()) {
        state.inviteCodes.splice(codeIndex, 1);
    }

    await persistDb();
    res.json({
        success: true,
        userId: id,
        users: state.users,
        inviteCodes: state.inviteCodes
    });
});

app.post('/api/auth/login', async (req, res) => {
    const id = String(req.body && req.body.id ? req.body.id : '').trim();
    const password = String(req.body && req.body.password ? req.body.password : '').trim();
    const userKey = Object.keys(state.users).find((key) => key.toLowerCase() === id.toLowerCase());

    if (!userKey || state.users[userKey].password !== password) {
        return res.status(400).json({ success: false, message: '?꾩씠???먮뒗 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.' });
    }

    state.users[userKey] = {
        ...state.users[userKey],
        lastLogin: new Date().toLocaleString('ko-KR')
    };
    state.users = normalizeUsers(state.users);
    state.currentUser = userKey;

    res.json({
        success: true,
        userId: userKey,
        user: state.users[userKey],
        users: state.users
    });

    persistDbInBackground({
        deferRemote: true,
        skipBoardRepair: true
    });
});

app.get('/api/login-hero', (req, res) => {
    reloadDb();
    res.json({
        images: state.loginHero.images,
        intervalSeconds: state.loginHero.intervalSeconds,
        randomOrder: state.loginHero.randomOrder
    });
});

app.post('/api/login-hero', async (req, res) => {
    const nextImages = req.body && Array.isArray(req.body.images) ? req.body.images : null;
    const hasInterval = req.body && Object.prototype.hasOwnProperty.call(req.body, 'intervalSeconds');
    const hasRandom = req.body && Object.prototype.hasOwnProperty.call(req.body, 'randomOrder');

    if (nextImages !== null) {
        const validImages = await persistLoginHeroImages(nextImages);
        if (!validImages.length) {
            return res.status(400).json({ success: false, message: '??ν븷 ?대?吏媛 ?놁뒿?덈떎.' });
        }
        await deleteStoredImageList(state.loginHero.images);
        state.loginHero.images = validImages;
    }

    if (hasInterval) {
        const intervalSeconds = Number(req.body.intervalSeconds);
        state.loginHero.intervalSeconds = Number.isFinite(intervalSeconds)
            ? Math.min(120, Math.max(3, Math.round(intervalSeconds)))
            : 10;
    }

    if (hasRandom) {
        state.loginHero.randomOrder = Boolean(req.body.randomOrder);
    }

    await persistDb();
    res.json({
        success: true,
        images: state.loginHero.images,
        intervalSeconds: state.loginHero.intervalSeconds,
        randomOrder: state.loginHero.randomOrder
    });
});

app.delete('/api/login-hero', async (req, res) => {
    await deleteStoredImageList(state.loginHero.images);
    state.loginHero.images = [];
    state.loginHero.intervalSeconds = 10;
    state.loginHero.randomOrder = false;
    await persistDb();
    res.json({ success: true });
});

app.get('/api/admin/storage-status', async (req, res) => {
    try {
        const backupEntries = await storage.listFolderEntries('backup');
        const latestBackup = backupEntries
            .filter((entry) => /backup-.*\.json$/i.test(entry.key))
            .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0] || null;

        res.json({
            success: true,
            storage: storage.getStorageStatus(),
            backup: {
                provider: storage.getStorageStatus().provider === 'r2' ? 'r2' : 'local',
                configured: true,
                retainCount: 2,
                latest: latestBackup ? {
                    key: latestBackup.key,
                    name: latestBackup.key.split('/').pop(),
                    lastModified: latestBackup.lastModified,
                    size: latestBackup.size,
                    url: latestBackup.url
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || '諛깆뾽 ?곹깭瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??'
        });
    }
});

app.post('/api/admin/backup/r2', async (req, res) => {
    try {
        const result = await uploadBackupToR2();
        res.json({ success: true, backup: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'R2 諛깆뾽???ㅽ뙣?덉뒿?덈떎.'
        });
    }
});

cron.schedule('0 23 * * *', async () => {
    try {
        const result = await uploadBackupToR2();
        console.log(`[Backup] Daily R2 backup completed: ${result.name}`);
        if (Array.isArray(result.removedKeys) && result.removedKeys.length) {
            console.log(`[Backup] Pruned old backups: ${result.removedKeys.join(', ')}`);
        }
    } catch (error) {
        console.error('[Backup] Daily R2 backup failed:', error.message || error);
    }
}, {
    timezone: 'Asia/Seoul'
});

app.post('/api/uploads/image', async (req, res) => {
    const folder = String(req.body && req.body.folder || '').trim();
    const dataUrl = String(req.body && req.body.dataUrl || '').trim();
    const fileName = String(req.body && req.body.fileName || '').trim();

    try {
        const savedPath = await storage.saveImageDataUrl({
            dataUrl,
            originalName: fileName,
                folder,
                fallbackName: folder === 'banner' ? 'banner' : folder === 'profile' ? 'profile' : 'board-inline',
                index: 0
            });
        res.json({ success: true, url: savedPath });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || '?대?吏 ?낅줈?쒖뿉 ?ㅽ뙣?덉뒿?덈떎.'
        });
    }
});

app.get('/api/board/meta', (req, res) => {
    res.json({
        categories: state.board.categories,
        totalPosts: state.board.posts.length,
        notices: state.board.posts.filter((post) => post.isNotice).length
    });
});

app.get('/api/board/posts', (req, res) => {
    const category = String(req.query.category || '').trim();
    const searchType = String(req.query.searchType || 'title');
    const search = String(req.query.search || '').trim().toLowerCase();
    const sort = String(req.query.sort || 'latest');

    let posts = [...state.board.posts];

    if (category) {
        posts = posts.filter((post) => post.category === category);
    }

    if (search) {
        posts = posts.filter((post) => {
            const title = String(post.title || '').toLowerCase();
            const content = String(post.content || '').toLowerCase();
            const author = String(post.author || '').toLowerCase();
            if (searchType === 'author') return author.includes(search);
            return title.includes(search) || content.includes(search);
        });
    }

    posts.sort((a, b) => {
        if (a.isNotice && !b.isNotice) return -1;
        if (!a.isNotice && b.isNotice) return 1;
        if (sort === 'likes') return (b.likes || 0) - (a.likes || 0) || (b.id || 0) - (a.id || 0);
        if (sort === 'views') return (b.views || 0) - (a.views || 0) || (b.id || 0) - (a.id || 0);
        return (b.id || 0) - (a.id || 0);
    });

    res.json({ posts });
});

app.get('/api/board/posts/:id', (req, res) => {
    const id = Number(req.params.id);
    const post = state.board.posts.find((item) => Number(item.id) === id);
    if (!post) {
        return res.status(404).json({ success: false, message: '寃뚯떆湲??李얠쓣 ???놁뒿?덈떎.' });
    }
    res.json({ post });
});

app.post('/api/board/posts', async (req, res) => {
    const payload = req.body || {};
    const nextId = state.board.posts.length ? Math.max(...state.board.posts.map((post) => Number(post.id || 0))) + 1 : 1;
    const nowIso = new Date().toISOString();
    const post = normalizeBoardPosts([{
        id: nextId,
        title: payload.title || '',
        content: payload.content || '',
        author: payload.author || '?듬챸',
        date: payload.date || '',
        updatedAt: payload.updatedAt || nowIso,
        views: payload.views || 0,
        likes: payload.likes || 0,
        dislikes: payload.dislikes || 0,
        comments: payload.comments || [],
        isNotice: Boolean(payload.isNotice),
        isRich: Boolean(payload.isRich),
        category: payload.category || state.board.categories[0]
    }], state.board.categories)[0];

    state.board.posts.push(post);
    delete state.board.drafts[createBoardDraftKey(post.author, null)];
    scheduleDeferredDbPersist();
    await saveBoardPostSnapshot(post);
    deleteBoardDraftSnapshot(post.author, null).catch(() => {});
    res.json({ success: true, post });
});

app.put('/api/board/posts/:id', async (req, res) => {
    const id = Number(req.params.id);
    const index = state.board.posts.findIndex((item) => Number(item.id) === id);
    if (index < 0) {
        return res.status(404).json({ success: false, message: '寃뚯떆湲??李얠쓣 ???놁뒿?덈떎.' });
    }

    state.board.posts[index] = normalizeBoardPosts([{
        ...state.board.posts[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
        id
    }], state.board.categories)[0];

    const savedPost = state.board.posts[index];
    delete state.board.drafts[createBoardDraftKey(savedPost.author, id)];
    scheduleDeferredDbPersist();
    await saveBoardPostSnapshot(savedPost);
    deleteBoardDraftSnapshot(savedPost.author, id).catch(() => {});
    res.json({ success: true, post: savedPost });
});

app.delete('/api/board/posts/:id', async (req, res) => {
    const id = Number(req.params.id);
    const existingPost = state.board.posts.find((item) => Number(item.id) === id);
    state.board.posts = state.board.posts.filter((item) => Number(item.id) !== id);
    scheduleDeferredDbPersist();
    await saveBoardPostTombstone(id, new Date().toISOString());
    if (existingPost) {
        deleteBoardDraftSnapshot(existingPost.author, id).catch(() => {});
    }
    res.json({ success: true });
});

app.get('/api/board/drafts', (req, res) => {
    const userId = String(req.query.user || '').trim();
    const postId = Number(req.query.postId || 0);
    if (!userId) {
        return res.status(400).json({ success: false, message: '?ъ슜???뺣낫媛 ?꾩슂?⑸땲??' });
    }

    const draft = state.board.drafts[createBoardDraftKey(userId, postId)] || null;
    res.json({ success: true, draft });
});

app.post('/api/board/drafts', async (req, res) => {
    const payload = req.body || {};
    const userId = String(payload.userId || '').trim();
    const postId = Number(payload.postId || 0);

    if (!userId) {
        return res.status(400).json({ success: false, message: '?ъ슜???뺣낫媛 ?꾩슂?⑸땲??' });
    }

    const draftKey = createBoardDraftKey(userId, postId);
    const normalizedDraft = normalizeBoardDrafts({
        [draftKey]: {
            userId,
            postId: postId > 0 ? postId : null,
            title: payload.title || '',
            content: payload.content || '',
            category: payload.category || state.board.categories[0],
            isNotice: Boolean(payload.isNotice),
            updatedAt: payload.updatedAt || new Date().toISOString()
        }
    }, state.board.categories)[draftKey];

    if (!normalizedDraft || (!normalizedDraft.title && !normalizedDraft.content)) {
        delete state.board.drafts[draftKey];
        scheduleDeferredDbPersist();
        await deleteBoardDraftSnapshot(userId, postId).catch(() => {});
        return res.json({ success: true, draft: null });
    }

    state.board.drafts[draftKey] = normalizedDraft;
    scheduleDeferredDbPersist();
    await saveBoardDraftSnapshot(normalizedDraft).catch(() => {});
    res.json({ success: true, draft: normalizedDraft });
});

app.delete('/api/board/drafts', async (req, res) => {
    const userId = String(req.query.user || '').trim();
    const postId = Number(req.query.postId || 0);
    if (!userId) {
        return res.status(400).json({ success: false, message: '?ъ슜???뺣낫媛 ?꾩슂?⑸땲??' });
    }

    delete state.board.drafts[createBoardDraftKey(userId, postId)];
    scheduleDeferredDbPersist();
    await deleteBoardDraftSnapshot(userId, postId).catch(() => {});
    res.json({ success: true });
});

app.get('/api/mountains', (req, res) => {
    res.json({
        success: true,
        mountains: normalizeMountainRecords(state.mountains)
    });
});

app.get('/api/ai/prompts', (req, res) => {
    res.json({
        success: true,
        prompts: normalizeAiPromptEntries(state.ai.prompts)
    });
});

app.get('/api/stock-sim/session', (req, res) => {
    reloadDb();
    const userId = String(req.query.userId || '').trim();

    if (!canAccessStockSim(userId)) {
        return res.status(403).json({
            success: false,
            message: '승인된 회원만 주식장에 입장할 수 있습니다.'
        });
    }

    state.stockSim = normalizeStockSimState(state.stockSim, state.users);
    const participant = state.stockSim.participants[userId] || null;

    return res.json({
        success: true,
        roomId: state.stockSim.roomId || 'main',
        participantCount: Object.keys(state.stockSim.participants || {}).length,
        leaderboard: createStockSimLeaderboardEntries(userId),
        participant
    });
});

app.put('/api/stock-sim/session', async (req, res) => {
    reloadDb();
    const userId = String(req.body && req.body.userId || '').trim();

    if (!canAccessStockSim(userId)) {
        return res.status(403).json({
            success: false,
            message: '승인된 회원만 주식장에 입장할 수 있습니다.'
        });
    }

    const snapshot =
        req.body && req.body.snapshot && typeof req.body.snapshot === 'object'
            ? req.body.snapshot
            : null;

    if (!snapshot || !snapshot.simulation || typeof snapshot.simulation !== 'object') {
        return res.status(400).json({
            success: false,
            message: '??ν븷 ?쒕??덉씠???ㅻ깄?룹씠 ?놁뒿?덈떎.'
        });
    }

    const previousParticipant = state.stockSim && state.stockSim.participants
        ? state.stockSim.participants[userId]
        : null;
    const previousSummary = previousParticipant && previousParticipant.summary
        ? previousParticipant.summary
        : null;
    const previousSavedAt = Number(previousSummary && previousSummary.savedAt || 0);
    const incomingSavedAt = Number(snapshot && snapshot.savedAt || 0);

    if (previousParticipant && previousSavedAt && incomingSavedAt && incomingSavedAt <= previousSavedAt) {
        return res.json({
            success: true,
            roomId: state.stockSim.roomId || 'main',
            participantCount: Object.keys((state.stockSim && state.stockSim.participants) || {}).length,
            leaderboard: createStockSimLeaderboardEntries(userId),
            participant: previousParticipant
        });
    }

    const nowIso = new Date().toISOString();

    state.stockSim = normalizeStockSimState({
        ...(state.stockSim || createEmptyStockSimState()),
        updatedAt: nowIso,
        participants: {
            ...((state.stockSim && state.stockSim.participants) || {}),
            [userId]: {
                userId,
                updatedAt: nowIso,
                lastActiveAt: nowIso,
                snapshot,
                summary: createStockSimSummaryFromSnapshot(userId, snapshot, previousSummary, state.users)
            }
        }
    }, state.users);

    await persistDb({ deferRemote: true, skipBoardRepair: true });

    return res.json({
        success: true,
        roomId: state.stockSim.roomId || 'main',
        participantCount: Object.keys(state.stockSim.participants || {}).length,
        leaderboard: createStockSimLeaderboardEntries(userId),
        participant: state.stockSim.participants[userId] || null
    });
});

app.post('/api/mountains', async (req, res) => {
    const payload = req.body || {};
    const nowIso = new Date().toISOString();
    const [record] = normalizeMountainRecords([{
        ...payload,
        id: payload.id || `m_${Date.now()}`,
        createdAt: payload.createdAt || nowIso,
        updatedAt: nowIso
    }]);

    state.mountains = [record, ...normalizeMountainRecords(state.mountains)];
    await persistDb({ deferRemote: true });
    res.json({ success: true, mountain: record });
});

app.put('/api/mountains/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    const index = normalizeMountainRecords(state.mountains).findIndex((item) => String(item.id) === id);
    if (index < 0) {
        return res.status(404).json({ success: false, message: '??湲곕줉??李얠쓣 ???놁뒿?덈떎.' });
    }

    const existing = normalizeMountainRecords(state.mountains)[index];
    const [record] = normalizeMountainRecords([{
        ...existing,
        ...req.body,
        id,
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }]);

    const nextMountains = normalizeMountainRecords(state.mountains);
    nextMountains[index] = record;
    state.mountains = nextMountains;
    await persistDb({ deferRemote: true });
    res.json({ success: true, mountain: record });
});

app.delete('/api/mountains/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    state.mountains = normalizeMountainRecords(state.mountains).filter((item) => String(item.id) !== id);
    await persistDb({ deferRemote: true });
    res.json({ success: true });
});

app.get('/api/users', (req, res) => {
    reloadDb();
    res.json({ success: true, users: state.users });
});

app.get('/api/users/:id', (req, res) => {
    reloadDb();
    const id = String(req.params.id || '');
    const key = Object.keys(state.users).find((entry) => entry.toLowerCase() === id.toLowerCase());
    if (!key) {
        return res.status(404).json({ success: false, message: '?뚯썝??李얠쓣 ???놁뒿?덈떎.' });
    }
    res.json({ userId: key, user: state.users[key] });
});

app.patch('/api/users/:id', async (req, res) => {
    reloadDb();
    const id = String(req.params.id || '');
    const key = Object.keys(state.users).find((entry) => entry.toLowerCase() === id.toLowerCase());
    if (!key) {
        return res.status(404).json({ success: false, message: '?뚯썝??李얠쓣 ???놁뒿?덈떎.' });
    }

    state.users[key] = {
        ...state.users[key],
        ...req.body
    };
    state.users = normalizeUsers(state.users);
    await persistDb();
    res.json({ success: true, userId: key, user: state.users[key] });
});

app.delete('/api/users/:id', async (req, res) => {
    reloadDb();
    const id = String(req.params.id || '');
    const key = Object.keys(state.users).find((entry) => entry.toLowerCase() === id.toLowerCase());
    if (!key) {
        return res.status(404).json({ success: false, message: '???뜚??筌≪뼚??????곷뮸??덈뼄.' });
    }

    if (key.toLowerCase() === 'admin' || state.users[key].isAdmin) {
        return res.status(400).json({ success: false, message: '愿由ъ옄 怨꾩젙? ??젣?????놁뒿?덈떎.' });
    }

    delete state.users[key];
    Object.keys(state.notifications || {}).forEach((notificationUserId) => {
        if (notificationUserId.toLowerCase() === key.toLowerCase()) {
            delete state.notifications[notificationUserId];
        }
    });
    if (String(state.currentUser || '').toLowerCase() === key.toLowerCase()) {
        state.currentUser = null;
    }
    await persistDb();
    res.json({ success: true, userId: key, users: state.users });
});

app.get('/api/admin/state', (req, res) => {
    reloadDb();
    res.json({
        inviteCodes: state.inviteCodes,
        boardCategories: state.board.categories,
        banners: state.banners,
        loginHero: state.loginHero,
        accessSettings: state.accessSettings,
        prototypeSlot: state.prototypeSlot
    });
});

app.get('/api/access-settings', (req, res) => {
    reloadDb();
    res.json({
        success: true,
        accessSettings: state.accessSettings
    });
});

app.get('/api/prototype-slot', (req, res) => {
    reloadDb();
    res.json({
        success: true,
        prototypeSlot: state.prototypeSlot
    });
});

app.post('/api/admin/board-categories', async (req, res) => {
    reloadDb();
    const categories = normalizeCategories(req.body && req.body.categories);
    remapBoardCategoriesInState(categories);
    await persistDb({ deferRemote: true });
    res.json({
        success: true,
        categories: state.board.categories
    });
});

app.post('/api/admin/access-settings', async (req, res) => {
    reloadDb();
    const currentSettings = normalizeServiceAccessSettings(state.accessSettings);
    const nextSettings = normalizeServiceAccessSettings({
        ...currentSettings,
        ...(req.body && typeof req.body === 'object' ? req.body : {})
    });
    state.accessSettings = nextSettings;
    res.json({
        success: true,
        accessSettings: state.accessSettings
    });
    persistDbInBackground({ deferRemote: true, skipBoardRepair: true });
});

app.post('/api/admin/prototype-slot', async (req, res) => {
    reloadDb();
    state.prototypeSlot = normalizePrototypeSlotState(req.body || {});
    res.json({
        success: true,
        prototypeSlot: state.prototypeSlot
    });
    persistDbInBackground({ deferRemote: true, skipBoardRepair: true });
});

async function runBackgroundBootstrap() {
    bootState.startedAt = new Date().toISOString();

    try {
        await hydrateDatabaseFromRemote();
        loadStateFromDisk();
        const reconciledBoardArtifacts = await reconcileBoardArtifactsInState();
        migrateLoginHeroStorageIfNeeded();
        migrateBannerStorageIfNeeded();
        await migrateBoardInlineStorageIfNeeded();
        if (reconciledBoardArtifacts) {
            await persistDb({ deferRemote: true });
        }

        bootState.readyAt = new Date().toISOString();
        console.log(`[Boot] Background initialization complete at ${bootState.readyAt}.`);
    } catch (error) {
        bootState.error = error && error.message ? error.message : String(error);
        console.error('[Boot] 諛깃렇?쇱슫??珥덇린?붿뿉 ?ㅽ뙣?덉뒿?덈떎.', error);
    }
}

async function bootstrap() {
    try {
        loadStateFromDisk();
    } catch (error) {
        console.warn('[Boot] 濡쒖뺄 DB瑜?癒쇱? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? 珥덇린 ?곹깭濡??쒖옉?⑸땲??', error.message || error);
    }

    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';

    await new Promise((resolve, reject) => {
        const server = app.listen(PORT, HOST, () => {
            console.log(`Server running on port ${PORT}.`);
            console.log('Normalized API is ready for Railway/R2 migration.');
            console.log(`Data directory: ${DATA_DIR}`);
            console.log(`[Boot] Listening on ${HOST}:${PORT} while background initialization continues.`);
            runBackgroundBootstrap();
            resolve(server);
        });

        server.on('error', reject);
    });
}

bootstrap().catch((error) => {
    console.error('[Boot] ?쒕쾭 ?쒖옉???ㅽ뙣?덉뒿?덈떎.', error);
    process.exit(1);
});
