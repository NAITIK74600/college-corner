/**
 * install-startup.js
 * Adds (or removes) START.bat to the Windows
 * HKCU\Software\Microsoft\Windows\CurrentVersion\Run registry key,
 * so the shopkeeper launcher auto-starts when the current user logs in.
 *
 * Usage:
 *   node install-startup.js             → installs
 *   node install-startup.js --uninstall → removes
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const { execSync } = require('child_process');

// START.bat is one level up from shopkeeper/ (at the root of the extracted package)
const ROOT_DIR  = path.join(__dirname, '..');
const BAT_PATH  = path.join(ROOT_DIR, 'START.bat');
const REG_KEY   = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const REG_NAME  = 'CollegeCornerShopkeeper';

const uninstall = process.argv.includes('--uninstall');

try {
  if (uninstall) {
    execSync(`reg delete "${REG_KEY}" /v "${REG_NAME}" /f`, { stdio: 'inherit' });
    console.log(`Removed "${REG_NAME}" from Windows startup.`);
  } else {
    if (!fs.existsSync(BAT_PATH)) {
      console.error(`START.bat not found: ${BAT_PATH}`);
      process.exit(1);
    }
    // Use wscript to launch the bat without a visible console window
    const vbsPath = path.join(ROOT_DIR, 'start-hidden.vbs');
    fs.writeFileSync(vbsPath,
      `Set WshShell = CreateObject("WScript.Shell")\r\n` +
      `WshShell.Run Chr(34) & "${BAT_PATH}" & Chr(34), 0, False\r\n`
    );
    execSync(`reg add "${REG_KEY}" /v "${REG_NAME}" /t REG_SZ /d "wscript.exe \\"${vbsPath}\\"" /f`, { stdio: 'inherit' });
    console.log(`Added "${REG_NAME}" to Windows startup.`);
    console.log(`  Launcher: ${BAT_PATH}`);
    console.log(`  Hidden launcher: ${vbsPath}`);
    console.log('It will run automatically on next login (no console window).');
  }
} catch (err) {
  console.error('Registry operation failed:', err.message);
  process.exit(1);
}
