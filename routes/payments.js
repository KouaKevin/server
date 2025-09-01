import express from 'express';
import { 
  getPayments, 
  createPayment, 
  generateReceipt, 
  getDailyReport 
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getPayments);
router.post('/', createPayment);
router.get('/daily-report', getDailyReport);
router.get('/:id/receipt', generateReceipt);

export default router;