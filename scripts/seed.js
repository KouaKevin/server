import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Child from '../models/Child.js';
import Payment from '../models/Payment.js';
import Menu from '../models/Menu.js';
import Attendance from '../models/Attendance.js';
import Expense from '../models/Expense.js';

dotenv.config();

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Child.deleteMany({});
    await Payment.deleteMany({});
    await Menu.deleteMany({});
    await Attendance.deleteMany({});
    await Expense.deleteMany({});

    console.log('🧹 Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Administrateur',
      email: 'admin@garderie.com',
      password: '1234',
      role: 'admin',
      phone: '+33123456789'
    });

    // Create tata user
    const tata = await User.create({
      name: 'Tata Marie',
      email: 'tata@garderie.com',
      password: '1234',
      role: 'tata',
      phone: '+33987654321'
    });

    console.log('👥 Created users');

    // Create sample children
    const children = [
      {
        firstName: 'Emma',
        lastName: 'Dupont',
        dateOfBirth: new Date('2020-03-15'),
        class: 'Tous-Petits',
        paymentMode: 'Mensuel',
        parent: {
          name: 'Pierre Dupont',
          phone: '+33123456001',
          email: 'pierre.dupont@email.com',
          address: '123 Rue de la Paix, Paris'
        }
      },
      {
        firstName: 'Lucas',
        lastName: 'Martin',
        dateOfBirth: new Date('2019-07-22'),
        class: 'Garderie',
        paymentMode: 'Journalier',
        parent: {
          name: 'Marie Martin',
          phone: '+33123456002',
          email: 'marie.martin@email.com',
          address: '456 Avenue des Fleurs, Lyon'
        }
      },
      {
        firstName: 'Chloe',
        lastName: 'Bernard',
        dateOfBirth: new Date('2021-01-10'),
        class: 'Crèche',
        paymentMode: 'Trimestriel',
        parent: {
          name: 'Jean Bernard',
          phone: '+33123456003',
          email: 'jean.bernard@email.com',
          address: '789 Boulevard du Soleil, Marseille'
        }
      },
      {
        firstName: 'Noah',
        lastName: 'Petit',
        dateOfBirth: new Date('2018-11-05'),
        class: 'Maternelle',
        paymentMode: 'Mensuel',
        parent: {
          name: 'Sophie Petit',
          phone: '+33123456004',
          email: 'sophie.petit@email.com',
          address: '321 Rue des Lilas, Toulouse'
        }
      },
      {
        firstName: 'Lila',
        lastName: 'Moreau',
        dateOfBirth: new Date('2020-09-18'),
        class: 'Tous-Petits',
        paymentMode: 'Journalier',
        parent: {
          name: 'Antoine Moreau',
          phone: '+33123456005',
          email: 'antoine.moreau@email.com',
          address: '654 Place de la République, Nice'
        }
      }
    ];

    const createdChildren = await Child.insertMany(children);
    console.log('👶 Created children');

    // Create sample payments
    const payments = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const paymentDate = new Date(today);
      paymentDate.setDate(paymentDate.getDate() - i);
      
      const child = createdChildren[Math.floor(Math.random() * createdChildren.length)];
      const amounts = { 'Journalier': 15000, 'Mensuel': 300000, 'Trimestriel': 900000 };
      const methods = ['Espèce', 'Virement', 'Mobile Money'];
      
      payments.push({
        child: child._id,
        amount: amounts[child.paymentMode],
        paymentDate,
        paymentMethod: methods[Math.floor(Math.random() * methods.length)],
        type: child.paymentMode,
        period: child.paymentMode !== 'Journalier' ? 
          `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}` : 
          undefined,
        status: 'Payé',
        recordedBy: Math.random() > 0.5 ? admin._id : tata._id
      });
    }

    await Payment.insertMany(payments);
    console.log('💰 Created payments');

    // Create sample attendances for today
 
    const attendances = [];
    
    // Mark some children as present today
    for (let i = 0; i < 3; i++) {
      const child = createdChildren[i];
      const checkInTime = new Date(today);
      checkInTime.setHours(8 + i, 30 + (i * 15), 0, 0); // Different arrival times
      
      attendances.push({
        child: child._id,
        date: today,
        checkInTime,
        recordedBy: Math.random() > 0.5 ? admin._id : tata._id,
        status: 'Présent'
      });
    }

    await Attendance.insertMany(attendances);
    console.log('📋 Created attendances');

    // Create sample expenses
    const expenses = [];
    const expenseTypes = ['Electricité', 'Eau', 'Wifi', 'Gaz', 'Autres'];
    const descriptions = {
      'Electricité': ['Facture électricité mensuelle', 'Réparation installation électrique', 'Ampoules LED'],
      'Eau': ['Facture eau mensuelle', 'Réparation fuite', 'Installation nouveau robinet'],
      'Wifi': ['Abonnement internet mensuel', 'Installation routeur', 'Maintenance réseau'],
      'Gaz': ['Recharge bouteille de gaz', 'Maintenance cuisinière', 'Achat détendeur'],
      'Autres': ['Fournitures de bureau', 'Produits d\'entretien', 'Matériel pédagogique']
    };

    for (let i = 0; i < 8; i++) {
      const expenseDate = new Date(today);
      expenseDate.setDate(expenseDate.getDate() - Math.floor(Math.random() * 30));
      
      const type = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
      const typeDescriptions = descriptions[type];
      const description = typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
      
      const amounts = { 
        'Electricité': [25000, 35000, 45000], 
        'Eau': [15000, 20000, 25000], 
        'Wifi': [12000, 15000, 18000], 
        'Gaz': [8000, 12000, 15000], 
        'Autres': [5000, 10000, 20000] 
      };
      
      const amount = amounts[type][Math.floor(Math.random() * amounts[type].length)];
      const statuses = ['En attente', 'Approuvée', 'Rejetée'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      expenses.push({
        title: type,
        description,
        amount,
        date: expenseDate,
        createdBy: Math.random() > 0.5 ? admin._id : tata._id,
        status
      });
    }

    await Expense.insertMany(expenses);
    console.log('💸 Created expenses');

    // Create sample menu
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 5); // Saturday

    const menu = await Menu.create({
      weekStartDate: startOfWeek,
      weekEndDate: endOfWeek,
      meals: {
        monday: {
          breakfast: 'Pain au chocolat, Lait chaud',
          lunch: 'Riz au poulet, Légumes sautés, Yaourt',
          snack: 'Fruits de saison, Biscuits'
        },
        tuesday: {
          breakfast: 'Céréales, Jus d\'orange',
          lunch: 'Pâtes à la sauce tomate, Salade verte, Compote',
          snack: 'Pain et confiture, Lait'
        },
        wednesday: {
          breakfast: 'Toast beurré, Chocolat chaud',
          lunch: 'Poisson grillé, Riz, Légumes vapeur, Fromage',
          snack: 'Gâteau maison, Eau'
        },
        thursday: {
          breakfast: 'Croissant, Lait',
          lunch: 'Boeuf sauté, Pommes de terre, Salade, Fruit',
          snack: 'Yaourt, Crackers'
        },
        friday: {
          breakfast: 'Pain perdu, Jus de fruits',
          lunch: 'Crevettes au curry, Riz basmati, Légumes, Dessert',
          snack: 'Smoothie, Biscuits secs'
        },
        saturday: {
          breakfast: 'Pancakes, Sirop, Lait',
          lunch: 'Plat du chef, Accompagnements variés',
          snack: 'Goûter surprise'
        }
      },
      createdBy: admin._id
    });

    console.log('🍽️ Created menu');

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('Admin: admin@garderie.com / 1234');
    console.log('Tata: tata@garderie.com / 1234');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();