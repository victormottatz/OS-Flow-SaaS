import React, { useState, useEffect, useRef } from "react";
import { DOCUMENT_TEMPLATES, DocumentTemplateId } from "../config/documents.config";
import WhatsAppAudioPlayer from "./whatsapp/WhatsAppAudioPlayer";
import WhatsAppMediaModal from "./whatsapp/WhatsAppMediaModal";
import WhatsAppAudioRecorder from "./whatsapp/WhatsAppAudioRecorder";
import { formatWhatsAppMessageReact } from "../utils/whatsappTextFormatter";

interface ClientData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpfCnpj?: string;
}

interface OrderData {
  id: string;
  osNumber: string;
  status: string;
  totalCost: number;
  deviceBrand?: string;
  deviceModel?: string;
  reportedDefect?: string;
  diagnostic?: string;
}

interface ChatItem {
  id: string;
  remoteJid: string;
  name: string | null;
  phoneNumber: string | null;
  profilePicUrl: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isArchived: boolean;
  clientId: string | null;
  client?: ClientData | null;
  activeOrderId: string | null;
  activeOrder?: OrderData | null;
}

function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 13 && clean.startsWith("55")) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith("55")) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return "";
}

function playWhatsAppTone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  } catch (_) {}
}

function resolveMessageMediaUrl(msg: MessageItem): string {
  if (msg.mediaUrl && (msg.mediaUrl.startsWith("data:") || msg.mediaUrl.startsWith("blob:"))) {
    return msg.mediaUrl;
  }
  // Rota resiliente protegida por controller: se o arquivo não estiver em disco, baixa da Evolution API sob demanda
  if (msg.id) {
    return `/api/whatsapp/messages/${msg.id}/media`;
  }
  return msg.mediaUrl || "";
}

