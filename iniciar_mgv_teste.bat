@echo off
title Servidor MGV - AMBIENTE DE TESTE (Porta 3001)
color 0E
echo ========================================================
echo   [MODO TESTE/HOMOLOGACAO] MGV SISTEMA INTEGRADO
echo   PORTA: 3001  ^|  BANCO: database_teste.json
echo ========================================================
echo.
cd /d "%~dp0"
echo Diretorio atual: %cd%
echo Verificando dependencias e iniciando o servidor de teste...
echo.
echo [INFO] Abrindo navegador em http://localhost:3001...
start http://localhost:3001
echo.
echo [INFO] Gerando Prisma Client...
call npx prisma generate
echo.
echo [INFO] Iniciando servidor de teste na porta 3001...
call npm run dev
echo.
echo [AVISO] O servidor de teste foi encerrado.
pause
