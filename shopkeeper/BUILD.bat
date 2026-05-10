@echo off
title College Corner — Build Shopkeeper EXE
color 0A
echo.
echo  =========================================================
echo   College Corner — Build Shopkeeper Station EXE
echo  =========================================================
echo.

:: ── 0. Verify Node is installed ──────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download from https://nodejs.org and re-run.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node %NODE_VER% found.
echo.

:: ── 1. Build Backend (TypeScript → dist/) ────────────────────────────────────
echo [1/5] Compiling backend TypeScript...
cd /d "%~dp0..\backend"
call npm run build
if errorlevel 1 (
    echo [ERROR] Backend build failed. Check TypeScript errors above.
    pause & exit /b 1
)
echo [OK] Backend compiled to backend\dist\
echo.

:: ── 2. Build Frontend (Next.js standalone) ───────────────────────────────────
echo [2/5] Building Next.js frontend (standalone)...
cd /d "%~dp0..\frontend"
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause & exit /b 1
)

:: Copy static assets into standalone (required by Next.js standalone)
echo Copying static assets into standalone...
xcopy /E /I /Y ".next\static"   ".next\standalone\.next\static"   >nul
xcopy /E /I /Y "public"         ".next\standalone\public"         >nul
echo [OK] Frontend built to frontend\.next\standalone\
echo.

:: ── 3. Install shopkeeper npm deps ───────────────────────────────────────────
echo [3/5] Installing shopkeeper dependencies...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause & exit /b 1
)
echo [OK] Dependencies installed.
echo.

:: ── 4. Package exe with pkg ──────────────────────────────────────────────────
echo [4/5] Packaging exe with pkg...
if not exist dist mkdir dist
call npx pkg launcher.js ^
    --targets node18-win-x64 ^
    --output dist\CollegeCornerShopkeeper.exe ^
    --compress GZip
if errorlevel 1 (
    echo [ERROR] pkg packaging failed.
    pause & exit /b 1
)
echo [OK] Exe created: shopkeeper\dist\CollegeCornerShopkeeper.exe
echo.

:: ── 5. Register Windows startup (optional) ───────────────────────────────────
echo [5/5] Register in Windows startup?
set /p STARTUP="   Add to startup so it runs on login? (y/N): "
if /i "%STARTUP%"=="y" (
    node install-startup.js
) else (
    echo      Skipped. Run INSTALL-STARTUP.bat manually later.
)

echo.
echo  =========================================================
echo   BUILD COMPLETE
echo  =========================================================
echo.
echo   EXE : %~dp0dist\CollegeCornerShopkeeper.exe
echo   LOG : %~dp0logs\
echo.
echo   To run now     : double-click the EXE above
echo   To add startup : run INSTALL-STARTUP.bat
echo   To remove      : run UNINSTALL-STARTUP.bat
echo.
pause
