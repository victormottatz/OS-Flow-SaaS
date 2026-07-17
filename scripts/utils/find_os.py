import pandas as pd
import sys

try:
    df = pd.read_excel('temp_migration/TABELA_ORDENS_DE_SERVIÇO.xls')
    found = df[df.astype(str).apply(lambda x: x.str.contains('235054', case=False, na=False)).any(axis=1)]
    if not found.empty:
        print(f"Encontrado {len(found)} registros:")
        print(found)
    else:
        print("Nao encontrado no XLS.")
except Exception as e:
    print(f"Erro: {e}")
