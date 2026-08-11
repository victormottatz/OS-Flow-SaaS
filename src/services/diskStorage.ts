/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

class DiskStorageService {
  private uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");

  constructor() {
    // Garante que a pasta public/uploads/avatars existe fisicamente
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Recebe um avatar em Base64, comprime com Sharp e grava no disco local.
   * @param userId ID do usuário para compor o nome do arquivo.
   * @param base64Data String da imagem em Base64.
   * @returns URL relativa acessível pelo navegador (/uploads/avatars/...).
   */
  async uploadAvatar(userId: string, base64Data: string): Promise<string> {
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Formato de imagem inválido. Certifique-se de carregar um arquivo válido.");
    }

    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");

    // Redimensionar para no máximo 500x500 e comprimir em JPEG 75%
    const finalBuffer = await sharp(buffer)
      .resize(500, 500, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    const filename = `avatar-${userId}-${Date.now()}.jpg`;
    const filepath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(filepath, finalBuffer);

    // Retornar a rota acessível no navegador que será servida de forma estática pelo Express
    return `/uploads/avatars/${filename}`;
  }

  /**
   * Exclui o arquivo de avatar do disco local com base na sua URL relativa.
   * @param avatarUrl URL relativa salva na tabela de usuários.
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl || !avatarUrl.startsWith("/uploads/")) return;
    try {
      const filename = path.basename(avatarUrl);
      const filepath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath);
      }
    } catch (err) {
      console.warn("[DiskStorageService] Erro ao tentar deletar arquivo do disco:", err);
    }
  }
}

export const diskStorageService = new DiskStorageService();
