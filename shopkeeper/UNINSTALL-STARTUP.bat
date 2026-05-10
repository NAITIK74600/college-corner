@echo off
title College Corner — Remove Startup
echo.
echo  Removing CollegeCornerShopkeeper from Windows startup...
echo.
cd /d "%~dp0"
node install-startup.js --uninstall
echo.
pause
