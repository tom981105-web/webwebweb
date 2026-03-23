const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const ROOT_DIR = __dirname;
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const PROVIDER = String(process.env.STORAGE_PROVIDER || 'local').trim().toLowerCase();

const FOLDER_MAP = {
    'login-hero': {
        localDir: path.join(UPLOADS_DIR, 'login-hero'),
        publicPrefix: '/uploads/login-hero',
        fallback: 'login-hero'
    },
    banner: {
        localDir: path.join(UPLOADS_DIR, 'banners'),
        publicPrefix: '/uploads/banners',
        fallback: 'banner'
    },
    'board-inline': {
        localDir: path.join(UPLOADS_DIR, 'board-inline'),
        publicPrefix: '/uploads/board-inline',
        fallback: 'board-inline'
    },
    backup: {
        localDir: path.join(UPLOADS_DIR, 'backups'),
        publicPrefix: '/uploads/backups',
        fallback: 'backup'
    }
};

Object.values(FOLDER_MAP).forEach((config) => {
    if (!fs.existsSync(config.localDir)) {
        fs.mkdirSync(config.localDir, { recursive: true });
    }
});

let r2Client = null;

function getR2Client() {
    if (r2Client) return r2Client;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 환경 변수가 부족합니다.');
    }

    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });

    return r2Client;
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

function parseDataUrl(dataUrl) {
    const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new Error('지원하지 않는 이미지 형식입니다.');
    }

    return {
        mimeType: match[1],
        buffer: Buffer.from(match[2], 'base64')
    };
}

function buildFileName(originalName, fallbackName, index, extension) {
    const baseName = sanitizeBaseName(originalName, `${fallbackName}-${index + 1}`);
    return `${Date.now()}-${index + 1}-${baseName}${extension}`;
}

function normalizeStoredUrl(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';

    const localhostMatch = rawValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
    if (localhostMatch) return localhostMatch[1];

    if (/^\/uploads\//i.test(rawValue)) return rawValue;
    if (/^https?:\/\//i.test(rawValue)) return rawValue;
    return '';
}

async function saveImageDataUrl({ dataUrl, originalName, folder, fallbackName, index = 0 }) {
    const folderConfig = FOLDER_MAP[folder];
    if (!folderConfig) {
        throw new Error('지원하지 않는 저장 폴더입니다.');
    }

    const { mimeType, buffer } = parseDataUrl(dataUrl);
    const extension = getMimeExtension(mimeType);
    const fileName = buildFileName(originalName, fallbackName || folderConfig.fallback, index, extension);

    if (PROVIDER === 'r2') {
        const bucket = process.env.R2_BUCKET;
        const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
        if (!bucket || !publicBaseUrl) {
            throw new Error('R2 버킷 또는 공개 URL 설정이 없습니다.');
        }

        const key = `${folder}/${fileName}`;
        await getR2Client().send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType
        }));

        return `${publicBaseUrl}/${key}`;
    }

    const targetPath = path.join(folderConfig.localDir, fileName);
    fs.writeFileSync(targetPath, buffer);
    return `${folderConfig.publicPrefix}/${fileName}`;
}

async function deleteStoredUrl(value) {
    const normalized = normalizeStoredUrl(value);
    if (!normalized) return;

    if (PROVIDER === 'r2') {
        const bucket = process.env.R2_BUCKET;
        const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
        if (!bucket || !publicBaseUrl || !normalized.startsWith(publicBaseUrl)) return;

        const key = normalized.slice(publicBaseUrl.length + 1);
        if (!key) return;

        await getR2Client().send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        }));
        return;
    }

    if (!normalized.startsWith('/uploads/')) return;
    const filePath = path.join(ROOT_DIR, normalized.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function saveTextFile({ content, folder, fileName, contentType = 'application/json' }) {
    const folderConfig = FOLDER_MAP[folder];
    if (!folderConfig) {
        throw new Error('지원하지 않는 저장 폴더입니다.');
    }

    const normalizedFileName = String(fileName || '').trim();
    if (!normalizedFileName) {
        throw new Error('파일 이름이 필요합니다.');
    }

    if (PROVIDER === 'r2') {
        const bucket = process.env.R2_BUCKET;
        const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
        if (!bucket || !publicBaseUrl) {
            throw new Error('R2 버킷 또는 공개 URL 설정이 없습니다.');
        }

        const key = `${folder}/${normalizedFileName}`;
        await getR2Client().send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(String(content || ''), 'utf8'),
            ContentType: contentType
        }));

        return `${publicBaseUrl}/${key}`;
    }

    const targetPath = path.join(folderConfig.localDir, normalizedFileName);
    fs.writeFileSync(targetPath, String(content || ''), 'utf8');
    return `${folderConfig.publicPrefix}/${normalizedFileName}`;
}

async function listFolderEntries(folder) {
    const folderConfig = FOLDER_MAP[folder];
    if (!folderConfig) {
        throw new Error('지원하지 않는 저장 폴더입니다.');
    }

    if (PROVIDER === 'r2') {
        const bucket = process.env.R2_BUCKET;
        const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
        if (!bucket || !publicBaseUrl) {
            throw new Error('R2 버킷 또는 공개 URL 설정이 없습니다.');
        }

        const response = await getR2Client().send(new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `${folder}/`
        }));

        return (response.Contents || []).map((entry) => ({
            key: entry.Key,
            url: `${publicBaseUrl}/${entry.Key}`,
            lastModified: entry.LastModified ? new Date(entry.LastModified).toISOString() : '',
            size: Number(entry.Size || 0)
        }));
    }

    if (!fs.existsSync(folderConfig.localDir)) return [];

    return fs.readdirSync(folderConfig.localDir).map((name) => {
        const absolutePath = path.join(folderConfig.localDir, name);
        const stat = fs.statSync(absolutePath);
        return {
            key: `${folder}/${name}`,
            url: `${folderConfig.publicPrefix}/${name}`,
            lastModified: stat.mtime.toISOString(),
            size: stat.size
        };
    });
}

async function deleteByKey(key) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;

    if (PROVIDER === 'r2') {
        const bucket = process.env.R2_BUCKET;
        if (!bucket) {
            throw new Error('R2 버킷 설정이 없습니다.');
        }

        await getR2Client().send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: normalizedKey
        }));
        return;
    }

    const absolutePath = path.join(ROOT_DIR, normalizedKey.replace(/\//g, path.sep));
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
    }
}

function resolveDisplayUrl(value, apiBase = '') {
    const normalized = normalizeStoredUrl(value);
    if (!normalized) return '';
    if (/^\/uploads\//i.test(normalized) && apiBase) {
        return `${apiBase}${normalized}`;
    }
    return normalized;
}

function getStorageStatus() {
    return {
        provider: PROVIDER,
        isR2Configured: PROVIDER === 'r2' && Boolean(process.env.R2_BUCKET && process.env.R2_PUBLIC_BASE_URL)
    };
}

module.exports = {
    normalizeStoredUrl,
    resolveDisplayUrl,
    saveImageDataUrl,
    deleteStoredUrl,
    saveTextFile,
    listFolderEntries,
    deleteByKey,
    getStorageStatus
};
