/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";

interface UserManagementProps {
  userRole: UserRole;
  isOffline: boolean;
}

export default function UserManagement({ userRole, isOffline }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de novo usuário
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.ATTENDANT);
  const [errorMsg, setErrorMsg] = useState("");

  const loadUsers = async () => {
    if (isOffline) return;
    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/auth/users", {
        headers: { "Authorization": `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isOffline]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({ name, email, password, role })
      });

      if (res.ok) {
        setShowModal(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole(UserRole.ATTENDANT);
        loadUsers();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Erro ao cadastrar.");
      }
    } catch (err) {
      setErrorMsg("Erro de conexão.");
    }
  };

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja remover o usuário ${userName}?`)) return;
    
    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${activeToken}` }
      });

      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao remover.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    }
  };

  if (userRole !== UserRole.OWNER) {
    return (
      <div className="p-8 text-center text-slate-500">
        Acesso negado. Apenas o Dono/Administrador pode gerenciar usuários.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Equipe & Acessos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os colaboradores que podem acessar o sistema.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={isOffline}
          className="flex items-center gap-2 bg-primary text-primary-content px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Carregando...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${u.role === UserRole.OWNER ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                          u.role === UserRole.ATTENDANT ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          u.role === UserRole.TECHNICIAN ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remover Usuário"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Novo Colaborador</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <p>{errorMsg}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Ex: joao@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Provisória</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Perfil (Departamento)</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                >
                  <option value={UserRole.OWNER}>Administrador (Acesso Total)</option>
                  <option value={UserRole.ATTENDANT}>Atendimento/Recepção</option>
                  <option value={UserRole.TECHNICIAN}>Laboratório/Técnico</option>
                  <option value={UserRole.FINANCIAL}>Financeiro/Estoque</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-content hover:bg-primary/90 font-medium rounded-lg transition-colors shadow-sm"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
