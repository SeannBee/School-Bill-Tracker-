@echo off
title Turning on!
echo Waking up server

:: 1. Launch the Backend
echo [1/3] Igniting Backend Database...
start "Backend Server" cmd /k "cd Server && node server.js"

:: Give the backend 2 seconds to warm up before hitting the frontend
timeout /t 2 /nobreak >nul

:: 2. Launch the Frontend
echo [2/3] Booting Client Interface...
start "Frontend Client" cmd /k "npm run start"

:: Give the frontend 3 seconds to compile and host
timeout /t 3 /nobreak >nul

:: 3. Open the Browser
echo [3/3] Opening Dashboard...
start http://localhost:5000 
:: (Change 5000 to whatever port your frontend actually opens on!)

echo All systems online.
pause