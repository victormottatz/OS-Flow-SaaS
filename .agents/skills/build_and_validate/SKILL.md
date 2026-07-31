---
name: build-and-validate
description: Executa a compilação completa do TypeScript e os testes unitários da aplicação para validar se nenhuma mudança quebrou o projeto.
---

# Habilidade: Compilação e Validação do Projeto MGV

Esta habilidade ensina o agente a executar uma bateria de testes e validação estática de tipos do TypeScript antes de dar qualquer tarefa por concluída ou propor commits.

## Quando Usar

Sempre que o agente fizer alterações em arquivos de código TypeScript (`.ts`, `.tsx`), rotas ou banco de dados (`prisma`).

## Passos para Validação

1. **Checagem de Tipos Estáticos**:
   - Rodar o comando: `npm run lint` (que executa `tsc --noEmit`).
   - Se houver qualquer erro de tipagem ou de sintaxe, o agente deve analisar, corrigir os arquivos afetados e rodar novamente até passar 100% sem erros.

2. **Testes Unitários**:
   - Rodar os testes unitários do projeto com: `npm run test` (que executa `vitest run tests/unit`).
   - Se algum teste falhar, o agente deve analisar o log do teste, aplicar a correção e rodar novamente.

3. **Verificação de Compilação do Frontend**:
   - Caso a alteração envolva a interface visual (React/Vite), rodar: `npm run build` para garantir que o bundle de produção compila sem problemas.

## Correção de Falhas

Se a compilação falhar:
* Inspecionar o log do erro para identificar o arquivo e a linha exatos.
* Explicar didaticamente o erro para o desenvolvedor no chat antes de aplicar a correção, garantindo que o desenvolvedor aprenda com o erro ocorrido.
