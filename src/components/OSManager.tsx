/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Device, OrdemServico } from "../types";


interface OSManagerProps {
  clients: (Client & { devices: Device[] })[];
  ordensServico: OrdemServico[];
  isOffline: boolean;
  onRefresh: () => void;
}

export default function OSManager({ clients, ordensServico, isOffline, onRefresh }: OSManagerProps) {
  // Wizard steps
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  
  // OS fields
  const [reportedDefect, setReportedDefect] = useState("");
  const [accessoriesLeft, setAccessoriesLeft] = useState("");
  const [physicalState, setPhysicalState] = useState("");

  // Control
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdOS, setCreatedOS] = useState<OrdemServico | null>(null);

  // Selected client & device helpers
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const availableDevices = (selectedClient?.devices || []).filter(d => !d.deletedAt);
  const selectedDevice = availableDevices.find(d => d.id === selectedDeviceId);

  const handleCreateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (isOffline) {
      setErrorMsg("Falha ao abrir OS: O sistema está offline.");
      return;
    }

    if (!selectedClientId || !selectedDeviceId || !reportedDefect) {
      setErrorMsg("O preenchimento de Cliente, Aparelho e Defeito Relatado é estritamente obrigatório.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ordens-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          deviceId: selectedDeviceId,
          reportedDefect,
          accessoriesLeft,
          physicalState
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao abrir Ordem de Serviço.");
      }

      setCreatedOS(data);
      onRefresh();

      // Reset form fields
      setSelectedClientId("");
      setSelectedDeviceId("");
      setReportedDefect("");
      setAccessoriesLeft("");
      setPhysicalState("");

    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto anim-fadein">
      {/* Printable Area overrides shown inside modal / container */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-termo, #printable-termo * {
            visibility: visible;
          }
          #printable-termo {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Ordem de Serviço</h2>
        <p className="text-slate-500 text-sm">Geração sequencial e impressões de termos de recebimento de ativos na MGV</p>
      </div>

      {/* Wizard Step Indicator */}
      {!createdOS && (
        <div className="glassmorphism rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              selectedClientId ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"
            }`}>
              {selectedClientId ? <span className="material-symbols-outlined text-[16px]">check</span> : "1"}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 1</p>
              <p className="text-xs font-bold text-slate-800">Cliente</p>
            </div>
          </div>
          
          <div className="h-0.5 flex-1 mx-4 bg-slate-200" />
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              selectedDeviceId 
                ? "bg-emerald-500 text-white" 
                : selectedClientId 
                  ? "bg-indigo-600 text-white anim-pulse" 
                  : "bg-slate-200 text-slate-500"
            }`}>
              {selectedDeviceId ? <span className="material-symbols-outlined text-[16px]">check</span> : "2"}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 2</p>
              <p className="text-xs font-bold text-slate-800">Equipamento</p>
            </div>
          </div>
          
          <div className="h-0.5 flex-1 mx-4 bg-slate-200" />
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              reportedDefect 
                ? "bg-emerald-500 text-white" 
                : selectedDeviceId 
                  ? "bg-indigo-600 text-white anim-pulse" 
                  : "bg-slate-200 text-slate-500"
            }`}>
              3
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 3</p>
              <p className="text-xs font-bold text-slate-800">Sintomas</p>
            </div>
          </div>
        </div>
      )}

      {createdOS ? (
        /* SUCCESS & TERM VIEW */
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-800 flex items-start space-x-4 shadow-sm">
            <span className="material-symbols-outlined text-[24px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-emerald-950">Ordem de Serviço Aberta com Sucesso!</h3>
              <p className="text-sm mt-1 text-emerald-800">
                Foi gerado o código sequencial exclusivo <strong className="font-bold text-slate-900 bg-emerald-200/50 px-2 py-0.5 rounded font-mono text-sm">{createdOS.osNumber}</strong> para esta entrada de assistência.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 transition hover-premium active-premium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Imprimir Termo de Recebimento</span>
                </button>
                <button
                  onClick={() => {
                    setCreatedOS(null);
                    setClientSearch("");
                  }}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition hover-premium active-premium cursor-pointer"
                >
                  Abrir Nova OS
                </button>
              </div>
            </div>
          </div>

          {/* Printable visual client voucher */}
          <div id="printable-termo" className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium text-slate-900 max-w-3xl mx-auto print:border-none print:shadow-none font-sans relative overflow-hidden">
            {/* Watermark/Accent lines */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide text-indigo-950 flex items-center">
                  <span className="material-symbols-outlined text-[20px] mr-1.5 text-indigo-600">workspace_premium</span>
                  MGV Tecnologia
                </h1>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider font-semibold">MGV TECNOLOGIA E ASSISTÊNCIA TÉCNICA LTDA</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">CNPJ: 18.291.554/0001-90 | IE: 109.283.412.110</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Av. Tiradentes, 850, Ribeirão Preto - SP | Tel: (11) 3218-9900</p>
              </div>
              <div className="flex flex-col items-end text-right w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-mono">
                  TERMO DE RECEBIMENTO
                </span>
                <p className="text-3xl font-mono font-bold mt-3 text-slate-950 tracking-tight">{createdOS.osNumber}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Abertura: {new Date(createdOS.createdAt).toLocaleString("pt-BR")}
                </p>

                {/* Simulated Barcode */}
                <div className="mt-3 flex flex-col items-center justify-center p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-end space-x-[2px] h-6 opacity-85">
                    <div className="w-[2px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[3px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[2px] h-full bg-slate-900" />
                    <div className="w-[4px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                    <div className="w-[2px] h-full bg-slate-900" />
                    <div className="w-[3px] h-full bg-slate-900" />
                    <div className="w-[1px] h-full bg-slate-900" />
                  </div>
                  <span className="text-[8px] font-mono text-slate-500 tracking-widest mt-0.5">MGV-{createdOS.osNumber}</span>
                </div>
              </div>
            </div>

            {/* Client and device metadata table */}
            <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">how_to_reg</span>
                  Dados do Proprietário
                </h4>
                <p className="font-bold text-slate-950 text-sm">{clients.find(c => c.id === createdOS.clientId)?.name}</p>
                <p className="mt-1.5 font-medium text-slate-700">Documento: <span className="font-mono">{clients.find(c => c.id === createdOS.clientId)?.cpfCnpj}</span></p>
                <p className="font-medium text-slate-700">Contato: <span className="font-mono">{clients.find(c => c.id === createdOS.clientId)?.phone}</span></p>
                <p className="mt-1.5 text-slate-500 font-medium">Endereço: {clients.find(c => c.id === createdOS.clientId)?.address}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">devices</span>
                  Equipamento em Custódia
                </h4>
                {(() => {
                  const client = clients.find(c => c.id === createdOS.clientId);
                  const dev = client?.devices?.find(d => d.id === createdOS.deviceId);
                  return (
                    <div className="space-y-1 text-slate-700">
                      <p className="font-bold text-slate-950 text-sm">{dev?.type} - {dev?.brand}</p>
                      <p className="font-medium">Modelo: {dev?.model}</p>
                      <p className="font-mono text-xs font-semibold">N/S: <span className="bg-slate-250/70 px-1.5 py-0.5 rounded font-bold text-slate-800">{dev?.serialNumber}</span></p>
                      <p className="pt-1.5 text-slate-500 italic text-[11px]">Estética: {dev?.description}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Defects Checklist details */}
            <div className="space-y-4 text-xs border-t border-slate-200 pt-5">
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1.5 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-indigo-650">build</span>
                  Defeito Relatado pelo Solicitante
                </h4>
                <p className="p-3 bg-slate-50/75 border border-slate-200 rounded-xl italic text-slate-800 leading-relaxed font-medium">
                  "{createdOS.reportedDefect}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1 flex items-center">
                    <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">check_box</span>
                    Acessórios Deixados na Oficina
                  </h4>
                  <p className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-700 font-medium">
                    {createdOS.accessoriesLeft || "Nenhum acessório adicional entregue."}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1 flex items-center">
                    <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">info</span>
                    Estado Físico / Condições do Dispositivo
                  </h4>
                  <p className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-700 font-medium">
                    {createdOS.physicalState || "Sem avarias visuais descritas."}
                  </p>
                </div>
              </div>
            </div>

            {/* Firm clauses and agreements for assistance */}
            <div className="mt-8 border-t border-slate-200 pt-5 text-[10px] text-slate-500 leading-relaxed space-y-2">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Termos de Garantia, Condições e Custódia da Assistência:</p>
              <p>
                1. O proprietário autoriza a abertura e desmontagem física do equipamento para diagnóstico pericial. Orçamentos têm validade legal de 10 dias corridos a partir da data de comunicação dos resultados pela equipe.
              </p>
              <p>
                2. Equipamentos prontos não retirados em até 90 dias caracterizam abandono conforme art. 1.275, inciso III, do Código Civil, autorizando a MGV Tecnologia a vender ou descartá-los para quitação de despesas laboratoriais.
              </p>
              <p>
                3. A MGV Tecnologia não se responsabiliza por integridade de softwares corporativos ou perda de informações de armazenamento. O backup de arquivos deve ser efetuado previamente pelo proprietário.
              </p>
            </div>

            {/* Signature workspace block */}
            <div className="mt-14 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t border-slate-300 pt-3">
                <p className="font-semibold text-slate-800">Representante Técnico MGV</p>
                <p className="text-[10px] text-slate-400 font-medium">Assinatura autorizada</p>
              </div>
              <div className="border-t border-slate-300 pt-3">
                <p className="font-semibold text-slate-800">Proprietário do Ativo</p>
                <p className="text-[10px] text-slate-400 font-medium">De acordo com as cláusulas</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* WIZARD FORM OS */
        <div className="bg-white rounded-2xl shadow-premium border border-slate-200 p-6">
          <form onSubmit={handleCreateOS} className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl text-xs text-red-800 flex items-start space-x-2.5">
                <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">shield_alert</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: CLIENT SELECTION */}
            {!selectedClientId && (
              <div className="space-y-4 anim-slideup">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-50 pb-2">
                  <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">1</span>
                  <span>Vincular Proprietário (Cliente)</span>
                </h3>
                
                <div className="relative">
                  <span className="material-symbols-outlined text-[20px] absolute left-3.5 top-3.5 text-slate-400">search</span>
                  <input
                    type="text"
                    placeholder="Pesquisar cliente por nome, CPF/CNPJ ou telefone..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition duration-150 font-medium text-slate-800"
                  />
                </div>

                {(() => {
                  const filtered = clients.filter(c => {
                    if (c.deletedAt) return false;
                    const term = clientSearch.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(term) ||
                      c.cpfCnpj.includes(term) ||
                      c.phone.includes(term)
                    );
                  });

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {filtered.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setSelectedDeviceId("");
                          }}
                          className="text-left p-4 bg-white border border-slate-200 hover:border-indigo-600 rounded-xl transition duration-150 hover:shadow-premium hover-premium active-premium flex flex-col justify-between cursor-pointer"
                        >
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm tracking-tight">{c.name}</h4>
                            <div className="text-[11px] text-slate-500 mt-2 flex flex-wrap gap-2 items-center font-mono">
                              <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">{c.cpfCnpj}</span>
                              <span>{c.phone}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-3 truncate font-medium border-t border-slate-100 pt-2">{c.address}</p>
                        </button>
                      ))}

                      {filtered.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <span className="material-symbols-outlined text-[32px] text-slate-300 mx-auto mb-2 block text-center">how_to_reg</span>
                          <p className="text-sm font-semibold">Nenhum cliente ativo encontrado</p>
                          <p className="text-xs mt-1 text-slate-400">Verifique os dados ou cadastre o cliente no painel ao lado.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* STEP 2: DEVICE SELECTION */}
            {selectedClientId && !selectedDeviceId && (
              <div className="space-y-4 anim-slideup">
                {/* Selected Client Card Summary */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente Selecionado</p>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedClient?.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{selectedClient?.cpfCnpj}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId("");
                      setSelectedDeviceId("");
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition hover-premium active-premium cursor-pointer"
                  >
                    Alterar Cliente
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-50 pb-2">
                  <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">2</span>
                  <span>Escolha o Aparelho Deixado</span>
                </h3>

                {availableDevices.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 flex items-start space-x-3">
                    <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">shield_alert</span>
                    <div>
                      <p className="font-semibold text-amber-950">Este cliente não possui equipamentos cadastrados</p>
                      <p className="text-xs mt-1 leading-relaxed text-amber-850">
                        Por favor, adicione pelo menos um equipamento na ficha do cliente no menu de <strong>Clientes & Aparelhos</strong> para prosseguir com a abertura desta Ordem de Serviço.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableDevices.map((d) => {
                      const isNotebook = d.type.toLowerCase().includes("note") || d.type.toLowerCase().includes("comp") || d.type.toLowerCase().includes("pc");
                      const isPrinter = d.type.toLowerCase().includes("imp") || d.type.toLowerCase().includes("print");
                      const isPhone = d.type.toLowerCase().includes("cel") || d.type.toLowerCase().includes("fone") || d.type.toLowerCase().includes("phone") || d.type.toLowerCase().includes("sm");
                      
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDeviceId(d.id)}
                          className="text-left p-4 bg-white border border-slate-200 hover:border-indigo-600 rounded-xl transition duration-150 hover:shadow-premium hover-premium active-premium flex items-start space-x-3.5 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            {isNotebook ? <span className="material-symbols-outlined text-[20px]">laptop</span> : isPrinter ? <span className="material-symbols-outlined text-[20px]">print</span> : <span className="material-symbols-outlined text-[20px]">smartphone</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{d.type}</span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1.5 truncate">{d.brand} {d.model}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-1">Série: <span className="bg-slate-100 px-1 py-0.5 rounded font-semibold text-slate-700">{d.serialNumber}</span></p>
                            <p className="text-[10px] text-slate-400 mt-2 italic truncate">"{d.description}"</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: OS DETAILS & SUBMIT */}
            {selectedClientId && selectedDeviceId && (
              <div className="space-y-5 anim-slideup">
                {/* Customer and Device Quick Info Summary Panel */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 border-r border-slate-200 pr-4 last:border-r-0 md:pb-0 pb-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Cliente</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId("");
                            setSelectedDeviceId("");
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit</span>
                          <span>Alterar</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mt-1.5 truncate">{selectedClient?.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedClient?.cpfCnpj} | {selectedClient?.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 pl-0 md:pl-4">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">devices</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Equipamento</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDeviceId("")}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit</span>
                          <span>Alterar</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mt-1.5 truncate">{selectedDevice?.brand} {selectedDevice?.model}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Série: {selectedDevice?.serialNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Historico de Manutenções deste Equipamento */}
                {(() => {
                  const history = ordensServico.filter(os => os.deviceId === selectedDeviceId && !os.deletedAt);
                  if (history.length === 0) return null;
                  
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-1">
                        <span className="material-symbols-outlined text-[14px] text-indigo-600">history</span>
                        <span>Histórico de Manutenções Deste Aparelho ({history.length})</span>
                      </h4>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {history.map((os) => {
                          const formattedDate = new Date(os.createdAt).toLocaleDateString("pt-BR");
                          return (
                            <div key={os.id} className="bg-white border border-slate-200 rounded-xl p-3 text-xs flex justify-between gap-4 items-start hover:border-slate-350 transition">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{os.osNumber}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">{formattedDate}</span>
                                </div>
                                <p className="text-slate-700 mt-1.5 font-medium leading-relaxed truncate"><strong className="text-slate-500">Defeito:</strong> "{os.reportedDefect}"</p>
                                {os.diagnostic && (
                                  <p className="text-slate-600 font-medium leading-relaxed truncate"><strong className="text-slate-500">Laudo:</strong> "{os.diagnostic}"</p>
                                )}
                              </div>
                              
                              <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                  os.status === "FINALIZADO" 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : os.status === "PRONTO_RETIRADA"
                                      ? "bg-teal-50 border-teal-200 text-teal-800"
                                      : "bg-amber-50 border-amber-250/60 text-amber-800"
                                }`}>
                                  {os.status.replace("_", " ")}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-slate-700">R$ {os.totalCost.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-50 pb-2">
                  <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">3</span>
                  <span>Sintomas e Defeitos Relatados</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Defeito Relatado pelo Cliente <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Descreva detalhadamente o sintoma narrado pelo cliente. Ex: Notebook liga mas fica com apitos seguidos e tela completamente preta, superaquecimento repentino."
                      value={reportedDefect}
                      onChange={(e) => setReportedDefect(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium transition duration-150 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Acessórios Deixados</label>
                      <input
                        type="text"
                        placeholder="Ex: Carregador original, cabo USB, capa de proteção"
                        value={accessoriesLeft}
                        onChange={(e) => setAccessoriesLeft(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium transition duration-150 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Avarias Estéticas / Estado no Balcão</label>
                      <input
                        type="text"
                        placeholder="Ex: Tela riscada, ausência de parafuso na carcaça"
                        value={physicalState}
                        onChange={(e) => setPhysicalState(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium transition duration-150 text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-premium hover-premium active-premium transition duration-150 flex items-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                        <span>Registrando Ordem...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">assignment_add</span>
                        <span>Gerar Ordem e Abrir Termo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
