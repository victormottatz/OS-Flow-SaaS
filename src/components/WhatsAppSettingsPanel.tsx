import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

export default function WhatsAppSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    WHATSAPP_API_URL: '',
    WHATSAPP_API_TOKEN: '',
    WHATSAPP_INSTANCE_NAME: '',
    WHATSAPP_AUTO_MESSAGES: 'true',
  });
  
  // Para exibir QR Code falso/simulado
  const [pairingStatus, setPairingStatus] = useState<'disconnected' | 'loading' | 'qrcode' | 'connected'>('disconnected');

  // Controle de dirty state
  const [initialValues, setInitialValues] = useState({...values});
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const response = await axios.get('/api/config', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      const filtered = response.data.filter((s: any) => s.category === 'WHATSAPP');
      const newVals = { ...values };
      
      filtered.forEach((s: any) => {
        if (s.key in newVals) {
          (newVals as any)[s.key] = s.value;
        }
      });
      
      setValues(newVals);
      setInitialValues(newVals);

      // Simula estado de conexo dependendo se tem token e url
      if (newVals.WHATSAPP_API_URL && newVals.WHATSAPP_API_TOKEN) {
        setPairingStatus('connected');
      } else {
        setPairingStatus('disconnected');
      }
    } catch (error) {
      console.error('Erro ao buscar configs do WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const promises = Object.entries(values).map(([key, val]) => {
        // Salvar todos, mesmo se igual o initial. (ou s se mudou, para otimizar)
        if (values[key as keyof typeof values] !== initialValues[key as keyof typeof initialValues]) {
           return axios.put(`/api/config/${key}`, {
             value: String(val),
             category: 'WHATSAPP',
             description: `Configurao ${key}`,
             type: key === 'WHATSAPP_AUTO_MESSAGES' ? 'boolean' : 'string'
           }, {
             headers: { Authorization: `Bearer ${activeToken}` }
           });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      setInitialValues({...values});
      alert('Configuraes do WhatsApp salvas!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alteraes.');
    } finally {
      setSaving(false);
    }
  };

  const simulateQRCode = () => {
    setPairingStatus('loading');
    setTimeout(() => {
      setPairingStatus('qrcode');
    }, 1500);
  };

  const simulateConnect = () => {
    setPairingStatus('loading');
    setTimeout(() => {
      setPairingStatus('connected');
      // Fora salvar token/url de teste se tiver vazio
      setValues(prev => ({
        ...prev,
        WHATSAPP_API_URL: prev.WHATSAPP_API_URL || 'http://localhost:8080',
        WHATSAPP_API_TOKEN: prev.WHATSAPP_API_TOKEN || 'EVO-SIMULADO-TOKEN'
      }));
    }, 2000);
  };

  const simulateDisconnect = () => {
    setPairingStatus('disconnected');
    setValues(prev => ({
      ...prev,
      WHATSAPP_API_URL: '',
      WHATSAPP_API_TOKEN: ''
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabelalho */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">chat</span>
            Integrao WhatsApp
          </h2>
          <p className="opacity-90 mt-1">Conecte sua conta do WhatsApp para envios automticos aos clientes.</p>
        </div>
        <div className="absolute right-0 top-0 h-full opacity-20 pointer-events-none">
          <span className="material-symbols-outlined text-[120px] -mt-4 mr-2">forum</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pareamento e Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center min-h-[350px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 w-full text-left">Status da Conexo</h3>
          
          {pairingStatus === 'disconnected' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-5xl">phonelink_off</span>
              </div>
              <div>
                <p className="text-slate-600 font-medium">Nenhum aparelho conectado</p>
                <p className="text-sm text-slate-500 mt-1">Gere um QR Code para iniciar o pareamento com a Evolution API.</p>
              </div>
              <button 
                onClick={simulateQRCode}
                className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                Gerar QR Code
              </button>
            </div>
          )}

          {pairingStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin"></div>
              <p className="text-slate-600 font-medium">Processando conexo...</p>
            </div>
          )}

          {pairingStatus === 'qrcode' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100 cursor-pointer" onClick={simulateConnect}>
                {/* Dummy QR Code UI - clickable for demo */}
                <div className="w-48 h-48 bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-cover bg-center opacity-80 hover:opacity-100 transition-opacity"></div>
              </div>
              <p className="text-slate-600 font-medium">Escaneie o QR Code com seu WhatsApp</p>
              <p className="text-xs text-slate-400">(Dica: Clique no QR Code para simular a conexo)</p>
            </div>
          )}

          {pairingStatus === 'connected' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-500">
                <span className="material-symbols-outlined text-5xl">phonelink_ring</span>
              </div>
              <div>
                <p className="text-emerald-600 font-bold text-lg flex items-center justify-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado e Operacional
                </p>
                <p className="text-sm text-slate-500 mt-1">Sua API est pronta para enviar mensagens.</p>
              </div>
              <button 
                onClick={simulateDisconnect}
                className="mt-4 px-6 py-2 text-rose-500 hover:bg-rose-50 rounded-xl font-medium transition-colors"
              >
                Desconectar Sesso
              </button>
            </div>
          )}
        </div>

        {/* Configuraes de API e Automo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center justify-between">
            Credenciais da API
            {isDirty && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-md">Modificado</span>}
          </h3>
          
          <div className="space-y-4 flex-1">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL da API (Evolution / Baileys)</label>
              <input
                type="text"
                placeholder="Ex: http://api.evolution.com"
                value={values.WHATSAPP_API_URL}
                onChange={(e) => setValues({...values, WHATSAPP_API_URL: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Token Global (API Key)</label>
              <input
                type="password"
                placeholder="Insira seu token de acesso"
                value={values.WHATSAPP_API_TOKEN}
                onChange={(e) => setValues({...values, WHATSAPP_API_TOKEN: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Instncia</label>
              <input
                type="text"
                placeholder="Ex: MGV_OFICIAL"
                value={values.WHATSAPP_INSTANCE_NAME}
                onChange={(e) => setValues({...values, WHATSAPP_INSTANCE_NAME: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Mensagens Automticas</p>
                <p className="text-sm text-slate-500">Disparar ao mudar status da OS</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={values.WHATSAPP_AUTO_MESSAGES === 'true'}
                  onChange={(e) => setValues({...values, WHATSAPP_AUTO_MESSAGES: e.target.checked ? 'true' : 'false'})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

          </div>

          <div className="pt-6 mt-4 flex justify-end gap-3">
            {isDirty && (
              <button 
                onClick={() => setValues({...initialValues})}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${isDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {saving ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-lg">save</span>
              )}
              {saving ? 'Salvando...' : 'Salvar Alteraes'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
