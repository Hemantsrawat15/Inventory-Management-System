import express from 'express';
import { getMappings, createMapping, getUnmappedSkus } from '../controllers/mapping.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();
router.use(protect);

router.get('/unmapped', getUnmappedSkus); // Route for Must Mapped SKUs

router.route('/')
    .get(getMappings)
    .post(createMapping);

export default router;