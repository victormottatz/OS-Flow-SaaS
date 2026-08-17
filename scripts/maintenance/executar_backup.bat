@echo off
set PG_USER=postgres
set PG_PASSWORD=k6k2tHwYChVlRTQg
set PG_HOST=localhost
set PG_PORT=5432
set PG_DATABASE=postgres
set BACKUP_DIR=C:\Backups\MGV_Database

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set YYYYMMDD=%date:~10,4%-%date:~7,2%-%date:~4,2%
set HHMM=%time:~0,2%-%time:~3,2%
set HHMM=%HHMM: =0%
set FILENAME=mgv_backup_%YYYYMMDD%_%HHMM%.sql
set PGPASSWORD=%PG_PASSWORD%

echo Gerando dump do banco de dados local...
"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -F c -b -v -f "%BACKUP_DIR%\%FILENAME%" %PG_DATABASE%

echo Mantendo apenas os backups dos ultimos 7 dias...
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path"
