import React, { useState, useEffect } from "react";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { formatWhatsAppMessageReact } from "../utils/whatsappTextFormatter";
import { EmojiPickerPopover } from "./EmojiPickerPopover";

interface MessageRecord {
  id: string;
  phoneNumber: string;
  messageText: string;
  status: string; // AGUARDANDO_APROVACAO, PENDENTE, ENVIADO, CANCELADO, FALHOU
  errorDetail: string | null;
  createdAt: string;
}

interface OSWhatsAppPanelProps {
  orderId: string;
  clientPhone: string;
  clientName: string;
  osNumber: string;
  deviceModel: string;
  deviceBrand: string;
  totalCost: number;
  onPrintPDF?: () => void;
  initialMessageText?: string;
}

export default function OSWhatsAppPanel({
  orderId,
  clientPhone,
  clientName,
  osNumber,
  deviceModel,
  deviceBrand,
  totalCost,
  onPrintPDF,
  initialMessageText
}: OSWhatsAppPanelProps) {
  const [history, setHistory] = useState<MessageRecord[]>([]);
  const [messageText, setMessageText] = useState(initialMessageText || "");
  const [selectedTemplateDoc, setSelectedTemplateDoc] = useState<string>("orcamento");
  const [includePdf, setIncludePdf] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Sincroniza mensagem inicial caso venha externamente (ex: notificação do sininho)
  useEffect(() => {
    if (initialMessageText && initialMessageText.trim()) {
      setMessageText(initialMessageText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 60), 250)}px`;
          textareaRef.current.focus();
        }
      }, 150);
    }
  }, [initialMessageText, orderId]);

  // Inserir emoji selecionado na posição atual do cursor
  const handleSelectEmoji = (emoji: string) => {
    if (!textareaRef.current) {
      setMessageText(prev => prev + emoji);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? messageText.length;
    const end = textarea.selectionEnd ?? messageText.length;
    const newText = messageText.substring(0, start) + emoji + messageText.substring(end);
    setMessageText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 60), 250)}px`;
    }, 10);
  };

  // Guarda de alterações não salvas
  useUnsavedChangesGuard(messageText.trim() !== "");

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/history/${orderId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      } else {
        setErrorMsg("Falha ao carregar histórico de mensagens.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de comunicação ao buscar histórico.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [orderId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSending(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/whatsapp/send-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          messageText: messageText.trim(),
          templateId: includePdf ? selectedTemplateDoc : undefined
        })
      });

      if (res.ok) {
        setMessageText("");
        setSuccessMsg(includePdf ? "Mensagem com documento PDF agendada com sucesso!" : "Mensagem agendada para envio com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3500);
        setTimeout(fetchHistory, 1500);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Falha ao enviar mensagem manual.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de comunicação ao enviar WhatsApp.");
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveMessage = async (msgId: string) => {
    setIsSending(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/messages/${msgId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSuccessMsg("Mensagem aprovada e enviada via WhatsApp com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3500);
        await fetchHistory();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Falha ao aprovar mensagem.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de comunicação ao aprovar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRejectMessage = async (msgId: string) => {
    setIsSending(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/messages/${msgId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reason: "Cancelado pela atendente no painel da OS." })
      });
      if (res.ok) {
        setSuccessMsg("Disparo de mensagem cancelado com sucesso.");
        setTimeout(() => setSuccessMsg(""), 3500);
        await fetchHistory();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Falha ao recusar mensagem.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de comunicação ao recusar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  // Templates humanizados rápidos para preenchimento ágil no frontend
  const loadTemplate = (templateKey: string) => {
    const firstName = (clientName || "Cliente").split(" ")[0];
    const formattedTotal = (totalCost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const linkPortal = `https://sistema.mgvrp.com.br/acompanhar?numero=${osNumber}`; 

    const templates: Record<string, { text: string; docId: string; withPdf: boolean }> = {
      termo_entrada: {
        text: `🩺 *Olá, ${firstName}! Tudo bem?*\n\nConfirmamos a entrada do seu equipamento *${deviceBrand} ${deviceModel}* em nosso laboratório técnico sob a *OS #${osNumber}*.\n\n📎 *Segue em anexo o seu Termo de Recebimento com o checklist de entrada.*\n\nNossa equipe já iniciou a triagem e em breve enviaremos o laudo detalhado.\n\n💬 _Se precisar de qualquer informação, basta responder esta mensagem!_`,
        docId: "termo",
        withPdf: true
      },
      orcamento: {
        text: `📋 *Olá, ${firstName}!*\n\nA avaliação técnica do seu *${deviceModel}* (OS *#${osNumber}*) foi finalizada!\n\n💰 *Valor Total:* *R$ ${formattedTotal}*\n📎 *Segue em anexo o Orçamento Oficial detalhado com o laudo pericial das peças.*\n\n✨ *Aprovação Online com 1 Clique:*\n🔗 ${linkPortal}\n\n💬 _Dúvidas sobre o laudo? Basta nos responder aqui para falar com o técnico responsável!_`,
        docId: "orcamento",
        withPdf: true
      },
      aguardando_peca: {
        text: `📦 *Olá, ${firstName}! Atualização sobre sua OS #${osNumber}:*\n\nPara garantir a máxima qualidade no conserto do seu *${deviceModel}*, solicitamos componentes novos e de procedência garantida.\n\nAssim que as peças chegarem em nossa bancada técnica, daremos prioridade imediata à montagem e aos testes. Manteremos você informado! ⚙️`,
        docId: "orcamento",
        withPdf: false
      },
      em_manutencao: {
        text: `⚙️ *Olá, ${firstName}!*\n\nInformamos que a manutenção do seu equipamento *${deviceModel}* (OS *#${osNumber}*) está em execução na bancada técnica por nossa equipe especializada.\n\nEm breve seu aparelho passará pelos testes finais de qualidade! 🔬`,
        docId: "orcamento",
        withPdf: false
      },
      retirada: {
        text: `🎉 *Ótima notícia, ${firstName}!* \n\nO seu equipamento *${deviceModel}* (OS *#${osNumber}*) concluiu com sucesso todas as etapas de serviços técnicos e testes de qualidade!\n\n📍 *Seu aparelho já está pronto para retirada:*\n🏢 *MGV Assistência Técnica:* Rua Julio Prestes, 648 - Jardim Sumaré, Ribeirão Preto - SP\n⏰ *Horário:* Segunda a Quinta das 08h às 18h | Sexta das 08h às 17h (Sábado e Domingo: Fechado)\n\n📎 *Segue em anexo o Laudo Técnico / Recibo do atendimento.*\n\n💬 _Aguardamos sua visita!_`,
        docId: "recibo",
        withPdf: true
      },
      finalizado: {
        text: `🤝 *Equipamento Entregue com Sucesso!*\n\nOlá, *${firstName}*! A Ordem de Serviço *#${osNumber}* foi concluída e o seu *${deviceModel}* entregue com garantia de 90 dias.\n\n📎 *Segue em anexo o Recibo Oficial de Entrega com o Termo de Garantia.*\n\nAgradecemos a confiança na MGV Assistência Técnica! ✨`,
        docId: "recibo",
        withPdf: true
      }
    };

    if (templates[templateKey]) {
      setMessageText(templates[templateKey].text);
      setSelectedTemplateDoc(templates[templateKey].docId);
      setIncludePdf(templates[templateKey].withPdf);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AGUARDANDO_APROVACAO":
        return "bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse";
      case "PENDENTE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ENVIADO":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CANCELADO":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "FALHOU":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-150 text-slate-700 border-slate-200";
    }
  };

  const pendingApprovalMessages = history.filter(h => h.status === "AGUARDANDO_APROVACAO");

  return (
    <div className="space-y-5 anim-fadein text-xs">
      <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-4 shadow-sm">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-1.5">
          <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">chat</span>
          <span>Comunicação WhatsApp & Envio de Documentos</span>
        </h4>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-[11px] text-red-700 font-semibold border border-red-200/30">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-lg text-[11px] text-emerald-700 font-semibold border border-emerald-200/30">
            {successMsg}
          </div>
        )}

        {/* ALERTA DE MENSAGENS AGUARDANDO APROVAÇÃO HUMANA */}
        {pendingApprovalMessages.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 space-y-3 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl">pending_actions</span>
                <div>
                  <h5 className="font-bold text-amber-950 text-sm">Disparo de WhatsApp Aguardando Sua Autorização</h5>
                  <p className="text-[11px] text-amber-800">Esta mensagem foi gerada pela mudança de status e aguarda aprovação para ser enviada ao cliente.</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-bold text-[10px]">
                {pendingApprovalMessages.length} pendente(s)
              </span>
            </div>

            {pendingApprovalMessages.map((pMsg) => (
              <div key={pMsg.id} className="bg-white rounded-xl p-3 border border-amber-200 space-y-2.5">
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-xs font-sans bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {pMsg.messageText}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleApproveMessage(pMsg.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      Autorizar Envio Agora
                    </button>

                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleRejectMessage(pMsg.id)}
                      className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-medium text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      Descartar / Recusar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMessageText(pMsg.messageText);
                      handleRejectMessage(pMsg.id);
                    }}
                    className="text-xs text-indigo-650 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                    Editar texto antes de enviar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Templates rápidos */}
        <div>
          <span className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Carregar Modelo Humanizado:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => loadTemplate("termo_entrada")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-indigo-600">login</span>
              Entrada / Termo
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("orcamento")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-blue-600">request_quote</span>
              Orçamento Pronto
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("aguardando_peca")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-amber-600">inventory_2</span>
              Aguardando Peça
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("em_manutencao")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-purple-600">build</span>
              Em Reparo
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("retirada")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-teal-600">verified</span>
              Pronto / Retirada
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("finalizado")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
              Entrega / Garantia
            </button>
          </div>
        </div>

        {/* Configuração de Anexo PDF no Disparo */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includePdfCheckbox"
                checked={includePdf}
                onChange={(e) => setIncludePdf(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="includePdfCheckbox" className="font-bold text-slate-700 text-xs cursor-pointer flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-red-500">picture_as_pdf</span>
                Anexar Documento Oficial em PDF no WhatsApp
              </label>
            </div>

            {includePdf && (
              <select
                value={selectedTemplateDoc}
                onChange={(e) => setSelectedTemplateDoc(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="termo">📄 Termo de Recebimento</option>
                <option value="orcamento">📄 Orçamento Oficial</option>
                <option value="recibo">📄 Recibo / Garantia / Laudo</option>
              </select>
            )}
          </div>
        </div>

        {/* Campo de envio */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Mensagem personalizada para WhatsApp (Destinatário: {clientPhone})
            </label>
            {messageText && (
              <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">edit</span>
                Você pode editar o texto abaixo antes de enviar
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="relative flex-1 flex items-start gap-1 bg-white border border-slate-200 rounded-lg p-1 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500">
              <textarea
                ref={textareaRef}
                rows={2}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  const target = e.target;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(Math.max(target.scrollHeight, 60), 250)}px`;
                }}
                placeholder="Digite a mensagem personalizada para o cliente..."
                className="flex-1 px-2.5 py-1.5 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-[height] duration-75 resize-none overflow-y-auto"
                style={{ minHeight: "56px", maxHeight: "250px" }}
              />

              {/* Botão de Emojis */}
              <div className="relative shrink-0 self-end m-1">
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen(prev => !prev)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    emojiPickerOpen
                      ? "bg-amber-400 border-amber-500 text-slate-900 shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                  title="Inserir Emoji"
                >
                  <span className="text-base leading-none select-none">😊</span>
                </button>

                <EmojiPickerPopover
                  isOpen={emojiPickerOpen}
                  onClose={() => setEmojiPickerOpen(false)}
                  onSelectEmoji={handleSelectEmoji}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isSending || !messageText.trim()}
              onClick={handleSend}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-lg transition shrink-0 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none self-stretch sm:self-auto shadow-sm cursor-pointer"
            >
              {isSending ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
              {isSending ? "Enviando..." : "Disparar WhatsApp"}
            </button>
          </div>
        </div>

        {/* Histórico */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Histórico de Comunicações da OS</span>
            <button
              type="button"
              onClick={fetchHistory}
              className="text-[10px] text-indigo-650 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[12px]">refresh</span> Atualizar
            </button>
          </div>

          {isLoading ? (
            <p className="text-slate-400 italic text-center py-4">Carregando histórico de mensagens...</p>
          ) : history.length === 0 ? (
            <p className="text-slate-400 italic text-center py-4">Nenhuma mensagem enviada para esta OS.</p>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {history.map((record) => (
                <div key={record.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-450">
                    <span className="font-mono">{new Date(record.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                    <span className={`px-2 py-0.5 font-bold rounded-full border ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="text-slate-800 text-xs whitespace-pre-wrap mt-1 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-slate-100 font-sans">
                    {formatWhatsAppMessageReact(record.messageText)}
                  </div>
                  {record.errorDetail && (
                    <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg font-mono">
                      <strong>Erro/Detalhe:</strong> {record.errorDetail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
