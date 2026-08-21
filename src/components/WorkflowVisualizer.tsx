import React, { useState, useEffect } from "react";

type MainTab = "infra" | "os" | "fiscal" | "whatsapp" | "deploy";
type ScenarioKey = "all" | "aprovado" | "rejeitado" | "fabiola" | "pgto_antecipado" | "reopen";

interface TabMeta {
  id: MainTab;
  label: string;
  shortLabel: string;
  icon: string;
  badge: string;
}

const MAIN_TABS: TabMeta[] = [
  { id: "infra", label: "Infraestrutura & DNS", shortLabel: "Infra & DNS", icon: "dns", badge: "Net Profissional + Hostinger" },
  { id: "os", label: "Ciclo de Vida da O.S.", shortLabel: "Jornada O.S.", icon: "assignment", badge: "Kanban & Estresse 30m" },
  { id: "fiscal", label: "Motor Fiscal Bifásico", shortLabel: "Fiscal Bifásico", icon: "receipt_long", badge: "Bling V3 + SEFAZ" },
  { id: "whatsapp", label: "Automação WhatsApp", shortLabel: "WhatsApp", icon: "chat", badge: "Evolution API" },
  { id: "deploy", label: "Pipeline de Deploy", shortLabel: "Deploy & DevOps", icon: "cloud_sync", badge: "Coolify + Docker" },
];

interface InfoCardData {
  title: string;
  desc: string;
  item1Label: string;
  item1Value: string;
  item2Label: string;
  item2Value: string;
  item3Label: string;
  item3Value: string;
  badgeBg: string;
  iconColor: string;
}

const OS_SCENARIOS: Record<ScenarioKey, { title: string; desc: string; op: string; cust: string; fin: string; color: string; badgeBg: string }> = {
  all: {
    title: "Todos os Processos e Transições da O.S.",
    desc: "Visão global de todos os estados possíveis de uma Ordem de Serviço, integrando protocolo de bancada, teste de estresse obrigatório de 30 minutos e entrega.",
    op: "Fluxo Dinâmico FSM",
    cust: "Oficina ➔ Cliente",
    fin: "Orçado ➔ Faturado",
    color: "text-indigo-400",
    badgeBg: "bg-slate-800 text-slate-300 border border-slate-700"
  },
  aprovado: {
    title: "Orçamento Aprovado (Caminho Padrão)",
    desc: "O cliente autoriza o conserto. A OS vai para Bancada, executa reparo, passa pelo Teste de Estresse de 30 min, vai para Pronto para Retirada e finaliza após quitação.",
    op: "AGUARDANDO_AUTORIZACAO ➔ BANCADA ➔ ESTRESSE (30m) ➔ PRONTO ➔ FINALIZADO",
    cust: "NA_OFICINA ➔ ENTREGUE_DEFINITIVO",
    fin: "PENDENTE ➔ PAGO (QUITAÇÃO)",
    color: "text-emerald-500",
    badgeBg: "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
  },
  rejeitado: {
    title: "Orçamento Rejeitado pelo Cliente",
    desc: "O cliente não autorizou o reparo. A OS é movida para Finalizado com laudo de recusa, aparelho devolvido sem conserto e sem lançamentos financeiros.",
    op: "AGUARDANDO_AUTORIZACAO ➔ FINALIZADO (Devolvido sem reparo)",
    cust: "NA_OFICINA ➔ ENTREGUE_DEFINITIVO",
    fin: "NENHUM / SEM CUSTO",
    color: "text-rose-500",
    badgeBg: "bg-rose-950/80 text-rose-400 border border-rose-800"
  },
  fabiola: {
    title: "Caso Fabíola (Retirada Temporária de Equipamento)",
    desc: "O cliente retira o aparelho temporariamente enquanto uma peça é importada. A OS segue aberta (AGUARDANDO_PECA), custódia vai para ENTREGUE_TEMP e emite-se NFC-e das peças já instaladas.",
    op: "EM_MANUTENCAO ➔ AGUARDANDO_PECA (OS Aberta)",
    cust: "ENTREGUE_TEMP (Casa do Cliente)",
    fin: "PAGO_PARCIAL (Faturamento de Peças)",
    color: "text-amber-500",
    badgeBg: "bg-amber-950/80 text-amber-400 border border-amber-800"
  },
  pgto_antecipado: {
    title: "Pagamento Antecipado (Aparelho na Oficina)",
    desc: "O cliente efetua a quitação antecipada via Pix/Cartão antes de retirar o item. A OS entra em PAGO_PRONTO_RETIRADA e a custódia permanece na loja até a retirada física.",
    op: "PRONTO_RETIRADA ➔ PAGO_PRONTO_RETIRADA",
    cust: "NA_OFICINA (Aguardando Retirada)",
    fin: "PAGO (Saldo Zerado)",
    color: "text-sky-500",
    badgeBg: "bg-sky-950/80 text-sky-400 border border-sky-800"
  },
  reopen: {
    title: "Reabertura de O.S. / Retorno em Garantia",
    desc: "O aparelho volta à assistência em garantia de 90 dias. O gerente reabre a OS registrando a justificativa no AuditLog, reabrindo a triagem técnica sem custo de mão de obra.",
    op: "FINALIZADO ➔ RETORNO_GARANTIA / EM_MANUTENCAO",
    cust: "RETORNOU À OFICINA",
    fin: "GARANTIA (Sem nova cobrança)",
    color: "text-purple-500",
    badgeBg: "bg-purple-950/80 text-purple-400 border border-purple-800"
  }
};

