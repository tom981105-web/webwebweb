require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const storage = require('./storage');
const { uploadBackupToR2 } = require('./r2-backup');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use(express.static(path.resolve(__dirname)));

app.get('/health', (req, res) => res.send('OK'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const DB_FILE = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const LOGIN_HERO_DIR = path.join(UPLOADS_DIR, 'login-hero');
const BANNER_DIR = path.join(UPLOADS_DIR, 'banners');
const BOARD_INLINE_DIR = path.join(UPLOADS_DIR, 'board-inline');
const DEFAULT_CATEGORIES = ['카테고리 1', '카테고리 2', '카테고리 3', '카테고리 4'];

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(LOGIN_HERO_DIR)) {
    fs.mkdirSync(LOGIN_HERO_DIR, { recursive: true });
}

if (!fs.existsSync(BANNER_DIR)) {
    fs.mkdirSync(BANNER_DIR, { recursive: true });
}

if (!fs.existsSync(BOARD_INLINE_DIR)) {
    fs.mkdirSync(BOARD_INLINE_DIR, { recursive: true });
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
        normalized[key] = {
            ...normalized[key],
            points: Number(normalized[key].points || 0),
            lastAttendanceDate: normalized[key].lastAttendanceDate || '',
            attendanceStreak: Number(normalized[key].attendanceStreak || 0),
            maxAttendanceStreak: Number(normalized[key].maxAttendanceStreak || 0),
            unlockedTitles: Array.isArray(normalized[key].unlockedTitles) ? normalized[key].unlockedTitles : [],
            activeTitleId: normalized[key].activeTitleId || ''
        };
    });

    return normalized;
}

function normalizeBoardPosts(value, categories) {
    const posts = Array.isArray(value) ? value : [];
    return posts.map((post) => ({
        ...post,
        id: Number(post.id || 0),
        title: post.title || '',
        content: normalizeBoardContent(post.content || ''),
        author: post.author || '익명',
        date: post.date || '',
        views: Number(post.views || 0),
        likes: Number(post.likes || 0),
        dislikes: Number(post.dislikes || 0),
        isNotice: Boolean(post.isNotice),
        isRich: Boolean(post.isRich),
        comments: Array.isArray(post.comments) ? post.comments : [],
        category: categories.includes(post.category) ? post.category : categories[0]
    }));
}

