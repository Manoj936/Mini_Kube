import { Router } from 'express';
import { onDemandContainerSpinner , onDemandLogs } from './controller.js';

const router = Router();

router.post('/config-details', onDemandContainerSpinner);
router.get('/config-logs', onDemandLogs);

export default router;