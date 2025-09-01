import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  weekStartDate: {
    type: Date,
    required: [true, 'La date de début de semaine est requise']
  },
  weekEndDate: {
    type: Date,
    required: [true, 'La date de fin de semaine est requise']
  },
  meals: {
    monday: {
      breakfast: { type: String, trim: true },
      lunch: { type: String, trim: true },
      snack: { type: String, trim: true }
    },
    tuesday: {
      breakfast: { type: String, trim: true },
      lunch: { type: String, trim: true },
      snack: { type: String, trim: true }
    },
    wednesday: {
      breakfast: { type: String, trim: true },
      lunch: { type: String, trim: true },
      snack: { type: String, trim: true }
    },
    thursday: {
      breakfast: { type: String, trim: true },
      lunch: { type: String, trim: true },
      snack: { type: String, trim: true }
    },
    friday: {
      breakfast: { type: String, trim: true },
      lunch: { type: String, trim: true },
      snack: { type: String, trim: true }
    },
    saturday: {
      breakfast: { type: String, trim: true },
      lunch: { type: String, trim: true },
      snack: { type: String, trim: true }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

menuSchema.index({ weekStartDate: 1 }, { unique: true });

export default mongoose.model('Menu', menuSchema);