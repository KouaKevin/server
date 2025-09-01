import express from 'express';
import { 
  getChildren, 
  getChild, 
  createChild, 
  updateChild, 
  deleteChild, 
  getChildHistory 
} from '../controllers/childController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getChildren);
router.post('/', createChild);
router.get('/:id', getChild);
router.put('/:id', updateChild);
router.delete('/:id', deleteChild);
router.get('/:id/history', getChildHistory);

export default router;