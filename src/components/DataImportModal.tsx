import React, { useState } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  Users, 
  Package, 
  Sparkles,
  Layers
} from "lucide-react";

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DataImportModal({ isOpen, onClose, onSuccess }: DataImportModalProps) {
  const [importType, setImportType] = useState<"clients" | "parts">("clients");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Parser simples de CSV no frontend
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
          setErrorMsg("O arquivo está vazio ou contém apenas o cabeçalho.");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || "";
          });

          if (importType === "clients") {
            rows.push({
              name: rowObj["Nome"] || rowObj["name"] || values[0] || "",
              cpfCnpj: rowObj["CPF_CNPJ"] || rowObj["cpfCnpj"] || values[1] || "",
              phone: rowObj["Telefone"] || rowObj["phone"] || values[2] || "",
              email: rowObj["Email"] || rowObj["email"] || values[3] || "",
              address: rowObj["Endereco"] || rowObj["address"] || values[4] || "",
              city: rowObj["Cidade"] || rowObj["city"] || values[5] || "",
              state: rowObj["UF"] || rowObj["state"] || values[6] || "",
              zipCode: rowObj["CEP"] || rowObj["zipCode"] || values[7] || "",
              deviceType: rowObj["Tipo_Equipamento"] || values[8] || "",
              deviceBrand: rowObj["Marca_Equipamento"] || values[9] || "",
              deviceModel: rowObj["Modelo_Equipamento"] || values[10] || "",
              deviceSerial: rowObj["Serial_Equipamento"] || values[11] || ""
            });
          } else {
            rows.push({
              code: rowObj["Codigo"] || rowObj["code"] || values[0] || "",
              name: rowObj["Nome_Peca"] || rowObj["name"] || values[1] || "",
              stock: Number(rowObj["Estoque"] || values[2] || 0),
              cost: Number(rowObj["Custo"] || values[3] || 0),
              price: Number(rowObj["Preco_Venda"] || values[4] || 0),
              ncm: rowObj["NCM"] || values[5] || "",
              location: rowObj["Localizacao"] || values[6] || ""
            });
          }
        }

        setParsedRows(rows);
      } catch (err) {
        setErrorMsg("Erro ao processar o arquivo CSV. Verifique o formato das colunas.");
      }
    };
    reader.readAsText(selectedFile, "UTF-8");
  };

  const handleDownloadTemplate = () => {
    window.open(`/api/integration/import-templates/${importType}`, "_blank");
  };

  const handleSubmitImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg("Nenhum dado válido para importar.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("mgv_token");
      const endpoint = importType === "clients" ? "/api/integration/import-clients" : "/api/integration/import-parts";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: parsedRows })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro durante a importação.");

      setImportResult(data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-cyan-400/20 border border-cyan-300/40 text-cyan-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              Migração e Onboarding em 1 Clique
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Importar Dados para sua Oficina</h2>
          <p className="text-blue-100 text-xs mt-1">
            Suba sua planilha de clientes, lasers ou peças e comece a operar imediatamente.
          </p>

          {/* Seletor de Categoria */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setImportType("clients");
                setParsedRows([]);
                setFile(null);
                setImportResult(null);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                importType === "clients"
                  ? "bg-white text-blue-900 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Users className="w-4 h-4" />
              Clientes & Equipamentos
            </button>
            <button
              onClick={() => {
                setImportType("parts");
                setParsedRows([]);
                setFile(null);
                setImportResult(null);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                importType === "parts"
                  ? "bg-white text-blue-900 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Package className="w-4 h-4" />
              Estoque de Peças
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {importResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Importação Concluída com Sucesso!
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-emerald-700 pt-1">
                {importType === "clients" ? (
                  <>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                      <strong>{importResult.createdClients}</strong> novos clientes
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                      <strong>{importResult.updatedClients}</strong> atualizados
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                      <strong>{importResult.createdDevices}</strong> equipamentos
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                      <strong>{importResult.createdParts}</strong> novas peças
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                      <strong>{importResult.updatedParts}</strong> atualizadas
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bloco de Download de Planilha Modelo */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Ainda não organizou seus dados?
              </h4>
              <p className="text-[11px] text-slate-500">
                Baixe nossa planilha modelo de exemplo com as colunas certas do nicho estético.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Baixar Modelo CSV
            </button>
          </div>

          {/* Área de Drag and Drop */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/50 relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {file ? file.name : "Clique ou arraste seu arquivo .CSV aqui"}
              </div>
              <p className="text-[11px] text-slate-500">
                {parsedRows.length > 0
                  ? `✅ ${parsedRows.length} linhas reconhecidas e prontas para envio.`
                  : "Compatível com arquivos exportados do Excel, Bling, Tiny e SH Oficina."}
              </p>
            </div>
          </div>

          {/* Pré-visualização dos primeiros 5 registros */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pré-visualização (Primeiros {Math.min(5, parsedRows.length)} itens)
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">{importType === "clients" ? "Cliente" : "Código"}</th>
                      <th className="p-2.5">{importType === "clients" ? "Cidade/UF" : "Nome da Peça"}</th>
                      <th className="p-2.5">{importType === "clients" ? "Equipamento" : "Estoque"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">{importType === "clients" ? row.name : row.code}</td>
                        <td className="p-2.5 text-slate-600">{importType === "clients" ? `${row.city || ""} ${row.state ? `(${row.state})` : ""}` : row.name}</td>
                        <td className="p-2.5 text-slate-600">{importType === "clients" ? `${row.deviceType || ""} ${row.deviceModel || ""}` : `${row.stock} un`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
          >
            Fechar
          </button>
          <button
            disabled={parsedRows.length === 0 || loading}
            onClick={handleSubmitImport}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Importando..." : `Importar ${parsedRows.length} Itens`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
