# Cartões do Trello - Quadro de Implementações MGV


## Lista: 📥 Backlog (Lista de Desejos):

### [#6] IMPRESSÃO ORÇAMENTO: Ficou só a assinatura do cliente na segunda página. Se tiver como diminur alguma coisa ou tirar alguma informação..
**Descrição:**
![image.webp](https://trello.com/1/cards/6a6b6c649274120326bd25c0/attachments/6a6b6c689c1e3757b58ae420/previews/6a6b6c689c1e3757b58ae4fc/download/image.webp)

Está com muito espaço entre os valores das peças e mão de obra.

### [#9] URGENTE>> Impressão orçamento. Colocar a opção de imprimir na página em que a gente monta o orçamento (e se possível, tirar a função de fechar a página quando clicamos em "Salvar gravações"). No caso, toda vez que clicamos em salvar alguma alteração a página fecha automaticamente.
*Sem descrição.*

### [#14] APARELHO SEM DEFEITO>> Aparelho avaliado e sem defeito. Colocar opção na Central de ação.
*Sem descrição.*

### [#16] DADOS DO EQUIPAMENTO>>> HISTORICO DE MANUTENÇÕES.. Não aparece nome do aparelho. Somente a marca e a função. Seria bom ter o nome. Quando eu preciso do nome, preciso ir nas Ordens de serviço e isso atrasa um pouco a operação durante o dia.
*Sem descrição.*

### [#17] ABERTURA DE OS>>>PESQUISA GLOBAL DE CLIENTES. Não consigo achar os clientes na hora de abrir a ordem de serviço.
*Sem descrição.*

### [#18] MUDAR A COR DAS ORDENS DE SERVIÇO EM GARANTIA.
*Sem descrição.*

## Lista: 📋 Priorização (O que vem primeiro):

### [#7] FINALIZAR O.S (FORMA DE PAGAMENTO)
**Descrição:**
![image.webp](https://trello.com/1/cards/6a6b74b9858873606b305d2c/attachments/6a6b74bc51afe9c002531756/previews/6a6b74bc51afe9c002531766/download/image.webp)

Colocar um campo DIGITÁVEL para algumas obervações referentes ao pagamento.

Se possível incluir também um campo para colocarmos a data que o pagamento foi realizado. O responsável pela emissão das notas precisa dessa informação.

![image.webp](https://trello.com/1/cards/6a6b74b9858873606b305d2c/attachments/6a6b75bc768bbe8f3a362ca5/preview... (resumido)

### [#2] INCLUIR A OPÇÃO LASER NO TIPO DO APARELHO / laserterapia é outro tipo de tratamento.
**Descrição:**
![image.webp](https://trello.com/1/cards/6a6b3f046253fa47905e242b/attachments/6a6b3f0eb9a26e98a15116c8/previews/6a6b3f0fb9a26e98a15116d9/download/image.webp)

![image.webp](https://trello.com/1/cards/6a6b3f046253fa47905e242b/attachments/6a6b547e2183287bcef0461a/previews/6a6b547e2183287bcef04655/download/image.webp)

### [#5] EQUIPAMENTO EM GARANTIA "ERRO AO MUDAR FASE". Quando o aparelho está em garantia, não consigo mudar para REPARO EM GARANTIA/INICIAR DIRETO. Não sei se é porque tem a fase “AGUARDANDO AUTORIZAÇÃO”.. Porém quando está na garantia não precisamos aguardar autorização do cliente.
*Sem descrição.*

### [#13] FINALIZAÇÃO EQUIPAMENTOS EM GARANTIA>> Não consigo finalizar as ordens de serviço de aparelhos em garantia.
*Sem descrição.*

### [#15] LIBERAR A FUNÇÃO DE ALTERAR DADOS DO CADASTRO DO CLIENTE>> Às vezes o cliente está com o cadastro desatualizado, com dados que nem utiliza mais como e-mail, telefone.. E eu não consigo atualizar.
*Sem descrição.*

## Lista: 🏗️ Em Desenvolvimento (Na Bancada):

### [#8] GARANTIA DE 90 DIAS CORRIDOS APÓS A ENTREGA DO APARELHO
**Descrição:**
‌

![image.webp](https://trello.com/1/cards/6a6b770c6a3d14887b158c65/attachments/6a6b77bff8a019a4cd4416b7/previews/6a6b77c0f8a019a4cd4416d1/download/image.webp)

A validade de 90 dias corridos começa a valer a partir da data de entrega do aparelho mas no sistema novo, fica com a data que eu imprimo o orçamento. EXEMPLO: Entreguei esse aparelho anteontem e hoje cliquei para imprimir o recibo de entrega e ele ficou com a data de hoje.

![image.webp](https://trello.com/1/cards/6a6b770c6a3d14887b158... (resumido)

### [#10] EDITAR ENTRADA DO APARELHO>> Só consigo editar as avarias e fotos. Não consigo editar os acessórios deixados junto ao aparelho.
*Sem descrição.*

### [#12] LIBERAR A FUNÇÃO DE ALTERAR A FASE DAS O.S. / REABRIR O.S.
*Sem descrição.*

### [#11] VERIFICAR INTEGRAÇÃO BLING
*Sem descrição.*

## Lista: 🚀 Produção (Lançado!):

### [#4] IMPRESSÃO PELA ABA "LISTAGEM DE O.S." Quando eu coloco para imprimir aparecem 33 páginas.
**Descrição:**
### 🔍 Causa do Problema

Quando você clicava para imprimir na aba **"Listagem de O.S."**, o sistema exibia **33 páginas** na visualização de impressão porque:

1. **Retenção de Espaço no Layout (**`visibility: hidden`**)**: Anteriormente, as regras de impressão usavam `visibility: hidden` para esconder o layout do sistema (tabela com 50 linhas, cabeçalho, filtros, etc.). No CSS, elementos com `visibility: hidden` ficam invisíveis, **mas continuam ocupando espaço vertical na página**.
2. **Exten... (resumido)

### [#3] CAMPO CPF>> Bloquear o cadastro do CPF caso o mesmo não exista. Exemplo: Se eu tentar cadastrar o Nº 12345678910 o sistema deixa. Não trava o cadastro mesmo que esse CPF não exista. Não sei onde o sistema busca essa informação mas nos sistemas e sites geralmente tem isso.. O ideal seria eu não conseguir cadastrar o CPF caso ele não exista. Às vezes o cliente informa o CPF incorreto e no sistema atual eu não consigo saber.
**Descrição:**
As novas validações de bloqueio de CPF e CNPJ matematicamente inválidos já estão ativas e empacotadas na versão final de produção.



# Walkthrough: Validação e Bloqueio de CPF/CNPJ Inválido

Implementamos a validação matemática do **Módulo 11 (Dígitos Verificadores da Receita Federal)** para CPF (11 dígitos) e CNPJ (14 dígitos), garantindo que CPFs inexistentes ou malformados (como `12345678910` ou `111.111.111-11`) sejam bloqueados no cadastro de clientes.

---

## Alterações Realizadas

### 1... (resumido)
