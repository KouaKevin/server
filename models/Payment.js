import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: [true, 'L\'enfant est requis']
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0, 'Le montant doit être positif']
  },
  paymentDate: {
    type: Date,
    required: [true, 'La date de paiement est requise'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    required: [true, 'La méthode de paiement est requise'],
    enum: ['Espèce', 'Virement', 'Mobile Money']
  },
  type: {
    type: String,
    required: [true, 'Le type de paiement est requis'],
    enum: ['Journalier', 'Mensuel', 'Trimestriel']
  },
  period: {
    type: String,
    required: function() {
      return this.type !== 'Journalier';
    }
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: [true, 'Le numéro de reçu est requis']
  },
  status: {
    type: String,
    enum: ['Payé', 'En attente', 'En retard'],
    default: 'Payé'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const count = await mongoose.models.Payment.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    this.receiptNumber = `REC-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Payment', paymentSchema);