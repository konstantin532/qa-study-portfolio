@echo off
setlocal
cd /d "%~dp0"
if not exist package.json (
  echo ERROR: package.json was not found in %CD%
  pause
  exit /b 1
)
echo Starting QA Study Portfolio at http://127.0.0.1:4173/index.html
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4173/index.html"
call npm run serve
