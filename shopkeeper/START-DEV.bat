@echo off
title College Corner — Shopkeeper Station (Dev Mode)
color 0B
echo.
echo  =====================================================
echo   College Corner — Shopkeeper Station (Dev Mode)
echo  =====================================================
echo  Starting backend and frontend dev servers...
echo.

:: Start backend in a new window
start "CC Backend API (port 5000)" cmd /k "cd /d "%~dp0..\backend" && npm run dev"

:: Wait 5 seconds for backend to init
timeout /t 5 /nobreak >nul

:: Start frontend in a new window
start "CC Frontend (port 3000)" cmd /k "cd /d "%~dp0..\frontend" && npm run dev"

:: Wait for frontend to be ready
timeout /t 8 /nobreak >nul

:: Open print-client in browser
echo  Opening print-client in browser...
start "" "http://localhost:3000/print-client"

echo.
echo  Both servers are running in separate windows.
echo  Print-client: http://localhost:3000/print-client
echo  Admin panel:  http://localhost:3000/admin
echo.
echo  Close the server windows to stop.
pause
