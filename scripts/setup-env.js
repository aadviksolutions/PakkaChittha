/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

const envPath = '.env';
const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

if (!content.includes('SUPER_ADMIN_EMAIL=')) {
  const newContent = content + '\nSUPER_ADMIN_EMAIL=admin@pakkachittha.com\nSUPER_ADMIN_PASSWORD=Admin@Pakkachittha@2026\nSUPER_ADMIN_NAME="Pakka Chittha Admin"\n';
  fs.writeFileSync(envPath, newContent);
  console.log('Appended SUPER_ADMIN environment variables to .env');
} else {
  console.log('SUPER_ADMIN environment variables already present in .env');
}
