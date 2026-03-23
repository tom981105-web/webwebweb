require('dotenv').config();

const fs = require('fs');
const path = require('path');
const storage = require('./storage');
const { DATA_DIR, DB_FILE, UPLOADS_DIR, ensureDataLayout } = require('./paths');

const RETAIN_BACKUP_COUNT = 2;

ensureDataLayout();

function createSnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const uploadFiles = [];

    if (fs.existsSync(UPLOADS_DIR)) {
        walkDirectory(UPLOADS_DIR, (absolutePath) => {
            const relativePath = path.relative(DATA_DIR, absolutePath).replace(/\\/g, '/');
            const stat = fs.statSync(absolutePath);
            uploadFiles.push({
                path: relativePath,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString()
            });
        });
    }

    return {
        fileName: `backup-${timestamp}.json`,
        content: JSON.stringify({
            createdAt: new Date().toISOString(),
            storage: storage.getStorageStatus(),
            database: db,
            uploads: uploadFiles
        }, null, 2)
    };
}

function walkDirectory(dirPath, visitor) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
        const absolutePath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            walkDirectory(absolutePath, visitor);
            return;
        }
        visitor(absolutePath);
    });
}

async function pruneOldBackups() {
    const entries = await storage.listFolderEntries('backup');
    const backups = entries
        .filter((entry) => /backup-.*\.json$/i.test(entry.key))
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    const removed = [];
    for (const entry of backups.slice(RETAIN_BACKUP_COUNT)) {
        await storage.deleteByKey(entry.key);
        removed.push(entry.key);
    }

    return removed;
}

async function uploadBackupToR2() {
    const snapshot = createSnapshot();
    const url = await storage.saveTextFile({
        folder: 'backup',
        fileName: snapshot.fileName,
        content: snapshot.content,
        contentType: 'application/json'
    });

    const removedKeys = await pruneOldBackups();

    return {
        name: snapshot.fileName,
        url,
        removedKeys
    };
}

if (require.main === module) {
    uploadBackupToR2()
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch((error) => {
            console.error(error.message || error);
            process.exit(1);
        });
}

module.exports = {
    uploadBackupToR2
};
