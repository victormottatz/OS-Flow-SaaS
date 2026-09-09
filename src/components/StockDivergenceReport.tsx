/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { StockAuditReport, StockDivergenceItem } from "../services/bling";

interface StockDivergenceReportProps {
  onRefreshParent?: () => Promise<void> | void;
}

export default function StockDivergenceReport({ onRefreshParent }: StockDivergenceReportProps) {
  const [report, setReport] = useState<StockAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "DIVERGENT" | "QTY" | "FISCAL" | "ONLY_MGV" | "ONLY_BLING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Estado de ações unitárias / lote
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchAuditReport = async () => {
    setLoading(true);
    setErrorMsg("");
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/integration/bling/stock/audit", {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        setErrorMsg(data.error || "Falha ao carregar auditoria de estoque do Bling.");
      }
    } catch (err: any) {
      setErrorMsg("Erro de conexão com o servidor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditReport();
  }, []);

  // Sincronizar MGV ➔ Bling (envia dados cadastrais, NCM e estoque do MGV)
  const handleSyncToBling = async (partId: string) => {
    setSyncingItemId(partId);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/integration/bling/stock/sync-to-bling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ partId })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ msg: data.message, type: "success" });
        await fetchAuditReport();
        if (onRefreshParent) onRefreshParent();
      } else {
        setActionFeedback({ msg: data.error || "Erro ao sincronizar com o Bling.", type: "error" });
      }
    } catch (e: any) {
      setActionFeedback({ msg: "Erro de rede ao sincronizar: " + e.message, type: "error" });
    } finally {
      setSyncingItemId(null);
    }
  };

  // Sincronizar Bling ➔ MGV (atualiza estoque, NCM e preço local com dados do Bling)
  const handleSyncFromBling = async (item: StockDivergenceItem) => {
    if (!item.partId) return;
    setSyncingItemId(item.partId);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/integration/bling/stock/sync-from-bling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          partId: item.partId,
          stockBling: item.stockBling,
          ncmBling: item.ncmBling,
          priceBling: item.priceBling,
          unitBling: item.unitBling
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ msg: data.message, type: "success" });
        await fetchAuditReport();
        if (onRefreshParent) onRefreshParent();
      } else {
        setActionFeedback({ msg: data.error || "Erro ao atualizar MGV.", type: "error" });
      }
    } catch (e: any) {
      setActionFeedback({ msg: "Erro de rede: " + e.message, type: "error" });
    } finally {
      setSyncingItemId(null);
    }
  };

  // Sincronização em Lote de todas as divergências do MGV para o Bling
  const handleBatchSyncToBling = async () => {
    if (!report || report.items.length === 0) return;
    const divergentPartIds = report.items
      .filter(i => i.partId && (i.status === "QTY_DIVERGENCE" || i.status === "FISCAL_DIVERGENCE" || i.status === "ONLY_MGV"))
      .map(i => i.partId as string);

    if (divergentPartIds.length === 0) {
      alert("Não há itens pendentes de sincronização do MGV para o Bling.");
      return;
    }

    if (!confirm(`Deseja sincronizar ${divergentPartIds.length} itens do MGV (Dados cadastrais, NCM e Saldos) para o Bling ERP?`)) {
      return;
    }

    setIsBatchSyncing(true);
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/integration/bling/stock/sync-batch-to-bling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ partIds: divergentPartIds })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          msg: `Sincronização em lote concluída! ${data.successCount} itens sincronizados com sucesso (${data.errorCount} falhas).`,
          type: data.errorCount > 0 ? "error" : "success"
        });
        await fetchAuditReport();
        if (onRefreshParent) onRefreshParent();
      } else {
        setActionFeedback({ msg: data.error || "Erro na sincronização em lote.", type: "error" });
      }
    } catch (e: any) {
      setActionFeedback({ msg: "Erro de conexão: " + e.message, type: "error" });
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // Exportar relatório em formato CSV compatível com Excel
  const handleExportCsv = () => {
    if (!report || report.items.length === 0) return;

    const headers = [
      "Codigo/SKU",
      "Descricao",
      "Estoque Local",
      "Estoque Bling",
      "Diferenca Saldo",
      "NCM Local",
      "NCM Bling",
      "Preco Local (R$)",
      "Preco Bling (R$)",
      "Status",
      "Diagnostico Divergencias"
    ];

    const rows = filteredItems.map(item => [
      `"${item.code.replace(/"/g, '""')}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      item.stockMgv,
      item.stockBling,
      item.stockDelta,
      `"${item.ncmMgv || ""}"`,
      `"${item.ncmBling || ""}"`,
      item.priceMgv.toFixed(2),
      item.priceBling.toFixed(2),
      `"${item.status}"`,
      `"${item.divergences.join(" | ").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_divergencias_estoque_bling_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem e busca de itens
  const filteredItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter(item => {
      // Filtro de status
      if (filterType === "ALL") {
        // passa tudo
      } else if (filterType === "DIVERGENT") {
        if (item.status === "OK") return false;
      } else if (filterType === "QTY") {
        if (item.status !== "QTY_DIVERGENCE") return false;
      } else if (filterType === "FISCAL") {
        if (item.status !== "FISCAL_DIVERGENCE") return false;
      } else if (filterType === "ONLY_MGV") {
        if (item.status !== "ONLY_MGV") return false;
      } else if (filterType === "ONLY_BLING") {
        if (item.status !== "ONLY_BLING") return false;
      }

      // Filtro de texto
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.ncmMgv.includes(q) ||
        item.ncmBling.includes(q)
      );
    });
  }, [report, filterType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO & BARRA DE AÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-lg font-bold text-slate-800">
              Conferência & Auditoria de Estoque / NCM (Bling ERP)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruzamento em tempo real de saldos, dados cadastrais e NCMs entre o banco local e a API V3 do Bling.
          </p>
          {report?.timestamp && (
            <span className="text-[11px] text-slate-400 font-medium">
              Última varredura: {new Date(report.timestamp).toLocaleString("pt-BR")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchAuditReport}
            disabled={loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Varrendo Bling...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Atualizar Varredura</span>
              </>
            )}
          </button>

          <button
            onClick={handleBatchSyncToBling}
            disabled={isBatchSyncing || loading || !report}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isBatchSyncing ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Sincronizando em Lote...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Sincronizar MGV ➔ Bling</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!report || report.items.length === 0}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>📥</span>
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            disabled={!report || report.items.length === 0}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE AÇÕES */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span>{actionFeedback.msg}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span>⚠️</span>
            <span>Erro na auditoria com o Bling</span>
          </div>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* CARDS DE INDICADORES (KPIS) */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Auditado</span>
            <span className="text-xl font-black text-slate-800">{report.totalItems}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">itens mapeados</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs text-center bg-emerald-50/20">
            <span className="text-[10px] font-bold uppercase text-emerald-600 block">Sincronizados</span>
            <span className="text-xl font-black text-emerald-600">{report.synchronizedCount}</span>
            <span className="text-[10px] text-emerald-600/80 block mt-0.5">100% alinhados</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs text-center bg-amber-50/20">
            <span className="text-[10px] font-bold uppercase text-amber-600 block">Dif. Estoque</span>
            <span className="text-xl font-black text-amber-600">{report.qtyDivergenceCount}</span>
            <span className="text-[10px] text-amber-600/80 block mt-0.5">saldos divergentes</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs text-center bg-indigo-50/20">
            <span className="text-[10px] font-bold uppercase text-indigo-600 block">Dif. NCM/Fiscal</span>
            <span className="text-xl font-black text-indigo-600">{report.fiscalDivergenceCount}</span>
            <span className="text-[10px] text-indigo-600/80 block mt-0.5">NCM / Preço</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs text-center bg-blue-50/20">
            <span className="text-[10px] font-bold uppercase text-blue-600 block">Apenas no Sistema</span>
            <span className="text-xl font-black text-blue-600">{report.onlyMgvCount}</span>
            <span className="text-[10px] text-blue-600/80 block mt-0.5">não criados no ERP</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs text-center bg-purple-50/20">
            <span className="text-[10px] font-bold uppercase text-purple-600 block">Apenas Bling</span>
            <span className="text-xl font-black text-purple-600">{report.onlyBlingCount}</span>
            <span className="text-[10px] text-purple-600/80 block mt-0.5">não criados no Sistema</span>
          </div>
        </div>
      )}

      {/* CARD DE IMPACTO FINANCEIRO */}
      {report && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Balanço Financeiro de Estoque
              </h4>
              <p className="text-[11px] text-slate-300">
                Valorização monetária dos itens no Sistema comparada aos saldos do Bling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Valor Total Sistema</span>
              <span className="font-bold text-white">R$ {report.totalValueMgv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Valor Total Bling</span>
              <span className="font-bold text-white">R$ {report.totalValueBling.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-right pl-4 border-l border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Diferença Financeira</span>
              <span className={`font-black ${report.financialDifference >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {report.financialDifference >= 0 ? "+" : ""}
                R$ {report.financialDifference.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS & BUSCA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* ABAS DE FILTRO */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === "ALL"
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({report?.items.length || 0})
          </button>
          <button
            onClick={() => setFilterType("DIVERGENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === "DIVERGENT"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
            }`}
          >
            Todas as Divergências ({(report?.qtyDivergenceCount || 0) + (report?.fiscalDivergenceCount || 0) + (report?.onlyMgvCount || 0) + (report?.onlyBlingCount || 0)})
          </button>
          <button
            onClick={() => setFilterType("QTY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === "QTY"
                ? "bg-orange-600 text-white"
                : "bg-orange-50 text-orange-800 hover:bg-orange-100"
            }`}
          >
            Dif. Estoque ({report?.qtyDivergenceCount || 0})
          </button>
          <button
            onClick={() => setFilterType("FISCAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === "FISCAL"
                ? "bg-indigo-600 text-white"
                : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
            }`}
          >
            Dif. NCM/Fiscal ({report?.fiscalDivergenceCount || 0})
          </button>
          <button
            onClick={() => setFilterType("ONLY_MGV")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === "ONLY_MGV"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            }`}
          >
            Só Sistema ({report?.onlyMgvCount || 0})
          </button>
          <button
            onClick={() => setFilterType("ONLY_BLING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === "ONLY_BLING"
                ? "bg-purple-600 text-white"
                : "bg-purple-50 text-purple-800 hover:bg-purple-100"
            }`}
          >
            Só Bling ({report?.onlyBlingCount || 0})
          </button>
        </div>

        {/* CAMPO DE BUSCA */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, nome ou NCM..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* TABELA COMPARATIVA DE ESTOQUE & NCM */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código / SKU</th>
                <th className="py-3 px-4">Descrição da Peça</th>
                <th className="py-3 px-3 text-center">Estoque Local</th>
                <th className="py-3 px-3 text-center">Estoque Bling</th>
                <th className="py-3 px-3 text-center">Diferença Saldo</th>
                <th className="py-3 px-3 text-center">NCM Local</th>
                <th className="py-3 px-3 text-center">NCM Bling</th>
                <th className="py-3 px-3 text-right">Preço Local</th>
                <th className="py-3 px-3 text-right">Preço Bling</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações de Sincronização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    {loading ? "Carregando e comparando produtos..." : "Nenhum item localizado com os filtros selecionados."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSyncing = syncingItemId === item.partId;
                  const isNcmDivergent = item.ncmMgv !== item.ncmBling;
                  const isQtyDivergent = item.stockMgv !== item.stockBling;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      {/* CÓDIGO */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.code}
                      </td>

                      {/* DESCRIÇÃO */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </div>
                        {item.divergences.length > 0 && (
                          <div className="text-[10px] text-amber-700 mt-0.5 truncate" title={item.divergences.join(" | ")}>
                            {item.divergences[0]}
                          </div>
                        )}
                      </td>

                      {/* ESTOQUE MGV */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {item.partId ? item.stockMgv : <span className="text-slate-300">-</span>}
                      </td>

                      {/* ESTOQUE BLING */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {item.blingId ? item.stockBling : <span className="text-slate-300">-</span>}
                      </td>

                      {/* DIFERENÇA DE SALDO */}
                      <td className="py-3 px-3 text-center">
                        {isQtyDivergent ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.stockDelta > 0
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-rose-100 text-rose-900 border border-rose-300"
                            }`}
                          >
                            {item.stockDelta > 0 ? `+${item.stockDelta}` : item.stockDelta}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0 ✓</span>
                        )}
                      </td>

                      {/* NCM MGV */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        {item.ncmMgv ? (
                          <span className={isNcmDivergent ? "text-amber-700 font-bold underline decoration-amber-400" : "text-slate-700"}>
                            {item.ncmMgv}
                          </span>
                        ) : (
                          <span className="text-rose-500 font-semibold italic text-[10px]">Não preenchido</span>
                        )}
                      </td>

                      {/* NCM BLING */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        {item.ncmBling ? (
                          <span className={isNcmDivergent ? "text-amber-700 font-bold underline decoration-amber-400" : "text-slate-700"}>
                            {item.ncmBling}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Vazio</span>
                        )}
                      </td>

                      {/* PREÇO MGV */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.partId ? `R$ ${item.priceMgv.toFixed(2)}` : "-"}
                      </td>

                      {/* PREÇO BLING */}
                      <td className="py-3 px-3 text-right font-mono">
                        {item.blingId ? `R$ ${item.priceBling.toFixed(2)}` : "-"}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3 px-3 text-center">
                        {item.status === "OK" && (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-lg border border-emerald-200">
                            Sincronizado
                          </span>
                        )}
                        {item.status === "QTY_DIVERGENCE" && (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 font-extrabold text-[10px] rounded-lg border border-amber-200">
                            Dif. Saldo
                          </span>
                        )}
                        {item.status === "FISCAL_DIVERGENCE" && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-lg border border-indigo-200">
                            Dif. NCM/Preço
                          </span>
                        )}
                        {item.status === "ONLY_MGV" && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-lg border border-blue-200">
                            Só no Sistema
                          </span>
                        )}
                        {item.status === "ONLY_BLING" && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 font-extrabold text-[10px] rounded-lg border border-purple-200">
                            Só no Bling
                          </span>
                        )}
                      </td>

                      {/* AÇÕES DE SINCRONIZAÇÃO */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.partId && (
                            <button
                              title="Sincronizar dados cadastrais, NCM e estoque local para o Bling"
                              onClick={() => handleSyncToBling(item.partId!)}
                              disabled={isSyncing}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-md border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                            >
                              {isSyncing ? "..." : "Sistema ➔ Bling"}
                            </button>
                          )}

                          {item.partId && item.blingId && (
                            <button
                              title="Atualizar estoque e NCM local com os dados do Bling"
                              onClick={() => handleSyncFromBling(item)}
                              disabled={isSyncing}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-md border border-slate-200 transition cursor-pointer disabled:opacity-50"
                            >
                              Bling ➔ Sistema
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
