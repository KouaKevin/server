import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: [true, 'L\'enfant est requis']
  },
  date: {
    type: Date,
    required: [true, 'La date est requise']
  },
  checkInTime: {
    type: Date,
    required: [true, 'L\'heure d\'arrivée est requise'],
    default: Date.now
  },
  checkOutTime: {
    type: Date
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Présent', 'Absent', 'En retard'],
    default: 'Présent'
  }
}, {
  timestamps: true
});

// Index composé pour éviter les doublons (un enfant ne peut être marqué présent qu'une fois par jour)
attendanceSchema.index({ child: 1, date: 1 }, { unique: true });

// Méthode pour obtenir la date sans l'heure
attendanceSchema.methods.getDateOnly = function() {
  const date = new Date(this.date);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export default mongoose.model('Attendance', attendanceSchema);