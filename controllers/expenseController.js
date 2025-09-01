import Expense from '../models/Expense.js';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';

export const getExpenses = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      title, 
      status,
      page = 1, 
      limit = 10 
    } = req.query;
    
    let query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (title) query.title = title;
    if (status) query.status = status;

    const expenses = await Expense.find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    let groupFormat;
    switch (groupBy) {
      case 'month':
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$date" } };
        break;
      case 'week':
        groupFormat = { $dateToString: { format: "%Y-W%V", date: "$date" } };
        break;
      default:
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
    }

    const report = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: 'Approuvée' // Seulement les dépenses approuvées
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalExpenses: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          expensesByCategory: {
            $push: {
              category: '$title',
              amount: '$amount'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculer la répartition par catégorie pour chaque période
    const enhancedReport = report.map(period => {
      const categoryBreakdown = {};
      period.expensesByCategory.forEach(exp => {
        categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
      });
      
      return {
        period: period._id,
        totalExpenses: period.totalExpenses,
        totalCount: period.totalCount,
        expensesByCategory: categoryBreakdown
      };
    });

    res.json(enhancedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'name role');
    
    if (!expense) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      createdBy: req.user.id
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('createdBy', 'name role');

    res.status(201).json(populatedExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Seuls les admins peuvent modifier le statut
    if (req.user.role !== 'admin' && (status || notes)) {
      return res.status(403).json({ 
        message: 'Seuls les administrateurs peuvent modifier le statut' 
      });
    }

    const expense = await Expense.findByIdAndUpdate(
      id,
      { status, notes },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name role');

    if (!expense) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    // Seuls les admins ou le créateur peuvent supprimer
    if (req.user.role !== 'admin' && expense.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez supprimer que vos propres dépenses' 
      });
    }

    await Expense.findByIdAndDelete(id);
    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const generateExpenseReceipt = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'name role');

    if (!expense) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    const receiptTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reçu de Dépense</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #333;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #e74c3c;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #e74c3c;
                margin: 0;
                font-size: 28px;
            }
            .header h2 {
                color: #666;
                margin: 5px 0 0 0;
                font-size: 18px;
                font-weight: normal;
            }
            .receipt-info { 
                margin-bottom: 30px; 
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .receipt-info p {
                margin: 8px 0;
                font-size: 14px;
            }
            .receipt-info strong {
                color: #2c3e50;
                display: inline-block;
                width: 150px;
            }
            .expense-details {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .amount {
                font-size: 24px;
                font-weight: bold;
                color: #e74c3c;
                text-align: center;
                background: #ffeaea;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .status {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status.approved { background: #d4edda; color: #155724; }
            .status.pending { background: #fff3cd; color: #856404; }
            .status.rejected { background: #f8d7da; color: #721c24; }
            .footer { 
                margin-top: 40px; 
                text-align: center; 
                border-top: 1px solid #ddd;
                padding-top: 20px;
                color: #666;
                font-size: 12px;
            }
            .category-icon {
                display: inline-block;
                width: 40px;
                height: 40px;
                background: #e74c3c;
                border-radius: 50%;
                text-align: center;
                line-height: 40px;
                color: white;
                font-weight: bold;
                margin-right: 15px;
                vertical-align: middle;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏫 Garderie Management</h1>
            <h2>Reçu de Dépense</h2>
        </div>
        
        <div class="receipt-info">
            <p><strong>Numéro de reçu:</strong> {{receiptNumber}}</p>
            <p><strong>Date de création:</strong> {{createdDate}}</p>
            <p><strong>Date de dépense:</strong> {{expenseDate}}</p>
            <p><strong>Créé par:</strong> {{createdBy.name}} ({{createdBy.role}})</p>
            <p><strong>Statut:</strong> 
                <span class="status {{statusClass}}">{{status}}</span>
            </p>
        </div>
        
        <div class="expense-details">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div class="category-icon">{{categoryIcon}}</div>
                <div>
                    <h3 style="margin: 0; color: #2c3e50;">{{title}}</h3>
                    <p style="margin: 5px 0 0 0; color: #666;">Catégorie de dépense</p>
                </div>
            </div>
            
            <div class="amount">
                {{amount}} FCFA
            </div>
            
            <div style="margin-top: 20px;">
                <strong style="color: #2c3e50;">Description:</strong>
                <p style="margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; line-height: 1.6;">
                    {{description}}
                </p>
            </div>
            
            {{#if notes}}
            <div style="margin-top: 20px;">
                <strong style="color: #2c3e50;">Notes administratives:</strong>
                <p style="margin: 10px 0; padding: 15px; background: #e8f4fd; border-radius: 5px; line-height: 1.6;">
                    {{notes}}
                </p>
            </div>
            {{/if}}
        </div>
        
        <div class="footer">
            <p><strong>Garderie Management System</strong></p>
            <p>Reçu généré automatiquement le {{generatedDate}}</p>
            <p><em>Ce document certifie l'enregistrement de la dépense dans le système</em></p>
        </div>
    </body>
    </html>
    `;

    const getCategoryIcon = (category) => {
      const icons = {
        'Electricité': '⚡',
        'Eau': '💧',
        'Wifi': '📶',
        'Gaz': '🔥',
        'Autres': '📦'
      };
      return icons[category] || '📦';
    };

    const getStatusClass = (status) => {
      const classes = {
        'Approuvée': 'approved',
        'En attente': 'pending',
        'Rejetée': 'rejected'
      };
      return classes[status] || 'pending';
    };

    const template = handlebars.compile(receiptTemplate);
    const html = template({
      ...expense.toObject(),
      createdDate: expense.createdAt.toLocaleDateString('fr-FR')
      // ,
      // expenseDate: expense.date.toLocaleDateString('fr-FR'),
      // generatedDate: new Date().toLocaleString('fr-FR'),
      // categoryIcon: getCategoryIcon(expense.title),
      // statusClass: getStatusClass(expense.status),
      // amount: new Intl.NumberFormat('fr-FR').format(expense.amount)
    });

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html);
    let pdf = await page.pdf({ format: 'A4' });
    await browser.close();


    if (!Buffer.isBuffer(pdf)) {
      pdf = Buffer.from(pdf);
    }
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=recu-depense-${expense.receiptNumber}.pdf`
    });

    res.send(pdf);
  } catch (error) {
    console.error('Error generating expense receipt:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du reçu' });
  }
};

export const getExpenseStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Statistiques du jour
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayExpenses = await Expense.find({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const todayTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Statistiques du mois
    const monthlyExpenses = await Expense.find({
      date: { $gte: startOfMonth }
    });

    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Dépenses par catégorie (ce mois)
    const expensesByCategory = await Expense.aggregate([
      { $match: { date: { $gte: startOfMonth } } },
      { $group: { _id: '$title', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Dépenses par statut
    const expensesByStatus = await Expense.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Tendance des 7 derniers jours
    const expenseTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayExpenses = await Expense.find({
        date: { $gte: dayStart, $lte: dayEnd }
      });

      const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      expenseTrend.push({
        date: date.toISOString().split('T')[0],
        amount: dayTotal,
        count: dayExpenses.length
      });
    }

    res.json({
      todayTotal,
      todayCount: todayExpenses.length,
      monthlyTotal,
      monthlyCount: monthlyExpenses.length,
      expensesByCategory,
      expensesByStatus,
      expenseTrend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};