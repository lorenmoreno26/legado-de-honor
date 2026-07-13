@echo off
title LEGADO DE HONOR - Guia de Ventas
cd /d "%~dp0"
echo ========================================
echo   LEGADO DE HONOR - Arrancando servidor
echo ========================================
echo.
if not exist node_modules (
    echo Instalando dependencias por primera vez...
    echo Esto puede tardar 30-60 segundos.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR al instalar. Verifica que Node.js este instalado.
        pause
        exit /b 1
    )
    echo.
    echo Instalacion completa.
    echo.
)
echo Arrancando servidor...
echo.
echo Para detener: cierra esta ventana o presiona Ctrl+C
echo.
call npm start
pause
