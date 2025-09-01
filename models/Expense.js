import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    enum: ['Electricité', 'Eau', 'Wifi', 'Gaz', 'Autres'],
    default: 'Autres'
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0, 'Le montant doit être positif']
  },
  date: {
    type: Date,
    required: [true, 'La date est requise'],
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  receiptNumber: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['En attente', 'Approuvée', 'Rejetée'],
    default: 'En attente'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

expenseSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const count = await mongoose.models.Expense.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    this.receiptNumber = `EXP-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Expense', expenseSchema);