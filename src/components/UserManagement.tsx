import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";

const SYSTEM_ROLES = [
  { key: 'OWNER', label: 'Dono (Acesso Total)' },
  { key: 'ADMIN', label: 'Administrador' },
  { key: 'SUPERVISOR', label: 'Supervisor' },
  { key: 'EDITOR', label: 'Editor' },
  { key: 'ATTENDANT', label: 'Atendimento' },
  { key: 'TECHNICIAN', label: 'Técnico' },
  { key: 'FINANCIAL', label: 'Financeiro' }
];

const PERMISSION_CATEGORIES = [
  {
    name: 'Ordem de Serviço (OS)',
    permissions: [
      { key: 'os.view', label: 'Visualizar Ordens de Serviço e Kanban' },
      { key: 'os.create', label: 'Abrir novas Ordens de Serviço' },
      { key: 'os.edit', label: 'Editar laudos, peças e observações técnicas' },
      { key: 'os.delete', label: 'Excluir Ordens de Serviço' },
      { key: 'os.change_status', label: 'Avançar/retroceder status no Kanban' },
      { key: 'os.finish', label: 'Finalizar/Encerrar Ordens de Serviço' },
      { key: 'os.stress_test', label: 'Iniciar/gerenciar testes de estresse em equipamentos' }
    ]
  },
  {
    name: 'Estoque & Peças',
    permissions: [
      { key: 'parts.view', label: 'Visualizar catálogo e estoque de peças' },
      { key: 'parts.manage', label: 'Adicionar, editar e remover produtos do estoque' }
    ]
  },
  {
    name: 'Clientes & Dispositivos',
    permissions: [
      { key: 'clients.view', label: 'Visualizar clientes e visão 360º do parque instalado' },
      { key: 'clients.manage', label: 'Cadastrar e editar clientes e dispositivos (Base Instalada)' },
      { key: 'devices.notes', label: 'Adicionar notas internas aos dispositivos' }
    ]
  },
  {
    name: 'Financeiro & Conciliação',
    permissions: [
      { key: 'financial.view', label: 'Visualizar rentabilidade por OS e painel financeiro' },
      { key: 'financial.conciliate', label: 'Executar lote de conciliação de OS' }
    ]
  },
  {
    name: 'Integração Bling',
    permissions: [
      { key: 'bling.view', label: 'Visualizar faturamento e sandbox do Bling' },
      { key: 'bling.sync', label: 'Sincronizar cadastros e faturar OS no Bling' }
    ]
  },
  {
    name: 'WhatsApp & Mensagens',
    permissions: [
      { key: 'whatsapp.send', label: 'Enviar mensagens manuais e gerenciar histórico de disparos' }
    ]
  },
  {
    name: 'Equipe & Usuários',
    permissions: [
      { key: 'users.view', label: 'Visualizar equipe de colaboradores' },
      { key: 'users.manage', label: 'Cadastrar, alterar e remover colaboradores' }
    ]
  },
  {
    name: 'Configurações & Administração',
    permissions: [
      { key: 'settings.manage', label: 'Configurações gerais e regras operacionais do sistema' },
      { key: 'feature_flags.manage', label: 'Ativar/desaviar flags de recursos (Feature Flags)' },
      { key: 'skills.manage', label: 'Visualizar e gerenciar árvore de habilidades (Skill Tree)' },
      { key: 'permissions.manage', label: 'Alterar permissões de perfis e usuários (Matriz de Acessos)' }
    ]
  }
];

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

  // Permissões por Usuário
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

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

  const handleOpenPermissions = async (user: User) => {
    if (user.role === UserRole.OWNER) {
      alert("O dono do sistema (OWNER) possui acesso total por padrão e não precisa de permissões configuradas manualmente.");
      return;
    }
    
    setSelectedUser(user);
    setShowPermissionsModal(true);
    setSelectedUserPermissions([]);

    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/auth/users/${user.id}/permissions`, {
        headers: { "Authorization": `Bearer ${activeToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedUserPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error("Erro ao carregar permissões", err);
    }
  };

  const handleTogglePermission = (permKey: string) => {
    setSelectedUserPermissions(prev => {
      if (prev.includes(permKey)) {
        return prev.filter(k => k !== permKey);
      }
      return [...prev, permKey];
    });
  };

  const handleSelectAllPermissions = () => {
    const allKeys = PERMISSION_CATEGORIES.flatMap(cat => cat.permissions.map(p => p.key));
    setSelectedUserPermissions(allKeys);
  };

  const handleClearPermissions = () => {
    setSelectedUserPermissions([]);
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;
    
    setSavingPermissions(true);
    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/auth/users/${selectedUser.id}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({ permissions: selectedUserPermissions })
      });

      if (res.ok) {
        alert(`Permissões atualizadas com sucesso para ${selectedUser.name}!`);
        setShowPermissionsModal(false);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar permissões.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setSavingPermissions(false);
    }
  };

  if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center text-slate-500">
        Acesso negado. Apenas o Dono ou Administradores podem gerenciar usuários.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Equipe & Acessos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os colaboradores e defina individualmente o nível de acesso de cada um.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={isOffline}
          className="flex items-center gap-2 bg-primary text-primary-content px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Novo Colaborador
        </button>
      </div>

      {/* Content - Users List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Perfil Base</th>
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
                        {SYSTEM_ROLES.find(r => r.key === u.role)?.label || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {u.role !== UserRole.OWNER && (
                        <button
                          onClick={() => handleOpenPermissions(u)}
                          className="text-teal-600 hover:text-teal-800 p-1.5 rounded hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-200"
                          title="Gerenciar Acessos do Colaborador"
                        >
                          <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
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

      {/* Modal - Register Colaborador */}
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
                  <option value={UserRole.ADMIN}>Gestão (Sub-Admin)</option>
                  <option value={UserRole.ATTENDANT}>Atendimento/Recepção</option>
                  <option value={UserRole.TECHNICIAN}>Laboratório/Técnico</option>
                  <option value={UserRole.FINANCIAL}>Financeiro/Estoque</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-content hover:bg-primary/90 font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - User Permissions */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Acessos: {selectedUser.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Defina o que este colaborador pode visualizar ou alterar.</p>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-xs font-medium text-slate-500">
                <span className="font-bold text-slate-700">{selectedUserPermissions.length}</span> permissões concedidas
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={handleClearPermissions}
                  className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Limpar Tudo
                </button>
                <button 
                  onClick={handleSelectAllPermissions}
                  className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Selecionar Tudo (Máximo)
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
              {PERMISSION_CATEGORIES.map(category => (
                <div key={category.name} className="space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.permissions.map(perm => {
                      const isGranted = selectedUserPermissions.includes(perm.key);
                      return (
                        <div 
                          key={perm.key}
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none
                            ${isGranted 
                              ? 'bg-teal-50/50 border-teal-500 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className={`mt-0.5 flex shrink-0 items-center justify-center w-5 h-5 rounded border ${
                            isGranted ? 'bg-teal-500 border-teal-500 text-white' : 'bg-slate-50 border-slate-300'
                          }`}>
                            {isGranted && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold leading-tight ${isGranted ? 'text-teal-900' : 'text-slate-700'}`}>
                              {perm.label}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.key}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2 text-slate-600 hover:bg-slate-100 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUserPermissions}
                disabled={savingPermissions || isOffline}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {savingPermissions ? 'Salvando...' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