export default function WorkflowVisualizer() {
  const [activeTab, setActiveTab] = useState<MainTab>("infra");
  const [osScenario, setOsScenario] = useState<ScenarioKey>("all");

  const getMermaidCode = (): string => {
    switch (activeTab) {
      case "infra":
        return `
          flowchart TD
            %% Estilos
            classDef domain fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#fff;
            classDef netprof fill:#0369a1,stroke:#38bdf8,stroke-width:2px,color:#fff;
            classDef vps fill:#065f46,stroke:#10b981,stroke-width:2px,color:#fff;
            classDef proxy fill:#581c87,stroke:#a855f7,stroke-width:2px,color:#fff;
            classDef container fill:#334155,stroke:#64748b,stroke-width:2px,color:#fff;
            classDef ext fill:#991b1b,stroke:#f87171,stroke-width:2px,color:#fff;

            subgraph DOMAIN_LAYER ["🌐 1. Provedor de Domínio & Gestão DNS"]
                NetProf["🏢 Net Profissional (Hospedagem de Domínio)<br/>Zona DNS: mgvrp.com.br"]:::netprof
                
                subgraph DNS_RECORDS ["📋 Apontamentos DNS"]
                    DNS_WPP["📌 whatsapp.mgvrp.com.br<br/>(Aponta para IP da Hostinger VPS)"]:::domain
                    DNS_APP["📌 app.mgvrp.com.br / mgvrp.com.br<br/>(Aponta para IP da Hostinger VPS)"]:::domain
                end
                
                NetProf --> DNS_WPP
                NetProf --> DNS_APP
            end

            subgraph HOSTINGER_VPS ["☁️ 2. Hostinger VPS (Ubuntu Linux)"]
                Traefik["🛡️ Traefik Reverse Proxy<br/>(Portas 80/443 + SSL Let's Encrypt Automático)"]:::proxy
                
                subgraph DOCKER_STACK ["⚙️ Orquestração Coolify & Docker"]
                    HubContainer["📦 MGV One Hub (Node.js + React)<br/>Porta 3000"]:::container
                    EvoContainer["🤖 Evolution API (WhatsApp Engine)<br/>Porta 8080"]:::container
                    PgContainer[("🐘 PostgreSQL (Prisma ORM)<br/>Porta 5432/5433")]:::container
                end
            end

            subgraph EXTERNAL_APIS ["🌐 3. Serviços Externos Integrados"]
                Bling["📦 Bling ERP V3 (OAuth 2.0)"]:::ext
                SEFAZ["🏛️ SEFAZ / Prefeitura (NF-e/NFS-e)"]:::ext
                ViaCEP["📍 ViaCEP API"]:::ext
                WppNet["🟢 WhatsApp Meta Servers"]:::ext
            end

            DNS_WPP -->|HTTPS whatsapp.mgvrp.com.br| Traefik
            DNS_APP -->|HTTPS mgvrp.com.br| Traefik

            Traefik -->|Roteamento Interno| EvoContainer
            Traefik -->|Roteamento Interno| HubContainer
            
            HubContainer <--> PgContainer
            HubContainer <--> Bling
            HubContainer <--> ViaCEP
            HubContainer --> EvoContainer

            Bling <--> SEFAZ
            EvoContainer --> WppNet
        `;

      case "os": {
        const isAll = osScenario === "all";
        const isAprovado = osScenario === "aprovado";
        const isRejeitado = osScenario === "rejeitado";
        const isFabiola = osScenario === "fabiola";
        const isPgto = osScenario === "pgto_antecipado";
        const isReopen = osScenario === "reopen";

        const normalNodeColor = isAll ? "#1e293b" : "#0f172a";
        const borderDefault = isAll ? "#475569" : "#334155";
        const textNormal = isAll ? "#fff" : "#94a3b8";

        return `
          flowchart TD
            classDef padrao fill:${normalNodeColor},stroke:${borderDefault},color:${textNormal},stroke-width:1.5px;
            classDef aprovado fill:${isAprovado ? "#166534" : "#1e293b"},stroke:${isAprovado ? "#22c55e" : "#334155"},color:${isAprovado ? "#fff" : "#94a3b8"},stroke-width:${isAprovado ? "3px" : "1.5px"};
            classDef rejeitado fill:${isRejeitado ? "#991b1b" : "#1e293b"},stroke:${isRejeitado ? "#ef4444" : "#334155"},color:${isRejeitado ? "#fff" : "#94a3b8"},stroke-width:${isRejeitado ? "3px" : "1.5px"};
            classDef fabiola fill:${isFabiola ? "#854d0e" : "#1e293b"},stroke:${isFabiola ? "#eab308" : "#334155"},color:${isFabiola ? "#fff" : "#94a3b8"},stroke-width:${isFabiola ? "3px" : "1.5px"};
            classDef pgto fill:${isPgto ? "#0369a1" : "#1e293b"},stroke:${isPgto ? "#38bdf8" : "#334155"},color:${isPgto ? "#fff" : "#94a3b8"},stroke-width:${isPgto ? "3px" : "1.5px"};
            classDef reabertura fill:${isReopen ? "#6b21a8" : "#1e293b"},stroke:${isReopen ? "#a855f7" : "#334155"},color:${isReopen ? "#fff" : "#94a3b8"},stroke-width:${isReopen ? "3px" : "1.5px"};

            ENTRADA(["1. Entrada / Check-in da O.S."])
            AVALIACAO["2. Triagem Técnica & Orçamento"]
            AUTORIZACAO["3. Aguardando Autorização do Cliente"]
            EXECUCAO["4. Bancada: Execução do Reparo"]
            STRESS_TEST["⏱️ Teste de Estresse Obrigatório (30 min)"]
            AGUARDANDO_PECA["Aguardando Peça Externa / Importação"]
            RETIRADA_TEMP["Retirada Temporária (Caso Fabíola)<br/>Custódia: ENTREGUE_TEMP"]
            PGTO_PARCIAL["Faturamento Parcial (NFC-e Peças)"]
            RETORNO_OFICINA["Retorno do Aparelho à Bancada"]
            PRONTO_RETIRADA["5. Pronto para Retirada (Disparo WhatsApp)"]
            PAGO_PRONTO["Pago Antecipado na Loja (PAGO_PRONTO_RETIRADA)"]
            FINALIZADO["6. O.S. FINALIZADA & FATURADA<br/>Custódia: ENTREGUE_DEFINITIVO"]
            MODAL_REABERTURA["Reabertura de Garantia (AuditLog)"]

            ENTRADA --> AVALIACAO
            AVALIACAO --> AUTORIZACAO
            
            AUTORIZACAO -- Aprovado --> EXECUCAO
            AUTORIZACAO -- Recusado --> FINALIZADO
            
            EXECUCAO --> STRESS_TEST
            STRESS_TEST -- Aprovado nos Testes --> PRONTO_RETIRADA
            
            EXECUCAO -- Falta Peça --> AGUARDANDO_PECA
            AGUARDANDO_PECA -- Cliente quer levar --> RETIRADA_TEMP
            RETIRADA_TEMP --> PGTO_PARCIAL
            PGTO_PARCIAL -- Peça Chegou --> RETORNO_OFICINA
            RETORNO_OFICINA --> EXECUCAO
            
            PRONTO_RETIRADA -- Retirada & Quitação --> FINALIZADO
            PRONTO_RETIRADA -- Pagou antes de vir --> PAGO_PRONTO
            PAGO_PRONTO -- Entrega física --> FINALIZADO
            
            FINALIZADO -- Retorno em Garantia (90 dias) --> MODAL_REABERTURA
            MODAL_REABERTURA --> AVALIACAO

            class ENTRADA,AVALIACAO,AUTORIZACAO padrao;
            class EXECUCAO,STRESS_TEST,PRONTO_RETIRADA aprovado;
            class FINALIZADO rejeitado;
            class AGUARDANDO_PECA,RETIRADA_TEMP,PGTO_PARCIAL,RETORNO_OFICINA fabiola;
            class PAGO_PRONTO pgto;
            class MODAL_REABERTURA reabertura;
        `;
      }

      case "fiscal":
        return `
          flowchart LR
            classDef blue fill:#1e40af,stroke:#3b82f6,stroke-width:2px,color:#fff;
            classDef green fill:#065f46,stroke:#10b981,stroke-width:2px,color:#fff;
            classDef yellow fill:#854d0e,stroke:#f59e0b,stroke-width:2px,color:#fff;
            classDef red fill:#991b1b,stroke:#ef4444,stroke-width:2px,color:#fff;

            OS["📋 O.S. em Finalização / Checkout"]:::blue --> Validador{"🔍 Validador Fiscal<br/>(CPF/CNPJ, CEP, NCMs)"}:::yellow
            
            Validador -- Dados Incompletos --> ModalAjuste["⚠️ Modal de Ajuste Rápido<br/>(ViaCEP + Correção ao vivo)"]:::red
            ModalAjuste --> Validador

            Validador -- Dados Válidos --> Separador["⚙️ Motor Fiscal Bifásico"]:::blue

            subgraph PRODUTOS ["📦 1. Módulo de Produtos / Peças"]
                Separador -->|Peças Trocadas| NFe["Emitir NF-e (Mod. 55) ou NFC-e (Mod. 65)"]:::green
                NFe --> BlingNFe["Bling V3 ➔ SEFAZ"]:::green
            end

            subgraph SERVICOS ["🛠️ 2. Módulo de Serviços / Mão de Obra"]
                Separador -->|Mão de Obra Técnica| NFSe["Emitir NFS-e Municipal<br/>(Prefeitura Ribeirão Preto)"]:::green
                NFSe --> BlingNFSe["Bling V3 ➔ Prefeitura"]:::green
            end

            BlingNFe --> Conclusao["✅ Vínculo de XMLs, PDFs e Chaves na O.S."]:::blue
            BlingNFSe --> Conclusao
        `;

      case "whatsapp":
        return `
          sequenceDiagram
            autonumber
            actor Atendente as 📋 Atendente / Técnico
            participant Core as ⚡ MGV One Hub (Hostinger VPS)
            participant DNS as 🏢 Net Profissional (whatsapp.mgvrp.com.br)
            participant Evo as 🤖 Evolution API (Docker)
            actor Cliente as 📱 Cliente (WhatsApp)

            Atendente->>Core: Atualiza status da O.S. (ex: "Pronto p/ Retirada")
            Core->>Core: EventBus dispara Webhook interno para Evolution API
            Note over Core,Evo: Tráfego roteado com SSL via whatsapp.mgvrp.com.br
            Core->>Evo: Envia payload (Mensagem formatada + Link do Portal)
            Evo->>Cliente: Dispara mensagem no WhatsApp com link seguro
            Cliente-->>Core: Acessa o Portal do Cliente para consultar a O.S.
        `;

      case "deploy":
        return `
          flowchart TD
            classDef git fill:#c2410c,stroke:#ea580c,stroke-width:2px,color:#fff;
            classDef coolify fill:#4338ca,stroke:#6366f1,stroke-width:2px,color:#fff;
            classDef vps fill:#065f46,stroke:#10b981,stroke-width:2px,color:#fff;

            Dev["👨‍💻 Ambiente de Teste / Dev<br/>(Diretório de Testes)"]:::git -->|git push origin main| GitHub["🐙 GitHub Repositório"]:::git
            
            GitHub -->|Webhook Automático| Coolify["⚙️ Painel Coolify (Hostinger VPS)"]:::coolify
            
            subgraph SERVER ["☁️ Servidor Hostinger VPS"]
                Coolify --> Build["🔨 Build da Imagem Docker<br/>(npm run build + Prisma migrate)"]:::coolify
                Build --> HealthCheck["🩺 Health Check Automático (/health)"]:::coolify
                HealthCheck -->|Status 200 OK| ZeroDowntime["🚀 Troca de Contêiner (Zero-Downtime)"]:::vps
                ZeroDowntime --> Prod["🌐 Sistema Atualizado no Ar"]:::vps
            end
        `;
    }
  };

  const getInfoData = (): InfoCardData => {
    switch (activeTab) {
      case "infra":
        return {
          title: "Infraestrutura de Domínio, DNS e Servidor VPS",
          desc: "O domínio mgvrp.com.br é hospedado na Net Profissional, onde estão configurados os apontamentos de DNS para o subdomínio whatsapp.mgvrp.com.br e a aplicação principal. O servidor Hostinger VPS recebe o tráfego com Traefik, gerenciando SSL e distribuindo para contêineres Docker do One Hub, Evolution API e PostgreSQL.",
          item1Label: "DOMÍNIO & DNS:",
          item1Value: "Net Profissional (mgvrp.com.br)",
          item2Label: "SERVIDOR VPS:",
          item2Value: "Hostinger VPS (Ubuntu + Coolify)",
          item3Label: "ROTEAMENTO & SSL:",
          item3Value: "Traefik + Let's Encrypt Automático",
          badgeBg: "bg-blue-950/80 text-blue-400 border border-blue-800",
          iconColor: "text-blue-400"
        };
      case "os": {
        const scenario = OS_SCENARIOS[osScenario];
        return {
          title: scenario.title,
          desc: scenario.desc,
          item1Label: "OPERACIONAL:",
          item1Value: scenario.op,
          item2Label: "CUSTÓDIA FÍSICA:",
          item2Value: scenario.cust,
          item3Label: "FINANCEIRO & FISCAL:",
          item3Value: scenario.fin,
          badgeBg: scenario.badgeBg,
          iconColor: scenario.color
        };
      }
      case "fiscal":
        return {
          title: "Motor Fiscal Bifásico (Peças x Mão de Obra)",
          desc: "Para cumprir as diretrizes tributárias municipais e estaduais (Ribeirão Preto / SP), o sistema separa automaticamente os itens da O.S.: produtos geram NF-e (Modelo 55) ou NFC-e (Modelo 65), e mão de obra gera NFS-e Municipal via API Bling V3 com validação cadastral prévia.",
          item1Label: "PRODUTOS / PEÇAS:",
          item1Value: "NF-e (55) / NFC-e (65) no Bling/SEFAZ",
          item2Label: "SERVIÇOS / MÃO DE OBRA:",
          item2Value: "NFS-e Municipal (Prefeitura RP)",
          item3Label: "PROTEÇÃO CADASTRAL:",
          item3Value: "Validação síncrona CPF/CNPJ, CEP e NCM",
          badgeBg: "bg-emerald-950/80 text-emerald-400 border border-emerald-800",
          iconColor: "text-emerald-400"
        };
      case "whatsapp":
        return {
          title: "Automação e Mensageria WhatsApp (Evolution API)",
          desc: "A cada alteração relevante de status de O.S. (aprovação, pronto para retirada ou aguardando peça), o EventBus interno aciona a Evolution API hospedada na VPS Hostinger através do subdomínio whatsapp.mgvrp.com.br gerenciado na Net Profissional, disparando a notificação com link para o Portal do Cliente.",
          item1Label: "ENGINE WHATSAPP:",
          item1Value: "Evolution API (Node.js Container)",
          item2Label: "SUBDOMÍNIO SEGURO:",
          item2Value: "whatsapp.mgvrp.com.br",
          item3Label: "GATILHO AUTOMÁTICO:",
          item3Value: "EventBus ao mudar status no Kanban",
          badgeBg: "bg-emerald-950/80 text-emerald-400 border border-emerald-800",
          iconColor: "text-emerald-400"
        };
      case "deploy":
        return {
          title: "Pipeline de Integração Contínua e Deploy Zero-Downtime",
          desc: "O código desenvolvido e testado no repositório é enviado para o GitHub. Um Webhook aciona o Coolify na Hostinger VPS, que reconstrói os contêineres Docker, executa as migrações do Prisma e só troca a rota do Traefik após o Health Check retornar status 200 OK.",
          item1Label: "ORQUESTRADOR:",
          item1Value: "Coolify (Self-Hosted PaaS na VPS)",
          item2Label: "ESTRATÉGIA DE DEPLOY:",
          item2Value: "Rolling Update Zero-Downtime",
          item3Label: "MONITORAMENTO:",
          item3Value: "Health Check /health no Prisma",
          badgeBg: "bg-purple-950/80 text-purple-400 border border-purple-800",
          iconColor: "text-purple-400"
        };
    }
  };

  useEffect(() => {
    const initializeMermaid = () => {
      const m = (window as any).mermaid;
      if (m) {
        try {
          m.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            flowchart: { curve: "basis", htmlLabels: true }
          });

          const container = document.getElementById("mermaid-diagram-container");
          if (container) {
            container.removeAttribute("data-processed");
            container.innerHTML = getMermaidCode();
            m.run({
              nodes: [container]
            });
          }
        } catch (err) {
          console.error("Erro ao renderizar Mermaid:", err);
        }
      }
    };

    if (!(window as any).mermaid) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.async = true;
      script.onload = () => {
        initializeMermaid();
      };
      document.body.appendChild(script);
    } else {
      initializeMermaid();
    }
  }, [activeTab, osScenario]);

  const currentInfo = getInfoData();

  return (
    <div className="flex flex-col bg-[#0b0f19] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden min-h-[calc(100vh-140px)] select-none">
      {/* Top Main Tabs Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-[22px]">account_tree</span>
            <h2 className="text-lg font-bold text-white tracking-wide">Mapa de Navegação e Arquitetura</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Esboço visual interativo do conglomerado MGV One Hub, infraestrutura e fluxos operacionais
          </p>
        </div>

        {/* Category Pill Buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto max-w-full">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Body with Sidebar + Diagram Canvas */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Contextual Sidebar */}
        <aside className="w-full lg:w-80 bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {/* Sub-scenarios only visible on OS tab */}
          {activeTab === "os" && (
            <div>
              <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">
                Cenários de O.S.
              </h3>
              <div className="flex flex-col gap-2">
                {(
                  [
                    { id: "all", label: "Visão Global de O.S.", icon: "visibility", color: "text-indigo-400", border: "" },
                    { id: "aprovado", label: "Orçamento Aprovado", icon: "check_circle", color: "text-emerald-400", border: "border-l-emerald-500" },
                    { id: "rejeitado", label: "Orçamento Recusado", icon: "cancel", color: "text-rose-400", border: "border-l-rose-500" },
                    { id: "fabiola", label: "Caso Fabíola (Retirada)", icon: "home_repair_service", color: "text-amber-400", border: "border-l-amber-500" },
                    { id: "pgto_antecipado", label: "Pagamento Antecipado", icon: "payments", color: "text-sky-400", border: "border-l-sky-500" },
                    { id: "reopen", label: "Garantia / Reabertura", icon: "history", color: "text-purple-400", border: "border-l-purple-500" },
                  ] as const
                ).map((item) => {
                  const isSelected = osScenario === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setOsScenario(item.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        item.border ? "border-l-4 " + item.border : ""
                      } ${
                        isSelected
                          ? "bg-slate-800 text-white border-slate-600 shadow-md"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/40"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${item.color}`}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Context Highlights */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center justify-between">
              <span>Especificações & Diretrizes</span>
              <span className="material-symbols-outlined text-[14px]">tune</span>
            </h4>
            <div className="space-y-3 font-semibold text-xs text-slate-300">
              <div className="flex flex-col gap-1 border-b border-slate-800/50 pb-2">
                <span className="text-[10px] text-slate-500 font-extrabold">{currentInfo.item1Label}</span>
                <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-md self-start ${currentInfo.badgeBg}`}>
                  {currentInfo.item1Value}
                </span>
              </div>
              <div className="flex flex-col gap-1 border-b border-slate-800/50 pb-2">
                <span className="text-[10px] text-slate-500 font-extrabold">{currentInfo.item2Label}</span>
                <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-md self-start ${currentInfo.badgeBg}`}>
                  {currentInfo.item2Value}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-extrabold">{currentInfo.item3Label}</span>
                <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-md self-start ${currentInfo.badgeBg}`}>
                  {currentInfo.item3Value}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Diagram Area */}
        <main className="flex-1 p-6 lg:p-8 flex flex-col justify-between items-center relative overflow-auto bg-[#070a13]">
          {/* Mermaid Canvas */}
          <div className="w-full flex-1 flex items-center justify-center min-h-[460px] overflow-auto">
            <div id="mermaid-diagram-container" className="mermaid w-full h-full flex justify-center items-center">
              {/* Mermaid render */}
            </div>
          </div>

          {/* Dynamic Detail Overlay Card */}
          <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-5 shadow-2xl mt-6 animate-fadein shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined text-[20px] ${currentInfo.iconColor}`}>info</span>
              <h4 className="text-sm font-bold text-white leading-none">{currentInfo.title}</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              {currentInfo.desc}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
