import prisma from "../database/prisma";

export interface ImportClientDTO {
  name: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
}

export interface ImportPartDTO {
  name: string;
  code?: string;
  stock?: number;
  cost?: number;
  price?: number;
  ncm?: string;
  location?: string;
}

export class DataImportService {
  /**
   * Importa lista de clientes e seus equipamentos opcionais vinculados ao tenant
   */
  async importClients(companyId: string, items: ImportClientDTO[]) {
    let createdClients = 0;
    let updatedClients = 0;
    let createdDevices = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name || item.name.trim() === "") {
        errors.push({ row: i + 1, error: "Nome do cliente é obrigatório." });
        continue;
      }

      try {
        const cleanCpfCnpj = (item.cpfCnpj || "").replace(/\D/g, "");
        const cleanPhone = (item.phone || "").replace(/\D/g, "");

        let client = null;

        // Procura se o cliente já existe pelo CPF/CNPJ dentro da mesma empresa
        if (cleanCpfCnpj.length >= 11) {
          client = await prisma.client.findFirst({
            where: {
              companyId,
              cpfCnpj: { contains: cleanCpfCnpj }
            }
          });
        }

        // Se não achou por CPF, procura por nome exato
        if (!client) {
          client = await prisma.client.findFirst({
            where: {
              companyId,
              name: { equals: item.name.trim(), mode: "insensitive" }
            }
          });
        }

        if (client) {
          // Atualiza dados cadastrais se vierem mais completos
          client = await prisma.client.update({
            where: { id: client.id },
            data: {
              phone: cleanPhone || client.phone,
              email: item.email || client.email,
              address: item.address || client.address,
              city: item.city || client.city,
              state: item.state || client.state,
              zipCode: item.zipCode || client.zipCode,
              notes: item.notes ? `${client.notes}\n${item.notes}`.trim() : client.notes
            }
          });
          updatedClients++;
        } else {
          // Cria novo cliente
          client = await prisma.client.create({
            data: {
              companyId,
              name: item.name.trim(),
              cpfCnpj: cleanCpfCnpj || "00000000000",
              phone: cleanPhone || "00000000000",
              email: item.email || "",
              address: item.address || "",
              city: item.city || "",
              state: item.state || "",
              zipCode: item.zipCode || "",
              notes: item.notes || ""
            }
          });
          createdClients++;
        }

        // Se a linha contiver informações de equipamento, cria ou atualiza
        if (item.deviceType || item.deviceModel || item.deviceBrand) {
          const serial = item.deviceSerial?.trim() || "Sem Série";
          
          const existingDevice = await prisma.device.findFirst({
            where: {
              companyId,
              clientId: client.id,
              model: item.deviceModel || "",
              serialNumber: serial !== "Sem Série" ? serial : undefined
            }
          });

          if (!existingDevice) {
            await prisma.device.create({
              data: {
                companyId,
                clientId: client.id,
                type: item.deviceType || "Equipamento Estético",
                brand: item.deviceBrand || "Multimarcas",
                model: item.deviceModel || "Modelo Padrão",
                serialNumber: serial,
                description: `Importado via migração em lote (${new Date().toLocaleDateString("pt-BR")})`
              }
            });
            createdDevices++;
          }
        }
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message || "Erro desconhecido ao salvar linha." });
      }
    }

    return {
      totalProcessed: items.length,
      createdClients,
      updatedClients,
      createdDevices,
      errors
    };
  }

  /**
   * Importa catálogo de peças e insumos de estoque para o tenant
   */
  async importParts(companyId: string, items: ImportPartDTO[]) {
    let createdParts = 0;
    let updatedParts = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name || item.name.trim() === "") {
        errors.push({ row: i + 1, error: "Nome da peça é obrigatório." });
        continue;
      }

      try {
        const code = (item.code || "").trim() || `PEC-${Math.floor(100000 + Math.random() * 900000)}`;

        const existingPart = await prisma.part.findFirst({
          where: {
            companyId,
            OR: [
              { code },
              { name: { equals: item.name.trim(), mode: "insensitive" } }
            ]
          }
        });

        if (existingPart) {
          await prisma.part.update({
            where: { id: existingPart.id },
            data: {
              stock: item.stock !== undefined ? Number(item.stock) : existingPart.stock,
              cost: item.cost !== undefined ? Number(item.cost) : existingPart.cost,
              price: item.price !== undefined ? Number(item.price) : existingPart.price,
              ncm: item.ncm || existingPart.ncm,
              location: item.location || existingPart.location
            }
          });
          updatedParts++;
        } else {
          await prisma.part.create({
            data: {
              companyId,
              name: item.name.trim(),
              code,
              stock: Number(item.stock) || 0,
              cost: Number(item.cost) || 0.0,
              price: Number(item.price) || 0.0,
              ncm: item.ncm || "9018.90.99",
              location: item.location || "Prateleira Geral"
            }
          });
          createdParts++;
        }
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message || "Erro ao salvar peça." });
      }
    }

    return {
      totalProcessed: items.length,
      createdParts,
      updatedParts,
      errors
    };
  }

  /**
   * Gera templates CSV prontos para download
   */
  getTemplateCsv(type: "clients" | "parts"): string {
    if (type === "clients") {
      return (
        "Nome,CPF_CNPJ,Telefone,Email,Endereco,Cidade,UF,CEP,Tipo_Equipamento,Marca_Equipamento,Modelo_Equipamento,Serial_Equipamento\n" +
        "Clínica Estética Bella Donna,11222333000144,16999998888,contato@belladonna.com.br,Av. Independencia 1200,Ribeirão Preto,SP,14020000,Laser Diodo,Milesman,Compact 810nm,MM-88901\n" +
        "Dra. Camila Dermatologia,98765432100,11988887777,dra.camila@gmail.com,Rua Oscar Freire 500,São Paulo,SP,01426000,Criolipólise,Ibramed,Polarys,POL-5541"
      );
    } else {
      return (
        "Codigo,Nome_Peca,Estoque,Custo,Preco_Venda,NCM,Localizacao\n" +
        "ENG-001,Engate Rápido Mangueira Manípulo Laser,15,45.00,120.00,8481.80.99,Gaveta A1\n" +
        "FIL-002,Filtro Deionizador de Água Ultraformer,8,120.00,280.00,8421.21.00,Prateleira B3\n" +
        "PEL-003,Pastilha Peltier 12V Arrefecimento Diodo,20,85.00,210.00,8541.59.00,Gaveta C2"
      );
    }
  }
}

export const dataImportService = new DataImportService();
