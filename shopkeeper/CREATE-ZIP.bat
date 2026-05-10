@echo off
setlocal enabledelayedexpansion
title College Corner — Create Deployment Package
color 0A
echo.
echo  =========================================================
echo   College Corner — Create Shopkeeper Deployment ZIP
echo  =========================================================
echo.

set ROOT=%~dp0..
set SHOPKEEPER=%~dp0
set DIST_DIR=%SHOPKEEPER%deploy-package
set ZIP_NAME=CollegeCornerShopkeeper-v1.0.zip

:: Clean previous package
if exist "%DIST_DIR%" rd /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

:: ── 1. Build Backend ─────────────────────────────────────────────────────────
echo [1/5] Compiling backend TypeScript...
cd /d "%ROOT%\backend"
call npm run build
if errorlevel 1 (
    echo [ERROR] Backend build failed.
    pause & exit /b 1
)
echo [OK] Backend compiled.
echo.

:: ── 2. Build Frontend ────────────────────────────────────────────────────────
echo [2/5] Building Next.js standalone frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause & exit /b 1
)

:: Copy static assets into standalone folder (required by Next.js standalone)
echo Copying static assets into standalone...
if exist ".next\static" (
    xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul
)
if exist "public" (
    xcopy /E /I /Y "public" ".next\standalone\public" >nul
)
echo [OK] Frontend built.
echo.

:: ── 3. Assemble package ──────────────────────────────────────────────────────
echo [3/5] Assembling deployment package...

:: Backend dist
xcopy /E /I /Y "%ROOT%\backend\dist"    "%DIST_DIR%\backend\dist"    >nul
echo  [+] backend\dist

:: Backend node_modules (needed for runtime requires like pg, dotenv, multer, xlsx)
xcopy /E /I /Y "%ROOT%\backend\node_modules" "%DIST_DIR%\backend\node_modules" >nul
echo  [+] backend\node_modules

:: Backend uploads folder (product images) — optional, may be empty
if exist "%ROOT%\backend\uploads" (
    xcopy /E /I /Y "%ROOT%\backend\uploads" "%DIST_DIR%\backend\uploads" >nul
    echo  [+] backend\uploads
)

:: Backend .env  — IMPORTANT: contains DB creds
if exist "%ROOT%\backend\.env" (
    copy /Y "%ROOT%\backend\.env" "%DIST_DIR%\backend\.env" >nul
    echo  [+] backend\.env
) else (
    echo  [!] backend\.env not found — copy manually before deploying
)

:: Frontend standalone
xcopy /E /I /Y "%ROOT%\frontend\.next\standalone" "%DIST_DIR%\frontend\.next\standalone" >nul
echo  [+] frontend\.next\standalone

:: Shopkeeper launcher scripts
copy /Y "%SHOPKEEPER%launcher.js"           "%DIST_DIR%\shopkeeper\launcher.js" >nul
copy /Y "%SHOPKEEPER%install-startup.js"    "%DIST_DIR%\shopkeeper\install-startup.js" >nul
copy /Y "%SHOPKEEPER%package.json"          "%DIST_DIR%\shopkeeper\package.json" >nul
copy /Y "%SHOPKEEPER%INSTALL-STARTUP.bat"   "%DIST_DIR%\shopkeeper\INSTALL-STARTUP.bat" >nul
copy /Y "%SHOPKEEPER%UNINSTALL-STARTUP.bat" "%DIST_DIR%\shopkeeper\UNINSTALL-STARTUP.bat" >nul
echo  [+] shopkeeper scripts

:: Shopkeeper node_modules (open package)
if exist "%SHOPKEEPER%node_modules" (
    xcopy /E /I /Y "%SHOPKEEPER%node_modules" "%DIST_DIR%\shopkeeper\node_modules" >nul
    echo  [+] shopkeeper\node_modules
)

:: Launch bat at root level for convenience
copy /Y "%SHOPKEEPER%INSTALL-STARTUP.bat"   "%DIST_DIR%\INSTALL-STARTUP.bat" >nul

:: Write root-level START.bat (double-click to launch)
echo @echo off > "%DIST_DIR%\START.bat"
echo title College Corner Shopkeeper >> "%DIST_DIR%\START.bat"
echo cd /d "%%~dp0" >> "%DIST_DIR%\START.bat"
echo node shopkeeper\launcher.js >> "%DIST_DIR%\START.bat"
echo  [+] START.bat

