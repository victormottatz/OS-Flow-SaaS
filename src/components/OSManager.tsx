import React, { useState, useEffect, useRef } from "react";
import { UserRole, Client, Device, OrdemServico, ChecklistItem, EntradaFoto } from "../types";

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "tela", label: "Tela / Display", status: "NA", observacao: "" },
  { id: "teclado", label: "Touchscreen / Teclado", status: "NA", observacao: "" },
  { id: "camera", label: "Câmera(s)", status: "NA", observacao: "" },
  { id: "botoes", label: "Botões físicos (ligar, volume)", status: "NA", observacao: "" },
  { id: "porta_carga", label: "Porta de carregamento", status: "NA", observacao: "" },
  { id: "carcaca", label: "Carcaça / Tampa traseira", status: "NA", observacao: "" },
  { id: "bateria", label: "Bateria / Nível de carga", status: "NA", observacao: "" },
  { id: "carregador", label: "Adaptador / Carregador entregue", status: "NA", observacao: "" },
  { id: "umidade", label: "Alta umidade / Corrosão", status: "NA", observacao: "" },
  { id: "queda", label: "Sinais de queda ou impacto", status: "NA", observacao: "" },
  { id: "temperatura", label: "Temperatura anormal", status: "NA", observacao: "" },
  { id: "acessorios_extra", label: "Acessórios entregues junto", status: "NA", observacao: "" },
  { id: "garantia", label: "Selo de garantia intacto", status: "NA", observacao: "" }
];

const removeAccents = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  
  // Normalizar para encontrar as correspondências mesmo com acentos
  const normalizedText = removeAccents(text);
  const normalizedHighlight = removeAccents(highlight);
  
  const index = normalizedText.indexOf(normalizedHighlight);
  if (index === -1) return <span>{text}</span>;
  
  const before = text.substring(0, index);
  const match = text.substring(index, index + highlight.length);
  const after = text.substring(index + highlight.length);
  
  return (
    <span>
      {before}
      <mark className="bg-amber-100 text-amber-950 px-0.5 rounded font-semibold">{match}</mark>
      {after}
    </span>
  );
};

const EQUIPMENT_PRESETS: Record<string, { brands: string[]; models: string[] }> = {
  "Ultrassom (Fisio/Estética)": {
    brands: ["IBRAMED", "KLD", "CEC BRA", "HTM"],
    models: ["Sonopulse III", "Sonopulse Compact", "Heccus Turbo", "Manthus", "Cavicell"]
  },
  "Radiofrequência": {
    brands: ["IBRAMED", "TONEDERM", "HTM", "MEDICAL SAN", "ENDYMED", "BTL"],
    models: ["Hooke", "Spectra G3", "Tecare", "Ethernia Cold", "Vanquish"]
  },
  "Eletroestimulador / Correntes": {
    brands: ["IBRAMED", "HTM", "CARCI", "KLD"],
    models: ["Neurodyn Compact", "Tensmed I", "TENS-FES HTM Clínico", "Dual Soon"]
  },
  "Laserterapia / LED": {
    brands: ["KLD", "IBRAMED", "HTM"],
    models: ["Hygialux", "Antares", "Endophoton"]
  },
  "Vapor de Ozônio": {
    brands: ["IBRAMED", "HTM"],
    models: ["Dermosteam", "Beautysteam"]
  },
  "Alta Frequência": {
    brands: ["HTM", "IBRAMED", "KLD"],
    models: ["Beauty Face", "HF", "Beauty Steam"]
  },
  "Criolipólise / Estética": {
    brands: ["IBRAMED", "MEDICAL SAN", "CEC BRA", "SKINTEC"],
    models: ["Criolipólise", "Hibrid", "CM Slim", "Emtone"]
  },
  "Pressoterapia": {
    brands: ["BTL"],
    models: ["Lymphastim"]
  },
  "Carboxiterapia": {
    brands: ["TONEDERM", "KLD"],
    models: ["Carboxiderm 1C"]
  }
};

interface OSManagerProps {
  clients: (Client & { devices: Device[] })[];
  ordensServico: OrdemServico[];
  isOffline: boolean;
  userRole: UserRole;
  onRefresh: () => void;
  onOSCreated?: () => void;
}

