const fs = require('fs');
const path = require('path');

const APP_DIR = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || APP_DIR);
const BUNDLED_DB_FILE = path.join(APP_DIR, 'database.json');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const LOGIN_HERO_DIR = path.join(UPLOADS_DIR, 'login-hero');
const BANNER_DIR = path.join(UPLOADS_DIR, 'banners');
const BOARD_INLINE_DIR = path.join(UPLOADS_DIR, 'board-inline');
const PROFILE_DIR = path.join(UPLOADS_DIR, 'profiles');
const BACKUP_DIR = path.join(UPLOADS_DIR, 'backups');

function ensureDataLayout() {
    [
        DATA_DIR,
        UPLOADS_DIR,
        LOGIN_HERO_DIR,
        BANNER_DIR,
        BOARD_INLINE_DIR,
        PROFILE_DIR,
        BACKUP_DIR
    ].forEach((targetPath) => {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
    });

    if (!fs.existsSync(DB_FILE)) {
        if (fs.existsSync(BUNDLED_DB_FILE)) {
            fs.copyFileSync(BUNDLED_DB_FILE, DB_FILE);
        } else {
            fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
        }
    }
}

module.exports = {
    APP_DIR,
    DATA_DIR,
    DB_FILE,
    UPLOADS_DIR,
    LOGIN_HERO_DIR,
    BANNER_DIR,
    BOARD_INLINE_DIR,
    PROFILE_DIR,
    BACKUP_DIR,
    ensureDataLayout
};
