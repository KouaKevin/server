import express from 'express';
import { 
  getMenus, 
  getCurrentMenu, 
  createMenu, 
  updateMenu, 
  deleteMenu, 
  duplicateMenu 
} from '../controllers/menuController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getMenus);
router.get('/current', getCurrentMenu);

// Admin only routes
router.post('/', admin, createMenu);
router.put('/:id', admin, updateMenu);
router.delete('/:id', admin, deleteMenu);
router.post('/:id/duplicate', admin, duplicateMenu);

export default router;