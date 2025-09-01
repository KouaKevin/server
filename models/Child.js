import mongoose from 'mongoose';

const childSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'La date de naissance est requise']
  },
  class: {
    type: String,
    required: [true, 'La classe est requise'],
    enum: ['Crèche-garderie', 'Toute petite section', 'Petite section', 'Grande section']
  },
  paymentMode: {
    type: String,
    required: [true, 'Le mode de paiement est requis'],
    enum: ['Journalier', 'Mensuel', 'Trimestriel']
  },
  parent: {
    name: {
      type: String,
      required: [true, 'Le nom du parent est requis'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Le téléphone du parent est requis'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

childSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

childSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

export default mongoose.model('Child', childSchema);