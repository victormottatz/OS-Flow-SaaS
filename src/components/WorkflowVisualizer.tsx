import React, { useState, useEffect } from "react";

type ScenarioKey = "all" | "aprovado" | "rejeitado" | "fabiola" | "pgto_antecipado" | "reopen";

interface ScenarioData {
  title: string;
  desc: string;
  op: string;
  cust: string;
  fin: string;
  color: string;
  badgeBg: string;
}

const infoData: Record<ScenarioKey, ScenarioData> = {
  all: {
    title: "Todos os Processos e Transições do Sistema",
    desc: "Mapeamento completo das regras operacionais, custódia e faturamento do ERP. Selecione qualquer cenário na barra lateral para ver o fluxo específico destacado.",
    op: "Status Variável (FSM)",
    cust: "Fluxo de Custódia",
    fin: "Situação de Pagamento",
    color: "text-indigo-400",
    badgeBg: "bg-slate-800 text-slate-350 border border-slate-700"
  },
  aprovado: {
    title: "Orçamento Aprovado (Caminho Feliz)",
    desc: "O cliente autoriza o orçamento do conserto. A OS passa de 'Aguardando Autorização' para 'Em Manutenção'. Ao finalizar o reparo, o status vai para 'Pronto para Retirada', e vira 'Finalizado' mediante a quitação total do saldo.",
    op: "AGUARDANDO_AUTORIZACAO ➔ EM_MANUTENCAO ➔ PRONTO_RETIRADA ➔ FINALIZADO",
    cust: "NA_OFICINA ➔ ENTREGUE_DEFINITIVO",
    fin: "PENDENTE ➔ PAGO (QUITAÇÃO)",
    color: "text-emerald-500",
    badgeBg: "bg-emerald-950/80 text-emerald-450 border border-emerald-800"
  },
  rejeitado: {
    title: "Orçamento Rejeitado pelo Cliente",
    desc: "O cliente não aceita o orçamento orçado para o reparo. A OS é movida diretamente para 'Finalizado' (com laudo de recusa), a custódia muda para 'Entregue' (sem conserto) e não há lançamento de faturamento financeiro.",
    op: "AGUARDANDO_AUTORIZACAO ➔ FINALIZADO (Devolvido)",
    cust: "NA_OFICINA ➔ ENTREGUE_DEFINITIVO",
    fin: "NENHUM / SEM CUSTO",
    color: "text-rose-500",
    badgeBg: "bg-rose-950/80 text-rose-450 border border-rose-800"
  },
  fabiola: {
    title: "Caso Fabíola (Retirada Temporária)",
    desc: "O cliente retira o equipamento para usar em casa enquanto aguarda uma peça de longa importação. A OS permanece aberta (Status: AGUARDANDO_PECA), a custódia física vai para ENTREGUE_TEMP e o pagamento parcial das peças já instaladas é recebido com emissão de NFC-e.",
    op: "EM_MANUTENCAO ➔ AGUARDANDO_PECA (OS Aberta)",
    cust: "ENTREGUE_TEMP (Casa do Cliente)",
    fin: "PAGO_PARCIAL (Faturamento de Peças)",
    color: "text-amber-500",
    badgeBg: "bg-amber-950/80 text-amber-450 border border-amber-800"
  },
  pgto_antecipado: {
    title: "Pagamento Antecipado (Item na Oficina)",
    desc: "O cliente efetua a quitação total ou parcial via Pix/Cartão antes de vir buscar o aparelho. A OS vai para o status operacional temporário 'PAGO_PRONTO_RETIRADA' e a custódia permanece na oficina até a retirada física do item.",
    op: "PRONTO_RETIRADA ➔ PAGO_PRONTO_RETIRADA",
    cust: "NA_OFICINA (Aguardando Retirada)",
    fin: "PAGO (Saldo Zerado)",
    color: "text-sky-500",
    badgeBg: "bg-sky-950/80 text-sky-450 border border-sky-800"
  },
  reopen: {
    title: "Reabertura / Retorno de Garantia",
    desc: "O equipamento retorna à oficina em garantia (ou a OS foi finalizada incorretamente). O gerente reabre a OS informando o motivo (gravado no histórico AuditLog). O status operacional volta para 'Em Manutenção' ou 'Aguardando Avaliação' (nova triagem), e o financeiro reabre o saldo.",
    op: "FINALIZADO ➔ EM_MANUTENCAO / AGUARDANDO_AVALIACAO",
    cust: "RETORNOU À OFICINA",
    fin: "REABERTO / SALDO A AJUSTAR",
    color: "text-purple-500",
    badgeBg: "bg-purple-950/80 text-purple-450 border border-purple-800"
  }
};

