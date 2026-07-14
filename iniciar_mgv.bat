@echo off
title Servidor MGV - Atendimento Local
echo ========================================================
echo   INICIANDO SERVIDOR DO MGV SISTEMA INTEGRADO (LOCAL)
echo ========================================================
echo.
cd /d "%~dp0"
echo Diretorio atual: %cd%
echo Verificando dependencias e iniciando o servidor...
echo.
echo [INFO] Gerando Prisma Client...
call npx prisma generate
echo.
call npm run dev
echo.
echo [ERRO] O servidor foi finalizado inesperadamente ou nao pode ser iniciado.
pause
