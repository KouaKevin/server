import express from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboardStats, getFinancialReport, getExpenseReport } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/financial-report', getFinancialReport);
router.get('/expense-report', getExpenseReport);

export default router;