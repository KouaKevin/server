import Menu from '../models/Menu.js';

export const getMenus = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { isActive: true };
    
    if (startDate) {
      query.weekStartDate = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      query.weekEndDate = { $lte: new Date(endDate) };
    }

    const menus = await Menu.find(query)
      .populate('createdBy', 'name')
      .sort({ weekStartDate: -1 });

    res.json(menus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getCurrentMenu = async (req, res) => {
  try {
    const today = new Date();
    const menu = await Menu.findOne({
      weekStartDate: { $lte: today },
      weekEndDate: { $gte: today },
      isActive: true
    }).populate('createdBy', 'name');

    if (!menu) {
      return res.status(404).json({ message: 'Aucun menu trouvé pour cette semaine' });
    }

    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createMenu = async (req, res) => {
  try {
    const menu = await Menu.create({
      ...req.body,
      createdBy: req.user.id
    });

    const populatedMenu = await Menu.findById(menu._id)
      .populate('createdBy', 'name');

    res.status(201).json(populatedMenu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!menu) {
      return res.status(404).json({ message: 'Menu non trouvé' });
    }

    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!menu) {
      return res.status(404).json({ message: 'Menu non trouvé' });
    }

    res.json({ message: 'Menu supprimé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const duplicateMenu = async (req, res) => {
  try {
    const sourceMenu = await Menu.findById(req.params.id);
    
    if (!sourceMenu) {
      return res.status(404).json({ message: 'Menu source non trouvé' });
    }

    const { weekStartDate, weekEndDate } = req.body;

    const newMenu = await Menu.create({
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      meals: sourceMenu.meals,
      createdBy: req.user.id
    });

    const populatedMenu = await Menu.findById(newMenu._id)
      .populate('createdBy', 'name');

    res.status(201).json(populatedMenu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};