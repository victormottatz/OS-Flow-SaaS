import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import { isValidCpfOrCnpj } from "../utils/cpfCnpjValidator";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

interface Supplier {
  id: string;
  name: string;
  fantasyName: string | null;
  cpfCnpj: string;
  ie: string | null;
  im: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  contactName: string | null;
  isCarrier: boolean;
  notes: string | null;
  lastPurchaseAt: string | null;
}

interface SupplierManagerProps {
  userRole: UserRole;
  currentUser?: any;
  isOffline: boolean;
}

export default function SupplierManager({ userRole, isOffline }: SupplierManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState<number | "all">(50);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [fantasyName, setFantasyName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [im, setIm] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [isCarrier, setIsCarrier] = useState(false);
  const [notes, setNotes] = useState("");

  const [isCepLoading, setIsCepLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // --- Unsaved Changes Guard ---
  const isFormDirty = showAddModal && (
    name.trim() !== "" ||
    cpfCnpj.trim() !== "" ||
    phone.trim() !== "" ||
    email.trim() !== "" ||
    address.trim() !== "" ||
    zipCode.trim() !== ""
  );
  useUnsavedChangesGuard(isFormDirty);

  // Fetch Suppliers from API
  const fetchSuppliers = async () => {
    if (isOffline) return;
    setLoading(true);
    setErrorMsg("");

    const token = localStorage.getItem("mgv_token") || "";
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      const url = `/api/suppliers?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error("Falha ao buscar fornecedores no servidor.");
      const result = await response.json();
      setSuppliers(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão com a API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, limit, isOffline]);

  // Cep Lookup integration (ViaCEP API)
  const handleCepLookup = async () => {
    const cleanCep = zipCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setErrorMsg("CEP inválido. Deve conter exatamente 8 dígitos.");
      return;
    }

    setIsCepLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error("Erro na rede ao consultar CEP.");
      const data = await response.json();
      if (data.erro) throw new Error("CEP não cadastrado na base dos Correios.");

      setName(prev => prev); // dummy to trigger react
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
      setAddress(`${data.logradouro}, `);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao autocompletar endereço.");
    } finally {
      setIsCepLoading(false);
    }
  };

  // Abre formulário para criação
  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setFantasyName("");
    setCpfCnpj("");
    setIe("");
    setIm("");
    setAddress("");
    setNeighborhood("");
    setCity("");
    setState("");
    setZipCode("");
    setPhone("");
    setFax("");
    setEmail("");
    setWebsite("");
    setContactName("");
    setIsCarrier(false);
    setNotes("");
    setErrorMsg("");
    setSuccessMsg("");
    setShowAddModal(true);
  };

  // Abre formulário para edição
  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setFantasyName(supplier.fantasyName || "");
    setCpfCnpj(supplier.cpfCnpj);
    setIe(supplier.ie || "");
    setIm(supplier.im || "");
    setAddress(supplier.address || "");
    setNeighborhood(supplier.neighborhood || "");
    setCity(supplier.city || "");
    setState(supplier.state || "");
    setZipCode(supplier.zipCode || "");
    setPhone(supplier.phone || "");
    setFax(supplier.fax || "");
    setEmail(supplier.email || "");
    setWebsite(supplier.website || "");
    setContactName(supplier.contactName || "");
    setIsCarrier(supplier.isCarrier);
    setNotes(supplier.notes || "");
    setErrorMsg("");
    setSuccessMsg("");
    setShowAddModal(true);
  };

  // Salvar cadastro ou alteração
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !cpfCnpj) {
      setErrorMsg("Razão Social e CNPJ/CPF são obrigatórios.");
      return;
    }

    const checkDoc = isValidCpfOrCnpj(cpfCnpj);
    if (!checkDoc.valid) {
      setErrorMsg(checkDoc.message || "CPF ou CNPJ com formato irregular.");
      return;
    }

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const token = localStorage.getItem("mgv_token") || "";
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    const payload = {
      name, fantasyName, cpfCnpj, ie, im, address, neighborhood,
      city, state, zipCode, phone, fax, email, website, contactName, isCarrier, notes
    };

    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu um erro ao salvar o registro.");

      setSuccessMsg(editingSupplier ? "Fornecedor atualizado com sucesso!" : "Fornecedor criado com sucesso!");
      setTimeout(() => {
        setShowAddModal(false);
        fetchSuppliers();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Exclusão física ou lógica (soft delete)
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este fornecedor? Ele será ocultado das telas operacionais.")) {
      return;
    }

    const token = localStorage.getItem("mgv_token") || "";
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao remover.");
      }

      fetchSuppliers();
    } catch (err: any) {
      alert("Erro ao excluir fornecedor: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden select-none">
      {/* Top Header & Search Actions */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Buscar por Razão Social, CNPJ, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-10 pr-4 py-2 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
          <span className="material-symbols-outlined text-slate-400 absolute left-3 top-2.5 text-[18px]">search</span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => setLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="50">50 itens</option>
            <option value="100">100 itens</option>
            <option value="all">Exibir todos</option>
          </select>

          {userRole !== UserRole.TECHNICIAN && (
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-blue-500/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">add</span>
              <span>Cadastrar Fornecedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Fornecedores */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider select-none">
              <th className="py-3.5 px-6">Fornecedor</th>
              <th className="py-3.5 px-4">CNPJ/CPF</th>
              <th className="py-3.5 px-4">Cidade / UF</th>
              <th className="py-3.5 px-4">Telefone / E-mail</th>
              <th className="py-3.5 px-4">Contato</th>
              <th className="py-3.5 px-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                  Buscando dados no Postgres...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                  Nenhum fornecedor ativo encontrado.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-6">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    {s.fantasyName && <div className="text-[10px] text-slate-400 font-medium">{s.fantasyName}</div>}
                    {s.isCarrier && <span className="inline-block mt-1 bg-indigo-50 border border-indigo-150 text-indigo-650 px-1.5 py-0.5 rounded text-[8px] font-bold">Transportadora</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">{s.cpfCnpj}</td>
                  <td className="py-3 px-4">
                    {s.city ? `${s.city} - ${s.state || ""}` : <span className="text-slate-350">Não especificado</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div>{s.phone}</div>
                    {s.email && <div className="text-[10px] text-slate-400">{s.email}</div>}
                  </td>
                  <td className="py-3 px-4">{s.contactName || <span className="text-slate-350">—</span>}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                        title="Editar Fornecedor"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      {userRole !== UserRole.TECHNICIAN && (
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Remover Fornecedor"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50/50">
        <div>Total de Fornecedores Cadastrados: <span className="font-bold text-slate-700">{total}</span></div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-fadein">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">
                {editingSupplier ? "Editar Fornecedor" : "Novo Cadastro de Fornecedor"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[75vh]">
              {errorMsg && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Razão Social */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Razão Social (Nome) *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Fantasia */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Nome Fantasia</label>
                  <input
                    type="text"
                    value={fantasyName}
                    onChange={(e) => setFantasyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* CNPJ / CPF */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">CNPJ ou CPF *</label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="Somente números ou formatado"
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition font-mono"
                  />
                </div>

                {/* IE */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Inscrição Estadual (IE)</label>
                  <input
                    type="text"
                    value={ie}
                    onChange={(e) => setIe(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* IM */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Inscrição Municipal (IM)</label>
                  <input
                    type="text"
                    value={im}
                    onChange={(e) => setIm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* CEP com Busca Automática */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">CEP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="99999-999"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCepLookup}
                      disabled={isCepLoading}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 rounded-xl text-xs font-bold border border-slate-250 cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      {isCepLoading ? "..." : "Consultar"}
                    </button>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Endereço e Número</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Cidade / Estado */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-center transition font-semibold"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Telefone Comercial</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">E-mail de Contato</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Contato (Nome) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Nome do Contato Interno</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Site */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Transportadora Flag */}
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="isCarrier"
                    checked={isCarrier}
                    onChange={(e) => setIsCarrier(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-1 cursor-pointer"
                  />
                  <label htmlFor="isCarrier" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Este fornecedor atua como Transportadora
                  </label>
                </div>

                {/* Fax */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Fax</label>
                  <input
                    type="text"
                    value={fax}
                    onChange={(e) => setFax(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Observações */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">Observações Gerais</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-800 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition resize-none"
                  />
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  {actionLoading ? "Processando..." : (editingSupplier ? "Salvar Alterações" : "Salvar Fornecedor")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
