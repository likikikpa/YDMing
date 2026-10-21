@echo off
rem Windows launcher: double-click to install dependencies if missing, build
rem YDMing, serve it on http://127.0.0.1:5173 and open it in the browser.
rem Extra options are passed to Start-YDMing.ps1, e.g. start.bat -Port 5174
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-YDMing.ps1" %*
set "code=%ERRORLEVEL%"
if not "%code%"=="0" (
  echo.
  echo YDMing stopped with an error. See the messages above.
  pause
)
exit /b %code%
