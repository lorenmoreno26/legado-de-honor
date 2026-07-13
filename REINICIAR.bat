@echo off
title LEGADO DE HONOR - Reiniciando
cd /d "%~dp0"
echo Cerrando el servidor anterior...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
echo Arrancando servidor con los cambios nuevos...
echo.
echo Deja esta ventana abierta mientras uses la app.
echo Para detener: cierra esta ventana.
echo.
call npm start
pause
