import React, { useState, useEffect, useRef } from "react";

export interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  className?: string;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: Array<{ char: string; keywords: string }>;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "mgv",
    name: "Mais Usados MGV",
    icon: "star",
    emojis: [
      { char: "👋", keywords: "ola oi tchau mao aceno saudacao" },
      { char: "🔧", keywords: "chave manutencao conserto ferramenta reparo tecnico" },
      { char: "🛠️", keywords: "ferramentas oficina assistencia martelo chave" },
      { char: "✅", keywords: "ok aprovado concluido pronto sucesso check certo" },
      { char: "⚠️", keywords: "alerta atencao aviso cuidado perigo pendencia" },
      { char: "❌", keywords: "cancelado reprovado erro nao recusado x" },
      { char: "💰", keywords: "dinheiro valor preco pagamento total orcamento" },
      { char: "💳", keywords: "cartao pagamento credito debito pix" },
      { char: "🧾", keywords: "recibo nota fiscal comprovante fatura" },
      { char: "📦", keywords: "caixa encomenda pacote peca produto entrega envio" },
      { char: "🚀", keywords: "foguete rapidez agilidade lancamento rapido" },
      { char: "📱", keywords: "celular smartphone aparelho telefone tela bateria" },
      { char: "💻", keywords: "notebook laptop computador pc placa" },
      { char: "⚡", keywords: "energia raio eletrico rapido choque fonte" },
      { char: "📄", keywords: "documento contrato termo laudo folha pdf" },
      { char: "🕒", keywords: "relogio tempo prazo horario aguardando espera" },
      { char: "💬", keywords: "mensagem conversa chat whatsapp atendimento" },
      { char: "📞", keywords: "telefone ligacao contato chamada" },
      { char: "🤝", keywords: "acordo aperto maos parceria combinado fechado" },
      { char: "👍", keywords: "positivo joinha legal sim confirmado aprovado" },
      { char: "🙏", keywords: "obrigado agradecido por favor gratidao" },
      { char: "🔍", keywords: "busca analise diagnostico lupa inspecao verificar" },
      { char: "🔒", keywords: "seguranca protegido garantia bloqueado senha" },
      { char: "🏷️", keywords: "etiqueta modelo marca serial tag" }
    ]
  },
  {
    id: "faces",
    name: "Expressões",
    icon: "sentiment_satisfied",
    emojis: [
      { char: "😀", keywords: "sorriso feliz alegre contente" },
      { char: "😃", keywords: "sorriso olhos abertos feliz" },
      { char: "😄", keywords: "sorriso feliz rindo" },
      { char: "😁", keywords: "sorriso dentes contente" },
      { char: "😆", keywords: "risada gargalhada animado" },
      { char: "😅", keywords: "suor alivio ufa quase" },
      { char: "😂", keywords: "rindo chorando risos kkk" },
      { char: "🤣", keywords: "rolando de rir risada" },
      { char: "😊", keywords: "timido feliz fofo simpatia" },
      { char: "😇", keywords: "anjo inocente halo" },
      { char: "🙂", keywords: "sorriso leve ok simpatico" },
      { char: "😉", keywords: "piscada combinou certeza" },
      { char: "😌", keywords: "alivio calmo tranquilo paz" },
      { char: "😍", keywords: "amor coracao apaixonado amei" },
      { char: "🥰", keywords: "carinho amavel afeto" },
      { char: "😘", keywords: "beijo carinho abraco" },
      { char: "😋", keywords: "delicia saboroso gostoso" },
      { char: "😎", keywords: "oculos escuros top legal estilo chefe" },
      { char: "🤩", keywords: "estrelas impressionado uau incrivel" },
      { char: "🥳", keywords: "festa comemoracao parabens aniversario" },
      { char: "🤔", keywords: "pensando duvida analisando reflexao" },
      { char: "🫡", keywords: "continencia respeito ordem entendido" },
      { char: "🤫", keywords: "segredo silencio quieto" },
      { char: "😴", keywords: "sono dormindo descansando" },
      { char: "🤒", keywords: "doente termometro febre" },
      { char: "🤯", keywords: "mente explodindo impressionante uau" },
      { char: "🥺", keywords: "pedindo por favor fofo emocionado" },
      { char: "😭", keywords: "chorando triste lagrimas" }
    ]
  },
  {
    id: "gestures",
    name: "Gestos & Mãos",
    icon: "front_hand",
    emojis: [
      { char: "👍", keywords: "positivo joinha legal sim aprovado" },
      { char: "👎", keywords: "negativo desaprovado nao ruim" },
      { char: "👏", keywords: "palmas parabens aplausos sucesso" },
      { char: "🙌", keywords: "comemoracao maos para o alto vitoria" },
      { char: "👐", keywords: "maos abertas acolhimento" },
      { char: "🤲", keywords: "maos juntas oferta oracao" },
      { char: "🤝", keywords: "aperto de maos acordo parceria fechar" },
      { char: "✍️", keywords: "escrevendo assinatura assinar anotacao" },
      { char: "🤞", keywords: "dedos cruzados torcendo sorte" },
      { char: "✌️", keywords: "paz dois vitoria v" },
      { char: "🤟", keywords: "te amo paz amor rock" },
      { char: "🤘", keywords: "rock metal chifre" },
      { char: "🤙", keywords: "ligue me de boa prancha hang loose" },
      { char: "👈", keywords: "esquerda apontar para ca" },
      { char: "👉", keywords: "direita apontar veja link" },
      { char: "👆", keywords: "cima apontar link acima" },
      { char: "👇", keywords: "baixo apontar link abaixo veja" },
      { char: "✋", keywords: "pare mao aberta alto cinco" },
      { char: "🖐️", keywords: "cinco dedos espalmada" },
      { char: "🙋‍♂️", keywords: "homem levantando a mao eu duvida" },
      { char: "🙋‍♀️", keywords: "mulher levantando a mao eu duvida" },
      { char: "🫂", keywords: "abraco pessoas apoio" }
    ]
  },
  {
    id: "tech",
    name: "Assistência & Tecnologia",
    icon: "build",
    emojis: [
      { char: "🔧", keywords: "chave inglesa manutencao reparo" },
      { char: "🔨", keywords: "martelo construcao obra reparo" },
      { char: "🛠️", keywords: "ferramentas suporte oficina" },
      { char: "⚙️", keywords: "engrenagem configuracao ajuste sistema" },
      { char: "🔩", keywords: "parafuso porca fixacao peca" },
      { char: "🪛", keywords: "chave de fenda fenda philips abertura" },
      { char: "🧰", keywords: "maleta de ferramentas kit reparo" },
      { char: "🔌", keywords: "tomada plug cabo conexao eletricidade" },
      { char: "🔋", keywords: "bateria cheia carga energia" },
      { char: "🪫", keywords: "bateria fraca descarregada sem energia" },
      { char: "💻", keywords: "notebook laptop computador tela display" },
      { char: "🖥️", keywords: "computador desktop monitor gabinete" },
      { char: "🖨️", keywords: "impressora fiscal laser jato papel" },
      { char: "📱", keywords: "celular telefone touch smartphone" },
      { char: "📲", keywords: "celular com seta mensagem chamada" },
      { char: "🕹️", keywords: "controle game console joystick" },
      { char: "💾", keywords: "disquete salvar backup memoria ssd hd" },
      { char: "💿", keywords: "cd dvd disco midia" },
      { char: "🧲", keywords: "ima magnetico atracao sensor" },
      { char: "💡", keywords: "lampada ideia luz solucao" },
      { char: "🏷️", keywords: "etiqueta valor preco marca" },
      { char: "📦", keywords: "pacote caixa entrega envio" },
      { char: "🛒", keywords: "carrinho compras pecas pedido" },
      { char: "📡", keywords: "antena sinal rede wifi conectividade" },
      { char: "🔒", keywords: "cadeado tranca seguranca travado" },
      { char: "🔑", keywords: "chave acesso login permissao" }
    ]
  },
  {
    id: "symbols",
    name: "Símbolos & Status",
    icon: "check_circle",
    emojis: [
      { char: "✅", keywords: "check aprovado sim pronto verde correto" },
      { char: "❌", keywords: "x erro cancelado reprovado errado vermelho" },
      { char: "⚠️", keywords: "alerta aviso amarelo atencao perigo" },
      { char: "ℹ️", keywords: "informacao detalhe aviso sobre" },
      { char: "🟢", keywords: "verde online ativo funcionando liberado" },
      { char: "🟡", keywords: "amarelo aguardando pendente em andamento" },
      { char: "🔴", keywords: "vermelho parado bloqueado urgente erro" },
      { char: "🔵", keywords: "azul informativo ordem servico" },
      { char: "🟣", keywords: "roxo especial cliente vip" },
      { char: "💰", keywords: "dinheiro saco valor preco pagamento" },
      { char: "💳", keywords: "cartao credito debito parcelamento" },
      { char: "💵", keywords: "nota dinheiro reais pagamento a vista" },
      { char: "🧾", keywords: "recibo comprovante cupom fatura" },
      { char: "📅", keywords: "calendario data agendamento dia" },
      { char: "⏰", keywords: "despertador horario prazo alerta" },
      { char: "⏳", keywords: "ampulheta tempo aguardando processando" },
      { char: "🔒", keywords: "cadeado fechado seguro" },
      { char: "🔓", keywords: "cadeado aberto desbloqueado livre" },
      { char: "🎯", keywords: "alvo meta objetivo concluido" },
      { char: "🚀", keywords: "foguete agilidade lancamento" },
      { char: "⭐", keywords: "estrela destaque favorito avaliacao" },
      { char: "🌟", keywords: "estrela brilhante especial excelente" },
      { char: "🔔", keywords: "sino notificacao aviso lembrete" },
      { char: "📌", keywords: "fixar tachinha importante destaque" },
      { char: "📍", keywords: "localizacao endereco ponto mapa" },
      { char: "💯", keywords: "cem perfeito nota 100 maximo" }
    ]
  }
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  className = ""
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("mgv");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Foco no campo de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Fechar ao clicar fora ou apertar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtragem de emojis pela busca
  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap(cat => cat.emojis).filter(item => {
        const query = searchQuery.toLowerCase().trim();
        return item.keywords.toLowerCase().includes(query) || item.char.includes(query);
      })
    : [];

  const currentCategoryObj = EMOJI_CATEGORIES.find(cat => cat.id === activeCategory);

  return (
    <div
      ref={popoverRef}
      className={`absolute bottom-full mb-2 left-0 z-50 w-80 md:w-96 max-h-[380px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100 ${className}`}
    >
      {/* Cabeçalho de Busca */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar emoji (ex: chave, ok, dinheiro)..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-slate-400 hover:text-white text-xs p-1"
            title="Limpar busca"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Abas de Categorias (se não estiver buscando) */}
      {!searchQuery.trim() && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 bg-slate-950/40 overflow-x-auto scrollbar-none">
          {EMOJI_CATEGORIES.map(cat => {
            const isActive = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? "bg-secondary-container text-primary-container font-bold shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title={cat.name}
              >
                <span className="material-symbols-outlined text-lg">{cat.icon}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de Emojis */}
      <div className="p-3 overflow-y-auto max-h-[260px] scrollbar-minimal">
        {searchQuery.trim() ? (
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              Resultados da busca ({filteredEmojis.length})
            </div>
            {filteredEmojis.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nenhum emoji encontrado para "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {filteredEmojis.map((item, idx) => (
                  <button
                    key={`search-${item.char}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectEmoji(item.char);
                    }}
                    className="h-10 text-2xl flex items-center justify-center rounded-xl hover:bg-slate-800 hover:scale-125 active:scale-95 transition-all cursor-pointer select-none"
                    title={item.keywords}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              {currentCategoryObj?.name || "Emojis"}
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
              {currentCategoryObj?.emojis.map((item, idx) => (
                <button
                  key={`${activeCategory}-${item.char}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectEmoji(item.char);
                  }}
                  className="h-10 text-2xl flex items-center justify-center rounded-xl hover:bg-slate-800 hover:scale-125 active:scale-95 transition-all cursor-pointer select-none"
                  title={item.keywords}
                >
                  {item.char}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Clique para inserir no texto</span>
        <span className="font-mono text-[9px] opacity-60">ESC para fechar</span>
      </div>
    </div>
  );
};
