import React, { useState } from "react";

export function EditableClientPhone({ client, onPhoneUpdated }: { client: any, onPhoneUpdated?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(client?.phone || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/clientes/${client.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) throw new Error("Erro");
      if (client) client.phone = phone; // update local object
      setEditing(false);
      if (onPhoneUpdated) onPhoneUpdated();
    } catch (e) {
      alert("Falha ao salvar telefone. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          className="border border-slate-300 px-2 py-1 text-xs rounded shadow-sm focus:ring-1 focus:ring-blue-500 w-32" 
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') setEditing(false); }}
        />
        <button type="button" onClick={save} disabled={saving} className="text-emerald-600 font-bold hover:bg-emerald-50 px-1 rounded transition text-xs">
          {saving ? "..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-slate-500 hover:bg-slate-100 px-1 rounded transition text-[10px]">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-0.5 group">
      <strong className="text-slate-800 text-sm">{client?.phone || "S/ Telefone"}</strong>
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }} 
        className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Editar Telefone"
      >
        <span className="material-symbols-outlined text-[12px]">edit</span>
      </button>
    </div>
  );
}
