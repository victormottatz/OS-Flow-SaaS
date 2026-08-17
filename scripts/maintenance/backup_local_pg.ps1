# ==============================================================================
# Script de Backup Automático do PostgreSQL Local
# ==============================================================================

$BackupDir = Join-Path $PSScriptRoot "..\..\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = Join-Path $BackupDir "backup_mgv_$Timestamp.sql"

Write-Host "Iniciando backup do banco de dados local para: $BackupFile" -ForegroundColor Cyan

# Definir a senha na variável de ambiente para que o pg_dump não peça
$env:PGPASSWORD = "k6k2tHwYChVlRTQg"

# Executar o pg_dump apontando para o binário do PostgreSQL padrão
$PgDumpPath = "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"

if (-not (Test-Path $PgDumpPath)) {
    Write-Host "pg_dump.exe não encontrado em $PgDumpPath. Verifique a instalação do PostgreSQL." -ForegroundColor Red
    exit 1
}

& $PgDumpPath -U postgres -h localhost -p 5432 -d postgres -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro durante a execução do backup." -ForegroundColor Red
}

# Limpar variável de ambiente
$env:PGPASSWORD = $null
