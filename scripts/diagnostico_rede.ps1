# ==============================================================================
# Script de Diagnóstico de Conectividade de Rede (Link Down / Gateway Up)
# Desenvolvido para analisar e isolar falhas de rede local vs. operadora vs. DNS.
# Roda silenciosamente, gravando logs detalhados apenas quando detecta anomalias.
# ==============================================================================

# Configurações de Alvos
$PublicIp = "8.8.8.8"           # Servidor DNS do Google (IP público robusto)
$DnsDomain = "google.com"       # Domínio grande para teste de resolução ativa
$DnsInterval = 5                 # Intervalo padrão de teste DNS (em segundos)
$LogPath = Join-Path $PSScriptRoot "..\temp\diagnostico_rede.log"

# Garantir que a pasta do log existe antes de iniciar
$LogDir = Split-Path $LogPath
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# 1. Detecção automática do Gateway Padrão Local
Write-Host "Detectando o Gateway Padrão local..."
$GatewayIp = $null
try {
    # Tenta obter o NextHop da rota padrão IPv4
    $GatewayIp = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty NextHop -First 1)
    if (-not $GatewayIp) {
        $GatewayIp = (Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4DefaultGateway }).IPv4DefaultGateway.NextHop
    }
} catch {
    # Ignora exceções na detecção
}

if (-not $GatewayIp) {
    $GatewayIp = "192.168.1.1" # Fallback clássico
    Write-Host "Não foi possível obter o Gateway automaticamente. Usando fallback: $GatewayIp" -ForegroundColor Yellow
} else {
    Write-Host "Gateway local detectado: $GatewayIp" -ForegroundColor Green
}

Write-Host "Iniciando monitoramento de rede..."
Write-Host "Os logs detalhados serão salvos em: $LogPath"
Write-Host "Pressione [Ctrl+C] para encerrar este script no console."

# Inicializa o arquivo de log com o cabeçalho de inicialização
$StartupMsg = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] | MONITORAMENTO INICIADO | Gateway Local: $GatewayIp | IP Externo: $PublicIp | Dominio DNS: $DnsDomain"
Add-Content -Path $LogPath -Value $StartupMsg

# Instâncias de Ping nativas do .NET (extremamente rápidas e leves)
$PingObjGateway = New-Object System.Net.NetworkInformation.Ping
$PingObjPublic  = New-Object System.Net.NetworkInformation.Ping

# Estruturas de controle de estado e buffers
$Buffer = [System.Collections.Generic.List[string]]::new()
$State = "NORMAL" # Estados possíveis: "NORMAL" ou "ALERT"
$AlertPostCounter = 0
$DnsCounter = 0

# Armazenamento do último status DNS medido
$LastDnsStatus = "OK"
$LastDnsLatency = "0ms"

# Loop principal de monitoramento a cada 1 segundo
while ($true) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # --- 1. PING GATEWAY LOCAL ---
    $GatewayStatus = "DOWN"
    try {
        $ReplyGateway = $PingObjGateway.Send($GatewayIp, 800) # Timeout de 800ms
        if ($ReplyGateway.Status -eq "Success") {
            $GatewayStatus = "UP"
        }
    } catch {
        $GatewayStatus = "DOWN"
    }

    # --- 2. PING IP PÚBLICO (WAN) ---
    $PublicStatus = "DOWN"
    try {
        $ReplyPublic = $PingObjPublic.Send($PublicIp, 800) # Timeout de 800ms
        if ($ReplyPublic.Status -eq "Success") {
            $PublicStatus = "UP"
        }
    } catch {
        $PublicStatus = "DOWN"
    }

    # --- 3. RESOLUÇÃO DNS ATIVA ---
    # Realizada a cada 5 segundos OU no exato segundo em que houver uma falha de conexão (Gateway/Público)
    $DnsCounter++
    $ForceDnsCheck = ($GatewayStatus -eq "DOWN" -or $PublicStatus -eq "DOWN")
    
    if ($DnsCounter -ge $DnsInterval -or $ForceDnsCheck) {
        $DnsCounter = 0
        $Sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            # Tenta resolver o domínio grande usando o resolvedor nativo do sistema
            $Addresses = [System.Net.Dns]::GetHostAddresses($DnsDomain)
            $Sw.Stop()
            if ($Addresses.Count -gt 0) {
                $LastDnsStatus = "OK"
                $LastDnsLatency = "$($Sw.ElapsedMilliseconds)ms"
            } else {
                $LastDnsStatus = "ERROR"
                $LastDnsLatency = "-1ms"
            }
        } catch {
            $Sw.Stop()
            $LastDnsStatus = "TIMEOUT"
            $LastDnsLatency = "-1ms"
        }
    }

    # --- 4. FORMATAÇÃO DA ENTRADA DO LOG ---
    # Formato estruturado conforme solicitado
    $LogLine = "[$Timestamp] | Gateway_Local: $GatewayStatus | Internet_Publica: $PublicStatus | DNS_Resolvido: $LastDnsStatus | Latencia_DNS: $LastDnsLatency"

    # --- 5. DETECÇÃO E FILTRAGEM DE ANOMALIAS ---
    # Uma falha de link externo (WAN), queda do gateway local, ou falha de DNS constituem anomalia
    $HasAnomaly = ($GatewayStatus -eq "DOWN" -or $PublicStatus -eq "DOWN" -or $LastDnsStatus -eq "TIMEOUT" -or $LastDnsStatus -eq "ERROR")

    if ($HasAnomaly) {
        # Transição de NORMAL para ALERT (Rede começou a falhar)
        if ($State -eq "NORMAL") {
            $State = "ALERT"
            
            # Despeja o histórico dos 5 segundos anteriores (pré-queda) salvos no buffer
            if ($Buffer.Count -gt 0) {
                Add-Content -Path $LogPath -Value "--- ANOMALIA DETECTADA (Despejando histórico de 5 segundos antes) ---"
                foreach ($BufferedLine in $Buffer) {
                    Add-Content -Path $LogPath -Value $BufferedLine
                }
                $Buffer.Clear()
            }
            Add-Content -Path $LogPath -Value "--- INÍCIO DO EVENTO DE QUEDA / INSTABILIDADE ---"
        }
        
        # Grava a falha imediatamente em disco no exato segundo em que ocorreu
        Add-Content -Path $LogPath -Value $LogLine
        
        # Reinicia o contador para registrar 5 segundos de dados estáveis no futuro após a recuperação
        $AlertPostCounter = 5
    } else {
        # Se a rede voltou a ficar normal, mas ainda estamos registrando o pós-queda
        if ($State -eq "ALERT") {
            Add-Content -Path $LogPath -Value $LogLine
            $AlertPostCounter--
            
            # Quando a rede estiver estável por 5 segundos seguidos, retorna ao modo silencioso
            if ($AlertPostCounter -le 0) {
                $State = "NORMAL"
                Add-Content -Path $LogPath -Value "--- CONEXÃO RESTABELECIDA (Retornando ao modo silencioso) ---`n"
            }
        } else {
            # Modo Silencioso: Apenas armazena as medições no buffer circular pré-queda
            $Buffer.Add($LogLine)
            
            # Mantém estritamente os últimos 5 registros
            if ($Buffer.Count -gt 5) {
                $Buffer.RemoveAt(0)
            }
        }
    }

    # Aguarda 1 segundo antes do próximo ciclo
    Start-Sleep -Seconds 1
}
