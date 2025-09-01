import express from 'express';
import { 
  getAttendances, 
  markAttendance, 
  updateAttendance, 
  deleteAttendance,
  getAttendanceStats,
  getChildrenForAttendance
} from '../controllers/attendanceController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Routes accessibles à tous les utilisateurs connectés
router.get('/', getAttendances);
router.get('/stats', getAttendanceStats);
router.get('/children', getChildrenForAttendance);
router.post('/', markAttendance);

// Routes admin uniquement
router.put('/:id', admin, updateAttendance);
router.delete('/:id', admin, deleteAttendance);

export default router;