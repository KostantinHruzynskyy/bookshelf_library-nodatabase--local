@echo off
echo Stopping any existing Node.js processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo Starting server...
node server.js
pause