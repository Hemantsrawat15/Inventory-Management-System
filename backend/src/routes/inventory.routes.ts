import express from 'express';
import multer from 'multer';
import { getInventoryItems, addInventoryItem } from '../controllers/inventory.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();
const upload = multer();

router.use(protect);

router.route('/')
  .get(getInventoryItems)
  .post(upload.single("featuredImage"), addInventoryItem); // Use multer here

export default router;