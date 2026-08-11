import { eventBus, Events } from "./index";
import { syncClientToBling } from "../services/bling";
import prisma from "../database/prisma";

const syncClient = async (clientId: string, action: string) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    
    if (!client) {
      console.warn(`[Subscribers] Cliente ${clientId} não encontrado para sync no Bling.`);
      return;
    }

    if (client.cpfCnpj) {
      await syncClientToBling({
        name: client.name,
        cpfCnpj: client.cpfCnpj,
        phone: client.phone,
        email: client.email || `${client.cpfCnpj.replace(/\D/g, "")}@cliente.sem.email.com`,
        address: client.address || "Endereço não informado",
        rg: client.rg || undefined,
      });
      console.log(`[Subscribers] Cliente ${client.name} sincronizado com o Bling com sucesso (${action}).`);
    }
  } catch (err: any) {
    console.error(`[Subscribers] Erro ao sincronizar cliente ${clientId} com Bling (${action}):`, err.message);
  }
};

export const registerSubscribers = () => {
  eventBus.on(Events.CLIENT_CREATED, (event: any) => {
    syncClient(event.aggregateId, "CREATED");
  });

  eventBus.on(Events.CLIENT_UPDATED, (event: any) => {
    syncClient(event.aggregateId, "UPDATED");
  });
  
  console.log("[Subscribers] Event listeners registrados com sucesso.");
};
