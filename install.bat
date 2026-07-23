@echo off
title Gestion-Stock - Installation
color 0B

echo ==========================================
echo    Gestion-Stock - Installation
echo ==========================================
echo.

:: Check Node.js
echo [1/5] Verification de Node.js...
node --version >NUL 2>&1
if %ERRORLEVEL% neq 0 (
    echo      ERREUR: Node.js n'est pas installe.
    echo      Telechargez-le depuis: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo      Node.js %%v detecte.

:: Check MongoDB
echo.
echo [2/5] Verification de MongoDB...
set MONGO_PATH=C:\MongoDB\mongodb-win32-x86_64-windows-8.0.9\bin\mongod.exe
if exist "%MONGO_PATH%" (
    echo      MongoDB trouve.
) else (
    echo      MongoDB non trouve dans %MONGO_PATH%
    echo      Installez MongoDB ou modifiez le chemin dans start.bat
)

:: Install npm dependencies
echo.
echo [3/5] Installation des dependances...
cd /d "%~dp0"
cmd /c "npm install --omit=dev"
if %ERRORLEVEL% neq 0 (
    echo      ERREUR: Echec de l'installation des dependances.
    pause
    exit /b 1
)
echo      Dependances installees.

:: Create data directories
echo.
echo [4/5] Creation des repertoires...
if not exist "server\uploads\products" mkdir "server\uploads\products"
echo      Repertoires crees.

:: Seed admin user
echo.
echo [5/5] Creation de l'admin par defaut...
echo      Email: admin@stock.com
echo      Mot de passe: admin123
echo      (Se connecter et changer le mot de passe apres la premiere connexion)

echo.
echo ==========================================
echo    Installation terminee !
echo ==========================================
echo.
echo    Pour demarrer:
echo      - Double-cliquez sur start.bat
echo      - Ou lancez: node server/index.js
echo.
echo    Puis ouvrez: http://localhost:3000
echo.

:: Create desktop shortcut
echo Creation du raccourci bureau...
set SHORTCUT="%USERPROFILE%\Desktop\Gestion-Stock.bat"
(
    echo @echo off
    echo cd /d "%~dp0"
    echo call start.bat
) > %SHORTCUT%
echo      Raccourci cree sur le Bureau.

echo.
pause
