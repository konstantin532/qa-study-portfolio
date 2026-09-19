@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"
title STRELOLIST - local server

echo.
echo  ============================================
echo   STRELOLIST - local server
echo  ============================================
echo.

if not exist "index.html" (
  echo  [!] index.html not found in this folder.
  echo      Path: %CD%
  echo      Put run.bat next to index.html
  goto hold
)

rem ---- free port 8080..8099 ----
set "PORT=8080"
:scan
netstat -ano | findstr /r /c:":!PORT! .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  if !PORT! geq 8099 (
    echo  [!] Ports 8080-8099 are busy.
    goto hold
  )
  set /a PORT+=1
  goto scan
)

rem ---- pick runtime ----
set "CMD="
python -c "1" >nul 2>&1 && set "CMD=python -m http.server !PORT! --bind 127.0.0.1"
if not defined CMD py -c "1" >nul 2>&1 && set "CMD=py -m http.server !PORT! --bind 127.0.0.1"
if not defined CMD where node >nul 2>&1 && set "CMD=npx --yes http-server . -p !PORT! -a 127.0.0.1 -c-1"
if not defined CMD where php >nul 2>&1 && set "CMD=php -S 127.0.0.1:!PORT! -t ."

if not defined CMD (
  echo  [!] No Python, Node or PHP found.
  echo.
  echo      Install one of them:
  echo        winget install Python.Python.3.12
  echo        winget install OpenJS.NodeJS.LTS
  echo.
  echo      Or open directly without server:
  set /p "A=      Open index.html now? [y/n] "
  if /i "!A!"=="y" start "" "index.html"
  goto hold
)

echo   Folder : %CD%
echo   Server : !CMD!
echo   URL    : http://127.0.0.1:!PORT!/
echo.
echo   Ctrl+C to stop. Ctrl+F5 in browser to hard reload.
echo.

start "" "http://127.0.0.1:!PORT!/"
!CMD!

echo.
echo   Server stopped. Freeing port !PORT! ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":!PORT! .*LISTENING"') do taskkill /f /pid %%p >nul 2>&1

:hold
echo.
pause
popd
endlocal