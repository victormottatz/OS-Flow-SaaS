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

  const [qrCodeBase64, setQrCodeBase64] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchQRCode = async () => {
    setPairingStatus('loading');
    setErrorMessage(null);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const response = await axios.post('/api/whatsapp/instance/connect', {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      // Se já retornar conectado (Modo Simulado ou instância já aberta)
      if (response.data && response.data.instance && response.data.instance.state === 'open' && !response.data.base64) {
        setPairingStatus('connected');
        return;
      }

      let qr = response.data?.base64 || response.data?.qrcode?.base64 || '';
      if (qr) {
        if (!qr.startsWith('data:image')) {
          qr = `data:image/png;base64,${qr}`;
        }
        setQrCodeBase64(qr);
        setPairingCode(response.data.pairingCode || response.data.code || null);
        setPairingStatus('qrcode');
        
        // Iniciar polling para verificar se conectou
        if (pollingInterval) clearInterval(pollingInterval);
        const interval = setInterval(checkConnectionState, 3000);
        setPollingInterval(interval);
      } else {
        const errorText = response.data?.error || 'A Evolution API não retornou o QR Code.';
        setErrorMessage(errorText);
        setPairingStatus('disconnected');
      }
    } catch (error: any) {
      console.error('[WhatsApp Panel] Erro ao conectar na Evolution API:', error);
      const apiErrMsg = error.response?.data?.error || error.message || 'Erro de comunicação com o servidor da Evolution API.';
      setErrorMessage(apiErrMsg);
      setPairingStatus('disconnected');
    }
  };

  const checkConnectionState = async () => {
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const response = await axios.get('/api/whatsapp/instance/state', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      if (response.data && response.data.instance?.state === 'open') {
        setPairingStatus('connected');
        setErrorMessage(null);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Limpa o polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const disconnectInstance = async () => {
    setPairingStatus('loading');
    setErrorMessage(null);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      await axios.delete('/api/whatsapp/instance/logout', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setPairingStatus('disconnected');
      setQrCodeBase64('');
      setPairingCode(null);
    } catch (error: any) {
      console.error(error);
      const apiErrMsg = error.response?.data?.error || 'Erro ao desconectar na Evolution API.';
      setErrorMessage(apiErrMsg);
      setPairingStatus('connected');
    }
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
          
          {errorMessage && (
            <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2 text-left animate-fade-in">
              <span className="material-symbols-outlined text-rose-500 text-lg shrink-0 mt-0.5">error</span>
              <div className="flex-1">
                <p className="font-semibold">Erro de Conexão</p>
                <p className="text-xs mt-0.5 opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

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
                onClick={fetchQRCode}
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
              <p className="text-slate-600 font-medium">Processando conexão com a Evolution API...</p>
            </div>
          )}

          {pairingStatus === 'qrcode' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100">
                {qrCodeBase64 ? (
                  <img src={qrCodeBase64} alt="QR Code" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="w-52 h-52 bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl">qr_code</span>
                  </div>
                )}
              </div>
              {pairingCode && (
                <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-mono">
                  Código de Pareamento: <strong>{pairingCode}</strong>
                </div>
              )}
              <p className="text-slate-600 font-medium text-sm">Escaneie o QR Code com seu WhatsApp no celular</p>
              <button onClick={() => setPairingStatus('disconnected')} className="text-xs text-rose-500 hover:underline">
                Cancelar
              </button>
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
                onClick={disconnectInstance}
                className="mt-4 px-6 py-2 text-rose-500 hover:bg-rose-50 rounded-xl font-medium transition-colors"
              >
                Desconectar Aparelho
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

            <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">Modo de Disparo das Mensagens</p>
                <p className="text-xs text-slate-500">Defina como o sistema deve reagir às mudanças de status das Ordens de Serviço.</p>
              </div>

              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${values.WHATSAPP_AUTO_MESSAGES === 'approval' || values.WHATSAPP_AUTO_MESSAGES === 'true' ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <input
                    type="radio"
                    name="whatsapp_mode"
                    value="approval"
                    checked={values.WHATSAPP_AUTO_MESSAGES === 'approval' || values.WHATSAPP_AUTO_MESSAGES === 'true'}
                    onChange={() => setValues({...values, WHATSAPP_AUTO_MESSAGES: 'approval'})}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      🛡️ Aprovação Prévia da Atendente <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">Recomendado</span>
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Gera uma notificação no Sininho e na OS com botões para a atendente autorizar o envio em 1 clique antes do disparo.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${values.WHATSAPP_AUTO_MESSAGES === 'auto' ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <input
                    type="radio"
                    name="whatsapp_mode"
                    value="auto"
                    checked={values.WHATSAPP_AUTO_MESSAGES === 'auto'}
                    onChange={() => setValues({...values, WHATSAPP_AUTO_MESSAGES: 'auto'})}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      ⚡ Disparo Automático Imediato
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Envia diretamente para o WhatsApp do cliente assim que o status da OS for alterado.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${values.WHATSAPP_AUTO_MESSAGES === 'disabled' || values.WHATSAPP_AUTO_MESSAGES === 'false' ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <input
                    type="radio"
                    name="whatsapp_mode"
                    value="disabled"
                    checked={values.WHATSAPP_AUTO_MESSAGES === 'disabled' || values.WHATSAPP_AUTO_MESSAGES === 'false'}
                    onChange={() => setValues({...values, WHATSAPP_AUTO_MESSAGES: 'disabled'})}
                    className="mt-1 text-slate-600 focus:ring-slate-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      ⛔ Desativado
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Nenhuma mensagem automática é gerada ou enviada pelo sistema.
                    </p>
                  </div>
                </label>
              </div>
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
