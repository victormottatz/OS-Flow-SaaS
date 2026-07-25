# SH Oficina → MGV Migration Pipeline

Baseline Arquitetural v1.0.0

## Estrutura

```
scripts/migrations/
├── src/
│   ├── types.ts          # Tipos centrais do pipeline
│   ├── errors.ts         # Taxonomia de erros
│   ├── constants.ts      # Constantes e configurações
│   ├── index.ts          # Barrel export
│   ├── interfaces.ts     # Contratos (PIPELINE_CONTRACT_VERSION)
│   ├── dictionary.json   # Dicionário semântico v1.0.0
│   ├── readers/
│   │   └── mdb-reader.ts # Leitor MDB (mdbtools → JSON)
│   ├── snapshots/
│   │   ├── snapshot-service.ts
│   │   └── snapshot-inspector.ts
│   ├── validators/
│   │   └── validator.ts
│   ├── normalizers/
│   │   └── normalizer.ts
│   ├── mappers/
│   │   └── mapper.ts
│   ├── writers/
│   │   ├── entity-writer.ts
│   │   ├── customer-writer.ts
│   │   ├── device-writer.ts
│   │   ├── workorder-writer.ts
│   │   └── payment-writer.ts    # DEFERRED (Financial Model)
│   ├── services/
│   │   ├── migration-run-service.ts
│   │   └── persistence-adapter.ts
│   ├── orchestrator.ts
│   └── cli.ts
├── tests/
│   └── fixtures/         # Dados de teste (sem dependência MDB)
├── python/
│   └── extract_mdb.py    # Script Python para leitura MDB
├── README.md
└── package.json
```

## Pipeline

```
Fonte de Dados → Snapshot → Validator → Normalizer → Mapper → EntityWriter
```

Sem Loader. EntityWriter orquestra escrita + registro.

## Modos de Execução

- `--extract`   : Apenas extrai snapshot do MDB
- `--transform` : Valida + Normaliza + Mapeia (dry-run)
- `--load`      : Persiste no banco de dados

## Dry-Run

- `full`       : Pipeline completo sem persistir
- `partial`    : Pipeline até fase específica
- `targeted`   : Apenas entidades selecionadas
