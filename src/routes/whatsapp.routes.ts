import { Router } from "express";
import { whatsAppController } from "../controllers/whatsapp.controller";
import { whatsAppChatController } from "../controllers/whatsappChat.controller";
import { whatsAppWebhookController } from "../controllers/whatsappWebhook.controller";
import { checkPermission, requireAuth } from "../middlewares/auth";

const router = Router();

// 1. Webhook da Evolution API (Recebimento de mensagens em background)
router.post("/webhook", whatsAppWebhookController.handleWebhook.bind(whatsAppWebhookController));

// 2. Conexão SSE em Tempo Real para o Frontend
router.get("/events", whatsAppChatController.subscribeEvents.bind(whatsAppChatController));

// 3. Central de Atendimento (Chats e Mensagens)
router.get("/chats", checkPermission("whatsapp.send"), whatsAppChatController.getChats.bind(whatsAppChatController));
router.get("/chats/:chatId/messages", checkPermission("whatsapp.send"), whatsAppChatController.getMessages.bind(whatsAppChatController));
router.post("/chats/:chatId/send-text", checkPermission("whatsapp.send"), whatsAppChatController.sendText.bind(whatsAppChatController));
router.post("/chats/:chatId/send-template-os", checkPermission("whatsapp.send"), whatsAppChatController.sendTemplateOs.bind(whatsAppChatController));
router.post("/chats/:chatId/mark-read", checkPermission("whatsapp.send"), whatsAppChatController.markRead.bind(whatsAppChatController));
router.post("/chats/:chatId/link-order", checkPermission("whatsapp.send"), whatsAppChatController.linkOrder.bind(whatsAppChatController));
router.post("/chats/:chatId/refresh-avatar", checkPermission("whatsapp.send"), whatsAppChatController.refreshChatAvatar.bind(whatsAppChatController));
router.post("/chats/:chatId/import-file", checkPermission("whatsapp.send"), whatsAppChatController.importChatFile.bind(whatsAppChatController));
router.post("/sync-evolution", checkPermission("whatsapp.send"), whatsAppChatController.syncFromEvolution.bind(whatsAppChatController));
router.post("/sync-internal", checkPermission("whatsapp.send"), whatsAppChatController.syncFromInternalHistory.bind(whatsAppChatController));

// 4. Histórico da OS e envio pontual
router.get("/history/:orderId", checkPermission("os.view"), whatsAppController.getHistory.bind(whatsAppController));
router.post("/send-manual", checkPermission("whatsapp.send"), whatsAppController.sendManual.bind(whatsAppController));

// 5. Gerenciamento da Instância Evolution API
router.post("/instance/connect", checkPermission("admin"), whatsAppController.connect.bind(whatsAppController));
router.get("/instance/state", checkPermission("admin"), whatsAppController.getState.bind(whatsAppController));
router.delete("/instance/logout", checkPermission("admin"), whatsAppController.logout.bind(whatsAppController));

export default router;
