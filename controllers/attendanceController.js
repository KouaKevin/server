import Attendance from '../models/Attendance.js';
import Child from '../models/Child.js';

export const getAttendances = async (req, res) => {
  try {
    const { date, class: childClass, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    // Filtre par date (par défaut aujourd'hui)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.date = { $gte: startOfDay, $lte: endOfDay };

    const attendances = await Attendance.find(query)
      .populate({
        path: 'child',
        select: 'firstName lastName class parent',
        match: childClass ? { class: childClass } : {}
      })
      .populate('recordedBy', 'name')
      .sort({ checkInTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filtrer les résultats où child n'est pas null (après le match)
    const filteredAttendances = attendances.filter(attendance => attendance.child !== null);

    const total = await Attendance.countDocuments(query);

    res.json({
      attendances: filteredAttendances,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: filteredAttendances.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { childId, notes } = req.body;
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Enfant non trouvé' });
    }

    // Vérifier si l'enfant est déjà marqué présent aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      child: childId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        message: 'Cet enfant est déjà marqué présent aujourd\'hui' 
      });
    }

    const attendance = await Attendance.create({
      child: childId,
      date: today,
      checkInTime: new Date(),
      recordedBy: req.user.id,
      notes
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('child', 'firstName lastName class parent')
      .populate('recordedBy', 'name');

    res.status(201).json(populatedAttendance);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Cet enfant est déjà marqué présent aujourd\'hui' 
      });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOutTime, notes, status } = req.body;

    const attendance = await Attendance.findByIdAndUpdate(
      id,
      { 
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        notes,
        status
      },
      { new: true, runValidators: true }
    )
    .populate('child', 'firstName lastName class parent')
    .populate('recordedBy', 'name');

    if (!attendance) {
      return res.status(404).json({ message: 'Présence non trouvée' });
    }

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findByIdAndDelete(id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Présence non trouvée' });
    }

    res.json({ message: 'Présence supprimée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getAttendanceStats = async (req, res) => {
  try {
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Statistiques du jour
    const todayAttendances = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('child', 'class');

    const totalPresent = todayAttendances.length;
    const totalChildren = await Child.countDocuments({ isActive: true });
    const absentCount = totalChildren - totalPresent;

    // Répartition par classe
    const attendanceByClass = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $lookup: {
          from: 'children',
          localField: 'child',
          foreignField: '_id',
          as: 'childInfo'
        }
      },
      {
        $unwind: '$childInfo'
      },
      {
        $group: {
          _id: '$childInfo.class',
          count: { $sum: 1 }
        }
      }
    ]);

    // Statistiques hebdomadaires
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Dimanche
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: weekStart, $lte: weekEnd }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      totalPresent,
      totalChildren,
      absentCount,
      attendanceRate: totalChildren > 0 ? ((totalPresent / totalChildren) * 100).toFixed(1) : 0,
      attendanceByClass,
      weeklyStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getChildrenForAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer tous les enfants actifs
    const allChildren = await Child.find({ isActive: true })
      .select('firstName lastName class parent')
      .sort({ firstName: 1 });

    // Récupérer les présences du jour
    const todayAttendances = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).select('child');

    const presentChildrenIds = todayAttendances.map(att => att.child.toString());

    // Marquer les enfants présents
    const childrenWithStatus = allChildren.map(child => ({
      ...child.toObject(),
      isPresent: presentChildrenIds.includes(child._id.toString())
    }));

    res.json(childrenWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};