import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import childRoutes from './routes/children.js';
import paymentRoutes from './routes/payments.js';
import menuRoutes from './routes/menus.js';
import dashboardRoutes from './routes/dashboard.js';
import attendanceRoutes from './routes/attendance.js';
import expenseRoutes from './routes/expenses.js';

dotenv.config();

const app = express();

// 🔹 Corrige le problème d'IP derrière proxy (Render, Heroku, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  "https://toupti-sarl.onrender.com",  // front prod
  "http://localhost:3000",             // dev local
  /\.vercel\.app$/                     // regex pour Preview deployments
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Postman ou curl
    if (allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin))) {
      return callback(null, true);
    }
    callback(new Error("CORS policy: Origin not allowed"));
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  credentials: true
}));

app.options("*", cors());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/children', childRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ACTIVE', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Une erreur interne s\'est produite',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// ⚡ Seul le développement local écoute un port
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  });
}

export default app;
