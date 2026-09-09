# Script utilitário para empacotar o build do OS Flow para envio à VPS
Write-Host "📦 Gerando o build de produção..." -ForegroundColor Cyan
npm run build

Write-Host "🗜️ Compactando arquivos para a VPS (dist, prisma, package.json)..." -ForegroundColor Cyan
tar -czvf osflow-build.tar.gz dist prisma package.json

Write-Host "✅ Arquivo 'osflow-build.tar.gz' gerado com sucesso na raiz do projeto!" -ForegroundColor Green
Write-Host "👉 Para enviar à sua VPS, use o comando:" -ForegroundColor Yellow
Write-Host "scp osflow-build.tar.gz root@SEU_IP_VPS:/var/www/osflow/" -ForegroundColor White