export default function WorkflowVisualizer() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("all");

  const getMermaidCode = (scenario: ScenarioKey) => {
    const isAll = scenario === "all";
    const isAprovado = scenario === "aprovado";
    const isRejeitado = scenario === "rejeitado";
    const isFabiola = scenario === "fabiola";
    const isPgto = scenario === "pgto_antecipado";
    const isReopen = scenario === "reopen";

    // Mapeamento de Opacidades/Fade
    const defaultColor = isAll ? "#475569" : "#1e293b";
    const highlightGreen = isAprovado ? "#22c55e" : (isAll ? "#22c55e" : "#1e293b/30");
    const highlightRed = isRejeitado ? "#ef4444" : (isAll ? "#ef4444" : "#1e293b/30");
    const highlightAmber = isFabiola ? "#eab308" : (isAll ? "#eab308" : "#1e293b/30");
    const highlightSky = isPgto ? "#38bdf8" : (isAll ? "#38bdf8" : "#1e293b/30");
    const highlightPurple = isReopen ? "#a855f7" : (isAll ? "#a855f7" : "#1e293b/30");

    const normalNodeColor = isAll ? "#1e293b" : "#1e293b/30";
    const borderDefault = isAll ? "#475569" : "#334155/35";
    const textNormal = isAll ? "#fff" : "#64748b";

    return `
      flowchart TD
        %% Estilos de nós e conexões
        classDef padrao fill:${normalNodeColor},stroke:${borderDefault},color:${textNormal},stroke-width:1.5px;
        classDef aprovado fill:${isAprovado ? "#166534" : "#1e293b/20"},stroke:${highlightGreen},color:${isAprovado ? "#fff" : "#64748b"},stroke-width:${isAprovado ? "3px" : "1px"};
        classDef rejeitado fill:${isRejeitado ? "#991b1b" : "#1e293b/20"},stroke:${highlightRed},color:${isRejeitado ? "#fff" : "#64748b"},stroke-width:${isRejeitado ? "3px" : "1px"};
        classDef fabiola fill:${isFabiola ? "#854d0e" : "#1e293b/20"},stroke:${highlightAmber},color:${isFabiola ? "#fff" : "#64748b"},stroke-width:${isFabiola ? "3px" : "1px"};
        classDef pgto fill:${isPgto ? "#0369a1" : "#1e293b/20"},stroke:${highlightSky},color:${isPgto ? "#fff" : "#64748b"},stroke-width:${isPgto ? "3px" : "1px"};
        classDef reabertura fill:${isReopen ? "#6b21a8" : "#1e293b/20"},stroke:${highlightPurple},color:${isReopen ? "#fff" : "#64748b"},stroke-width:${isReopen ? "3px" : "1px"};

        ENTRADA(["1. Entrada da OS"])
        AVALIACAO["2. Triagem / Orçamento"]
        AUTORIZACAO["3. Aguardando Autorização"]
        EXECUCAO["4. Em Manutenção"]
        AGUARDANDO_PECA["Aguardando Peça Externa"]
        RETIRADA_TEMP["Retirada Temporária pelo Cliente<br />Status OS: AGUARDANDO_PECA<br />Custódia: ENTREGUE_TEMP"]
        PGTO_PARCIAL["Faturamento Parcial / NFC-e Peças"]
        RETORNO_OFICINA["Retorno do Aparelho à Oficina"]
        PRONTO_RETIRADA["5. Pronto para Retirada"]
        PAGO_PRONTO_RETIRADA["Pago na Loja (PAGO_PRONTO_RETIRADA)<br />Custódia: NA_OFICINA"]
        FINALIZADO["6. OS FINALIZADA / RETIRADA<br />Custódia: ENTREGUE_DEFINITIVO"]
        MODAL_REABERTURA["Histórico de Reabertura (AuditLog)<br />Justificativa Gerente"]
        REABERTO["OS REABERTA<br />Status: REABERTO"]

        ENTRADA --> AVALIACAO
        AVALIACAO --> AUTORIZACAO
        
        AUTORIZACAO -- Orçamento Aprovado --> EXECUCAO
        AUTORIZACAO -- Rejeitado pelo Cliente --> FINALIZADO
        
        EXECUCAO -- Falta Peça ➔ Encomendar --> AGUARDANDO_PECA
        AGUARDANDO_PECA -- Cliente quer levar ➔ Caso Fabíola --> RETIRADA_TEMP
        RETIRADA_TEMP --> PGTO_PARCIAL
        PGTO_PARCIAL -- Peça Chegou ➔ Voltar à Oficina --> RETORNO_OFICINA
        RETORNO_OFICINA --> EXECUCAO
        
        EXECUCAO -- Reparo Concluído --> PRONTO_RETIRADA
        
        PRONTO_RETIRADA -- Retirada & Quitação --> FINALIZADO
        PRONTO_RETIRADA -- Pagou antes de retirar --> PAGO_PRONTO_RETIRADA
        PAGO_PRONTO_RETIRADA -- Entrega física --> FINALIZADO
        
        FINALIZADO -- Retorno em Garantia --> MODAL_REABERTURA
        MODAL_REABERTURA --> REABERTO
        REABERTO --> AVALIACAO

        class ENTRADA,AVALIACAO,AUTORIZACAO padrao;
        class EXECUCAO,PRONTO_RETIRADA aprovado;
        class FINALIZADO rejeitado;
        class AGUARDANDO_PECA,RETIRADA_TEMP,PGTO_PARCIAL,RETORNO_OFICINA fabiola;
        class PAGO_PRONTO_RETIRADA pgto;
        class MODAL_REABERTURA,REABERTO reabertura;
    `;
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
            container.innerHTML = getMermaidCode(activeScenario);
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
  }, [activeScenario]);

  const currentInfo = infoData[activeScenario];

  return (
    <div className="flex flex-col md:flex-row bg-[#0b0f19] rounded-3xl border border-slate-800 shadow-xl overflow-hidden min-h-[calc(100vh-140px)] select-none">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col gap-6 shrink-0">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Cenários de Negócio</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveScenario("all")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                activeScenario === "all"
                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveScenario("aprovado")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border border-l-4 cursor-pointer ${
                activeScenario === "aprovado"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                  : "bg-slate-950/40 border-slate-800 border-l-emerald-500/50 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Orçamento Aprovado</span>
            </button>

            <button
              onClick={() => setActiveScenario("rejeitado")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border border-l-4 cursor-pointer ${
                activeScenario === "rejeitado"
                  ? "bg-rose-500/10 border-rose-500 text-rose-400"
                  : "bg-slate-950/40 border-slate-800 border-l-rose-500/50 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Orçamento Recusado</span>
            </button>

            <button
              onClick={() => setActiveScenario("fabiola")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border border-l-4 cursor-pointer ${
                activeScenario === "fabiola"
                  ? "bg-amber-500/10 border-amber-500 text-amber-400"
                  : "bg-slate-950/40 border-slate-800 border-l-amber-500/50 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">home_repair_service</span>
              <span>Caso Fabíola (Retirada)</span>
            </button>

            <button
              onClick={() => setActiveScenario("pgto_antecipado")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border border-l-4 cursor-pointer ${
                activeScenario === "pgto_antecipado"
                  ? "bg-sky-500/10 border-sky-500 text-sky-400"
                  : "bg-slate-950/40 border-slate-800 border-l-sky-500/50 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Pagamento Antecipado</span>
            </button>

            <button
              onClick={() => setActiveScenario("reopen")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border border-l-4 cursor-pointer ${
                activeScenario === "reopen"
                  ? "bg-purple-500/10 border-purple-500 text-purple-400"
                  : "bg-slate-950/40 border-slate-800 border-l-purple-500/50 text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Garantia / Reabertura</span>
            </button>
          </div>
        </div>

        {/* Matriz 3D Display */}
        <div className="bg-slate-955 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Matriz de 3 Dimensões</h4>
          <div className="space-y-3 font-semibold text-xs text-slate-350">
            <div className="flex flex-col gap-1 border-b border-slate-800/50 pb-2">
              <span className="text-[10px] text-slate-500 font-extrabold">OPERACIONAL:</span>
              <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded-md self-start ${currentInfo.badgeBg}`}>
                {currentInfo.op}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-b border-slate-800/50 pb-2">
              <span className="text-[10px] text-slate-500 font-extrabold">CUSTÓDIA (APARELHO):</span>
              <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded-md self-start ${currentInfo.badgeBg}`}>
                {currentInfo.cust}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-extrabold">FINANCEIRO E FISCAL:</span>
              <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded-md self-start ${currentInfo.badgeBg}`}>
                {currentInfo.fin}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Flow Diagram Area */}
      <main className="flex-1 p-6 md:p-8 flex flex-col justify-between items-center relative overflow-auto bg-[#070a13]">
        {/* Mermaid Canvas */}
        <div className="w-full flex-1 flex items-center justify-center min-h-[420px]">
          <div id="mermaid-diagram-container" className="mermaid w-full h-full flex justify-center items-center">
            {/* Mermaid render */}
          </div>
        </div>

        {/* Dynamic Detail Overlay Card */}
        <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-2xl mt-6 animate-fadein shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`material-symbols-outlined text-[18px] ${currentInfo.color}`}>info</span>
            <h4 className="text-sm font-bold text-white leading-none">{currentInfo.title}</h4>
          </div>
          <p className="text-xs text-slate-450 leading-relaxed font-semibold">
            {currentInfo.desc}
          </p>
        </div>
      </main>
    </div>
  );
}