export default function OSManager({ clients, ordensServico, isOffline, userRole, onRefresh, onOSCreated }: OSManagerProps) {
  // Wizard steps
  const [activeStep, setActiveStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeStep === 1 && clientSearchInputRef.current) {
      setTimeout(() => {
        clientSearchInputRef.current?.focus();
      }, 100);
    }
  }, [activeStep]);

  // New Device / Avulso fields
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [devType, setDevType] = useState("Ultrassom (Fisio/Estética)");
  const [devExtraType, setDevExtraType] = useState("");
  const [devBrand, setDevBrand] = useState("");
  const [devModel, setDevModel] = useState("");
  const [devSerial, setDevSerial] = useState("");
  const [devDesc, setDevDesc] = useState("");
  
  // OS fields
  const [reportedDefect, setReportedDefect] = useState("");
  const [accessoriesLeft, setAccessoriesLeft] = useState("");
  const [physicalState, setPhysicalState] = useState("");

  // Checklist & Photos fields
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [photos, setPhotos] = useState<EntradaFoto[]>([]);

  // Control
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdOS, setCreatedOS] = useState<OrdemServico | null>(null);

  // Selected client & device helpers
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const availableDevices = (selectedClient?.devices || []).filter(d => !d.deletedAt);
  const selectedDevice = availableDevices.find(d => d.id === selectedDeviceId);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 6) {
      alert("Limite de 6 fotos por Ordem de Serviço atingido.");
      return;
    }

    (Array.from(files) as File[]).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const targetWidth = 800;
          const targetHeight = Math.round((img.height * targetWidth) / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setPhotos((prev) => [
              ...prev,
              {
                id: `foto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                dataUrl,
                legenda: "",
                capturedAt: new Date().toISOString()
              }
            ]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (isOffline) {
      setErrorMsg("Falha ao abrir OS: O sistema está offline.");
      return;
    }

    if (!selectedClientId || (!selectedDeviceId && !isCreatingDevice) || !reportedDefect) {
      setErrorMsg("O preenchimento de Cliente, Aparelho e Defeito Relatado é estritamente obrigatório.");
      return;
    }

    setLoading(true);

    try {
      let finalDeviceId = selectedDeviceId;

      // Se for aparelho avulso, cadastra primeiro
      if (isCreatingDevice) {
        if (!devType || !devBrand || !devModel) {
          throw new Error("Preencha Tipo, Marca e Modelo do novo aparelho.");
        }
        const token = localStorage.getItem("mgv_token") || "";
        const devRes = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            clientId: selectedClientId,
            type: devExtraType.trim() ? `${devType} / ${devExtraType.trim()}` : devType,
            brand: devBrand,
            model: devModel,
            serialNumber: devSerial,
            description: devDesc
          })
        });
        
        if (!devRes.ok) {
          const err = await devRes.json();
          throw new Error(err.error || "Erro ao cadastrar novo aparelho avulso.");
        }
        
        const newDev = await devRes.json();
        finalDeviceId = newDev.id;
      }

      const response = await fetch("/api/ordens-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          deviceId: finalDeviceId,
          reportedDefect,
          accessoriesLeft,
          physicalState,
          checklistEntrada: checklist,
          laudoFotos: photos
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
      setIsCreatingDevice(false);
      setDevBrand("");
      setDevModel("");
      setDevSerial("");
      setDevDesc("");
      setReportedDefect("");
      setAccessoriesLeft("");
      setPhysicalState("");
      setChecklist(DEFAULT_CHECKLIST);
      setPhotos([]);
      setActiveStep(1);

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
        <div className="glassmorphism rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between flex-wrap gap-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              activeStep > 1 ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white animate-pulse"
            }`}>
              {activeStep > 1 ? <span className="material-symbols-outlined text-[16px]">check</span> : "1"}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 1</p>
              <p className="text-xs font-bold text-slate-800">Cliente</p>
            </div>
          </div>
          
          <div className="h-0.5 flex-1 mx-4 bg-slate-200 min-w-[20px]" />
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              activeStep > 2
                ? "bg-emerald-500 text-white" 
                : activeStep === 2 
                  ? "bg-indigo-600 text-white animate-pulse" 
                  : "bg-slate-200 text-slate-500"
            }`}>
              {activeStep > 2 ? <span className="material-symbols-outlined text-[16px]">check</span> : "2"}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 2</p>
              <p className="text-xs font-bold text-slate-850">Equipamento</p>
            </div>
          </div>
          
          <div className="h-0.5 flex-1 mx-4 bg-slate-200 min-w-[20px]" />
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              activeStep > 3 
                ? "bg-emerald-500 text-white" 
                : activeStep === 3 
                  ? "bg-indigo-600 text-white animate-pulse" 
                  : "bg-slate-200 text-slate-500"
            }`}>
              {activeStep > 3 ? <span className="material-symbols-outlined text-[16px]">check</span> : "3"}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 3</p>
              <p className="text-xs font-bold text-slate-850">Sintomas</p>
            </div>
          </div>

          <div className="h-0.5 flex-1 mx-4 bg-slate-200 min-w-[20px]" />
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
              activeStep === 4 
                ? "bg-indigo-600 text-white animate-pulse" 
                : "bg-slate-200 text-slate-500"
            }`}>
              4
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Passo 4</p>
              <p className="text-xs font-bold text-slate-850">Laudo & Fotos</p>
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
                <button
                  onClick={() => {
                    setCreatedOS(null);
                    setClientSearch("");
                    if (onOSCreated) onOSCreated();
                  }}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition hover-premium active-premium cursor-pointer"
                >
                  Concluir e Ver Listagem
                </button>
              </div>
            </div>
          </div>

          {/* Printable visual client voucher */}
          <div id="printable-termo" className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium text-slate-900 max-w-3xl mx-auto print:border-none print:shadow-none font-sans relative overflow-hidden">
            {/* Watermark/Accent lines */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary-container" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
              <div>
                <img 
                  src="/logos/LOGO V3.0 (2).png" 
                  alt="MGV Tecnologia" 
                  className="h-10 w-auto object-contain mb-3"
                />
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider font-semibold">MGV TECNOLOGIA E ASSISTÊNCIA TÉCNICA LTDA</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">CNPJ: 18.291.554/0001-90 | IE: 109.283.412.110</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Av. Tiradentes, 850, Ribeirão Preto - SP | Tel: (11) 3218-9900</p>
              </div>
              <div className="flex flex-col items-end text-right w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase text-slate-950 bg-secondary-container/10 border border-secondary-container/30 px-3 py-1 rounded-full font-mono">
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

              {createdOS.checklistEntrada && createdOS.checklistEntrada.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2 flex items-center">
                    <span className="material-symbols-outlined text-[16px] mr-1.5 text-indigo-650">fact_check</span>
                    Checklist de Entrada do Equipamento
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                    {createdOS.checklistEntrada.map((item) => (
                      <div key={item.id} className="text-[10px] border-b border-slate-100 pb-1 last:border-0 flex flex-col justify-center">
                        <span className="font-semibold text-slate-700 block truncate">{item.label}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                            item.status === "OK" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : item.status === "AVARIA" 
                                ? "bg-rose-50 text-rose-700 border border-rose-100 font-extrabold" 
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {item.status === "OK" ? "OK" : item.status === "AVARIA" ? "AVARIA" : "N/A"}
                          </span>
                          {item.observacao && <span className="text-[9px] text-slate-550 italic truncate max-w-[90px]" title={item.observacao}>({item.observacao})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            {activeStep === 1 && (() => {
              const termClean = removeAccents(clientSearch);
              const termDigits = clientSearch.replace(/\D/g, "");

              const filtered = clients.filter(c => {
                if (c.deletedAt) return false;
                
                const nameClean = removeAccents(c.name);
                const docDigits = c.cpfCnpj.replace(/\D/g, "");
                const phoneDigits = c.phone.replace(/\D/g, "");

                return (
                  nameClean.includes(termClean) ||
                  (termDigits && docDigits.includes(termDigits)) ||
                  (termDigits && phoneDigits.includes(termDigits))
                );
              });

              return (
                <div className="space-y-4 anim-slideup">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-50 pb-2">
                    <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">1</span>
                    <span>Vincular Proprietário (Cliente)</span>
                  </h3>
                  
                  <div className="relative">
                    <span className="material-symbols-outlined text-[20px] absolute left-3.5 top-3.5 text-slate-400">search</span>
                    <input
                      ref={clientSearchInputRef}
                      type="text"
                      placeholder="Pesquisar cliente por nome, CPF/CNPJ ou telefone..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filtered.length === 1) {
                            const singleClient = filtered[0];
                            setSelectedClientId(singleClient.id);
                            setSelectedDeviceId("");
                            setIsCreatingDevice(false);
                            setActiveStep(2);
                          }
                        }
                      }}
                      className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition duration-150 font-medium text-slate-800"
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={() => setClientSearch("")}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Limpar busca"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setSelectedDeviceId("");
                          setIsCreatingDevice(false);
                          setActiveStep(2);
                        }}
                        className="text-left p-4 bg-white border border-slate-200 hover:border-indigo-600 rounded-xl transition duration-150 hover:shadow-premium hover-premium active-premium flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm tracking-tight">
                            <HighlightText text={c.name} highlight={clientSearch} />
                          </h4>
                          <div className="text-[11px] text-slate-500 mt-2 flex flex-wrap gap-2 items-center font-mono">
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                              <HighlightText text={c.cpfCnpj} highlight={clientSearch} />
                            </span>
                            <span>
                              <HighlightText text={c.phone} highlight={clientSearch} />
                            </span>
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
                </div>
              );
            })()}

            {/* STEP 2: DEVICE SELECTION */}
            {activeStep === 2 && !isCreatingDevice && (
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
                      setIsCreatingDevice(false);
                      setActiveStep(1);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition hover-premium active-premium cursor-pointer"
                  >
                    Alterar Cliente
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">2</span>
                    <span>Escolha o Aparelho Deixado</span>
                  </h3>
                  <button type="button" onClick={() => setIsCreatingDevice(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer">
                    <span className="material-symbols-outlined text-[16px]">add_circle</span> Adicionar Avulso
                  </button>
                </div>

                {availableDevices.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 flex items-start space-x-3">
                    <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">shield_alert</span>
                    <div>
                      <p className="font-semibold text-amber-950">Este cliente não possui equipamentos cadastrados</p>
                      <p className="text-xs mt-1 leading-relaxed text-amber-850">
                        Por favor, adicione pelo menos um equipamento na ficha do cliente no menu de <strong>Clientes & Aparelhos</strong> ou adicione um aparelho <strong>avulso</strong> para prosseguir.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableDevices.map((d) => {
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId(d.id);
                            setIsCreatingDevice(false);
                            setActiveStep(3);
                          }}
                          className="text-left p-4 bg-white border border-slate-200 hover:border-indigo-600 rounded-xl transition duration-150 hover:shadow-premium hover-premium active-premium flex items-start space-x-3.5 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <span className="material-symbols-outlined text-[20px]">medical_services</span>
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

                <div className="pt-4 border-t border-slate-100 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {/* CREATE NEW DEVICE FORM */}
            {activeStep === 2 && isCreatingDevice && (
              <div className="space-y-4 anim-slideup">
                <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">2</span>
                    <span>Cadastrar Aparelho Avulso</span>
                  </h3>
                  <button type="button" onClick={() => setIsCreatingDevice(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center">
                    <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Voltar para Lista
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Tipo Primário</label>
                      <select value={devType} onChange={(e) => setDevType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
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
                      <input type="text" placeholder="Função Extra (Ex: + Gerador...)" value={devExtraType} onChange={(e) => setDevExtraType(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Marca</label>
                      <input type="text" placeholder="Ex: IBRAMED" value={devBrand} onChange={(e) => setDevBrand(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white font-semibold" />
                      {EQUIPMENT_PRESETS[devType]?.brands && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5 select-none">
                          {EQUIPMENT_PRESETS[devType].brands.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setDevBrand(b)}
                              className="text-[9px] bg-white hover:bg-indigo-50 hover:text-indigo-650 border border-slate-200 hover:border-indigo-300 text-slate-600 px-2.5 py-0.8 rounded-md transition cursor-pointer font-bold uppercase shadow-sm"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Modelo</label>
                      <input type="text" placeholder="Ex: Sonopulse III" value={devModel} onChange={(e) => setDevModel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white font-semibold" />
                      {EQUIPMENT_PRESETS[devType]?.models && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5 select-none">
                          {EQUIPMENT_PRESETS[devType].models.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setDevModel(m)}
                              className="text-[9px] bg-white hover:bg-indigo-50 hover:text-indigo-650 border border-slate-200 hover:border-indigo-300 text-slate-600 px-2.5 py-0.8 rounded-md transition cursor-pointer font-bold shadow-sm"
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nº de Série</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Deixe em branco se não houver" value={devSerial} onChange={(e) => setDevSerial(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white font-mono" />
                        <button
                          type="button"
                          onClick={() => setDevSerial("Sem Série")}
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer shrink-0 font-bold shadow-sm"
                        >
                          Sem Série
                        </button>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Características Físicas / Estética</label>
                      <input type="text" placeholder="Ex: Riscos na tampa, sem carregador" value={devDesc} onChange={(e) => setDevDesc(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white" />
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingDevice(false);
                    }}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Voltar para Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!devType || !devBrand || !devModel) {
                        alert("Preencha Tipo, Marca e Modelo do novo aparelho.");
                        return;
                      }
                      setActiveStep(3);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
                  >
                    Avançar para Sintomas
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: OS DETAILS (SYMPTOMS) */}
            {activeStep === 3 && (
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
                            setIsCreatingDevice(false);
                            setActiveStep(1);
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
                        <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Equipamento {isCreatingDevice ? "(Novo)" : ""}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId("");
                            setIsCreatingDevice(false);
                            setActiveStep(2);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit</span>
                          <span>Alterar</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mt-1.5 truncate">{isCreatingDevice ? `${devBrand} ${devModel}` : `${selectedDevice?.brand} ${selectedDevice?.model}`}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">S/N: {isCreatingDevice ? (devSerial || "N/D") : selectedDevice?.serialNumber}</p>
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

                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!reportedDefect.trim()) {
                        alert("O Defeito Relatado é obrigatório.");
                        return;
                      }
                      setActiveStep(4);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-sm font-semibold"
                  >
                    Avançar para Checklist e Fotos
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CHECKLIST & PHOTOS */}
            {activeStep === 4 && (
              <div className="space-y-6 anim-slideup">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-50 pb-2">
                  <span className="bg-indigo-600 text-white rounded-xl w-6 h-6 text-xs flex items-center justify-center font-mono font-bold shrink-0">4</span>
                  <span>Checklist & Laudo Fotográfico</span>
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Checklist Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600">fact_check</span>
                      <span>Checklist de Entrada</span>
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {checklist.map((item, idx) => (
                        <div key={item.id} className="flex flex-col border-b border-slate-200/50 pb-2.5 last:border-0 last:pb-0 gap-2">
                          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
                              {(["OK", "AVARIA", "NA"] as const).map((status) => {
                                let activeClass = "";
                                if (item.status === status) {
                                  if (status === "OK") activeClass = "bg-emerald-500 text-white shadow-sm font-bold";
                                  else if (status === "AVARIA") activeClass = "bg-rose-500 text-white shadow-sm font-bold";
                                  else activeClass = "bg-slate-500 text-white shadow-sm font-bold";
                                } else {
                                  activeClass = "text-slate-600 hover:bg-slate-100";
                                }
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...checklist];
                                      updated[idx].status = status;
                                      if (status !== "AVARIA") {
                                        updated[idx].observacao = "";
                                      }
                                      setChecklist(updated);
                                    }}
                                    className={`px-3 py-1 text-[10px] rounded-md transition-all cursor-pointer ${activeClass}`}
                                  >
                                    {status === "OK" ? "OK" : status === "AVARIA" ? "Avaria" : "N/A"}
                                  </button>
                                );
                              })}
                            </div>
                            {item.status === "AVARIA" && (
                              <input
                                type="text"
                                placeholder="Descrição da avaria..."
                                value={item.observacao || ""}
                                onChange={(e) => {
                                  const updated = [...checklist];
                                  updated[idx].observacao = e.target.value;
                                  setChecklist(updated);
                                }}
                                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 w-full sm:w-48"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-indigo-650">photo_camera</span>
                      <span>Laudo Fotográfico (Máximo 6 Fotos)</span>
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-semibold">{photos.length} de 6 fotos anexadas</span>
                        {photos.length < 6 && (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePhotoUpload}
                              className="hidden"
                              id="checklist-photo-upload"
                            />
                            <label
                              htmlFor="checklist-photo-upload"
                              className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-indigo-150 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[16px]">upload</span>
                              <span>Adicionar Fotos</span>
                            </label>
                          </>
                        )}
                      </div>

                      {photos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
                          {photos.map((p, pIdx) => (
                            <div key={p.id} className="relative bg-white border border-slate-200 rounded-xl p-2 flex flex-col group hover:shadow-sm transition">
                              <img src={p.dataUrl} alt={`Laudo ${pIdx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => setPhotos((prev) => prev.filter((ph) => ph.id !== p.id))}
                                className="absolute top-3 right-3 bg-rose-600/90 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-rose-700 transition"
                                title="Remover foto"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                              <input
                                type="text"
                                placeholder="Descreva a foto (opcional)"
                                value={p.legenda || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPhotos((prev) => prev.map((ph) => ph.id === p.id ? { ...ph, legenda: val } : ph));
                                }}
                                className="mt-2.5 w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                          <span className="material-symbols-outlined text-[32px] text-slate-350 mx-auto mb-1.5 block">add_a_photo</span>
                          <p className="text-xs font-bold">Nenhuma foto adicionada</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Use o botão acima para capturar ou selecionar imagens.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Voltar
                  </button>
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
