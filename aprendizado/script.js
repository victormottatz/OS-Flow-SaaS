/* ============================================================
   MGV SANDBOX DE APRENDIZADO — JAVASCRIPT (JS)
   ============================================================
   Todo o COMPORTAMENTO da página fica aqui:
     - criar cartões automaticamente
     - adicionar uma nova OS quando o usuário digita e clica
     - mover cartões entre as colunas ao clicar nos botões

   No JS, quase tudo acontece através de:
     1. Selecionar elementos do HTML (document.getElementById...)
     2. Criar funções (blocos de código reutilizáveis)
     3. Escutar eventos (click) e reagir a eles

   Dica: use o DevTools do navegador (tecla F12) e console.log()
   para ver o que o código está fazendo em tempo real.
   ============================================================ */

// ------------------------------------------------------------
// 1. "PEGAR" os elementos do HTML que vamos manipular
// ------------------------------------------------------------
// document = a página inteira
// .getElementById('...') = procura um elemento pelo atributo id
const campoNovaOs = document.getElementById('campoNovaOs');
const botaoAdicionar = document.getElementById('botaoAdicionar');

// ------------------------------------------------------------
// 2. Criar uma "lista" de regiões do HTML chamadas cartoes
//    Cada coluna tem um <div class="cartoes" id="...">.
//    Vamos guardar referências a elas num OBJETO (chave: valor).
// ------------------------------------------------------------
const colunas = {
  aguardando: document.getElementById('aguardando'),
  manutencao: document.getElementById('manutencao'),
  pronto: document.getElementById('pronto'),
};

// ------------------------------------------------------------
// 3. Os dados. Em vez de "chutar" valores fixos no HTML,
//    guardamos as OS num ARRAY de objetos.
//    Cada objeto tem: numero (id), descricao e status.
//    ----------------------------------------------------------
//    status possíveis: "aguardando" | "manutencao" | "pronto"
// ------------------------------------------------------------
const ordensDeServico = [
  { numero: 'OS-001', descricao: 'Troca de tela quebrada', status: 'aguardando' },
  { numero: 'OS-002', descricao: 'Bateria com pouca duração', status: 'aguardando' },
  { numero: 'OS-003', descricao: 'Botão de volume travado', status: 'manutencao' },
  { numero: 'OS-004', descricao: 'Fonte de energia com defeito', status: 'pronto' },
];

// ------------------------------------------------------------
// 4. FUNÇÕES (o coração do programa)
//    Uma função é um bloco de código com NOME, que podemos
//    chamar várias vezes. Ex: renderizar() mostra as OS na tela.
// ------------------------------------------------------------

// Essa função "pinta" todos os cartões na coluna correta.
function renderizar() {
  // Primeiro, ESVAZIAMOS as colunas (para não duplicar ao redesenhar)
  colunas.aguardando.innerHTML = '';
  colunas.manutencao.innerHTML = '';
  colunas.pronto.innerHTML = '';

  // Depois, percorremos a lista de OS e criamos cada cartão.
  // ordensDeServico.forEach( os => {...} ) roda o bloco para cada OS.
  ordensDeServico.forEach(function (os) {
    // Cria um <div> novo em branco (vamos montar o cartão dentro)
    const cartao = document.createElement('div');
    cartao.className = 'cartao'; // aplica o visual da classe .cartao do CSS

    // Dentro de cada cartão, o conteúdo é montado com texto +
    // o botão "mover". Vamos montar um HTML em texto puro (string):
    cartao.innerHTML = `
      <span class="numero">${os.numero}</span>
      <span class="descricao">${os.descricao}</span>
      <button class="botao-mini" data-numero="${os.numero}">Mover ▶</button>
    `;

    // Adiciona (appendChild = "anexa como filho") o cartão na coluna certa.
    // colunas[os.status] pega a div correspondente ao status da OS.
    colunas[os.status].appendChild(cartao);
  });

  // Ao terminar, verificamos se tem alguma coluna vazia
  // para exibir a mensagem de "coluna vazia".
  verificarColunasVazias();
}

