require('dotenv').config();

function readEnv(name) {
    return String(process.env[name] || '').trim();
}

function boolLabel(value) {
    return value ? 'OK' : 'MISSING';
}

function main() {
    const storageProvider = readEnv('STORAGE_PROVIDER') || 'local';
    const r2Checks = {
        R2_ACCOUNT_ID: Boolean(readEnv('R2_ACCOUNT_ID')),
        R2_ACCESS_KEY_ID: Boolean(readEnv('R2_ACCESS_KEY_ID')),
        R2_SECRET_ACCESS_KEY: Boolean(readEnv('R2_SECRET_ACCESS_KEY')),
        R2_BUCKET: Boolean(readEnv('R2_BUCKET')),
        R2_PUBLIC_BASE_URL: Boolean(readEnv('R2_PUBLIC_BASE_URL'))
    };
    console.log('=== Cloud Config Check ===');
    console.log(`STORAGE_PROVIDER: ${storageProvider}`);
    console.log('');
    console.log('[R2]');
    Object.entries(r2Checks).forEach(([key, value]) => {
        console.log(`${key}: ${boolLabel(value)}`);
    });

    const isR2Ready = Object.values(r2Checks).every(Boolean);

    console.log('');
    console.log(`R2 Ready: ${isR2Ready ? 'YES' : 'NO'}`);

    if (storageProvider === 'r2' && !isR2Ready) {
        process.exitCode = 1;
    }
}

main();
