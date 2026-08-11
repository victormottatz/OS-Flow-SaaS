import React, { useState, useEffect } from "react";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { Part, Client, OSStatus } from "../types";
import { isValidCpfOrCnpj } from "../utils/cpfCnpjValidator";

interface FiscalPanelProps {
  parts: Part[];
  clients: Client[];
  isOffline: boolean;
  onRefresh: () => void;
}

export default function FiscalPanel({ parts, clients, isOffline, onRefresh }: FiscalPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ncm" | "clients">("ncm");
  const [localParts, setLocalParts] = useState<Part[]>([]);
  const [localClients, setLocalClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPartId, setSavingPartId] = useState<string | null>(null);
  
  // NCM view controls
  const [filterOnlyEmptyNcm, setFilterOnlyEmptyNcm] = useState(true);
  const [ncmSearchQuery, setNcmSearchQuery] = useState("");
  
  // Client edit states
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [clientForm, setClientForm] = useState<any>({
    name: "",
    cpfCnpj: "",
    stateInscription: "",
    address: "",
    city: "",
    state: "",
    zipCode: ""
  });
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // Guarda de alterações não salvas (modal de edição do cliente fiscal)
  const fiscalClientDirty =
    !!editingClient &&
    (clientForm.name?.trim() !== "" ||
      clientForm.cpfCnpj?.trim() !== "" ||
      clientForm.stateInscription?.trim() !== "" ||
      clientForm.address?.trim() !== "" ||
      clientForm.city?.trim() !== "" ||
      clientForm.state?.trim() !== "" ||
      clientForm.zipCode?.trim() !== "");
  useUnsavedChangesGuard(fiscalClientDirty);

  // Sync parts & clients list
  useEffect(() => {
    // Filtragem de partes
    let filteredParts = [...parts];
    if (filterOnlyEmptyNcm) {
      filteredParts = filteredParts.filter(p => !p.ncm || p.ncm.trim().replace(/\D/g, "").length !== 8);
    }
    if (ncmSearchQuery.trim() !== "") {
      filteredParts = filteredParts.filter(p => 
        p.name.toLowerCase().includes(ncmSearchQuery.toLowerCase()) || 
        p.code.toLowerCase().includes(ncmSearchQuery.toLowerCase())
      );
    }
    setLocalParts(filteredParts);
  }, [parts, filterOnlyEmptyNcm, ncmSearchQuery]);

  useEffect(() => {
    // Filtragem de clientes com pendências
    const badClients = clients.filter(c => {
      const docVal = isValidCpfOrCnpj(c.cpfCnpj);
      const hasAddress = c.address && c.address.trim() !== "";
      const hasCity = c.city && c.city.trim() !== "";
      const hasState = c.state && c.state.trim() !== "" && c.state.trim().length === 2;
      const hasZip = c.zipCode && c.zipCode.trim() !== "";
      return !docVal.valid || !hasAddress || !hasCity || !hasState || !hasZip;
    }).map(c => {
      const docVal = isValidCpfOrCnpj(c.cpfCnpj);
      const reasons: string[] = [];
      if (!docVal.valid) reasons.push("Documento Inválido");
      if (!c.address) reasons.push("Sem Endereço");
      if (!c.city) reasons.push("Sem Cidade");
      if (!c.state) reasons.push("Sem UF");
      if (!c.zipCode) reasons.push("Sem CEP");
      return { ...c, reasons: reasons.join(", ") };
    });
    setLocalClients(badClients);
  }, [clients]);

  // Função para salvar NCM inline
  const handleNcmChange = (partId: string, value: string) => {
    setLocalParts(prev => prev.map(p => p.id === partId ? { ...p, ncm: value } : p));
  };

  const handleSaveNcm = async (partId: string, ncmValue: string) => {
    const cleanNcm = ncmValue.replace(/\D/g, "");
    if (cleanNcm.length !== 8 && cleanNcm.length !== 0) {
      alert("Atenção: O código NCM deve possuir exatamente 8 dígitos.");
      return;
    }

    setSavingPartId(partId);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/parts/${partId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ncm: ncmValue })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar NCM.");
      }
    } catch (e: any) {
      alert("Erro ao conectar ao servidor: " + e.message);
    } finally {
      setSavingPartId(null);
    }
  };

  const handleNcmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, partId: string, index: number, currentValue: string) => {
    if (e.key === "Enter" || e.key === "Tab") {
      handleSaveNcm(partId, currentValue);
      // Focar automaticamente no input da linha seguinte para agilidade total
      setTimeout(() => {
        const nextInput = document.getElementById(`ncm-input-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 50);
    }
  };

  // CEP Search
  const handleCepSearch = async () => {
    const cleanCep = clientForm.zipCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      alert("CEP deve possuir 8 dígitos.");
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setClientForm((prev: any) => ({
          ...prev,
          address: data.logradouro ? `${data.logradouro}, ` : prev.address,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          zipCode: cleanCep
        }));
      } else {
        alert("CEP não encontrado.");
      }
    } catch (err) {
      alert("Erro ao buscar CEP.");
    }
  };

  // CNPJ Search
  const handleCnpjSearch = async () => {
    const cleanCnpj = clientForm.cpfCnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      alert("Para consulta automática na Receita, informe um CNPJ com 14 dígitos.");
      return;
    }
    setCnpjLoading(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/clients/cnpj/${cleanCnpj}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setClientForm((prev: any) => ({
          ...prev,
          name: data.name || prev.name,
          address: data.address || prev.address,
          city: data.city || prev.city,
          state: data.state || prev.state,
          zipCode: data.zipCode || prev.zipCode
        }));
      } else {
        alert(data.error || "Erro ao buscar dados do CNPJ.");
      }
    } catch (err) {
      alert("Erro na rede ao buscar CNPJ.");
    } finally {
      setCnpjLoading(false);
    }
  };

  // Salvar alterações de cliente
  const handleSaveClient = async () => {
    if (!editingClient) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        setEditingClient(null);
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar cliente.");
      }
    } catch (e: any) {
      alert("Erro ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("ncm")}
          className={`py-3 px-5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "ncm"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          🗂️ Edição de NCM em Lote
        </button>
        <button
          onClick={() => setActiveSubTab("clients")}
          className={`py-3 px-5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "clients"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          👥 Triagem de Clientes Incompletos ({localClients.length})
        </button>
      </div>

      {/* Tab 1: NCM Inline Grid */}
      {activeSubTab === "ncm" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Pesquisar peça..."
                value={ncmSearchQuery}
                onChange={(e) => setNcmSearchQuery(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64"
              />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterOnlyEmptyNcm}
                  onChange={(e) => setFilterOnlyEmptyNcm(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Exibir apenas sem NCM / Inválido</span>
              </label>
            </div>
            <p className="text-[10px] text-slate-400 font-mono self-end">
              Dica: Digite o NCM de 8 dígitos e aperte <strong>Enter</strong> para salvar e ir para a linha de baixo automaticamente.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição da Peça</th>
                  <th className="p-3 w-48">NCM (8 dígitos)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {localParts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-mono">
                      Nenhuma peça pendente de atualização fiscal encontrada.
                    </td>
                  </tr>
                ) : (
                  localParts.slice(0, 100).map((part, idx) => {
                    const isSaving = savingPartId === part.id;
                    return (
                      <tr key={part.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-450">{part.code}</td>
                        <td className="p-3 text-slate-800">{part.name}</td>
                        <td className="p-3">
                          <input
                            id={`ncm-input-${idx}`}
                            type="text"
                            value={part.ncm || ""}
                            onChange={(e) => handleNcmChange(part.id, e.target.value)}
                            onKeyDown={(e) => handleNcmKeyDown(e, part.id, idx, part.ncm || "")}
                            placeholder="00000000"
                            maxLength={8}
                            className={`w-full p-2 bg-slate-50 border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center ${
                              part.ncm && part.ncm.replace(/\D/g, "").length === 8
                                ? "border-slate-200"
                                : "border-amber-300 bg-amber-50/30"
                            }`}
                          />
                        </td>
                        <td className="p-3">
                          {isSaving ? (
                            <span className="text-amber-600 flex items-center gap-1 font-mono text-[10px]">
                              ⏳ Salvando...
                            </span>
                          ) : part.ncm && part.ncm.replace(/\D/g, "").length === 8 ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              ✅ OK
                            </span>
                          ) : (
                            <span className="text-amber-650 flex items-center gap-1">
                              ⚠️ Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Clients Triagem */}
      {activeSubTab === "clients" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Nome do Cliente</th>
                  <th className="p-3">CPF / CNPJ</th>
                  <th className="p-3">Pendência Cadastral</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {localClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-mono">
                      Nenhum cliente ativo com pendências fiscais.
                    </td>
                  </tr>
                ) : (
                  localClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 text-slate-800">{client.name}</td>
                      <td className="p-3 font-mono text-[11px]">{client.cpfCnpj || "Vazio"}</td>
                      <td className="p-3">
                        <span className="text-rose-600 font-bold text-[10px] uppercase bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                          {client.reasons}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setClientForm({
                              name: client.name || "",
                              cpfCnpj: client.cpfCnpj || "",
                              stateInscription: client.stateInscription || client.rg || "",
                              address: client.address || "",
                              city: client.city || "",
                              state: client.state || "",
                              zipCode: client.zipCode || ""
                            });
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition flex items-center gap-1 ml-auto"
                        >
                          ✏️ Corrigir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>✏️ Editar Cadastro Fiscal do Cliente</span>
              </h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Nome / Razão Social</label>
                  <input
                    type="text"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">CPF ou CNPJ</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientForm.cpfCnpj}
                      onChange={(e) => setClientForm({ ...clientForm, cpfCnpj: e.target.value })}
                      placeholder="Somente números"
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {clientForm.cpfCnpj.replace(/\D/g, "").length === 14 && (
                      <button
                        type="button"
                        onClick={handleCnpjSearch}
                        disabled={cnpjLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl transition cursor-pointer text-[10px] flex items-center gap-1 disabled:bg-slate-250 disabled:text-slate-400"
                      >
                        {cnpjLoading ? "Buscando..." : "🔍 Receita"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Inscrição Estadual / RG</label>
                  <input
                    type="text"
                    value={clientForm.stateInscription}
                    onChange={(e) => setClientForm({ ...clientForm, stateInscription: e.target.value })}
                    placeholder="Isento ou Nº"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">CEP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientForm.zipCode}
                      onChange={(e) => setClientForm({ ...clientForm, zipCode: e.target.value })}
                      placeholder="99999-999"
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                    >
                      <span>🔍 CEP</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Endereço (Rua, Número, Bairro)</label>
                  <input
                    type="text"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Cidade</label>
                  <input
                    type="text"
                    value={clientForm.city}
                    onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Estado (UF)</label>
                  <input
                    type="text"
                    value={clientForm.state}
                    onChange={(e) => setClientForm({ ...clientForm, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="SP"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveClient}
                disabled={loading}
                className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
