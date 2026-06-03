@echo off
setlocal

cd /d "%~dp0app"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js / npm is not installed or not in PATH.
  echo Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)

echo Starting CSV Editor...
npm.cmd start
