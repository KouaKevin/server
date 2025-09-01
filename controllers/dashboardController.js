import Child from '../models/Child.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Basic counts
    const totalChildren = await Child.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ isActive: true });
    
    // Children by class
    const childrenByClass = await Child.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$class', count: { $sum: 1 } } }
    ]);

    // Daily stats
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayPayments = await Payment.find({
      paymentDate: { $gte: todayStart, $lte: todayEnd }
    });

    const todayRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Monthly stats
    const monthlyPayments = await Payment.find({
      paymentDate: { $gte: startOfMonth }
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Revenue by payment method (this month)
    const revenueByMethod = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfMonth } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Revenue trend (last 7 days)
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayPayments = await Payment.find({
        paymentDate: { $gte: dayStart, $lte: dayEnd }
      });

      const dayRevenue = dayPayments.reduce((sum, payment) => sum + payment.amount, 0);

      revenueTrend.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue,
        payments: dayPayments.length
      });
    }

    // Overdue payments (for monthly and quarterly payments)
    const overduePayments = await Payment.countDocuments({
      status: 'En retard'
    });

    // Recent payments
    const recentPayments = await Payment.find()
      .populate('child', 'firstName lastName class')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalChildren,
      totalUsers,
      todayRevenue,
      monthlyRevenue,
      todayPayments: todayPayments.length,
      monthlyPayments: monthlyPayments.length,
      overduePayments,
      childrenByClass,
      revenueByMethod,
      revenueTrend,
      recentPayments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getExpenseReport = async (req, res) => {
  try {
    const expenses = await Payment.find().populate('child', 'firstName lastName'); 
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


export const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    let groupFormat;
    switch (groupBy) {
      case 'month':
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$paymentDate" } };
        break;
      case 'week':
        groupFormat = { $dateToString: { format: "%Y-W%V", date: "$paymentDate" } };
        break;
      default:
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } };
    }

    const report = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalRevenue: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          paymentMethods: {
            $push: {
              method: '$paymentMethod',
              amount: '$amount'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate payment method breakdown for each period
    const enhancedReport = report.map(period => {
      const methodBreakdown = {};
      period.paymentMethods.forEach(pm => {
        methodBreakdown[pm.method] = (methodBreakdown[pm.method] || 0) + pm.amount;
      });
      
      return {
        period: period._id,
        totalRevenue: period.totalRevenue,
        totalPayments: period.totalPayments,
        paymentMethods: methodBreakdown
      };
    });

    res.json(enhancedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};