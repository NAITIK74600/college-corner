import { Router } from 'express';
import { requireApiKey }        from '../middleware/apiKeyAuth';
import { clientGetQueue, clientUpdateJobStatus } from '../controllers/printClientController';

const router = Router();

// All routes here are protected by API key (no JWT needed)
router.use(requireApiKey);

// Poll for assigned paid jobs
router.get('/queue', clientGetQueue);

// Report job progress / completion
router.patch('/jobs/:id/status', clientUpdateJobStatus);

export default router;
