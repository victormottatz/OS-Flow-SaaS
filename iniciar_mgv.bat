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
where docker >nul 2>nul
if errorlevel 1 goto no_docker

echo [INFO] Docker detectado. Iniciando banco de dados local...
call docker-compose up -d
goto start_app

:no_docker
echo [INFO] Docker nao detectado. O sistema usara o Supabase na Nuvem.

:start_app
echo.
echo [INFO] Gerando Prisma Client...
call npx prisma generate
echo.
call npm run dev
echo.
echo [ERRO] O servidor foi finalizado inesperadamente ou nao pode ser iniciado.
pause
