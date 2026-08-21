"""
Script de Transcrição Local de Áudio com OpenAI Whisper
Autor: MGV Assistência Técnica
Finalidade: Transcrever áudios (.mp3, .wav, .m4a, etc.) localmente para economizar tokens.
"""

import os
import sys
import argparse
from pathlib import Path
import whisper

# Extensões de áudio suportadas
SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"}


def transcrever_arquivo(caminho_arquivo: Path, modelo: whisper.Whisper, idioma: str = "pt") -> bool:
    """
    Transcreve um arquivo de áudio individual e salva o .txt no mesmo diretório.
    """
    try:
        if not caminho_arquivo.exists():
            print(f"❌ [Erro] Arquivo não encontrado: {caminho_arquivo}")
            return False

        print(f"\n🎙️ Processando: {caminho_arquivo.name}...")
        
        # Realiza a transcrição forçando o idioma
        resultado = modelo.transcribe(
            str(caminho_arquivo),
            language=idioma,
            fp16=False,  # Mantém compatibilidade com CPU e placas sem FP16 nativo
            verbose=False
        )

        texto_transcrito = resultado.get("text", "").strip()

        if not texto_transcrito:
            print(f"⚠️ [Aviso] Nenhum texto reconhecido em: {caminho_arquivo.name}")
            return False

        # Define o caminho de saída com a extensão .txt
        caminho_txt = caminho_arquivo.with_suffix(".txt")
        caminho_txt.write_text(texto_transcrito, encoding="utf-8")

        print(f"✅ [Sucesso] Transcrição salva em: {caminho_txt.name}")
        return True

    except Exception as e:
        print(f"❌ [Falha] Erro ao processar '{caminho_arquivo.name}': {e}")
        return False


def processar_alvo(alvo_path: str, nome_modelo: str = "small", idioma: str = "pt"):
    """
    Carrega o modelo e direciona o processamento para arquivo ou pasta.
    """
    path = Path(alvo_path).resolve()

    if not path.exists():
        print(f"❌ [Erro] Caminho especificado não existe: {path}")
        sys.exit(1)

    print(f"⏳ Carregando modelo Whisper '{nome_modelo}'...")
    try:
        # Carrega o modelo (faz download automático na 1ª execução)
        modelo = whisper.load_model(nome_modelo)
        print(f"🧠 Modelo '{nome_modelo}' carregado com sucesso!")
    except Exception as e:
        print(f"❌ [Erro Crítico] Falha ao carregar o modelo Whisper: {e}")
        print("💡 Dica: Verifique se o FFmpeg está instalado e acessível no PATH.")
        sys.exit(1)

    # Caso seja um arquivo único
    if path.is_file():
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            print(f"⚠️ Extensão '{path.suffix}' não suportada. Suportadas: {SUPPORTED_EXTENSIONS}")
            sys.exit(1)
        transcrever_arquivo(path, modelo, idioma)

    # Caso seja uma pasta/diretório
    elif path.is_dir():
        arquivos = [f for f in path.iterdir() if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS]
        
        if not arquivos:
            print(f"ℹ️ Nenhum arquivo de áudio compatível encontrado em: {path}")
            return

        print(f"📂 Encontrados {len(arquivos)} arquivo(s) de áudio para processamento.")
        sucessos = 0
        for arq in arquivos:
            if transcrever_arquivo(arq, modelo, idioma):
                sucessos += 1

        print(f"\n🏁 Concluído! {sucessos}/{len(arquivos)} arquivos transcritos.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcritor Local de Áudio usando OpenAI Whisper.")
    parser.add_argument(
        "caminho",
        type=str,
        help="Caminho para o arquivo de áudio ou para a pasta com arquivos."
    )
    parser.add_argument(
        "--modelo",
        type=str,
        default="small",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Tamanho do modelo Whisper (Padrão: 'small')."
    )
    parser.add_argument(
        "--idioma",
        type=str,
        default="pt",
        help="Código do idioma para transcrição (Padrão: 'pt')."
    )

    args = parser.parse_args()
    processar_alvo(args.caminho, nome_modelo=args.modelo, idioma=args.idioma)
