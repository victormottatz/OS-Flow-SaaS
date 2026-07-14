import prisma from "../database/prisma";
import { featureFlags } from "./FeatureFlagService";

const WHATSAPP_TEMPLATES: Record<string, string> = {
  ORCAMENTO: "Olá, {cliente_nome}! O orçamento para a manutenção do seu equipamento {aparelho_modelo} está pronto. O valor total é de R$ {valor_total}. Acesse para aprovar online: {link_portal}",
  AGUARDANDO_PECA: "Olá, {cliente_nome}! A Ordem de Serviço {os_numero} do seu equipamento {aparelho_modelo} foi atualizada para: Aguardando Peças de Reposição.",
  EM_MANUTENCAO: "Olá, {cliente_nome}! Informamos que o reparo do seu equipamento {aparelho_modelo} (OS {os_numero}) foi iniciado pelo nosso laboratório técnico.",
  PRONTO_RETIRADA: "Olá, {cliente_nome}! Ótimas notícias! O seu equipamento {aparelho_modelo} (OS {os_numero}) está pronto para retirada. Aguardamos você em nossa oficina!",
  FINALIZADO: "Olá, {cliente_nome}! A Ordem de Serviço {os_numero} do seu equipamento {aparelho_modelo} foi faturada e concluída com sucesso. Obrigado pela preferência!"
};

function formatWhatsAppMessage(template: string, data: {
  cliente_nome: string;
  os_numero: string;
  aparelho_modelo: string;
  aparelho_marca: string;
  valor_total: string;
  link_portal: string;
}): string {
  let msg = template;
  msg = msg.replace(/{cliente_nome}/g, data.cliente_nome);
  msg = msg.replace(/{os_numero}/g, data.os_numero);
  msg = msg.replace(/{aparelho_modelo}/g, data.aparelho_modelo);
  msg = msg.replace(/{aparelho_marca}/g, data.aparelho_marca);
  msg = msg.replace(/{valor_total}/g, data.valor_total);
  msg = msg.replace(/{link_portal}/g, data.link_portal);
  return msg;
}

export async function triggerWhatsAppNotification(orderId: string, status: string): Promise<boolean> {
  try {
    const isEnabled = await featureFlags.isEnabled("WHATSAPP_AUTO_MESSAGES");
    if (!isEnabled) {
      console.log(`[WhatsApp Service] Disparo abortado: Feature Flag 'WHATSAPP_AUTO_MESSAGES' inativa.`);
      return false;
    }

    const os = await prisma.ordemServico.findUnique({
      where: { id: orderId },
      include: { client: true, device: true }
    });

    if (!os || !os.client || !os.device) {
      console.log(`[WhatsApp Service] Disparo abortado: Dados da OS ${orderId} insuficientes.`);
      return false;
    }

    if (status === "ORCAMENTO" && (!os.diagnostic || os.totalCost === 0)) {
      console.log(`[WhatsApp Service] Disparo abortado para status ORCAMENTO: orçamento ainda não preenchido/precificado.`);
      return false;
    }

    const template = WHATSAPP_TEMPLATES[status];
    if (!template) {
      console.log(`[WhatsApp Service] Sem template cadastrado para o status ${status}.`);
      return false;
    }

    const linkPortal = `http://192.168.15.18:3000/acompanhar?numero=${os.osNumber}&cpfCnpj=${os.client.cpfCnpj.replace(/\D/g, "")}`;
    const formattedText = formatWhatsAppMessage(template, {
      cliente_nome: os.client.name.split(" ")[0],
      os_numero: os.osNumber,
      aparelho_modelo: os.device.model,
      aparelho_marca: os.device.brand,
      valor_total: os.totalCost.toFixed(2).replace(".", ","),
      link_portal: linkPortal
    });

    const history = await prisma.messageHistory.create({
      data: {
        orderId: os.id,
        phoneNumber: os.client.phone,
        messageText: formattedText,
        status: "PENDENTE"
      }
    });

    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;

    setTimeout(async () => {
      try {
        if (apiUrl && apiToken) {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiToken}`
            },
            body: JSON.stringify({
              number: os.client.phone.replace(/\D/g, ""),
              message: formattedText
            })
          });

          if (response.ok) {
            await prisma.messageHistory.update({
              where: { id: history.id },
              data: { status: "ENVIADO" }
            });
          } else {
            const errText = await response.text();
            await prisma.messageHistory.update({
              where: { id: history.id },
              data: { status: "FALHOU", errorDetail: `HTTP ${response.status}: ${errText}` }
            });
          }
        } else {
          console.log(`\n======================================================`);
          console.log(`[WhatsApp Gateway Simulado] Enviando Mensagem...`);
          console.log(`Destinatário: ${os.client.phone}`);
          console.log(`Mensagem: ${formattedText}`);
          console.log(`======================================================\n`);

          await prisma.messageHistory.update({
            where: { id: history.id },
            data: { status: "ENVIADO" }
          });
        }
      } catch (sendErr: any) {
        await prisma.messageHistory.update({
          where: { id: history.id },
          data: { status: "FALHOU", errorDetail: sendErr.message }
        });
      }
    }, 1500);

    return true;
  } catch (err) {
    console.error("[WhatsApp Service] Erro geral ao disparar notificação:", err);
    return false;
  }
}