function normalizeBanners(value) {
    return value && typeof value === 'object'
        ? value
        : {
            top: { title: '우리들의 아지트', desc: '우리들만의 소중한 공간에 오신 것을 환영합니다.', bg: '', posX: 4, posY: 50 },
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

function getMimeExtension(mimeType) {
    const normalizedMime = String(mimeType || '').toLowerCase();
    if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') return '.jpg';
    if (normalizedMime === 'image/png') return '.png';
    if (normalizedMime === 'image/webp') return '.webp';
    if (normalizedMime === 'image/gif') return '.gif';
    return '.png';
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
        const filePath = path.join(__dirname, normalized.replace(/^\//, '').replace(/\//g, path.sep));
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
        const filePath = path.join(__dirname, normalized.replace(/^\//, '').replace(/\//g, path.sep));
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
    const normalized = {
        users: normalizeUsers(safeParseJson(raw.users_db, raw.users_db || {})),
        board: {
            categories,
            posts: normalizeBoardPosts(safeParseJson(raw.board_posts, raw.board_posts || []), categories),
            likedPosts: safeParseJson(raw.liked_posts, raw.liked_posts || []),
            dislikedPosts: safeParseJson(raw.disliked_posts, raw.disliked_posts || [])
        },
        inviteCodes: safeParseJson(raw.invite_codes, raw.invite_codes || ['FRIENDS2026']),
        ai: {
            directory: safeParseJson(raw.my_ai_directory, raw.my_ai_directory || []),
            prompts: safeParseJson(raw.my_prompt_directory, raw.my_prompt_directory || [])
        },
        mountains: safeParseJson(raw.mountains_db, raw.mountains_db || []),
        banners: normalizeBannerState(safeParseJson(raw.site_banners, raw.site_banners || {})),
        loginHero: {
            images: normalizeLoginHeroImages(Array.isArray(raw.login_hero_images) ? raw.login_hero_images : []),
            intervalSeconds: Number.isFinite(Number(raw.login_hero_interval_seconds)) ? Math.min(120, Math.max(3, Number(raw.login_hero_interval_seconds))) : 10,
            randomOrder: Boolean(raw.login_hero_random_order)
        },
        currentUser: raw.current_user || null
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
        login_hero_random_order: state.loginHero.randomOrder
    };
}

let rawDb = safeParseJson(fs.readFileSync(DB_FILE, 'utf8'), {});
let state = normalizeRawDb(rawDb);

function persistDb() {
    rawDb = createLegacyPayloadFromState(state);
    fs.writeFileSync(DB_FILE, JSON.stringify(rawDb, null, 2));
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

function reloadDb() {
    rawDb = safeParseJson(fs.readFileSync(DB_FILE, 'utf8'), {});
    state = normalizeRawDb(rawDb);
    migrateLoginHeroStorageIfNeeded();
    migrateBannerStorageIfNeeded();
}

migrateLoginHeroStorageIfNeeded();
migrateBannerStorageIfNeeded();

function applyLegacySyncWrite(key, value) {
    switch (key) {
    case 'users_db':
        state.users = normalizeUsers(safeParseJson(value, {}));
        break;
    case 'board_posts':
        state.board.posts = normalizeBoardPosts(safeParseJson(value, []), state.board.categories);
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
    case 'my_ai_directory':
        state.ai.directory = safeParseJson(value, []);
        break;
    case 'my_prompt_directory':
        state.ai.prompts = safeParseJson(value, []);
        break;
    case 'mountains_db':
        state.mountains = safeParseJson(value, []);
        break;
    case 'board_categories':
        state.board.categories = normalizeCategories(safeParseJson(value, []));
        state.board.posts = normalizeBoardPosts(state.board.posts, state.board.categories);
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

app.post('/api/sync', (req, res) => {
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

        persistDb();
    }

    res.json({ success: true });
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
            return res.status(400).json({ success: false, message: '저장할 이미지가 없습니다.' });
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

    persistDb();
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
    persistDb();
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
            message: error.message || '백업 상태를 불러오지 못했습니다.'
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
            message: error.message || 'R2 백업에 실패했습니다.'
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
            fallbackName: folder === 'banner' ? 'banner' : 'board-inline',
            index: 0
        });
        res.json({ success: true, url: savedPath });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || '이미지 업로드에 실패했습니다.'
        });
    }
});

app.get('/api/board/meta', (req, res) => {
    reloadDb();
    res.json({
        categories: state.board.categories,
        totalPosts: state.board.posts.length,
        notices: state.board.posts.filter((post) => post.isNotice).length
    });
});

app.get('/api/board/posts', (req, res) => {
    reloadDb();
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
    reloadDb();
    const id = Number(req.params.id);
    const post = state.board.posts.find((item) => Number(item.id) === id);
    if (!post) {
        return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }
    res.json({ post });
});

app.post('/api/board/posts', (req, res) => {
    reloadDb();
    const payload = req.body || {};
    const nextId = state.board.posts.length ? Math.max(...state.board.posts.map((post) => Number(post.id || 0))) + 1 : 1;
    const post = normalizeBoardPosts([{
        id: nextId,
        title: payload.title || '',
        content: payload.content || '',
        author: payload.author || '익명',
        date: payload.date || '',
        views: payload.views || 0,
        likes: payload.likes || 0,
        dislikes: payload.dislikes || 0,
        comments: payload.comments || [],
        isNotice: Boolean(payload.isNotice),
        isRich: Boolean(payload.isRich),
        category: payload.category || state.board.categories[0]
    }], state.board.categories)[0];

    state.board.posts.push(post);
    persistDb();
    res.json({ success: true, post });
});

app.put('/api/board/posts/:id', (req, res) => {
    reloadDb();
    const id = Number(req.params.id);
    const index = state.board.posts.findIndex((item) => Number(item.id) === id);
    if (index < 0) {
        return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }

    state.board.posts[index] = normalizeBoardPosts([{
        ...state.board.posts[index],
        ...req.body,
        id
    }], state.board.categories)[0];

    persistDb();
    res.json({ success: true, post: state.board.posts[index] });
});

app.delete('/api/board/posts/:id', (req, res) => {
    reloadDb();
    const id = Number(req.params.id);
    state.board.posts = state.board.posts.filter((item) => Number(item.id) !== id);
    persistDb();
    res.json({ success: true });
});

app.get('/api/users', (req, res) => {
    reloadDb();
    res.json({ users: state.users });
});

app.get('/api/users/:id', (req, res) => {
    reloadDb();
    const id = String(req.params.id || '');
    const key = Object.keys(state.users).find((entry) => entry.toLowerCase() === id.toLowerCase());
    if (!key) {
        return res.status(404).json({ success: false, message: '회원을 찾을 수 없습니다.' });
    }
    res.json({ userId: key, user: state.users[key] });
});

app.patch('/api/users/:id', (req, res) => {
    reloadDb();
    const id = String(req.params.id || '');
    const key = Object.keys(state.users).find((entry) => entry.toLowerCase() === id.toLowerCase());
    if (!key) {
        return res.status(404).json({ success: false, message: '회원을 찾을 수 없습니다.' });
    }

    state.users[key] = {
        ...state.users[key],
        ...req.body
    };
    state.users = normalizeUsers(state.users);
    persistDb();
    res.json({ success: true, userId: key, user: state.users[key] });
});

app.delete('/api/users/:id', (req, res) => {
    reloadDb();
    const id = String(req.params.id || '');
    const key = Object.keys(state.users).find((entry) => entry.toLowerCase() === id.toLowerCase());
    if (!key) {
        return res.status(404).json({ success: false, message: '?뚯썝??李얠쓣 ???놁뒿?덈떎.' });
    }

    if (key.toLowerCase() === 'admin' || state.users[key].isAdmin) {
        return res.status(400).json({ success: false, message: '관리자 계정은 삭제할 수 없습니다.' });
    }

    delete state.users[key];
    persistDb();
    res.json({ success: true });
});

app.get('/api/admin/state', (req, res) => {
    reloadDb();
    res.json({
        inviteCodes: state.inviteCodes,
        boardCategories: state.board.categories,
        banners: state.banners,
        loginHero: state.loginHero
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}.`);
    console.log('Normalized API is ready for Railway/R2 migration.');
});