:: Write root-level INSTALL-STARTUP.bat (calls shopkeeper\install-startup.js)
echo @echo off > "%DIST_DIR%\INSTALL-STARTUP.bat"
echo title College Corner — Install Startup >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo echo. >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo echo  Adding CollegeCornerShopkeeper to Windows startup... >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo echo. >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo cd /d "%%~dp0" >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo node shopkeeper\install-startup.js >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo echo. >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo pause >> "%DIST_DIR%\INSTALL-STARTUP.bat"
echo  [+] INSTALL-STARTUP.bat

:: Write root-level UNINSTALL-STARTUP.bat
echo @echo off > "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo title College Corner — Remove Startup >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo echo. >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo echo  Removing CollegeCornerShopkeeper from Windows startup... >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo echo. >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo cd /d "%%~dp0" >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo node shopkeeper\install-startup.js --uninstall >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo echo. >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo pause >> "%DIST_DIR%\UNINSTALL-STARTUP.bat"
echo  [+] UNINSTALL-STARTUP.bat

:: Write README
echo College Corner — Shopkeeper Station > "%DIST_DIR%\README.txt"
echo. >> "%DIST_DIR%\README.txt"
echo REQUIREMENTS: >> "%DIST_DIR%\README.txt"
echo   - Windows 10/11 >> "%DIST_DIR%\README.txt"
echo   - Node.js 18 or later  ^(https://nodejs.org^) >> "%DIST_DIR%\README.txt"
echo   - PostgreSQL running ^(local or remote^) >> "%DIST_DIR%\README.txt"
echo. >> "%DIST_DIR%\README.txt"
echo FIRST TIME SETUP: >> "%DIST_DIR%\README.txt"
echo   1. Install Node.js 18+ if not already installed >> "%DIST_DIR%\README.txt"
echo   2. Edit  backend\.env  — update DB_PASSWORD, DB_HOST etc if needed >> "%DIST_DIR%\README.txt"
echo   3. Double-click  START.bat  to launch both servers + open browser >> "%DIST_DIR%\README.txt"
echo. >> "%DIST_DIR%\README.txt"
echo AUTO-START ON LOGIN ^(optional^): >> "%DIST_DIR%\README.txt"
echo   - Double-click  INSTALL-STARTUP.bat  once ^(run as admin if needed^) >> "%DIST_DIR%\README.txt"
echo   - Double-click  UNINSTALL-STARTUP.bat  to remove >> "%DIST_DIR%\README.txt"
echo. >> "%DIST_DIR%\README.txt"
echo URLS: >> "%DIST_DIR%\README.txt"
echo   Print Station : http://localhost:3000/print-client >> "%DIST_DIR%\README.txt"
echo   Store         : http://localhost:3000 >> "%DIST_DIR%\README.txt"
echo   Admin Panel   : http://localhost:3000/admin >> "%DIST_DIR%\README.txt"
echo   Backend API   : http://localhost:5000 >> "%DIST_DIR%\README.txt"
echo. >> "%DIST_DIR%\README.txt"
echo LOGS: shopkeeper\logs\ >> "%DIST_DIR%\README.txt"

echo  [+] README.txt
echo.

:: ── 4. Create ZIP ────────────────────────────────────────────────────────────
echo [4/5] Creating ZIP archive...
cd /d "%SHOPKEEPER%"
if exist "%ZIP_NAME%" del "%ZIP_NAME%"

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%SHOPKEEPER%%ZIP_NAME%' -Force"

if errorlevel 1 (
    echo [ERROR] ZIP creation failed.
    pause & exit /b 1
)
echo [OK] ZIP created: shopkeeper\%ZIP_NAME%
echo.

:: Show size
powershell -NoProfile -Command ^
  "$f = Get-Item '%SHOPKEEPER%%ZIP_NAME%'; 'ZIP size: ' + [math]::Round($f.Length/1MB, 1) + ' MB'"

:: ── 5. Cleanup temp package dir ──────────────────────────────────────────────
echo.
echo [5/5] Cleaning up temp folder...
rd /s /q "%DIST_DIR%"
echo [OK] Done.

echo.
echo  =========================================================
echo   PACKAGE READY
echo  =========================================================
echo.
echo   %SHOPKEEPER%%ZIP_NAME%
echo.
echo   Copy this ZIP to the shopkeeper machine,
echo   extract it, and follow the README.txt inside.
echo.
pause
