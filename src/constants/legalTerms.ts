/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Termos de Uso e Política de Privacidade da Plataforma OS-Flow SaaS
 * Em conformidade com o Marco Civil da Internet (Lei 12.965/14) e LGPD (Lei 13.709/18).
 */

export const LEGAL_TERMS = {
  version: "2026.1 - Vigência a partir de 01/01/2026",
  companyName: "MGV TECNOLOGIA & GESTÃO LTDA",
  cnpj: "00.000.000/0001-00", // Substituível no deploy de produção
  contactEmail: "suporte@osflow.com.br",
  contactPhone: "(16) 99999-9999",
  jurisdiction: "Comarca de Ribeirão Preto - SP",

  sections: [
    {
      title: "1. Objeto e Natureza dos Serviços (SaaS)",
      content: `O OS-Flow é uma plataforma sob modelo Software como Serviço (SaaS) destinada à gestão operacional, controle de bancada técnica, cadastro de clientes, emissão de laudos de ordem de serviço, inventário de peças e faturamento para assistências técnicas e oficinas especializadas.`
    },
    {
      title: "2. Período de Testes Gratuitos (Trial de 14 Dias)",
      content: `O assinante tem direito a um período inicial de 14 (quatorze) dias corridos de teste gratuito no Plano Pro, a contar da data de cadastro. Nenhum dado de cartão de crédito é exigido para ativação do período de testes. Ao término dos 14 dias, a continuidade do serviço dependerá da contratação de um dos planos disponíveis.`
    },
    {
      title: "3. Isolamento Multi-Tenancy e Confidencialidade",
      content: `Os dados da sua oficina (incluindo cadastros de clientes finais, números de série de equipamentos, fotos de laudos e valores cobrados) são estritamente isolados por Tenant (Company ID) e protegidos por criptografia em trânsito e em repouso. O OS-Flow não compartilha, não monetiza e não comercializa os dados dos clientes de suas assistências parceiras com terceiros.`
    },
    {
      title: "4. Portabilidade de Dados e LGPD (Art. 18)",
      content: `Em total respeito à Lei Geral de Proteção de Dados (Lei 13.709/2018), o titular da conta tem o direito inalienável à portabilidade e extração integral dos seus dados. A qualquer momento, através da aba de Configurações, o assinante pode realizar o download de backup completo de sua oficina em formato padronizado JSON, inclusive em caso de inadimplência ou cancelamento.`
    },
    {
      title: "5. Cancelamento e Isenção de Fidelidade",
      content: `As assinaturas mensais do OS-Flow não possuem fidelidade, multa rescisória ou carência. O cancelamento pode ser efetuado a qualquer momento pelo assinante diretamente no painel do sistema ou mediante solicitação ao suporte. O acesso permanecerá ativo até o final do período já faturado.`
    },
    {
      title: "6. Pagamentos e Cobrança Recorrente",
      content: `O processamento dos pagamentos de mensalidades é operacionalizado através do gateway parceiro homologado (Asaas Gestão Financeira). As cobranças podem ser liquidadas via PIX instantâneo com baixa automatizada ou Cartão de Crédito recorrente.`
    },
    {
      title: "7. Foro de Eleição",
      content: `Fica eleito o foro da Comarca de Ribeirão Preto, Estado de São Paulo, como competente para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`
    }
  ]
};