// Exibe um aviso "nenhum cartão" nas colunas que ficarem vazias.
function verificarColunasVazias() {
  for (const key in colunas) {
    const coluna = colunas[key];
    // children: os elementos <div> que estão dentro da coluna.
    if (coluna.children.length === 0) {
      coluna.innerHTML = '<p class="coluna-vazia">Nenhuma OS nesta coluna.</p>';
    }
  }
}

// Move uma OS para o próximo status quando o botão é clicado.
function moverParaProxima(numeroDaOs) {
  // 1. Encontrar a OS na lista pelo número (o id dela)
  //    .find() percorre o array e devolve o objeto que corresponde.
  const os = ordensDeServico.find(function (item) {
    return item.numero === numeroDaOs;
  });

  if (!os) return; // se não achou, sai da função sem fazer nada

  // 2. Definir a "ordem" dos status, para saber qual é o próximo.
  const ordem = ['aguardando', 'manutencao', 'pronto'];

  // 3. Descobrir a posição atual e a próxima
  const posicaoAtual = ordem.indexOf(os.status);
  const proximaPosicao = posicaoAtual + 1;

  // Se já está na última coluna ("pronto"), não faz nada.
  if (proximaPosicao >= ordem.length) return;

  // 4. Atualizar o status da OS e redesenhar a tela.
  os.status = ordem[proximaPosicao];
  renderizar();
}

// Adiciona uma nova OS digitada pelo usuário.
function adicionarNovaOs() {
  // .value pega o texto que o usuário digitou no input.
  const descricao = campoNovaOs.value.trim(); // .trim() remove espaços extras

  // "Validação": se o campo estiver vazio, avisa e para.
  if (descricao === '') {
    alert('Digite uma descrição para a OS.');
    return; // encerra a função aqui
  }

  // Cria um novo objeto e coloca no final da lista (.push).
  const novoNumero = 'OS-' + String(ordensDeServico.length + 1).padStart(3, '0');
  ordensDeServico.push({
    numero: novoNumero,
    descricao: descricao,
    status: 'aguardando',
  });

  // Limpa o campo para facilitar a próxima digitação.
  campoNovaOs.value = '';

  // Redesenha a tela com a nova OS.
  renderizar();
}

// ------------------------------------------------------------
// 5. EVENTOS — "ligar" os botões às ações
// ------------------------------------------------------------
// Quando o botão "+ Adicionar OS" for clicado, chama adicionarNovaOs.
// addEventListener = "fique de ouvido" no evento 'click'.
botaoAdicionar.addEventListener('click', adicionarNovaOs);

// Deixa o usuário adicionar também ao pressionar Enter no campo.
campoNovaOs.addEventListener('keydown', function (evento) {
  // 'Enter' tem código de tecla 13 (ou "Enter").
  if (evento.key === 'Enter') {
    adicionarNovaOs();
  }
});

// ------------------------------------------------------------
// 6. DELEGAÇÃO de eventos
//    Os botões "Mover ▶" de cada cartão são criados dinamicamente.
//    Em vez de ligar um evento em cada um (eles podem mudar),
//    escutamos os CLICKS na página toda e checamos se o clique
//    aconteceu num botão de mover.
//    ----------------------------------------------------------
//    document.addEventListener('click', funcao) = escuta o click
//    em qualquer lugar da página.
// ------------------------------------------------------------
document.addEventListener('click', function (evento) {
  // evento.target = o elemento exato que foi clicado.
  // .closest('.botao-mini') = sobe procurando o cartão mais próximo
  // que tenha a classe "botao-mini". Se o clique foi num botão mover,
  // achamos o botão; senão voltamos null (nada).
  const botaoClicado = evento.target.closest('.botao-mini');

  if (botaoClicado) {
    // data-numero pega o valor que gravamos no atributo do botão.
    const numero = botaoClicado.getAttribute('data-numero');
    moverParaProxima(numero);
  }
});

// ------------------------------------------------------------
// 7. PRIMEIRA EXECUÇÃO
//    Chamamos renderizar() uma vez para a página nascer com os
//    cartões iniciais já desenhados (OS-001 a OS-004).
// ------------------------------------------------------------
// (O aprendizado começa: altere os dados no passo 3 e recarregue!)
renderizar();

// console.log é sua melhor amiga para aprender:
// abra o F12 > aba "Console" e veja este aviso.
console.log('♻️ Sandbox MGV carregado! Experimente alterar o array ordensDeServico.');