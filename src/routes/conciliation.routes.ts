import { Router } from 'express';
import { ConciliationController } from '../controllers/conciliation.controller';
import { checkPermission } from '../middlewares/auth';

const router = Router();
const controller = new ConciliationController();

router.get('/analisar', checkPermission('financial.view'), controller.simulate.bind(controller));
router.post('/executar', checkPermission('financial.conciliate'), controller.execute.bind(controller));
router.get('/lotes', checkPermission('financial.view'), controller.getBatches.bind(controller));
router.post('/rollback/:batchId', checkPermission('financial.conciliate'), controller.rollback.bind(controller));

// Central de Status
router.get('/avaliacao-scan', checkPermission('financial.view'), controller.scanAvaliacao.bind(controller));
router.post('/avaliacao-apply', checkPermission('financial.conciliate'), controller.applyAvaliacao.bind(controller));

export default router;