function ContactAvatar({
  name,
  phone,
  profilePicUrl,
  size = "md",
  hasOrder = false
}: {
  name: string;
  phone: string;
  profilePicUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  hasOrder?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const displayName = name && !/^\d+$/.test(name) ? name : formatDisplayPhone(phone);
  const initials = displayName.substring(0, 2).toUpperCase();

  const sizeClasses = {
    sm: "w-9 h-9 rounded-xl text-xs",
    md: "w-11 h-11 rounded-2xl text-sm",
    lg: "w-11 h-11 rounded-xl text-sm",
    xl: "w-16 h-16 rounded-2xl text-lg"
  }[size];

  if (profilePicUrl && !imgError) {
    return (
      <div className={`${sizeClasses} overflow-hidden flex-shrink-0 shadow-md border ${hasOrder ? "border-amber-500/40 ring-1 ring-amber-500/30" : "border-slate-700"} bg-slate-900`}>
        <img
          src={profilePicUrl}
          alt={displayName}
          className="w-full h-full object-cover transition-transform hover:scale-105"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} flex items-center justify-center font-bold flex-shrink-0 shadow-md ${hasOrder ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
      {initials}
    </div>
  );
}

interface MessageItem {
  id: string;
  chatId: string;
  remoteJid: string;
  keyId?: string;
  fromMe: boolean;
  senderName: string | null;
  messageType: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
  text: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  errorDetail: string | null;
  timestamp: string;
  orderId: string | null;
}

interface WhatsAppInboxViewProps {
  onOpenOrderModal?: (orderId: string) => void;
}

export default function WhatsAppInboxView({ onOpenOrderModal }: WhatsAppInboxViewProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "with_os" | "contacts">("all");
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showOSSidebar, setShowOSSidebar] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string; text: string; docId?: string; withPdf: boolean } | null>(null);

  // Estados de Mídias, Gravação e Modal
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [mediaModalData, setMediaModalData] = useState<{
    isOpen: boolean;
    type: "IMAGE" | "DOCUMENT" | "VIDEO";
    src: string;
    fileName?: string;
    title?: string;
  } | null>(null);

  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === selectedChatId) || null;

  const handleCopyPhone = (e: React.MouseEvent, phoneToCopy?: string) => {
    e.stopPropagation();
    if (!phoneToCopy) return;
    const formatted = formatDisplayPhone(phoneToCopy) || phoneToCopy;
    navigator.clipboard.writeText(formatted);
    setCopiedPhone(phoneToCopy);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Sincronizar histórico da Evolution API / Celular
  const handleSyncHistory = async () => {
    setIsSyncing(true);
    setSyncStatusMsg("Sincronizando conversas com a Evolution API...");
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/whatsapp/sync-evolution", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg(`Sincronizado com sucesso! ${data.chatsCount || 0} conversas e ${data.messagesCount || 0} mensagens.`);
        await fetchChats();
        if (selectedChatId) fetchMessages(selectedChatId);
      } else {
        const errData = await res.json().catch(() => ({ error: "Falha na resposta do servidor" }));
        setSyncStatusMsg(errData.error || "Falha ao sincronizar conversas.");
      }
    } catch (err) {
      console.warn("Sincronização em background:", err);
      setSyncStatusMsg("Sincronização concluída! Atualizando lista de conversas...");
      setTimeout(fetchChats, 2000);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  // Importar arquivo .txt exportado do WhatsApp do celular
  const handleImportTxtFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId) return;

    setIsSyncing(true);
    setSyncStatusMsg("Importando arquivo de histórico...");
    try {
      const fileText = await file.text();
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/chats/${selectedChatId}/import-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileContent: fileText })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatusMsg(`Importadas ${data.imported || 0} mensagens com sucesso!`);
        await fetchMessages(selectedChatId);
      } else {
        setSyncStatusMsg(data.error || "Falha ao processar arquivo de histórico.");
      }
    } catch (err) {
      console.error("Erro ao importar arquivo:", err);
      setSyncStatusMsg("Erro ao ler arquivo.");
    } finally {
      setIsSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Carrega lista de chats do backend
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem("mgv_token");
      let url = `/api/whatsapp/chats?`;
      if (filterType !== "all") url += `filter=${filterType}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: ChatItem[] = await res.json();
        // Ordena estritamente com as mensagens mais recentes no topo
        const sorted = [...data].sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
        setChats(sorted);
        if (!selectedChatId && sorted.length > 0) {
          setSelectedChatId(sorted[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar chats de WhatsApp:", err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Carrega histórico de mensagens do chat selecionado
  const fetchMessages = async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        scrollToBottom(true);
      }
      // Marca conversa como lida
      fetch(`/api/whatsapp/chats/${chatId}/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [filterType, searchQuery]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId]);

  const selectedChatIdRef = useRef<string | null>(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Conexão SSE para atualizações instantâneas em tempo real com DEDUPLICAÇÃO e RECONEXÃO RESILIENTE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      const token = localStorage.getItem("mgv_token");
      eventSource = new EventSource(`/api/whatsapp/events?token=${token}`);

      eventSource.onopen = () => {
        // Conexão estabelecida com sucesso
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Tenta reconectar após 3 segundos
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            setupSSE();
          }, 3000);
        }
      };

      eventSource.addEventListener("new_message", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          const { chatId, message, chat } = payload;
          const currentOpenChatId = selectedChatIdRef.current;

          // Se a mensagem for do chat atualmente aberto na tela, adiciona na lista imediatamente
          if (currentOpenChatId && (currentOpenChatId === chatId || (chat && currentOpenChatId === chat.id))) {
            setMessages(prev => {
              const alreadyExists = prev.some(m => 
                (m.id && message.id && m.id === message.id) ||
                (m.keyId && message.keyId && m.keyId === message.keyId) ||
                (m.fromMe === message.fromMe && m.text === message.text && Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
              );
              if (alreadyExists) {
                return prev.map(m => (m.id === message.id || m.keyId === message.keyId) ? { ...m, ...message } : m);
              }
              return [...prev, message];
            });
            scrollToBottom();

            // Se a conversa aberta recebeu nova mensagem de cliente, marca como lida
            if (!message.fromMe) {
              const token = localStorage.getItem("mgv_token");
              fetch(`/api/whatsapp/chats/${chatId}/mark-read`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
              }).catch(() => {});
            }
          }

          // Toca som de notificação se a mensagem veio de um cliente
          if (message && !message.fromMe) {
            playWhatsAppTone();
            window.dispatchEvent(new Event("mgv_whatsapp_unread_changed"));
          }

          // Atualiza a lista lateral de chats e move a conversa mais recente para o topo imediatamente
          setChats(prev => {
            const index = prev.findIndex(c => c.id === chatId);
            let updated: ChatItem[];
            const isCurrentlyOpen = currentOpenChatId === chatId;

            if (index !== -1) {
              updated = [...prev];
              updated[index] = {
                ...updated[index],
                lastMessageText: message.text || `[${message.messageType}]`,
                lastMessageAt: message.timestamp || new Date().toISOString(),
                unreadCount: isCurrentlyOpen ? 0 : (message.fromMe ? updated[index].unreadCount : updated[index].unreadCount + 1),
                profilePicUrl: chat?.profilePicUrl || updated[index].profilePicUrl,
                name: chat?.name || updated[index].name
              };
            } else if (chat) {
              updated = [{
                ...chat,
                lastMessageText: message.text || `[${message.messageType}]`,
                lastMessageAt: message.timestamp || new Date().toISOString(),
                unreadCount: isCurrentlyOpen ? 0 : (message.fromMe ? 0 : (chat.unreadCount || 1))
              }, ...prev];
            } else {
              return prev;
            }
            return updated.sort((a, b) => {
              const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
              const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
              return timeB - timeA;
            });
          });
        } catch (err) {
          console.error("Erro ao processar SSE new_message:", err);
        }
      });

      eventSource.addEventListener("message_status_update", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          const { keyId, messageId, status } = payload;
          setMessages(prev => prev.map(m => {
            const match = (messageId && m.id === messageId) ||
                          (keyId && m.keyId === keyId) ||
                          (keyId && m.id === keyId);
            if (match) {
              return { ...m, status };
            }
            return m;
          }));
        } catch (err) {}
      });

      eventSource.addEventListener("chat_read", (e: any) => {
        try {
          const { chatId } = JSON.parse(e.data);
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
        } catch (err) {}
      });

      eventSource.addEventListener("chat_updated", (e: any) => {
        try {
          const { chat } = JSON.parse(e.data);
          if (chat?.id) {
            setChats(prev => {
              const index = prev.findIndex(c => c.id === chat.id);
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = { ...updated[index], ...chat };
                return updated;
              }
              return [chat, ...prev];
            });
          }
        } catch (err) {}
      });

      eventSource.addEventListener("chats_synced", () => {
        fetchChats();
        const activeId = selectedChatIdRef.current;
        if (activeId) fetchMessages(activeId);
      });
    };

    setupSSE();

    // Sincronização ao focar novamente a janela do navegador
    const handleWindowFocus = () => {
      fetchChats();
      const activeId = selectedChatIdRef.current;
      if (activeId) fetchMessages(activeId);
    };
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Polling silencioso de redundância (a cada 3 segundos) para sincronização instantânea
  useEffect(() => {
    const silentSyncInterval = setInterval(async () => {
      const token = localStorage.getItem("mgv_token");
      if (!token) return;

      // 1. Atualiza lista de chats silenciosamente
      try {
        let url = `/api/whatsapp/chats?`;
        if (filterType !== "all") url += `filter=${filterType}&`;
        if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery)}&`;

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const freshChats: ChatItem[] = await res.json();
          const sorted = [...freshChats].sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return timeB - timeA;
          });
          setChats(sorted);
        }
      } catch (err) {}

      // 2. Se a conversa estiver aberta na tela, atualiza as mensagens silenciosamente
      const activeId = selectedChatIdRef.current;
      if (activeId) {
        try {
          const res = await fetch(`/api/whatsapp/chats/${activeId}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const freshMessages: MessageItem[] = await res.json();
            setMessages(prev => {
              const hasNew = freshMessages.length !== prev.length || 
                (freshMessages.length > 0 && freshMessages[freshMessages.length - 1]?.id !== prev[prev.length - 1]?.id);
              if (hasNew) {
                scrollToBottom();
                return freshMessages;
              }
              return prev;
            });
          }
        } catch (err) {}
      }
    }, 2000);

    return () => clearInterval(silentSyncInterval);
  }, [filterType, searchQuery]);

  // Scroll isolado que NÃO movimenta o scroll geral da janela principal
  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: instant ? "auto" : "smooth"
        });
      }
    }, 50);
  };

  // Auto-ajuste de altura dinâmico do campo digitável conforme o texto digitado
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 24), 200);
    textarea.style.height = `${nextHeight}px`;
  };

  // Enviar mensagem de texto digitada (com deduplicação)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedChatId || isSending) return;

    const textToSend = messageText.trim();
    setMessageText("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
    }
    setIsSending(true);

    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/chats/${selectedChatId}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: textToSend })
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => {
          const alreadyExists = prev.some(m => (m.id && saved.id && m.id === saved.id) || (m.keyId && saved.keyId && m.keyId === saved.keyId));
          if (alreadyExists) return prev;
          return [...prev, saved];
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setIsSending(false);
      chatInputRef.current?.focus();
    }
  };

  // Enviar áudio gravado no microfone
  const handleSendAudio = async (audioBase64: string) => {
    if (!selectedChatId) return;
    setIsSending(true);

    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/chats/${selectedChatId}/send-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ audioBase64 })
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => {
          const alreadyExists = prev.some(m => (m.id && saved.id && m.id === saved.id) || (m.keyId && saved.keyId && m.keyId === saved.keyId));
          if (alreadyExists) return prev;
          return [...prev, saved];
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error("Erro ao enviar áudio:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Enviar foto ou documento selecionado pelo menu de anexo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "IMAGE" | "DOCUMENT") => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId) return;

    setIsSending(true);
    setAttachmentMenuOpen(false);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const fileBase64 = reader.result as string;
        const token = localStorage.getItem("mgv_token");
        const res = await fetch(`/api/whatsapp/chats/${selectedChatId}/send-media`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileBase64,
            fileName: file.name,
            mimeType: file.type,
            messageType: type,
            caption: ""
          })
        });

        if (res.ok) {
          const saved = await res.json();
          setMessages(prev => {
            const alreadyExists = prev.some(m => (m.id && saved.id && m.id === saved.id) || (m.keyId && saved.keyId && m.keyId === saved.keyId));
            if (alreadyExists) return prev;
            return [...prev, saved];
          });
          scrollToBottom();
        }
      };
    } catch (err) {
      console.error("Erro ao enviar anexo:", err);
    } finally {
      setIsSending(false);
      e.target.value = "";
    }
  };

  // Envia template de OS com documento em anexo (com deduplicação)
  const handleSendTemplate = async (template: { id: string; name: string; text: string; docId?: string; withPdf: boolean }) => {
    if (!selectedChatId || !activeChat?.activeOrder) return;

    setIsSending(true);
    setShowTemplateModal(false);

    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/chats/${selectedChatId}/send-template-os`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: activeChat.activeOrder.id,
          templateId: template.docId,
          messageText: template.text,
          includePdf: template.withPdf
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => {
          const alreadyExists = prev.some(m => (m.id && saved.id && m.id === saved.id) || (m.keyId && saved.keyId && m.keyId === saved.keyId));
          if (alreadyExists) return prev;
          return [...prev, saved];
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error("Erro ao enviar template de OS:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Prepara templates inteligentes com variáveis da OS ativa
  const getPreparedTemplates = () => {
    if (!activeChat) return [];
    const clientName = activeChat.client?.name || activeChat.name || "Cliente";
    const firstName = clientName.split(" ")[0];
    const os = activeChat.activeOrder;
    const osNum = os ? os.osNumber : "---";
    const brand = os?.deviceBrand || "";
    const model = os?.deviceModel || "Equipamento";
    const totalFormatted = (os?.totalCost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const linkPortal = `https://sistema.mgvrp.com.br/acompanhar?numero=${osNum}`;

    return [
      {
        id: "termo_entrada",
        name: "Termo de Entrada (com Laudo e Checklist)",
        docId: "termo_entrada",
        withPdf: true,
        text: `🩺 *Olá, ${firstName}! Tudo bem?*\n\nConfirmamos a entrada do seu equipamento *${brand} ${model}* em nosso laboratório técnico sob a *OS #${osNum}*.\n\n📎 *Segue em anexo o seu Termo de Recebimento com o checklist de entrada.*\n\nNossa equipe já iniciou a triagem e em breve enviaremos o laudo detalhado.\n\n💬 _Se precisar de qualquer informação, estamos à disposição!_`
      },
      {
        id: "orcamento",
        name: "Orçamento Detalhado (com PDF e Aprovação)",
        docId: "orcamento",
        withPdf: true,
        text: `📋 *Olá, ${firstName}!*\n\nA avaliação técnica do seu *${model}* (OS *#${osNum}*) foi finalizada com sucesso!\n\n💰 *Valor Total do Reparo:* *R$ ${totalFormatted}*\n📎 *Segue em anexo o Orçamento Oficial detalhado com o laudo pericial.*\n\n✨ *Para aprovar seu orçamento online, acesse:*\n🔗 ${linkPortal}\n\n💬 _Dúvidas? Basta responder esta mensagem!_`
      },
      {
        id: "aguardando_peca",
        name: "Aguardando Peças Originais",
        withPdf: false,
        text: `📦 *Olá, ${firstName}! Atualização sobre sua OS #${osNum}:*\n\nPara garantir a máxima confiabilidade no conserto do seu *${model}*, solicitamos componentes novos e originais de fábrica.\n\nAssim que as peças chegarem em nossa bancada, daremos prioridade imediata à montagem e calibração! ⚙️`
      },
      {
        id: "em_manutencao",
        name: "Em Manutenção Ativa na Bancada",
        withPdf: false,
        text: `⚙️ *Olá, ${firstName}!*\n\nInformamos que o conserto do seu equipamento *${model}* (OS *#${osNum}*) está em execução técnica ativa em nossa bancada especializada.\n\nEm breve entraremos na fase final de testes de estresse e aferição! 🔬`
      },
      {
        id: "pronto_retirada",
        name: "Equipamento Pronto para Retirada",
        docId: "recibo",
        withPdf: true,
        text: `🎉 *Ótima notícia, ${firstName}!* \n\nO seu equipamento *${model}* (OS *#${osNum}*) concluiu com sucesso todas as etapas de serviços técnicos e testes de qualidade!\n\n📍 *Já está pronto para retirada em nossa sede:*\n🏢 *Endereço:* Rua Julio Prestes, 648 - Jardim Sumaré, Ribeirão Preto - SP\n⏰ *Horário:* Segunda a Quinta das 08h às 18h | Sexta das 08h às 17h (Sábado e Domingo: Fechado)\n\n📎 *Em anexo segue o Laudo Técnico / Recibo do serviço.*\n\n💳 _Se preferir agilizar o pagamento via PIX, basta solicitar por aqui!_`
      },
      {
        id: "recibo_entrega",
        name: "Recibo de Entrega & Termo de Garantia",
        docId: "recibo_entrega",
        withPdf: true,
        text: `🤝 *Equipamento Entregue com Sucesso!*\n\nOlá, *${firstName}*! A Ordem de Serviço *#${osNum}* foi finalizada e o seu *${model}* foi entregue.\n\n📎 *Segue em anexo o seu Recibo Oficial com o Termo de Garantia de 90 dias.*\n\nFoi um prazer atendê-lo(a)! Se precisar de qualquer suporte técnico ou novas manutenções, estamos sempre à sua disposição. 🌟`
      }
    ];
  };

  // Formata hora amigável
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateLabel = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Hoje";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="flex h-full max-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden animate-fadein">
      {/* ========================================================================= */}
      {/* 🟢 COLUNA 1: LISTA LATERAL DE CONVERSAS (CHATS)                           */}
      {/* ========================================================================= */}
      <div className="w-80 md:w-96 flex-shrink-0 bg-slate-900/90 border-r border-slate-800 flex flex-col h-full overflow-hidden">
        {/* Cabeçalho da Lista */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide text-white uppercase">Central WhatsApp</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Instância Conectada</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSyncHistory}
            disabled={isSyncing}
            className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isSyncing
                ? "bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed"
                : "bg-slate-800/80 hover:bg-slate-800 text-secondary-container hover:text-white border-slate-700 hover:border-slate-600 shadow-sm active:scale-95"
            }`}
            title="Sincronizar conversas e mensagens do WhatsApp"
          >
            <span className={`material-symbols-outlined text-base ${isSyncing ? "animate-spin" : ""}`}>sync</span>
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>

        {/* Banner de Status de Sincronização */}
        {syncStatusMsg && (
          <div className="px-4 py-2 bg-secondary-container/10 border-b border-secondary-container/20 text-[11px] font-bold text-secondary-container flex items-center gap-2 flex-shrink-0 animate-fadein">
            <span className="material-symbols-outlined text-sm animate-pulse">info</span>
            <span className="truncate">{syncStatusMsg}</span>
          </div>
        )}

        {/* Campo de Busca & Filtros Rápidos */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/50 flex-shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Buscar cliente, telefone ou OS..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-secondary-container transition-all"
            />
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex-shrink-0 ${filterType === "all" ? "bg-secondary-container text-primary-container shadow-sm" : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType("with_os")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 ${filterType === "with_os" ? "bg-amber-500 text-slate-950 shadow-sm" : "bg-slate-800/70 text-slate-400 hover:text-amber-400 hover:bg-slate-800"}`}
            >
              <span className="material-symbols-outlined text-[13px]">assignment</span>
              <span>Com OS</span>
              {chats.filter(c => Boolean(c.activeOrder)).length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterType === "with_os" ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {chats.filter(c => Boolean(c.activeOrder)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterType("contacts")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 ${filterType === "contacts" ? "bg-emerald-500 text-slate-950 shadow-sm" : "bg-slate-800/70 text-slate-400 hover:text-emerald-400 hover:bg-slate-800"}`}
            >
              <span className="material-symbols-outlined text-[13px]">contacts</span>
              <span>Contatos</span>
              {chats.filter(c => !c.activeOrder).length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterType === "contacts" ? "bg-slate-950 text-emerald-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {chats.filter(c => !c.activeOrder).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterType("unread")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 ${filterType === "unread" ? "bg-secondary-container text-primary-container shadow-sm" : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <span>Não Lidas</span>
              {chats.filter(c => c.unreadCount > 0).length > 0 && (
                <span className="bg-emerald-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {chats.filter(c => c.unreadCount > 0).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Lista com Scroll Independente */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/40 scrollbar-minimal">
          {isLoadingChats ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <span className="material-symbols-outlined text-3xl animate-spin mb-2">progress_activity</span>
              <p>Carregando conversas...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">chat_bubble_outline</span>
              <p>Nenhuma conversa encontrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {chats.map(chat => {
                const isSelected = chat.id === selectedChatId;
                const displayName = chat.client?.name || (chat.name && !/^\d+$/.test(chat.name) ? chat.name : (formatDisplayPhone(chat.phoneNumber) || "Contato WhatsApp"));

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-800/50 ${
                      isSelected
                        ? "bg-slate-800/90 border-l-4 border-emerald-500 shadow-inner"
                        : "hover:bg-slate-800/30"
                    }`}
                  >
                    <ContactAvatar
                      name={displayName}
                      phone={chat.phoneNumber}
                      profilePicUrl={chat.profilePicUrl}
                      size="md"
                      hasOrder={Boolean(chat.activeOrder)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className={`font-bold text-xs truncate ${isSelected ? "text-white" : chat.unreadCount > 0 ? "text-emerald-300 font-extrabold" : "text-slate-200"}`}>
                            {displayName}
                          </h4>
                          {chat.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" title="Novas mensagens recebidas"></span>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium flex-shrink-0 ${chat.unreadCount > 0 ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                          {formatTime(chat.lastMessageAt) || formatDateLabel(chat.lastMessageAt)}
                        </span>
                      </div>

                      {/* Telefone Visível */}
                      {chat.phoneNumber && (
                        <div className="text-[10px] text-emerald-400/80 font-mono mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">call</span>
                          <span>{formatDisplayPhone(chat.phoneNumber) || chat.phoneNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate flex-1 ${chat.unreadCount > 0 ? "font-bold text-white" : "text-slate-400"}`}>
                          {chat.lastMessageText || "Nova conversa iniciada..."}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-slate-950 font-black text-xs min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30 border border-emerald-300/50 animate-bounce">
                            {chat.unreadCount > 99 ? "+99" : chat.unreadCount}
                          </span>
                        )}
                      </div>

                      {chat.activeOrder && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">build</span>
                            <span>OS #{chat.activeOrder.osNumber}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {chat.activeOrder.deviceBrand} {chat.activeOrder.deviceModel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💬 COLUNA 2: JANELA DE CHAT ATIVA                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-slate-950 relative min-w-0 h-full overflow-hidden">
        {activeChat ? (
          <>
            {/* Topbar do Chat */}
            <div className="p-3.5 px-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <ContactAvatar
                  name={activeChat.client?.name || activeChat.name}
                  phone={activeChat.phoneNumber}
                  profilePicUrl={activeChat.profilePicUrl}
                  size="md"
                  hasOrder={Boolean(activeChat.activeOrder)}
                />
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-white truncate flex items-center gap-2">
                    <span>{activeChat.client?.name || (activeChat.name && !/^\d+$/.test(activeChat.name) ? activeChat.name : (formatDisplayPhone(activeChat.phoneNumber) || "Contato WhatsApp"))}</span>
                    {activeChat.client && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-bold">
                        Cliente Cadastrado
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    {activeChat.phoneNumber ? (
                      <button
                        onClick={(e) => handleCopyPhone(e, activeChat.phoneNumber)}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-700/60 transition-all active:scale-95 cursor-pointer text-[11px] font-semibold group"
                        title="Clique para copiar o número de telefone"
                      >
                        <span className="material-symbols-outlined text-[13px] text-emerald-400">call</span>
                        <span>{formatDisplayPhone(activeChat.phoneNumber) || activeChat.phoneNumber}</span>
                        <span className={`material-symbols-outlined text-[13px] transition-colors ${copiedPhone === activeChat.phoneNumber ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                          {copiedPhone === activeChat.phoneNumber ? "check" : "content_copy"}
                        </span>
                        {copiedPhone === activeChat.phoneNumber && (
                          <span className="text-[10px] text-emerald-400 font-bold ml-0.5 animate-fadein">Copiado!</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-emerald-400">chat</span>
                        <span>Conversa WhatsApp</span>
                      </span>
                    )}
                    {activeChat.activeOrder && (
                      <span className="text-amber-400 font-semibold truncate">
                        • OS #{activeChat.activeOrder.osNumber} ({activeChat.activeOrder.deviceModel})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Topbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3 py-1.5 bg-secondary-container hover:bg-secondary-container-hover text-primary-container rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Carregar Template Rápido da OS"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span>Templates de OS</span>
                </button>

                <button
                  onClick={() => setShowOSSidebar(!showOSSidebar)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${showOSSidebar ? "bg-slate-800 text-secondary-container border-slate-700" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"}`}
                  title={showOSSidebar ? "Ocultar Painel da OS" : "Exibir Painel da OS"}
                >
                  <span className="material-symbols-outlined text-lg">dock_to_left</span>
                </button>
              </div>
            </div>

            {/* Linha do Tempo de Mensagens com SCROLL ISOLADO INDEPENDENTE */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-3.5 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] scrollbar-minimal">
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  <span className="material-symbols-outlined text-3xl animate-spin mb-2">progress_activity</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <span className="material-symbols-outlined text-4xl text-slate-600">forum</span>
                  <p>Início da conversa com este cliente.</p>
                  <p className="text-[11px] text-slate-600">Envie uma mensagem ou selecione um template acima.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.fromMe;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"} animate-fadein`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3.5 shadow-md relative ${
                          isMine
                            ? "bg-emerald-900/70 border border-emerald-700/50 text-emerald-50 rounded-tr-none"
                            : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                        }`}
                      >
                        {/* Remetente em atendimento multi-usuário */}
                        {msg.senderName && (
                          <div className="text-[10px] font-bold opacity-75 mb-1">
                            <span className={isMine ? "text-emerald-300" : "text-amber-400"}>
                              {msg.senderName}
                            </span>
                          </div>
                        )}

                        {/* Conteúdo de Mídia - ÁUDIO */}
                        {msg.messageType === "AUDIO" && (
                          <div className="mb-2">
                            <WhatsAppAudioPlayer src={resolveMessageMediaUrl(msg)} isMine={isMine} />
                          </div>
                        )}

                        {/* Conteúdo de Mídia - IMAGEM */}
                        {msg.messageType === "IMAGE" && (
                          <div
                            className="mb-2 rounded-xl overflow-hidden cursor-pointer group relative max-w-[280px] bg-slate-950 border border-slate-800"
                            onClick={() => setMediaModalData({
                              isOpen: true,
                              type: "IMAGE",
                              src: resolveMessageMediaUrl(msg),
                              fileName: msg.fileName || "foto.jpg",
                              title: msg.text || "Foto do WhatsApp"
                            })}
                          >
                            <img
                              src={resolveMessageMediaUrl(msg)}
                              alt={msg.fileName || "Foto"}
                              className="w-full max-h-60 object-cover rounded-xl transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                              <span className="material-symbols-outlined text-2xl">zoom_in</span>
                              <span className="text-xs font-bold">Ampliar</span>
                            </div>
                          </div>
                        )}

                        {/* Conteúdo de Mídia - VÍDEO */}
                        {msg.messageType === "VIDEO" && (
                          <div className="mb-2 rounded-xl overflow-hidden max-w-[280px] bg-slate-950 border border-slate-800">
                            <video
                              src={resolveMessageMediaUrl(msg)}
                              controls
                              className="w-full max-h-60 object-cover rounded-xl"
                            />
                          </div>
                        )}

                        {/* Conteúdo de Mídia - DOCUMENTO PDF */}
                        {msg.messageType === "DOCUMENT" && (
                          <div className="mb-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 shadow-md">
                                <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate max-w-[160px] md:max-w-[200px]">
                                  {msg.fileName || "Documento-Oficial.pdf"}
                                </p>
                                <span className="text-[10px] text-slate-400">Documento Oficial</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setMediaModalData({
                                  isOpen: true,
                                  type: "DOCUMENT",
                                  src: resolveMessageMediaUrl(msg),
                                  fileName: msg.fileName || "Documento.pdf",
                                  title: msg.fileName || "Documento Oficial"
                                })}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-secondary-container transition-all cursor-pointer"
                                title="Visualizar PDF"
                              >
                                <span className="material-symbols-outlined text-base">visibility</span>
                              </button>
                              <a
                                href={resolveMessageMediaUrl(msg)}
                                download={msg.fileName || "documento.pdf"}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                title="Baixar arquivo"
                              >
                                <span className="material-symbols-outlined text-base">download</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Texto da Mensagem (Oculta se for apenas placeholder de áudio/mídia) */}
                        {msg.text && (msg.messageType === "TEXT" || (msg.messageType !== "AUDIO" && !msg.text.startsWith("🎵") && !msg.text.startsWith("📷") && !msg.text.startsWith("🎥") && !msg.text.startsWith("📄"))) && (
                          <div className="text-xs whitespace-pre-wrap leading-relaxed font-sans select-text">
                            {formatWhatsAppMessageReact(msg.text)}
                          </div>
                        )}

                        {/* Rodapé do Balão: Horário + Vistos do WhatsApp no canto inferior direito */}
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] select-none ${isMine ? "text-emerald-300/80" : "text-slate-400"}`}>
                          <span className="opacity-75 font-mono text-[10px] leading-none">
                            {formatTime(msg.timestamp)}
                          </span>

                          {isMine && (
                            <span className="inline-flex items-center ml-0.5">
                              {/* 🕒 Pendente / Enviando */}
                              {msg.status === "PENDING" && (
                                <span
                                  className="material-symbols-outlined text-[13px] text-emerald-200/70 animate-pulse"
                                  title="Enviando mensagem..."
                                >
                                  schedule
                                </span>
                              )}

                              {/* ✓ 1 Visto: Enviado ao servidor WhatsApp */}
                              {msg.status === "SENT" && (
                                <span
                                  className="material-symbols-outlined text-[14px] text-emerald-200/80"
                                  title="Enviada ao WhatsApp"
                                >
                                  done
                                </span>
                              )}

                              {/* ✓✓ 2 Vistos Cinzas: Entregue no aparelho do cliente */}
                              {msg.status === "DELIVERED" && (
                                <span
                                  className="material-symbols-outlined text-[14px] text-emerald-200/90"
                                  title="Entregue no aparelho do cliente"
                                >
                                  done_all
                                </span>
                              )}

                              {/* ✓✓ 2 Vistos Azuis: Lido / Visualizado pelo cliente */}
                              {msg.status === "READ" && (
                                <span
                                  className="material-symbols-outlined text-[14px] text-[#53bdeb] font-bold"
                                  title="Lida pelo cliente"
                                >
                                  done_all
                                </span>
                              )}

                              {/* ⚠️ Erro no envio */}
                              {msg.status === "FAILED" && (
                                <span
                                  className="material-symbols-outlined text-[14px] text-rose-400"
                                  title={msg.errorDetail || "Erro ao entregar mensagem"}
                                >
                                  error
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé de Envio / Composição */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex-shrink-0 relative">
              {/* Inputs Ocultos de Upload */}
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*,video/*"
                onChange={e => handleFileUpload(e, "IMAGE")}
                className="hidden"
              />
              <input
                type="file"
                ref={docInputRef}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={e => handleFileUpload(e, "DOCUMENT")}
                className="hidden"
              />

              {/* Menu Flutuante de Anexos */}
              {attachmentMenuOpen && (
                <div className="absolute bottom-16 left-4 z-40 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl space-y-1 animate-fadein min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentMenuOpen(false);
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-all text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">image</span>
                    </div>
                    <span>Foto ou Vídeo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentMenuOpen(false);
                      docInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-all text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">description</span>
                    </div>
                    <span>Documento / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentMenuOpen(false);
                      setShowTemplateModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-all text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">bolt</span>
                    </div>
                    <span>Documento da OS</span>
                  </button>
                </div>
              )}

              {/* Modo de Gravação de Áudio Ativo */}
              {isRecordingAudio ? (
                <WhatsAppAudioRecorder
                  onSendAudio={handleSendAudio}
                  onCancel={() => setIsRecordingAudio(false)}
                />
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  {/* Botão de Anexo (+) */}
                  <button
                    type="button"
                    onClick={() => setAttachmentMenuOpen(prev => !prev)}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
                      attachmentMenuOpen
                        ? "bg-secondary-container text-primary-container"
                        : "bg-slate-800 text-slate-300 hover:text-secondary-container hover:bg-slate-700"
                    }`}
                    title="Anexar arquivo, foto ou documento"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {attachmentMenuOpen ? "close" : "attach_file"}
                    </span>
                  </button>

                  {/* Botão de Templates Rápidos */}
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-all cursor-pointer flex-shrink-0"
                    title="Templates Rápidos de OS"
                  >
                    <span className="material-symbols-outlined text-xl">bolt</span>
                  </button>

                  {/* Campo de Texto Digitável */}
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 focus-within:border-secondary-container transition-all flex items-center">
                    <textarea
                      ref={chatInputRef}
                      rows={1}
                      value={messageText}
                      onChange={handleTextareaChange}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para quebra de linha)"
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed transition-[height] duration-75 overflow-y-auto scrollbar-minimal"
                      style={{ minHeight: "22px", maxHeight: "200px" }}
                    />
                  </div>

                  {/* Botão de Gravar Áudio (Microfone) ou Botão de Enviar Texto */}
                  {messageText.trim() ? (
                    <button
                      type="submit"
                      disabled={!messageText.trim() || isSending}
                      className="p-3 rounded-2xl flex items-center justify-center font-bold transition-all shadow-md flex-shrink-0 cursor-pointer bg-secondary-container text-primary-container hover:bg-secondary-container-hover hover:scale-105 active:scale-95"
                      title="Enviar Mensagem"
                    >
                      {isSending ? (
                        <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-xl">send</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRecordingAudio(true)}
                      className="p-3 rounded-2xl flex items-center justify-center font-bold transition-all shadow-md flex-shrink-0 cursor-pointer bg-slate-800 text-slate-200 hover:text-emerald-400 hover:bg-slate-700 active:scale-95"
                      title="Gravar mensagem de voz"
                    >
                      <span className="material-symbols-outlined text-xl">mic</span>
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-secondary-container shadow-xl">
              <span className="material-symbols-outlined text-3xl">chat</span>
            </div>
            <h3 className="font-bold text-white text-sm">Selecione uma conversa</h3>
            <p className="text-xs text-slate-500 max-w-sm text-center">
              Escolha um contato na lista lateral para iniciar o atendimento ou envie notificações automáticas vinculadas às Ordens de Serviço.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📱 COLUNA 3: PAINEL DE CONTEXTO DA OS & CLIENTE                           */}
      {/* ========================================================================= */}
      {showOSSidebar && activeChat && (
        <div className="w-80 flex-shrink-0 bg-slate-900/90 border-l border-slate-800 flex flex-col h-full overflow-hidden animate-fadein">
          {/* Cabeçalho do Painel */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-container text-base">person</span>
              <span>Dados do Cliente & OS</span>
            </h3>
          </div>

          <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto scrollbar-minimal">
            {/* Card do Perfil WhatsApp com Foto e Botão de Copiar Telefone */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 shadow-sm">
              <div className="flex items-center gap-3.5">
                <ContactAvatar
                  name={activeChat.client?.name || activeChat.name}
                  phone={activeChat.phoneNumber}
                  profilePicUrl={activeChat.profilePicUrl}
                  size="xl"
                  hasOrder={Boolean(activeChat.activeOrder)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Perfil WhatsApp</span>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("mgv_auth_token") || localStorage.getItem("mgv_token");
                          const res = await fetch(`/api/whatsapp/chats/${activeChat.id}/refresh-avatar`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (data.profilePicUrl) {
                            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, profilePicUrl: data.profilePicUrl } : c));
                          }
                        } catch (_) {}
                      }}
                      title="Recarregar foto do WhatsApp"
                      className="text-slate-500 hover:text-secondary-container transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-xs">sync</span>
                    </button>
                  </div>
                  <h4 className="font-black text-sm text-white truncate">
                    {activeChat.client?.name || (activeChat.name && !/^\d+$/.test(activeChat.name) ? activeChat.name : (formatDisplayPhone(activeChat.phoneNumber) || "Contato WhatsApp"))}
                  </h4>
                  {activeChat.name && activeChat.client && activeChat.name !== activeChat.client.name && !/^\d+$/.test(activeChat.name) && (
                    <p className="text-[11px] text-slate-400 truncate">WhatsApp: {activeChat.name}</p>
                  )}
                </div>
              </div>

              {/* Linha de Telefone com Botão de Copiar */}
              {activeChat.phoneNumber ? (
                <div className="pt-2.5 border-t border-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="material-symbols-outlined text-sm text-emerald-400">call</span>
                    <span className="font-mono font-medium">{formatDisplayPhone(activeChat.phoneNumber) || activeChat.phoneNumber}</span>
                  </div>
                  <button
                    onClick={(e) => handleCopyPhone(e, activeChat.phoneNumber)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 flex items-center gap-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                    title="Copiar número de telefone"
                  >
                    <span className={`material-symbols-outlined text-xs ${copiedPhone === activeChat.phoneNumber ? "text-emerald-400" : "text-slate-400"}`}>
                      {copiedPhone === activeChat.phoneNumber ? "check" : "content_copy"}
                    </span>
                    <span className={copiedPhone === activeChat.phoneNumber ? "text-emerald-400" : ""}>
                      {copiedPhone === activeChat.phoneNumber ? "Copiado!" : "Copiar"}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-900 text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-slate-500">chat</span>
                  <span>Conversa via WhatsApp Web</span>
                </div>
              )}

              {activeChat.client?.cpfCnpj && (
                <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-slate-500">badge</span>
                  <span>CPF/CNPJ: {activeChat.client.cpfCnpj}</span>
                </div>
              )}
            </div>

            {/* Card da Ordem de Serviço */}
            {activeChat.activeOrder ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    OS #{activeChat.activeOrder.osNumber}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{activeChat.activeOrder.status}</span>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-white">
                    {activeChat.activeOrder.deviceBrand} {activeChat.activeOrder.deviceModel}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    <strong className="text-slate-300">Defeito:</strong> {activeChat.activeOrder.reportedDefect || "Não informado"}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Valor Orçamento:</span>
                  <span className="text-sm font-black text-emerald-400">
                    R$ {(activeChat.activeOrder.totalCost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Botão para abrir modal completo da OS */}
                {onOpenOrderModal && (
                  <button
                    onClick={() => onOpenOrderModal(activeChat.activeOrder!.id)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-secondary-container rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>Abrir OS Completa</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500 space-y-2">
                <span className="material-symbols-outlined text-2xl text-slate-600">link_off</span>
                <p>Nenhuma Ordem de Serviço vinculada a esta conversa.</p>
              </div>
            )}

            {/* Ações Rápidas em 1 Clique */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ações Rápidas</span>

              <button
                onClick={() => setShowTemplateModal(true)}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2.5 transition-all cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-secondary-container/20 text-secondary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                </div>
                <span>Disparar Template de OS</span>
              </button>

              <button
                onClick={() => {
                  const firstName = (activeChat.client?.name || activeChat.name || "Cliente").split(" ")[0];
                  setMessageText(`💳 *Chave PIX da MGV Assistência Técnica:*\n\n🔑 *Chave CNPJ:* 12.345.678/0001-90\n🏦 *Banco:* Cora SCD\n👤 *Favorecido:* MGV Assistência Técnica LTDA\n\n_Favor nos enviar o comprovante por aqui assim que efetuar o pagamento!_ ✨`);
                  chatInputRef.current?.focus();
                }}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2.5 transition-all cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-sm">qr_code_2</span>
                </div>
                <span>Enviar Dados do PIX</span>
              </button>

              <div className="pt-2 border-t border-slate-800/80">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".txt"
                  onChange={handleImportTxtFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSyncing}
                  className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-2.5 transition-all cursor-pointer text-left"
                  title="Importa arquivo .txt exportado do WhatsApp do celular"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">Importar Conversa (.txt)</p>
                    <span className="text-[10px] text-slate-500 block truncate">Backup exportado do celular</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚡ MODAL DE SELEÇÃO DE TEMPLATES RÁPIDOS                                   */}
      {/* ========================================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadein">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary-container text-2xl">bolt</span>
                <h3 className="font-black text-sm text-white uppercase">Templates Inteligentes de OS</h3>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Selecione uma mensagem estruturada com substituição automática de dados da OS e geração de documento em PDF:
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-minimal">
              {getPreparedTemplates().map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleSendTemplate(tpl)}
                  className="p-3.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-secondary-container rounded-xl cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white group-hover:text-secondary-container transition-colors flex items-center gap-2">
                      <span>{tpl.name}</span>
                      {tpl.withPdf && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.2 rounded font-bold border border-red-500/30">
                          + PDF
                        </span>
                      )}
                    </h5>
                    <span className="material-symbols-outlined text-slate-500 group-hover:text-secondary-container text-sm">send</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic font-serif">
                    {tpl.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🖼️ MODAL LIGHTBOX / VISUALIZADOR DE MÍDIAS (IMAGENS, PDFS, VÍDEOS)          */}
      {/* ========================================================================= */}
      {mediaModalData && (
        <WhatsAppMediaModal
          isOpen={mediaModalData.isOpen}
          onClose={() => setMediaModalData(null)}
          type={mediaModalData.type}
          src={mediaModalData.src}
          fileName={mediaModalData.fileName}
          title={mediaModalData.title}
        />
      )}
    </div>
  );
}

