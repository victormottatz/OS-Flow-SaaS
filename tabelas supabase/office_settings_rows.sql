INSERT INTO "public"."office_settings" ("id", "key", "value", "type", "description", "updatedAt", "category") VALUES ('022808f3-59ec-4031-bda0-8c6b771b6ab1', 'multiple_history_penalty', '20', 'number', 'Pontos deduzidos se o equipamento possuir múltiplas OSs históricas no banco de dados e associação por nome', '2026-07-16 21:05:49.895', 'CONCILIACAO'), ('19c7e407-53ec-4669-8288-4af4a1af03f1', 'temporal_conflict_penalty', '40', 'number', 'Pontos deduzidos em caso de pagamento com data anterior à data de abertura da OS', '2026-07-16 21:05:49.714', 'CONCILIACAO'), ('1fc11664-aa63-4e3c-af5c-8a27afd9d82b', 'threshold_review', '70', 'number', 'Pontuação mínima para sugerir revisão humana (abaixo disso, envia para conflito ou ignora)', '2026-07-16 21:05:50.097', 'CONCILIACAO'), ('36d5c0c8-0d5f-4ac4-81b0-5a980a2e1582', 'threshold_automatic', '90', 'number', 'Pontuação mínima necessária para aprovação automática da OS na simulação', '2026-07-16 21:05:50.004', 'CONCILIACAO'), ('4bae6595-461b-404e-be5f-6d07e5a51ebc', 'days_temporal_high', '15', 'number', 'Quantidade limite de dias entre pagamento e abertura para considerar correlação temporal ALTA', '2026-07-16 21:05:50.187', 'CONCILIACAO'), ('5793f5b2-52c5-4abc-8562-89265c1fef24', 'DIAGNOSTIC_REQUIRED_PRONTO_RETIRADA', 'false', 'boolean', 'Exigir preenchimento do laudo técnico (diagnóstico) antes de mover a OS para Pronto Retirada.', '2026-07-23 21:23:35.135', 'GERAL'), ('6353eea1-d3a7-4f19-8552-e3978671fc43', 'days_temporal_medium', '90', 'number', 'Quantidade limite de dias entre pagamento e abertura para considerar correlação temporal MÉDIA', '2026-07-16 21:05:50.271', 'CONCILIACAO'), ('665fca4c-835b-4ab5-a920-4e11665e4be5', 'os_number_match_score', '40', 'number', 'Pontos adicionados se o número da OS for encontrado nos registros de pagamento', '2026-07-16 21:35:35.45', 'CONCILIACAO'), ('83e60c81-19ba-472a-9da1-18021cf6d414', 'name_only_match_penalty', '20', 'number', 'Pontos deduzidos se a associação do pagamento for feita apenas por nome do cliente, sem OS explícita', '2026-07-16 21:05:49.797', 'CONCILIACAO'), ('96026991-1579-4c4c-af13-7347ea409392', 'payment_integral_score', '20', 'number', 'Pontos adicionados se comprovado o pagamento integral do valor da OS', '2026-07-16 21:05:49.348', 'CONCILIACAO'), ('ae7f1a55-4fe7-4b04-ab99-e5efc498dc7a', 'physical_present_score', '30', 'number', 'Pontos adicionados se o equipamento estiver localizado na oficina física pronto para retirada', '2026-07-16 21:05:49.268', 'CONCILIACAO'), ('bfc14f94-636e-4a5b-b3d1-658985610de7', 'temporal_match_medium_score', '5', 'number', 'Pontos adicionados para média correlação temporal (pagamento entre X e Y dias)', '2026-07-16 21:05:49.555', 'CONCILIACAO'), ('ccd9671a-3190-4267-9fa9-0bfb611a2f14', 'OS_ALLOWED_TRANSITIONS', '[
  {
    "from": "AGUARDANDO_AVALIACAO",
    "to": "AGUARDANDO_AUTORIZACAO"
  },
  {
    "from": "AGUARDANDO_AVALIACAO",
    "to": "FINALIZADO"
  },
  {
    "from": "AGUARDANDO_AUTORIZACAO",
    "to": "EM_MANUTENCAO"
  },
  {
    "from": "AGUARDANDO_AUTORIZACAO",
    "to": "AGUARDANDO_PECA"
  },
  {
    "from": "AGUARDANDO_AUTORIZACAO",
    "to": "FINALIZADO"
  },
  {
    "from": "AGUARDANDO_PECA",
    "to": "EM_MANUTENCAO"
  },
  {
    "from": "EM_MANUTENCAO",
    "to": "AGUARDANDO_PECA"
  },
  {
    "from": "EM_MANUTENCAO",
    "to": "PRONTO_RETIRADA"
  },
  {
    "from": "PRONTO_RETIRADA",
    "to": "FINALIZADO"
  },
  {
    "from": "PRONTO_RETIRADA",
    "to": "PAGO_PRONTO_RETIRADA"
  },
  {
    "from": "PAGO_PRONTO_RETIRADA",
    "to": "FINALIZADO"
  },
  {
    "from": "PRONTO_RETIRADA",
    "to": "EM_MANUTENCAO"
  },
  {
    "from": "FINALIZADO",
    "to": "EM_MANUTENCAO"
  },
  {
    "from": "FINALIZADO",
    "to": "AGUARDANDO_AVALIACAO"
  },
  {
    "from": "AGUARDANDO_AVALIACAO",
    "to": "ORCAMENTO"
  },
  {
    "from": "EM_MANUTENCAO",
    "to": "FINALIZADO"
  }
]', 'json', 'Lista de transições de status permitidas para as Ordens de Serviço.', '2026-07-22 16:11:16.01', 'GERAL'), ('cd60988d-3cfc-4ab3-9f03-bf771a7d9f8e', 'multiple_os_penalty', '30', 'number', 'Pontos deduzidos por ambiguidade se o cliente possuir múltiplas OSs ativas simultaneamente', '2026-07-16 21:05:49.635', 'CONCILIACAO'), ('fcb4cfab-613b-45bc-aad6-a8ba682acc19', 'temporal_match_high_score', '15', 'number', 'Pontos adicionados para alta correlação temporal (pagamento em até X dias da abertura/conclusão)', '2026-07-16 21:05:49.433', 'CONCILIACAO');