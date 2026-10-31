@echo off
setlocal EnableDelayedExpansion
title LNCR-WEP_ANALYSIS - Build Production Bundle for Cloudflare Pages

echo ============================================================================
echo   Building LNCR-WEP_ANALYSIS for Cloudflare Pages Production
echo ============================================================================
echo.

set "LOCAL_REPO=%USERPROFILE%\LNCR-WEP_ANALYSIS"
set "GDRIVE_REPO=G:\My Drive\Late Night Combat Robotics\LNCR-WEP_ANALYSIS"

cd /d "%LOCAL_REPO%"

echo Building production assets with Vite...
call npm.cmd run build

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %ERRORLEVEL%
)

if exist "%GDRIVE_REPO%" (
    echo.
    echo Mirroring dist and source files back to Google Drive repo...
    robocopy "%LOCAL_REPO%\dist" "%GDRIVE_REPO%\dist" /MIR /NP /NDL /NFL >nul 2>nul
    robocopy "%LOCAL_REPO%\src" "%GDRIVE_REPO%\src" /MIR /NP /NDL /NFL >nul 2>nul
    robocopy "%LOCAL_REPO%\public" "%GDRIVE_REPO%\public" /MIR /NP /NDL /NFL >nul 2>nul
    copy /y "%LOCAL_REPO%\package.json" "%GDRIVE_REPO%\package.json" >nul 2>nul
    copy /y "%LOCAL_REPO%\tsconfig.json" "%GDRIVE_REPO%\tsconfig.json" >nul 2>nul
    copy /y "%LOCAL_REPO%\vite.config.ts" "%GDRIVE_REPO%\vite.config.ts" >nul 2>nul
    copy /y "%LOCAL_REPO%\index.html" "%GDRIVE_REPO%\index.html" >nul 2>nul
    copy /y "%LOCAL_REPO%\start_or_reset.bat" "%GDRIVE_REPO%\start_or_reset.bat" >nul 2>nul
    copy /y "%LOCAL_REPO%\build_dist.bat" "%GDRIVE_REPO%\build_dist.bat" >nul 2>nul
    echo Done! Production bundle is ready at %GDRIVE_REPO%\dist
)

echo.
echo ============================================================================
echo   SUCCESS! Ready to deploy to Cloudflare Pages:
echo   1. Drag and drop the "dist" folder at https://dash.cloudflare.com/pages
echo   OR
echo   2. Push to GitHub and connect repository to Cloudflare Pages
echo ============================================================================
pause
endlocal
