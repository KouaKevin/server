import Child from '../models/Child.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';

export const getChildren = async (req, res) => {
  try {
    const { class: childClass, paymentMode, search, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    if (childClass) query.class = childClass;
    if (paymentMode) query.paymentMode = paymentMode;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { 'parent.name': { $regex: search, $options: 'i' } }
      ];
    }

    const children = await Child.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Child.countDocuments(query);

    res.json({
      children,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    
    if (!child) {
      return res.status(404).json({ message: 'Enfant non trouvé' });
    }

    res.json(child);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createChild = async (req, res) => {
  try {
    const child = await Child.create(req.body);
    res.status(201).json(child);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateChild = async (req, res) => {
  try {
    const child = await Child.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!child) {
      return res.status(404).json({ message: 'Enfant non trouvé' });
    }

    res.json(child);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteChild = async (req, res) => {
  try {
    const child = await Child.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!child) {
      return res.status(404).json({ message: 'Enfant non trouvé' });
    }

    res.json({ message: 'Enfant désactivé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getChildHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payments = await Payment.find({ child: id })
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });
    
    const attendance = await Attendance.find({ child: id })
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .limit(30);

    res.json({ payments, attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};