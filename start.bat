@echo off
cd /d "%~dp0"
if not exist "node_modules\expo\package.json" (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)
echo Starting Gym Tracker for Expo Go...
call npm start
pause
