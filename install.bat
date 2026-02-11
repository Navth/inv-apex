@echo off
echo Cleaning...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Installing dependencies (this may take 2-3 minutes)...
call npm install --legacy-peer-deps

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Install completed successfully!
    echo Run: npm run dev
    echo Then open: http://localhost:5000
    echo ========================================
) else (
    echo.
    echo Install failed. Try running as Administrator or use:
    echo   yarn install
    echo   or
    echo   pnpm install
)

pause
