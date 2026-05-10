@echo off
title College Corner — Install Startup
echo.
echo  Adding CollegeCornerShopkeeper to Windows startup...
echo.
cd /d "%~dp0"
node install-startup.js
echo.
pause
