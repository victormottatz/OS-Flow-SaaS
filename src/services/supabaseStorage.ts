/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

class SupabaseStorageService {
  private supabase: SupabaseClient | null = null;
  private bucketName = "avatars";

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.error(
        "[SupabaseStorageService] Credenciais do Supabase não configuradas no arquivo .env"
      );
    }
  }

  /**
   * Faz upload de uma imagem em Base64 para o Supabase Storage.
   * @param userId ID do usuário para compor o nome do arquivo.
   * @param base64Data Imagem completa em base64 (incluindo cabeçalho data:image/...).
   * @returns URL pública da imagem carregada.
   */
  /**
   * Garante que o bucket configurado existe no Supabase Storage.
   * Se não existir, tenta criar e configura-o como público.
   */
  private async ensureBucketExists(): Promise<void> {
    if (!this.supabase) return;
    try {
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      if (listError) {
        console.warn("[SupabaseStorageService] Erro ao listar buckets. Se o bucket 'avatars' não existir, crie-o manualmente no painel do Supabase. Erro:", listError.message);
        return;
      }
      
      const hasBucket = buckets?.some(b => b.name === this.bucketName);
      if (!hasBucket) {
        console.log(`[SupabaseStorageService] Bucket '${this.bucketName}' não encontrado. Tentando criá-lo automaticamente...`);
        const { error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024, // 10 MB
          allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"]
        });
        
        if (createError) {
          console.warn(
            `[SupabaseStorageService] Não foi possível criar o bucket '${this.bucketName}' automaticamente por falta de privilégios. Por favor, crie o bucket '${this.bucketName}' manualmente como PÚBLICO no painel do Supabase. Detalhe:`,
            createError.message
          );
        } else {
          console.log(`[SupabaseStorageService] Bucket '${this.bucketName}' criado automaticamente com sucesso e configurado como público.`);
        }
      }
    } catch (err) {
      console.warn("[SupabaseStorageService] Erro durante verificação do bucket no Supabase:", err);
    }
  }

  async uploadAvatar(userId: string, base64Data: string): Promise<string> {
    if (!this.supabase) {
      throw new Error(
        "Supabase Storage não está inicializado devido à falta de credenciais no servidor."
      );
    }

    // Garantir a existência do bucket antes de fazer o upload
    await this.ensureBucketExists();

    // Validar formato base64
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Formato de imagem inválido. Certifique-se de carregar um arquivo de imagem válido.");
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");

    // Extrair extensão do MIME type (ex: image/png -> png)
    let extension = "png";
    const mimeParts = mimeType.split("/");
    if (mimeParts.length === 2) {
      extension = mimeParts[1];
      // Normalizar jpeg
      if (extension === "jpeg") extension = "jpg";
    }

    let finalBuffer = buffer;
    let finalMimeType = mimeType;
    let finalExtension = extension;

    try {
      let sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();

      // Redimensionar para no máximo 1000px de largura/altura
      if (metadata.width && metadata.height && (metadata.width > 1000 || metadata.height > 1000)) {
        sharpInstance = sharpInstance.resize(1000, 1000, {
          fit: "inside",
          withoutEnlargement: true
        });
      }

      // Aplicar compressão baseada no formato original
      if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
        finalBuffer = await sharpInstance.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      } else if (mimeType === "image/png") {
        // Tentar compressão PNG otimizada
        let tempBuffer = await sharpInstance.png({ compressionLevel: 8, palette: true }).toBuffer();
        
        // Se ainda for maior que 800 KB, converter para JPEG
        if (tempBuffer.length > 800 * 1024) {
          finalBuffer = await sharp(buffer)
            .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer();
          finalMimeType = "image/jpeg";
          finalExtension = "jpg";
        } else {
          finalBuffer = tempBuffer;
        }
      } else if (mimeType === "image/webp") {
        finalBuffer = await sharpInstance.webp({ quality: 80 }).toBuffer();
      } else {
        // Outros formatos: converter para jpeg
        finalBuffer = await sharpInstance.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        finalMimeType = "image/jpeg";
        finalExtension = "jpg";
      }

      // Segunda verificação de emergência: se mesmo após as compressões ainda for maior que 800 KB,
      // reduzir a qualidade e converter para jpeg
      if (finalBuffer.length > 800 * 1024) {
        finalBuffer = await sharp(finalBuffer)
          .jpeg({ quality: 65, mozjpeg: true })
          .toBuffer();
        finalMimeType = "image/jpeg";
        finalExtension = "jpg";
      }
      
      console.log(`[SupabaseStorageService] Imagem comprimida com sucesso. Tamanho original: ${(buffer.length / 1024).toFixed(2)} KB. Tamanho final: ${(finalBuffer.length / 1024).toFixed(2)} KB.`);
    } catch (compressErr) {
      console.error("[SupabaseStorageService] Erro ao comprimir imagem com sharp. Usando imagem original:", compressErr);
      finalBuffer = buffer;
      finalMimeType = mimeType;
      finalExtension = extension;
    }

    // Criar um nome de arquivo único usando a extensão final (pode ter mudado de png para jpg se foi convertida)
    const filename = `avatar-${userId}-${Date.now()}.${finalExtension}`;

    // Upload usando supabase storage
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filename, finalBuffer, {
        contentType: finalMimeType,
        upsert: true,
      });

    if (error) {
      console.error("[SupabaseStorageService] Erro no upload:", error);
      throw new Error(`Falha ao carregar arquivo no Supabase Storage: ${error.message}`);
    }

    // Obter URL pública
    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filename);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Erro ao obter URL pública do arquivo carregado.");
    }

    return publicUrlData.publicUrl;
  }

  /**
   * Remove uma foto antiga do Supabase Storage com base na sua URL pública.
   * @param avatarUrl URL pública completa do avatar salvo no banco.
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!this.supabase || !avatarUrl) return;

    try {
      // Extrair o nome do arquivo a partir da URL pública
      // Exemplo: https://sxkrugacijbenqamenxg.supabase.co/storage/v1/object/public/avatars/avatar-xxx-12345.png
      const urlSearchPattern = `/storage/v1/object/public/${this.bucketName}/`;
      const urlParts = avatarUrl.split(urlSearchPattern);
      if (urlParts.length !== 2) {
        // Não é uma URL do nosso bucket do Supabase, ignorar deleção
        return;
      }
      const filename = urlParts[1];

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filename]);

      if (error) {
        console.warn(
          `[SupabaseStorageService] Não foi possível remover o arquivo antigo do storage (${filename}):`,
          error.message
        );
      } else {
        console.log(`[SupabaseStorageService] Arquivo antigo removido com sucesso: ${filename}`);
      }
    } catch (err) {
      console.warn("[SupabaseStorageService] Erro ao tentar extrair filename para deleção:", err);
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();
