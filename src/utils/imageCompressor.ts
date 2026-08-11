/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
}

/**
 * Comprime uma imagem no navegador utilizando HTMLCanvasElement.
 * Converte imagens pesadas em arquivos leves WebP/JPEG com resolução máxima otimizada.
 * 
 * @param base64DataString Imagem original em string Base64 ou DataURL.
 * @param options Opções de redimensionamento e qualidade (padrão: 1200px e 80% qualidade).
 * @returns Promessa com a nova imagem comprimida em DataURL Base64.
 */
export async function compressBase64Image(
  base64DataString: string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    mimeType = "image/webp"
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calcular novas dimensões mantendo a proporção (aspect ratio)
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64DataString); // Fallback para a original se canvas não for suportado
        return;
      }

      // Desenhar a imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Exportar como DataURL no formato e qualidade especificados
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      
      const originalLengthKB = (base64DataString.length / 1024).toFixed(1);
      const compressedLengthKB = (compressedDataUrl.length / 1024).toFixed(1);
      console.log(
        `[ImageCompressor] Imagem otimizada: ${originalLengthKB} KB -> ${compressedLengthKB} KB (${width}x${height}px)`
      );

      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      console.warn("[ImageCompressor] Erro ao carregar imagem para compressão, mantendo original.", err);
      resolve(base64DataString);
    };

    img.src = base64DataString;
  });
}
