/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Device, UserRole, OrdemServico } from "../types";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";


interface ClientManagerProps {
  clients: (Client & { devices: Device[] })[];
  userRole: UserRole;
  isOffline: boolean;
  onRefresh: () => void;
  limit: number | "all";
  onLimitChange: (limit: number | "all") => void;
}

export default function ClientManager({ clients, userRole, isOffline, onRefresh, limit, onLimitChange }: ClientManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [activeClientForDevice, setActiveClientForDevice] = useState<string | null>(null);

  // Visão 360
  const [selectedDevice360, setSelectedDevice360] = useState<Device | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<OrdemServico[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Visão 360 do Cliente (Prioridade 3)
  const [activeClient360Id, setActiveClient360Id] = useState<string | null>(null);
  const [prontuarioTab, setProntuarioTab] = useState<"history" | "parts" | "notes" | "warranty">("history");
  const [client360Data, setClient360Data] = useState<any | null>(null);
  const [is360Loading, setIs360Loading] = useState(false);
  const [visao360Tab, setVisao360Tab] = useState<"devices" | "history">("devices");

  // Edição de Dispositivo da Base Instalada (Prioridade 3)
  const [showEditDeviceModal, setShowEditDeviceModal] = useState(false);
  const [editDeviceId, setEditDeviceId] = useState("");
  const [editDevType, setEditDevType] = useState("Ultrassom (Fisio/Estética)");
  const [editDevExtraType, setEditDevExtraType] = useState("");
  const [editDevBrand, setEditDevBrand] = useState("");
  const [editDevModel, setEditDevModel] = useState("");
  const [editDevSerial, setEditDevSerial] = useState("");
  const [editDevDesc, setEditDevDesc] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");
  const [editSuccessMsg, setEditSuccessMsg] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Filtro de base instalada
  const [filterIncomplete, setFilterIncomplete] = useState(false);

  // Form Fields - Client
  const [clientName, setClientName] = useState("");
  const [clientCpfCnpj, setClientCpfCnpj] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCep, setClientCep] = useState("");
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  // Custom list of devices inside the Add Client modal
  const [tempDevices, setTempDevices] = useState<{ type: string; extraType?: string; brand: string; model: string; serialNumber: string; description: string }[]>([]);

  // Form Fields - Individual Device addition
  const [devType, setDevType] = useState("Ultrassom (Fisio/Estética)");
  const [devExtraType, setDevExtraType] = useState("");
  const [devBrand, setDevBrand] = useState("");
  const [devModel, setDevModel] = useState("");
  const [devSerial, setDevSerial] = useState("");
  const [devDesc, setDevDesc] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCepLookup = async () => {
    const cleanCep = clientCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setErrorMsg("Por favor, informe um CEP válido com 8 dígitos para a consulta.");
      return;
    }

    setIsCepLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) {
        throw new Error("Falha ao se conectar com o servidor do ViaCEP.");
      }
      const data = await response.json();
      if (data.erro) {
        throw new Error("CEP não encontrado.");
      }

      // Pre-fill address formatting: Rua, [nº] - Bairro - Cidade / UF
      const preFilled = `${data.logradouro},  - ${data.bairro} - ${data.localidade} / ${data.uf}`;
      setClientAddress(preFilled);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao consultar o CEP.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Estados para Prontuário Técnico
  const [prontuarioData, setProntuarioData] = useState<any | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const openDeviceHistory = async (dev: Device) => {
    if (isOffline) {
      alert("Acesso ao histórico completo indisponível offline.");
      return;
    }
    setSelectedDevice360(dev);
    setIsHistoryLoading(true);
    setDeviceHistory([]);
    setProntuarioData(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/devices/${dev.id}/prontuario`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProntuarioData(data);
        setDeviceHistory(data.orders || []);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleAddNote = async (deviceId: string) => {
    if (!newNoteContent.trim()) return;
    setIsSavingNote(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/devices/${deviceId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: newNoteContent })
      });
      if (res.ok) {
        const newNote = await res.json();
        if (prontuarioData) {
          setProntuarioData({
            ...prontuarioData,
            notes: [newNote, ...(prontuarioData.notes || [])]
          });
        }
        setNewNoteContent("");
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao salvar nota.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleUpdateWarranty = async (deviceId: string, warrantyExpiresAt: string, lastMaintenanceAt: string) => {
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/devices/${deviceId}/warranty`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ warrantyExpiresAt, lastMaintenanceAt })
      });
      if (res.ok) {
        const updated = await res.json();
        if (prontuarioData) {
          setProntuarioData({
            ...prontuarioData,
            device: {
              ...prontuarioData.device,
              warrantyExpiresAt: updated.warrantyExpiresAt,
              lastMaintenanceAt: updated.lastMaintenanceAt,
              warrantyActive: updated.warrantyExpiresAt ? new Date(updated.warrantyExpiresAt).getTime() > Date.now() : false
            }
          });
        }
        alert("Datas de garantia e manutenção atualizadas com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const { isFeatureEnabled } = useFeatureFlags();
  const is360Enabled = isFeatureEnabled("CLIENT_360_AND_BASE_INSTALADA");

  const openClient360 = async (clientId: string) => {
    if (isOffline) {
      alert("Visão 360 do cliente não disponível offline.");
      return;
    }
    setActiveClient360Id(clientId);
    setIs360Loading(true);
    setClient360Data(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/clients/${clientId}/360`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClient360Data(data);
      } else {
        console.error("Falha ao recuperar dados unificados.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIs360Loading(false);
    }
  };

  const handleEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg("");
    setEditSuccessMsg("");
    setEditLoading(true);

    if (isOffline) {
      setEditErrorMsg("O sistema está offline.");
      setEditLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/devices/${editDeviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: editDevExtraType.trim() ? `${editDevType} / ${editDevExtraType.trim()}` : editDevType,
          brand: editDevBrand,
          model: editDevModel,
          serialNumber: editDevSerial,
          description: editDevDesc
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar dispositivo.");
      }

      setEditSuccessMsg("Dispositivo atualizado com sucesso!");
      onRefresh();

      if (activeClient360Id) {
        openClient360(activeClient360Id);
      }

      setTimeout(() => {
        setShowEditDeviceModal(false);
        setEditSuccessMsg("");
      }, 1000);
    } catch (err: any) {
      setEditErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setEditLoading(false);
    }
  };

  // Helper validation for CPF/CNPJ
  const formatCpfCnpj = (val: string) => {
    // Basic format filter
    return val.replace(/\D/g, "");
  };

  const addTempDeviceField = () => {
    setTempDevices([...tempDevices, { type: "Ultrassom (Fisio/Estética)", extraType: "", brand: "", model: "", serialNumber: "", description: "" }]);
  };

  const updateTempDevice = (index: number, field: string, value: string) => {
    const updated = [...tempDevices];
    updated[index] = { ...updated[index], [field]: value };
    setTempDevices(updated);
  };

  const removeTempDevice = (index: number) => {
    setTempDevices(tempDevices.filter((_, idx) => idx !== index));
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (isOffline) {
      setErrorMsg("O sistema está offline. Conexão física de rede indisponível.");
      return;
    }

    if (!clientName || !clientCpfCnpj || !clientPhone || !clientEmail || !clientAddress) {
      setErrorMsg("Todos os campos do cliente são de preenchimento obrigatório.");
      return;
    }

    // Validation for "Sem Série" description length minimum
    for (const [idx, dev] of tempDevices.entries()) {
      const isBlankSerial = !dev.serialNumber || dev.serialNumber.trim() === "" || dev.serialNumber === "Sem Série";
      if (isBlankSerial && (!dev.description || dev.description.trim().length < 5)) {
        setErrorMsg(`Para o equipamento nº ${idx + 1} sem número de série, é obrigatório preencher uma descrição detalhada das características estéticas/físicas.`);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clientName,
          cpfCnpj: clientCpfCnpj,
          phone: clientPhone,
          email: clientEmail,
          address: clientAddress,
          devices: tempDevices.map(d => ({
            type: d.extraType?.trim() ? `${d.type} / ${d.extraType.trim()}` : d.type,
            brand: d.brand,
            model: d.model,
            serialNumber: d.serialNumber,
            description: d.description
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar cliente.");
      }

      setSuccessMsg("Cliente e seus respectivos aparelhos cadastrados com excelência!");
      onRefresh();
      
      // Cleanup
      setTimeout(() => {
        setShowAddModal(false);
        setClientName("");
        setClientCpfCnpj("");
        setClientPhone("");
        setClientEmail("");
        setClientAddress("");
        setClientCep("");
        setTempDevices([]);
        setSuccessMsg("");
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddIndividualDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (isOffline) {
      setErrorMsg("Aparelho não pôde ser gravado: Sistema offline.");
      return;
    }

    const resolvedSerial = devSerial.trim() === "" ? "Sem Série" : devSerial.trim();
    if (resolvedSerial === "Sem Série" && (!devDesc || devDesc.trim().length < 5)) {
      setErrorMsg("Para equipamentos sem número de série, descreva características estéticas detalhadas (ex: marcas de uso, etiquetas, adesivos).");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: activeClientForDevice,
          type: devExtraType.trim() ? `${devType} / ${devExtraType.trim()}` : devType,
          brand: devBrand,
          model: devModel,
          serialNumber: resolvedSerial,
          description: devDesc
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao associar dispositivo.");
      }

      setSuccessMsg("Dispositivo adicionado à conta do cliente!");
      onRefresh();

      setTimeout(() => {
        setShowDeviceModal(false);
        setActiveClientForDevice(null);
        setDevBrand("");
        setDevModel("");
        setDevSerial("");
        setDevDesc("");
        setSuccessMsg("");
      }, 1200);

    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (isOffline) {
      alert("Operação impossibilitada: Modo Offline ativo.");
      return;
    }

    if (userRole !== UserRole.OWNER) {
      alert("Acesso Negado: Apenas a função OWNER possui permissão para excluir clientes e ativos.");
      return;
    }

    if (!confirm("Aviso: Esta exclusão é lógica (Soft Delete) e tornará o cliente e todas as suas OSs inacessíveis para edição. Deseja prosseguir de forma definitiva?")) {
      return;
    }

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-user-role": userRole
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Não foi possível excluir");
      }

      alert("Exclusão lógica realizada com sucesso!");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter lists based on search
  const filteredClients = clients.filter(c => {
    const searchLow = searchTerm.toLowerCase();
    
    const hasIncompleteDevice = c.devices.some(d => {
      return d.serialNumber === "Sem Série" || 
             !d.brand?.trim() || 
             !d.model?.trim() ||
             d.brand.toLowerCase() === "indefinido" ||
             d.model.toLowerCase() === "indefinido";
    });

    if (is360Enabled && filterIncomplete && !hasIncompleteDevice) {
      return false;
    }

    const hasMatch = c.name.toLowerCase().includes(searchLow) || 
                     c.cpfCnpj.includes(searchLow) || 
                     c.email.toLowerCase().includes(searchLow) ||
                     c.devices.some(d => 
                       d.brand.toLowerCase().includes(searchLow) || 
                       d.model.toLowerCase().includes(searchLow) || 
                       d.serialNumber.toLowerCase().includes(searchLow)
                     );
    return hasMatch && !c.deletedAt;
  });

  return (
    <div className="space-y-6 anim-fadein">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight font-display">Clientes & Equipamentos</h2>
          <p className="text-slate-500 text-sm font-semibold">Controle de fichas cadastrais e histórico de dispositivos de entrada</p>
        </div>
        
        {(userRole === UserRole.OWNER || userRole === UserRole.ATTENDANT) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider px-4.5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover-premium active-premium flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Cadastrar Cliente</span>
          </button>
        )}
      </div>

      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative shadow-sm rounded-xl flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </div>
          <input
            type="text"
            placeholder="Filtrar por nome, CPF/CNPJ, e-mail, marca, modelo ou nº de série do equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 font-semibold transition"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shrink-0">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Limite:</label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="100">100 Clientes</option>
            <option value="250">250 Clientes</option>
            <option value="500">500 Clientes</option>
            <option value="all">Exibir Todos</option>
          </select>
        </div>
        {is360Enabled && (
          <button
            onClick={() => setFilterIncomplete(!filterIncomplete)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition duration-200 cursor-pointer ${
              filterIncomplete
                ? "bg-amber-100 border-amber-300 text-amber-800"
                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] animate-pulse">warning</span>
            <span>Apenas Pendentes de Higienização</span>
          </button>
        )}
      </div>

      {/* Grid ou Tabela de Clientes */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-semibold">Nenhum cliente ou aparelho coincide com a pesquisa no momento.</p>
        </div>
      ) : is360Enabled ? (
        /* VISÃO DATA TABLE COMPACTA (PRIORIDADE 3) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-wider font-bold">
                  <th className="p-3.5 pl-5">Código ERP</th>
                  <th className="p-3.5">Nome / Razão Social</th>
                  <th className="p-3.5">CPF / CNPJ</th>
                  <th className="p-3.5">Telefone</th>
                  <th className="p-3.5 text-center">Ativos no Parque</th>
                  <th className="p-3.5 text-right pr-5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredClients.map((client) => {
                  const hasIncomplete = client.devices.some(d => {
                    return d.serialNumber === "Sem Série" || 
                           !d.brand?.trim() || 
                           !d.model?.trim() ||
                           d.brand.toLowerCase() === "indefinido" ||
                           d.model.toLowerCase() === "indefinido";
                  });

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-slate-500 text-[10px]">
                        CLI-{client.id.substring(0, 5).toUpperCase()}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{client.name}</td>
                      <td className="p-3.5 font-mono text-[10px]">{client.cpfCnpj}</td>
                      <td className="p-3.5">{client.phone}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                          hasIncomplete 
                            ? "bg-amber-100 text-amber-800 border border-amber-200/50" 
                            : "bg-indigo-50 text-indigo-700 border border-indigo-150"
                        }`}>
                          {client.devices?.length || 0}
                          {hasIncomplete && (
                            <span className="material-symbols-outlined text-[12px] text-amber-600 animate-pulse">warning</span>
                          )}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex justify-end items-center gap-2">
                          {(userRole === UserRole.OWNER || userRole === UserRole.ATTENDANT) && (
                            <button
                              onClick={() => {
                                setActiveClientForDevice(client.id);
                                setShowDeviceModal(true);
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Vincular Novo Ativo"
                            >
                              <span className="material-symbols-outlined text-[16px]">laptop_mac</span>
                            </button>
                          )}
                          <button
                            onClick={() => openClient360(client.id)}
                            className="px-2.5 py-1 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 hover:from-slate-800 hover:to-indigo-900 transition active:scale-95 cursor-pointer shadow-xs"
                            title="Ver Visão 360º"
                          >
                            <span className="material-symbols-outlined text-[13px] text-teal-400">account_circle</span>
                            <span>Visão 360º</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            disabled={userRole !== UserRole.OWNER}
                            className={`p-1 rounded transition ${
                              userRole === UserRole.OWNER
                                ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                : "text-slate-200 cursor-not-allowed"
                            }`}
                            title={userRole !== UserRole.OWNER ? "Apenas OWNER possui privilégios de exclusão" : "Excluir logicamente"}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISÃO CARDS TRADICIONAIS (RETROCOMPATIBILIDADE) */
        <div className="grid grid-cols-1 gap-5">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-premium p-6 flex flex-col md:flex-row justify-between gap-6 hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-0.5">
              {/* Left hand side: Client details */}
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900 font-display leading-tight">{client.name}</h3>
                  <span className="text-[10px] sm:text-xs bg-slate-100/90 text-slate-700 font-mono font-bold border border-slate-200/60 px-2 py-0.5 rounded-md select-none">{client.cpfCnpj}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 font-semibold">
                  <p><span className="text-slate-400 block text-[9px] uppercase tracking-wider">Telefone</span> <span className="text-slate-800 block mt-0.5">{client.phone}</span></p>
                  <p><span className="text-slate-400 block text-[9px] uppercase tracking-wider">E-mail</span> <span className="text-slate-800 block mt-0.5">{client.email}</span></p>
                  <p className="sm:col-span-2"><span className="text-slate-400 block text-[9px] uppercase tracking-wider">Endereço de Entrega</span> <span className="text-slate-800 block mt-0.5">{client.address}</span></p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">laptop_mac</span>
                      <span>Aparelhos vinculados ({client.devices?.length || 0}):</span>
                    </span>
                    
                    {(userRole === UserRole.OWNER || userRole === UserRole.ATTENDANT) && (
                      <button
                        onClick={() => {
                          setActiveClientForDevice(client.id);
                          setShowDeviceModal(true);
                        }}
                        className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>Vincular Outro</span>
                      </button>
                    )}
                  </div>

                  {client.devices?.length === 0 ? (
                    <p className="text-xs text-amber-600 font-semibold italic">Nenhum aparelho associado à ficha cadastral.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {client.devices.map((dev) => (
                        <button 
                          key={dev.id} 
                          onClick={() => openDeviceHistory(dev)}
                          className="bg-slate-50/60 p-3 rounded-xl border border-slate-200 text-xs hover:border-indigo-400 hover:shadow-sm hover:bg-indigo-50/30 transition duration-150 text-left cursor-pointer focus:outline-none"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{dev.type} ({dev.brand})</span>
                            <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-full border ${
                              dev.serialNumber === "Sem Série" ? "bg-amber-100 text-amber-800 border-amber-250/50" : "bg-slate-200 text-slate-700 border-slate-300"
                            }`}>
                              N/S: {dev.serialNumber}
                            </span>
                          </div>
                          <p className="text-slate-650 mt-2 font-semibold"><strong className="text-slate-700">Modelo:</strong> {dev.model}</p>
                          <p className="text-slate-500 text-[11px] mt-1 italic pointer-events-none line-clamp-2" title={dev.description}>
                            {dev.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right hand side: Operations */}
              <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  onClick={() => handleDeleteClient(client.id)}
                  disabled={userRole !== UserRole.OWNER}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover-premium active-premium cursor-pointer ${
                    userRole === UserRole.OWNER
                      ? "text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                      : "text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                  }`}
                  title={userRole !== UserRole.OWNER ? "Apenas OWNER possui privilégios de exclusão" : "Excluir cadastro logicamente"}
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  <span>Excluir Ficha</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD CLIENT & LINKED DEVICES */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto anim-slideup">
            {/* Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between rounded-t-2xl sticky top-0 z-10 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">person_add</span>
                <h3 className="font-bold text-base font-display">Novo Cadastro de Cliente e Vínculo 1:N</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateClient} className="p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200/30 p-3.5 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0 mt-0.5">shield_alert</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-green-50 border border-green-200/30 p-3.5 rounded-xl text-xs text-emerald-700 font-semibold flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Proprietário / Cadastros Base</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Roberto Silva"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">CPF / CNPJ (Somente Números)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 14259388210"
                      value={clientCpfCnpj}
                      onChange={(e) => setClientCpfCnpj(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Telefone / Fone Oficina</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: (11) 98112-2233"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email Principal</label>
                    <input
                      type="email"
                      required
                      placeholder="Ex: carlos@silva.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">CEP de Busca (ViaCEP)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: 01310-100"
                        maxLength={9}
                        value={clientCep}
                        onChange={(e) => setClientCep(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={handleCepLookup}
                        disabled={isCepLoading || !clientCep}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 rounded-lg transition disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer shrink-0"
                      >
                        {isCepLoading ? "Consultando..." : "Buscar"}
                      </button>
                    </div>
                  </div>
                  <div className="hidden sm:block"></div> {/* Grid spacer */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Endereço Residencial/Comercial Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Av. Paulista, 1000 - Ap 21 - CEP 01310-100, São Paulo SP"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Devices 1:N Sub-entry */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aparelhos Iniciais a Registrar</h4>
                  <button
                    type="button"
                    onClick={addTempDeviceField}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 uppercase tracking-wider transition active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Adicionar Linha</span>
                  </button>
                </div>

                {tempDevices.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200/80">
                    <p className="text-slate-505 text-xs font-semibold">Nenhum aparelho adicionado à ficha inicial de abertura.</p>
                    <button
                      type="button"
                      onClick={addTempDeviceField}
                      className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Registrar 1º Equipamento Agora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tempDevices.map((dev, idx) => (
                      <div key={idx} className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4 relative space-y-4 hover:border-slate-300 transition duration-150">
                        <button
                          type="button"
                          onClick={() => removeTempDevice(idx)}
                          className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition active:scale-90 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                        
                        <span className="text-[9px] font-bold bg-slate-800 text-white rounded px-2.5 py-0.5 select-none font-mono uppercase tracking-wider shadow-sm">
                          Aparelho #{idx + 1}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Tipo</label>
                            <select
                              value={dev.type}
                              onChange={(e) => updateTempDevice(idx, "type", e.target.value)}
                              className="w-full px-2.5 py-1.8 border border-slate-200 rounded-lg bg-white text-xs text-slate-850"
                            >
                              <option value="Ultrassom (Fisio/Estética)">Ultrassom (Fisio/Estética)</option>
                              <option value="Radiofrequência">Radiofrequência</option>
                              <option value="Eletroestimulador / Correntes">Eletroestimulador / Correntes</option>
                              <option value="Laserterapia / LED">Laserterapia / LED</option>
                              <option value="Vapor de Ozônio">Vapor de Ozônio</option>
                              <option value="Gerador de Ozônio">Gerador de Ozônio</option>
                              <option value="Alta Frequência">Alta Frequência</option>
                              <option value="Criolipólise / Estética">Criolipólise / Estética</option>
                              <option value="Pressoterapia">Pressoterapia</option>
                              <option value="Carboxiterapia">Carboxiterapia</option>
                              <option value="Outro">Outro</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Função Extra (Opcional)"
                              value={dev.extraType || ""}
                              onChange={(e) => updateTempDevice(idx, "extraType", e.target.value)}
                              className="w-full mt-2 px-2.5 py-1.8 border border-slate-200 rounded-lg bg-white text-xs text-slate-850"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Marca</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: LG, Dell"
                              value={dev.brand}
                              onChange={(e) => updateTempDevice(idx, "brand", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Modelo</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Inspiron 14"
                              value={dev.model}
                              onChange={(e) => updateTempDevice(idx, "model", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Nº de Série</label>
                            <input
                              type="text"
                              placeholder="Deixe em branco p/ 'Sem Série'"
                              value={dev.serialNumber}
                              onChange={(e) => updateTempDevice(idx, "serialNumber", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center space-x-1.5">
                            <span>Estado Físico / Especificações</span>
                            <span className="text-slate-400 font-normal lowercase">(Exigido se sem número de série)</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Descreva marcas estéticas, riscos, avarias ou ausência de travas para garantir a integridade."
                            value={dev.description}
                            onChange={(e) => updateTempDevice(idx, "description", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-4.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-lg transition hover-premium active-premium"
                >
                  {loading ? "Gravando Fichas no Banco..." : "Salvar no Supabase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INDIVIDUAL DEVICE */}
      {showDeviceModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md anim-slideup">
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between rounded-t-2xl border-b border-slate-850">
              <div className="flex items-center space-x-2.5">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">laptop_mac</span>
                <h3 className="font-bold text-base font-display">Vincular Novo Aparelho</h3>
              </div>
              <button onClick={() => setShowDeviceModal(false)} className="text-slate-450 hover:text-white transition cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddIndividualDevice} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-2.5 rounded-lg text-xs text-red-700 font-semibold border border-red-200/20">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-2.5 rounded-lg text-xs text-emerald-700 font-semibold border border-emerald-200/20 border-emerald-900/20">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Tipo de Aparelho</label>
                <select
                  value={devType}
                  onChange={(e) => setDevType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                >
                  <option value="Ultrassom (Fisio/Estética)">Ultrassom (Fisio/Estética)</option>
                  <option value="Carboxiterapia">Carboxiterapia</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Marca</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ibramed, KLD"
                  value={devBrand}
                  onChange={(e) => setDevBrand(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Modelo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Inspiron 15"
                  value={devModel}
                  onChange={(e) => setDevModel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Número de Série (Deixar branco p/ "Sem Série")</label>
                <input
                  type="text"
                  placeholder="Deixe em branco se Sem Série"
                  value={devSerial}
                  onChange={(e) => setDevSerial(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Características Físicas / Estado (Exigido se Sem Série)
                </label>
                <textarea
                  rows={3}
                  required={devSerial.trim() === ""}
                  placeholder="Descreva marcas, riscos ou quebras estéticas fundamentais para a responsabilidade jurídica técnica da MGV."
                  value={devDesc}
                  onChange={(e) => setDevDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition hover-premium active-premium"
                >
                  {loading ? "Gravando..." : "Salvar Aparelho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISÃO 360 / TIMELINE — PRONTUÁRIO TÉCNICO COMPLETO */}
      {selectedDevice360 && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="material-symbols-outlined text-[20px] text-teal-400">medical_services</span>
                <h3 className="font-bold text-base font-display">Prontuário Técnico do Equipamento</h3>
              </div>
              <button onClick={() => { setSelectedDevice360(null); setProntuarioData(null); }} className="text-slate-400 hover:text-white transition cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-lg">{selectedDevice360.brand} {selectedDevice360.model}</h4>
                    {prontuarioData?.device?.warrantyActive ? (
                      <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">Garantia Ativa</span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">Sem Garantia</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-slate-500">
                    <span className="font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{selectedDevice360.type}</span>
                    <span className="font-mono font-semibold">Série: {selectedDevice360.serialNumber}</span>
                    {prontuarioData?.client && (
                      <span className="text-slate-600">Proprietário: <strong>{prontuarioData.client.name}</strong></span>
                    )}
                  </div>
                </div>
                {prontuarioData && (
                  <div className="flex gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs self-stretch md:self-auto justify-around text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Total OSs</span>
                      <p className="text-base font-bold text-indigo-700">{prontuarioData.stats.totalOrders}</p>
                    </div>
                    <div className="border-l border-slate-100 px-3">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Investido</span>
                      <p className="text-base font-bold text-slate-800 font-mono">R$ {prontuarioData.stats.totalSpent.toFixed(2)}</p>
                    </div>
                    {prontuarioData.stats.recurrenceAlert && (
                      <div className="border-l border-slate-100 pl-3">
                        <span className="text-[9px] text-rose-500 uppercase tracking-widest font-bold block">Recorrência</span>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-150 inline-block mt-0.5 animate-pulse">Crítico (90d)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TABS DO PRONTUÁRIO */}
              <div className="flex border-b border-slate-200 mt-6 -mb-6">
                <button
                  onClick={() => setProntuarioTab("history")}
                  className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                    prontuarioTab === "history"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Histórico & Linhas do Tempo
                </button>
                <button
                  onClick={() => setProntuarioTab("parts")}
                  className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                    prontuarioTab === "parts"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Peças & Defeitos
                </button>
                <button
                  onClick={() => setProntuarioTab("notes")}
                  className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                    prontuarioTab === "notes"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Notas de Bancada ({prontuarioData?.notes?.length || 0})
                </button>
                <button
                  onClick={() => setProntuarioTab("warranty")}
                  className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                    prontuarioTab === "warranty"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Datas & Garantias
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <span className="material-symbols-outlined text-[32px] animate-spin mb-3 text-indigo-400">autorenew</span>
                  <p className="text-sm font-semibold">Carregando prontuário técnico do ativo...</p>
                </div>
              ) : !prontuarioData ? (
                <div className="text-center py-10">
                  <p className="text-sm font-semibold text-slate-400">Nenhum dado recuperado.</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: HISTÓRICO & LINHA DO TEMPO */}
                  {prontuarioTab === "history" && (
                    <div className="space-y-6">
                      {/* Timeline visual do status da OS mais recente */}
                      {prontuarioData.orders.length > 0 && (
                        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estágio da OS Atual ({prontuarioData.orders[0].osNumber})</h5>
                            <span className="text-[10px] bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded font-mono font-bold text-indigo-700">{prontuarioData.orders[0].status}</span>
                          </div>
                          
                          {/* Timeline Fluxograma */}
                          <div className="flex items-center justify-between text-center overflow-x-auto py-2">
                            {['AGUARDANDO_AVALIACAO', 'AGUARDANDO_AUTORIZACAO', 'AGUARDANDO_PECA', 'EM_MANUTENCAO', 'PRONTO_RETIRADA', 'FINALIZADO'].map((statusOption, idx, arr) => {
                              const orderStatus = prontuarioData.orders[0].status;
                              const statusOrder = ['AGUARDANDO_AVALIACAO', 'AGUARDANDO_AUTORIZACAO', 'AGUARDANDO_PECA', 'EM_MANUTENCAO', 'PRONTO_RETIRADA', 'FINALIZADO'];
                              const currentIdx = statusOrder.indexOf(orderStatus);
                              const isCompleted = statusOrder.indexOf(statusOption) <= currentIdx;
                              const isCurrent = statusOption === orderStatus;

                              const labelsMap: Record<string, string> = {
                                AGUARDANDO_AVALIACAO: 'Avaliação',
                                AGUARDANDO_AUTORIZACAO: 'Orçamento',
                                AGUARDANDO_PECA: 'Peças',
                                EM_MANUTENCAO: 'Execução',
                                PRONTO_RETIRADA: 'Teste/Pronto',
                                FINALIZADO: 'Entregue'
                              };

                              return (
                                <React.Fragment key={statusOption}>
                                  <div className="flex flex-col items-center min-w-[70px]">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                                      isCurrent ? 'bg-indigo-650 text-white border-indigo-650 scale-110 shadow' :
                                      isCompleted ? 'bg-emerald-500 text-white border-emerald-500' :
                                      'bg-slate-100 text-slate-400 border-slate-200'
                                    }`}>
                                      {isCompleted && !isCurrent ? (
                                        <span className="material-symbols-outlined text-[14px]">check</span>
                                      ) : (
                                        idx + 1
                                      )}
                                    </div>
                                    <span className={`text-[9px] font-bold mt-1.5 ${
                                      isCurrent ? 'text-indigo-600 font-extrabold' :
                                      isCompleted ? 'text-slate-700' : 'text-slate-400'
                                    }`}>{labelsMap[statusOption]}</span>
                                  </div>
                                  {idx < arr.length - 1 && (
                                    <div className={`flex-1 h-0.5 min-w-[20px] ${
                                      statusOrder.indexOf(arr[idx + 1]) <= currentIdx
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-200'
                                    }`} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Histórico Cronológico de Ordens de Serviço */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico Completo de Ordens de Serviço</h5>
                        {prontuarioData.orders.length === 0 ? (
                          <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl">
                            <span className="material-symbols-outlined text-[32px] text-slate-300 mb-2">assignment</span>
                            <p className="text-slate-500 font-semibold text-sm">Nenhuma OS anterior vinculada.</p>
                          </div>
                        ) : (
                          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-2">
                            {prontuarioData.orders.map((os: any) => {
                              const getStatusDisplayAndColor = () => {
                                if (os.status === 'FINALIZADO') {
                                  if (os.closingReason === 'ORCAMENTO_RECUSADO') {
                                    return { label: 'Sem Reparo (Recusado)', color: 'text-amber-700 bg-amber-50 border-amber-250', dotColor: 'border-amber-500' };
                                  }
                                  if (os.closingReason === 'DESCARTE_CLIENTE_RETIRA') {
                                    return { label: 'Descarte (Cliente Retira)', color: 'text-slate-700 bg-slate-50 border-slate-250', dotColor: 'border-slate-400' };
                                  }
                                  if (os.closingReason === 'DESCARTE_OFICINA') {
                                    return { label: 'Descarte (Oficina)', color: 'text-rose-700 bg-rose-50 border-rose-250', dotColor: 'border-rose-500' };
                                  }
                                  return { label: 'Finalizado', color: 'text-emerald-700 bg-emerald-50 border-emerald-250', dotColor: 'border-emerald-500' };
                                }
                                if (os.status === 'AGUARDANDO_AVALIACAO' || os.status === 'AGUARDANDO_AUTORIZACAO') {
                                  return { label: os.status.replace("_", " "), color: 'text-amber-700 bg-amber-50 border-amber-250', dotColor: 'border-amber-500' };
                                }
                                if (os.status === 'EM_MANUTENCAO') {
                                  return { label: os.status.replace("_", " "), color: 'text-blue-700 bg-blue-50 border-blue-250', dotColor: 'border-indigo-500' };
                                }
                                return { label: os.status.replace("_", " "), color: 'text-indigo-700 bg-indigo-50 border-indigo-250', dotColor: 'border-indigo-500' };
                              };
                              const { label: displayLabel, color: statusColor, dotColor } = getStatusDisplayAndColor();
                                
                              return (
                                <div key={os.id} className="relative pl-6">
                                  <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border bg-white ${dotColor}`} />
                                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:shadow-sm transition">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mr-2">{os.osNumber}</span>
                                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{displayLabel}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(os.createdAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    
                                    <div className="mt-3 space-y-2 text-xs">
                                      <p><strong className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">Defeito Relatado:</strong> <span className="text-slate-800 italic">"{os.reportedDefect}"</span></p>
                                      {os.diagnostic && (
                                        <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg mt-2 text-slate-700">
                                          <strong className="text-indigo-600 text-[10px] uppercase tracking-wider block mb-1">Diagnóstico / Laudo Técnico:</strong>
                                          <p>{os.diagnostic}</p>
                                        </div>
                                      )}
                                      
                                      {os.usedParts && os.usedParts.length > 0 && (
                                        <div className="mt-2.5">
                                          <strong className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1">Peças Aplicadas:</strong>
                                          <div className="flex flex-wrap gap-1.5">
                                            {os.usedParts.map((part: any, pIdx: number) => (
                                              <span key={pIdx} className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-650">
                                                {part.name} (x{part.quantity})
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="text-right mt-3 border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                        <span>Diagnóstico: {os.diagnostic ? "Preenchido" : "Pendente"}</span>
                                        <span>Total: <span className="font-mono text-slate-800 font-bold normal-case text-xs">R$ {os.totalCost?.toFixed(2) || '0.00'}</span></span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PEÇAS & DEFEITOS */}
                  {prontuarioTab === "parts" && (
                    <div className="space-y-6">
                      {/* Histórico acumulado de peças */}
                      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Histórico de Peças Instaladas</h5>
                        {prontuarioData.partsHistory.length === 0 ? (
                          <p className="text-xs text-slate-450 italic py-4 text-center">Nenhuma peça foi aplicada neste equipamento ainda.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-slate-450 uppercase text-[9px] tracking-wider border-b border-slate-100">
                                  <th className="py-2">Peça</th>
                                  <th className="py-2 text-center">Quantidade</th>
                                  <th className="py-2">Aplicada na OS</th>
                                  <th className="py-2 text-right">Data</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {prontuarioData.partsHistory.map((item: any, idx: number) => (
                                  <tr key={idx} className="text-slate-700 hover:bg-slate-50/50">
                                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                                    <td className="py-2.5 text-center font-bold text-indigo-700">{item.quantity}</td>
                                    <td className="py-2.5 font-mono">{item.osNumber}</td>
                                    <td className="py-2.5 text-right text-slate-400">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Histórico acumulado de defeitos */}
                      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Histórico de Sintomas & Soluções</h5>
                        {prontuarioData.defectsHistory.length === 0 ? (
                          <p className="text-xs text-slate-450 italic py-4 text-center">Nenhum sintoma registrado.</p>
                        ) : (
                          <div className="space-y-3">
                            {prontuarioData.defectsHistory.map((item: any, idx: number) => (
                              <div key={idx} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono font-bold text-[10px] bg-slate-100 border px-1.5 py-0.5 rounded text-slate-600">{item.osNumber}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <p className="text-slate-800 mb-1"><strong>Sintoma:</strong> "{item.defect}"</p>
                                {item.diagnostic && (
                                  <p className="text-indigo-650 bg-indigo-50/40 p-2 rounded border border-indigo-100/50"><strong>Solução/Laudo:</strong> {item.diagnostic}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: NOTAS DE BANCADA */}
                  {prontuarioTab === "notes" && (
                    <div className="space-y-6">
                      {/* Editor de Notas */}
                      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nova Observação / Laudo Livre</h5>
                        <div className="space-y-2.5">
                          <textarea
                            rows={3}
                            placeholder="Adicione observações técnicas de longa duração para este equipamento (ex: problemas crônicos na placa, resistências antigas, avisos importantes de manuseio)..."
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleAddNote(selectedDevice360.id)}
                              disabled={isSavingNote || !newNoteContent.trim()}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              {isSavingNote ? "Gravando..." : "Salvar Nota"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Notas */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notas Registradas</h5>
                        {prontuarioData.notes?.length === 0 ? (
                          <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-xl text-slate-450 italic text-xs">
                            Nenhuma nota técnica registrada para este equipamento.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {prontuarioData.notes.map((note: any) => (
                              <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-slate-100 pb-1.5">
                                  <span>Por: <strong className="text-slate-650">{note.createdBy}</strong></span>
                                  <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')} às {new Date(note.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-slate-750 font-medium whitespace-pre-wrap">{note.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: DATAS & GARANTIAS */}
                  {prontuarioTab === "warranty" && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Controle de Vida Útil do Equipamento</h5>
                      
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const exp = formData.get("warrantyExpiresAt") as string;
                        const maint = formData.get("lastMaintenanceAt") as string;
                        handleUpdateWarranty(selectedDevice360.id, exp, maint);
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Expiração da Garantia</label>
                            <input
                              type="date"
                              name="warrantyExpiresAt"
                              defaultValue={prontuarioData.device.warrantyExpiresAt ? new Date(prontuarioData.device.warrantyExpiresAt).toISOString().split('T')[0] : ""}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Última Manutenção Preventiva</label>
                            <input
                              type="date"
                              name="lastMaintenanceAt"
                              defaultValue={prontuarioData.device.lastMaintenanceAt ? new Date(prontuarioData.device.lastMaintenanceAt).toISOString().split('T')[0] : ""}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs text-slate-650 space-y-2">
                          <p>💡 <strong>Dica de Conformidade:</strong></p>
                          <p>Defina a data de expiração da garantia para emitir alertas automáticos no painel do Kanban quando o cliente reabrir uma OS dentro do prazo. Manutenções preventivas ajudam no histórico de durabilidade do ativo.</p>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition"
                          >
                            Salvar Datas
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL: VISÃO 360 DO CLIENTE (Sprint 3) */}
      {is360Enabled && activeClient360Id && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-end z-[80] transition-opacity duration-300">
          <div className="absolute inset-0" onClick={() => { setActiveClient360Id(null); setClient360Data(null); }} />

          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col anim-slideright border-l border-slate-200">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-display flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">account_circle</span>
                  <span>Visão 360º do Cliente</span>
                </h3>
                {client360Data && (
                  <p className="text-[10px] text-slate-350 font-bold uppercase tracking-wider mt-1">
                    {client360Data.client.name} — CPF/CNPJ: {client360Data.client.cpfCnpj}
                  </p>
                )}
              </div>
              <button 
                onClick={() => { setActiveClient360Id(null); setClient360Data(null); }} 
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              {is360Loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <span className="material-symbols-outlined text-[32px] animate-spin mb-3 text-indigo-500">autorenew</span>
                  <p className="text-xs font-semibold">Carregando dados unificados do cliente...</p>
                </div>
              ) : !client360Data ? (
                <div className="text-center py-10">
                  <p className="text-xs text-red-650 font-semibold">Falha ao recuperar informações cadastrais.</p>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Detalhes Cadastrais</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Telefone</span>
                        <span className="text-slate-800 font-bold">{client360Data.client.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">E-mail</span>
                        <span className="text-slate-800 font-bold">{client360Data.client.email}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Endereço</span>
                        <span className="text-slate-800 font-bold">{client360Data.client.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex border-b border-slate-200">
                      <button
                        onClick={() => setVisao360Tab("devices")}
                        className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                          visao360Tab === "devices"
                            ? "border-blue-650 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Parque Instalado ({client360Data.devices?.length || 0})
                      </button>
                      <button
                        onClick={() => setVisao360Tab("history")}
                        className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                          visao360Tab === "history"
                            ? "border-blue-650 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Histórico de Manutenções ({client360Data.orders?.length || 0})
                      </button>
                    </div>

                    {visao360Tab === "devices" && (
                      <div className="space-y-3">
                        {client360Data.devices?.length === 0 ? (
                          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold italic">Nenhum equipamento vinculado à base instalada.</p>
                          </div>
                        ) : (
                          client360Data.devices.map((dev: any) => {
                            const isIncomplete = dev.serialNumber === "Sem Série" || !dev.brand?.trim() || !dev.model?.trim() || dev.brand.toLowerCase() === "indefinido" || dev.model.toLowerCase() === "indefinido";
                            
                            return (
                              <div 
                                key={dev.id}
                                className={`bg-white p-4.5 rounded-xl border shadow-sm transition hover:shadow-md ${
                                  isIncomplete ? "border-amber-200 bg-amber-50/20" : "border-slate-200"
                                }`}
                              >
                                <div className="flex justify-between items-start font-semibold text-slate-700">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-slate-900 text-sm">{dev.brand} {dev.model}</span>
                                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full uppercase">
                                        {dev.type}
                                      </span>
                                    </div>
                                    <div className="text-slate-500 text-xs mt-1.5 font-mono">
                                      N/S: <span className={dev.serialNumber === "Sem Série" ? "text-amber-700 font-bold" : "text-slate-800 font-bold"}>{dev.serialNumber}</span>
                                    </div>
                                    <p className="text-slate-500 text-[11px] mt-2 italic font-semibold leading-relaxed">{dev.description}</p>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-2">
                                    {isIncomplete && (
                                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center space-x-1 animate-pulse">
                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                        <span>Pendência</span>
                                      </span>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEditDeviceId(dev.id);
                                        const splitIdx = dev.type.indexOf(" / ");
                                        if (splitIdx > -1) {
                                          setEditDevType(dev.type.substring(0, splitIdx));
                                          setEditDevExtraType(dev.type.substring(splitIdx + 3));
                                        } else {
                                          setEditDevType(dev.type);
                                          setEditDevExtraType("");
                                        }
                                        setEditDevBrand(dev.brand === "Indefinido" ? "" : dev.brand);
                                        setEditDevModel(dev.model === "Indefinido" ? "" : dev.model);
                                        setEditDevSerial(dev.serialNumber === "Sem Série" ? "" : dev.serialNumber);
                                        setEditDevDesc(dev.description === "Sem observações." ? "" : dev.description);
                                        setEditErrorMsg("");
                                        setEditSuccessMsg("");
                                        setShowEditDeviceModal(true);
                                      }}
                                      className="text-[10px] font-extrabold text-blue-650 hover:text-blue-755 uppercase tracking-wider flex items-center space-x-1 transition active:scale-95 cursor-pointer mt-1"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">edit_note</span>
                                      <span>Ajustar Ativo</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {visao360Tab === "history" && (
                      <div className="space-y-4">
                        {client360Data.orders?.length === 0 ? (
                          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold italic">Nenhuma ordem de serviço cadastrada no histórico.</p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {client360Data.orders.map((os: any) => {
                              const statusColor = 
                                os.status === 'FINALIZADO' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                (os.status === 'AGUARDANDO_AVALIACAO' || os.status === 'AGUARDANDO_AUTORIZACAO') ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                os.status === 'EM_MANUTENCAO' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                'text-indigo-700 bg-indigo-50 border-indigo-200';

                              return (
                                <div key={os.id} className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                        {os.osNumber}
                                      </span>
                                      <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                        {os.status.replace("_", " ")}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-450 font-bold">
                                      {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>

                                  <div className="text-xs space-y-2 text-slate-650 font-semibold">
                                    <p>
                                      <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Equipamento</span>
                                      <span className="text-slate-800 font-bold">{os.device ? `${os.device.brand} ${os.device.model} (S/N: ${os.device.serialNumber})` : "Não informado"}</span>
                                    </p>
                                    <p>
                                      <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Defeito Relatado</span>
                                      <span className="text-slate-800 italic">"{os.reportedDefect}"</span>
                                    </p>
                                    {os.diagnostic && (
                                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                                        <span className="text-indigo-650 text-[9px] uppercase tracking-wider font-extrabold block mb-1">Diagnóstico / Laudo</span>
                                        <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">{os.diagnostic}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-2">
                                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Faturamento</div>
                                    <div className="font-mono font-extrabold text-slate-800">
                                      R$ {os.totalCost?.toFixed(2) || '0.00'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {client360Data && (
              <div className="bg-slate-900 text-white p-5 border-t border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450">Faturamento Total Realizado</span>
                <span className="font-mono font-extrabold text-lg text-teal-400">
                  R$ {client360Data.totalSpent?.toFixed(2) || '0.00'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR ATIVO DA BASE INSTALADA (Sprint 3) */}
      {is360Enabled && showEditDeviceModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[90] overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md anim-slideup">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between rounded-t-2xl border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">edit_note</span>
                <h3 className="font-bold text-sm font-display">Ajustar Ficha do Ativo</h3>
              </div>
              <button onClick={() => setShowEditDeviceModal(false)} className="text-slate-400 hover:text-white transition cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditDevice} className="p-5 space-y-4">
              {editErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                  {editErrorMsg}
                </div>
              )}
              {editSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">
                  {editSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Tipo Primário</label>
                  <select
                    value={editDevType}
                    onChange={(e) => setEditDevType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Ultrassom (Fisio/Estética)">Ultrassom (Fisio/Estética)</option>
                    <option value="Radiofrequência">Radiofrequência</option>
                    <option value="Eletroestimulador / Correntes">Eletroestimulador / Correntes</option>
                    <option value="Laserterapia / LED">Laserterapia / LED</option>
                    <option value="Vapor de Ozônio">Vapor de Ozônio</option>
                    <option value="Gerador de Ozônio">Gerador de Ozônio</option>
                    <option value="Alta Frequência">Alta Frequência</option>
                    <option value="Criolipólise / Estética">Criolipólise / Estética</option>
                    <option value="Pressoterapia">Pressoterapia</option>
                    <option value="Carboxiterapia">Carboxiterapia</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Função Extra (Opcional)"
                    value={editDevExtraType}
                    onChange={(e) => setEditDevExtraType(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Marca / Fabricante</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ibramed, KLD"
                    value={editDevBrand}
                    onChange={(e) => setEditDevBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Modelo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Latitude 3420, ThinkPad E14"
                  value={editDevModel}
                  onChange={(e) => setEditDevModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Número de Série (N/S)</label>
                <input
                  type="text"
                  placeholder="Digite o número de série real ou deixe em branco se não houver"
                  value={editDevSerial}
                  onChange={(e) => setEditDevSerial(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">
                  Descrição Física / Marcas Estéticas
                </label>
                <textarea
                  rows={3}
                  required={!editDevSerial.trim()}
                  placeholder="Se o ativo não possuir número de série, descreva características estéticas detalhadas (ex: risco na tampa, adesivos, cantos amassados)."
                  value={editDevDesc}
                  onChange={(e) => setEditDevDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditDeviceModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition hover-premium active-premium cursor-pointer"
                >
                  {editLoading ? "Gravando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
