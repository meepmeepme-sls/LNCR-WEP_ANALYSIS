@echo off
setlocal EnableDelayedExpansion
title Late Night Combat Robotics — Weapon MOI Analyzer (LNCR-WEP_ANALYSIS)

echo ============================================================================
echo   LNCR-WEP_ANALYSIS — Combat Robotics Weapon MOI & Dynamics Analyzer
echo ============================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

set "LOCAL_REPO=%USERPROFILE%\LNCR-WEP_ANALYSIS"
set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

if /i not "%CURRENT_DIR%"=="%LOCAL_REPO%" (
    echo Syncing project files to fast local drive: %LOCAL_REPO%
    if not exist "%LOCAL_REPO%" mkdir "%LOCAL_REPO%"
    robocopy "%CURRENT_DIR%\src" "%LOCAL_REPO%\src" /MIR /NP /NDL /NFL >nul 2>nul
    robocopy "%CURRENT_DIR%\public" "%LOCAL_REPO%\public" /MIR /NP /NDL /NFL >nul 2>nul
    copy /y "%CURRENT_DIR%\package.json" "%LOCAL_REPO%\package.json" >nul 2>nul
    copy /y "%CURRENT_DIR%\tsconfig.json" "%LOCAL_REPO%\tsconfig.json" >nul 2>nul
    copy /y "%CURRENT_DIR%\vite.config.ts" "%LOCAL_REPO%\vite.config.ts" >nul 2>nul
    copy /y "%CURRENT_DIR%\index.html" "%LOCAL_REPO%\index.html" >nul 2>nul
    cd /d "%LOCAL_REPO%"
) else (
    cd /d "%LOCAL_REPO%"
)

if not exist node_modules\three (
    echo Installing dependencies (Three.js, occt-import-js, Tailwind, React)...
    call npm.cmd install --no-audit --no-fund
)

echo.
echo Starting Vite Dev Server at http://localhost:5173 ...
start "" cmd /c "ping 127.0.0.1 -n 3 >nul && start http://localhost:5173"
call npm.cmd run dev
pause
endlocal
