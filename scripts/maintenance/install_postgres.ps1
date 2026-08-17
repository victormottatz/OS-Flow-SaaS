# ==============================================================================
# Script de Instalação Silenciosa do PostgreSQL 15 no Windows
# ==============================================================================

$Url = "https://get.enterprisedb.com/postgresql/postgresql-15.7-1-windows-x64.exe"
$Output = "$env:TEMP\postgresql-installer.exe"

Write-Host "Baixando o PostgreSQL 15... Isso pode levar alguns minutos." -ForegroundColor Cyan
Invoke-WebRequest -Uri $Url -OutFile $Output

Write-Host "Instalando o PostgreSQL... Por favor, aguarde." -ForegroundColor Cyan
# Modo autônomo, configurando a senha da aplicação
Start-Process -FilePath $Output -ArgumentList "--mode unattended --superpassword `"k6k2tHwYChVlRTQg`" --serverport 5432" -Wait -NoNewWindow

Write-Host "Instalação do PostgreSQL concluída com sucesso!" -ForegroundColor Green

# Limpando o instalador da pasta temporária
Remove-Item -Path $Output -Force -ErrorAction SilentlyContinue
