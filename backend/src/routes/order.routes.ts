import { Router } from 'express';
import { processOrders, getOrders } from '../controllers/order.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/', protect, processOrders);
router.get('/', protect, getOrders);

export default router;