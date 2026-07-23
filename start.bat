@echo off
title Gestion-Stock - Demarrage
color 0A

echo ==========================================
echo    Gestion-Stock - Serveur Local
echo ==========================================
echo.

set MONGO_PATH=C:\MongoDB\mongodb-win32-x86_64-windows-8.0.9\bin\mongod.exe
set MONGO_DATA=C:\MongoDB\data
set MONGO_LOG=C:\MongoDB\logs\mongod.log
set SERVER_PORT=3000

echo [1/3] Verification de MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I "mongod.exe" >NUL
if %ERRORLEVEL% == 0 (
    echo      MongoDB est deja en cours d'execution.
) else (
    echo      Demarrage de MongoDB...
    if not exist "%MONGO_DATA%" mkdir "%MONGO_DATA%"
    if not exist "C:\MongoDB\logs" mkdir "C:\MongoDB\logs"
    start "" "%MONGO_PATH%" --dbpath "%MONGO_DATA%" --logpath "%MONGO_LOG%" --port 27017
    timeout /t 3 /nobreak >NUL
    echo      MongoDB demarre sur le port 27017.
)

echo.
echo [2/3] Verification du port %SERVER_PORT%...
netstat -an | find ":%SERVER_PORT% " | find "LISTENING" >NUL 2>&1
if %ERRORLEVEL% == 0 (
    echo      Le port %SERVER_PORT% est deja utilise.
    echo      Fermez l'autre instance ou changez le port dans .env
    pause
    exit /b 1
)

echo.
echo [3/3] Demarrage du serveur Node.js...
echo.
echo ==========================================
echo    Serveur accessible sur:
echo    http://localhost:%SERVER_PORT%
echo ==========================================
echo.
echo    Appuyez sur Ctrl+C pour arreter.
echo.

node server/index.js

pause
