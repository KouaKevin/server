import express from 'express';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  resetPassword 
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(admin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetPassword);

export default router;