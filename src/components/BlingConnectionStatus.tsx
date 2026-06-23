/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

export default function BlingConnectionStatus() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    const token = localStorage.getItem("mgv_token") || "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    try {
      const res = await fetch("/api/integration/bling/status", { headers });
      if (res.ok) {
        const data = await res.json();
        setAuthorized(data.authorized);
        setExpiresAt(data.expiresAt);
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.error("[Bling Status] Erro ao obter status do Bling:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    // Redirect to backend connect endpoint
    window.location.href = "/api/integration/bling/connect";
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Deseja realmente desconectar a integração com o Bling e revogar os tokens?")) {
      return;
    }
    const token = localStorage.getItem("mgv_token") || "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    try {
      const res = await fetch("/api/integration/bling/disconnect", {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        alert("Integração desconectada com sucesso!");
        fetchStatus();
      } else {
        alert("Erro ao desconectar a integração.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão com o servidor.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold py-2">
        <span className="animate-spin h-3 w-3 border-2 border-slate-300 border-t-transparent rounded-full"></span>
        <span>Carregando status do Bling...</span>
      </div>
    );
  }

  if (authorized) {
    const dateFormatted = updatedAt 
      ? new Date(updatedAt).toLocaleString("pt-BR", { 
          day: "2-digit", 
          month: "2-digit", 
          year: "numeric", 
          hour: "2-digit", 
          minute: "2-digit" 
        }).replace(", ", " às ")
      : "";

    return (
      <div className="flex flex-row items-center justify-between gap-3 bg-emerald-50/50 border border-emerald-100 px-4 py-2.5 rounded-xl text-xs select-none w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-800">Conectado ao Bling</span>
          {dateFormatted && (
            <span className="text-slate-400 font-medium hidden sm:inline">(Atualizado: {dateFormatted})</span>
          )}
        </div>
        <button
          onClick={handleDisconnect}
          className="text-red-500 hover:text-red-750 font-bold hover:underline cursor-pointer ml-4 transition"
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-between gap-4 bg-rose-50/30 border border-rose-100 px-4 py-2.5 rounded-xl text-xs select-none w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <span className="font-bold text-rose-800">Bling Desconectado</span>
      </div>
      <button
        onClick={handleConnect}
        className="px-3 py-1.5 bg-secondary-container text-primary-container font-extrabold rounded-lg hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer text-[10px] shadow-sm"
      >
        Conectar ao Bling
      </button>
    </div>
  );
}
