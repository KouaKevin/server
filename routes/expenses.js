import express from 'express';
import { 
  getExpenses, 
  getExpense,
  createExpense, 
  updateExpense, 
  deleteExpense,
  getExpenseStats,
  generateExpenseReceipt,
  getExpenseReport
} from '../controllers/expenseController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Routes accessibles à tous les utilisateurs connectés
router.get('/', getExpenses);
router.get('/stats', getExpenseStats);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.get('/:id/receipt', generateExpenseReceipt);

// Routes avec restrictions
router.put('/:id', updateExpense); // Admin peut changer statut, utilisateur peut modifier ses dépenses
router.delete('/:id', deleteExpense); // Admin ou créateur peut supprimer

export default router;