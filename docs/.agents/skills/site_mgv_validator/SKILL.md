---
name: site_mgv_validator
description: Instruções e comandos para testar e validar localmente a sintaxe PHP e visualização do site MGV.
---

# Habilidade: Site MGV Validator

Esta habilidade fornece instruções para testar, validar e visualizar o projeto `site-MGV` no ambiente de desenvolvimento local.

## Quando usar esta habilidade
Use esta habilidade sempre que:
- For finalizada uma edição em arquivos PHP ou no template da landing page.
- O usuário pedir para verificar se a aplicação possui erros de sintaxe.
- For necessário subir o servidor de desenvolvimento local.

---

## Procedimentos de Validação

### 1. Teste de Visualização Estática (Landing Page)
Para abrir o servidor de desenvolvimento local e visualizar a interface gráfica instantaneamente no navegador:

```powershell
npx live-server
```
*O servidor iniciará em `http://127.0.0.1:8080`.*

### 2. Validação da Sintaxe PHP (Arquivos do Tema)
Se o ambiente possuir o binário do PHP configurado no PATH:

```powershell
Get-ChildItem -Path "mgv-tema" -Filter "*.php" -Recurse | ForEach-Object { php -l $_.FullName }
```

### 3. Checklist de Garantia de Qualidade (QA):
- [ ] Responsividade testada em resolução mobile e desktop.
- [ ] Atributos `alt` presentes em todas as imagens `<img src="...">`.
- [ ] Formulário de contato / WhatsApp com link funcional (`https://wa.me/5516991049631`).
- [ ] Textos e traduções com a chave de domínio `'mgv-theme'`.
