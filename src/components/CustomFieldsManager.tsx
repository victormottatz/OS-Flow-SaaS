import React, { useState, useEffect } from "react";

export default function CustomFieldsManager() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do form
  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");
  const [entityType, setEntityType] = useState("DEVICE");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const res = await fetch("/api/custom-fields", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          label,
          type,
          entityType,
          options: type === "SELECT" ? options.split(",").map(o => o.trim()) : [],
          required
        })
      });

      if (res.ok) {
        setLabel("");
        setOptions("");
        fetchFields();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este campo?")) return;
    try {
      await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      fetchFields();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-600">dynamic_form</span>
        Campos Personalizados
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        Crie novos campos para capturar informações específicas em clientes, aparelhos e ordens de serviço.
      </p>

      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Campo</label>
          <input 
            type="text" 
            value={label} 
            onChange={e => setLabel(e.target.value)} 
            required 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
            placeholder="Ex: Voltagem"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Entidade</label>
          <select value={entityType} onChange={e => setEntityType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white">
            <option value="DEVICE">Aparelhos</option>
            <option value="CLIENT">Clientes</option>
            <option value="ORDEM_SERVICO">Ordens de Serviço</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Campo</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white">
            <option value="TEXT">Texto Curto</option>
            <option value="NUMBER">Número</option>
            <option value="CHECKBOX">Caixa de Seleção (Sim/Não)</option>
            <option value="SELECT">Lista de Opções</option>
          </select>
        </div>

        {type === "SELECT" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opções (separadas por vírgula)</label>
            <input 
              type="text" 
              value={options} 
              onChange={e => setOptions(e.target.value)} 
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
              placeholder="Ex: 110V, 220V, Bivolt"
            />
          </div>
        )}

        <div className="md:col-span-2 flex items-center gap-2 mt-2">
          <input 
            type="checkbox" 
            id="req" 
            checked={required} 
            onChange={e => setRequired(e.target.checked)} 
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label htmlFor="req" className="text-sm font-medium text-slate-700 cursor-pointer">Tornar este campo obrigatório</label>
        </div>

        <div className="md:col-span-2 flex justify-end mt-4 pt-4 border-t border-slate-200">
          <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold shadow-sm transition-colors">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Adicionar Campo
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <span className="material-symbols-outlined animate-spin text-2xl mr-2">progress_activity</span>
          <span>Carregando campos...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.length === 0 ? (
            <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">data_object</span>
              Nenhum campo personalizado criado ainda.
            </div>
          ) : (
            fields.map(field => (
              <div key={field.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">{field.label}</span>
                    {field.required && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] uppercase font-bold rounded-full">Obrigatório</span>}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] uppercase font-bold rounded-md tracking-wide">
                      {field.entityType === 'DEVICE' ? 'Aparelhos' : field.entityType === 'CLIENT' ? 'Clientes' : 'OS'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] opacity-70">
                      {field.type === 'TEXT' ? 'short_text' : field.type === 'NUMBER' ? '123' : field.type === 'CHECKBOX' ? 'check_box' : 'list'}
                    </span>
                    Tipo: <span className="font-medium text-slate-600">{
                      field.type === 'TEXT' ? 'Texto' : 
                      field.type === 'NUMBER' ? 'Número' : 
                      field.type === 'CHECKBOX' ? 'Caixa de Seleção' : 
                      'Lista de Opções'
                    }</span>
                    {field.type === "SELECT" && field.options?.length > 0 && ` (${field.options.join(", ")})`}
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDelete(field.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir Campo"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
