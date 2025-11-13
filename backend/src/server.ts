import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import pdfRoutes from './routes/pdfRoutes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import inventoryRoutes from './routes/inventory.routes';
import mappingRoutes from './routes/mapping.routes';
import cropperRoutes from './routes/cropper.routes';
import orderRoutes from './routes/order.routes';
import { UnmappedSku } from './models/unmappedSku.model';
import mongoose from 'mongoose';

dotenv.config();

// Connect to MongoDB and rebuild indexes
const initializeDatabase = async () => {
  await connectDB();
  
  // Rebuild indexes for UnmappedSku
  try {
    console.log('🔄 Rebuilding UnmappedSku indexes...');
    await UnmappedSku.collection.dropIndexes();
    await UnmappedSku.syncIndexes();
    console.log('✅ UnmappedSku indexes rebuilt successfully');
  } catch (error: any) {
    // This error is normal on first run when collection doesn't exist
    if (error.code === 26) {
      console.log('ℹ️  UnmappedSku collection not found (normal on first run)');
    } else {
      console.log('⚠️  Index rebuild warning:', error.message);
    }
  }
};

initializeDatabase();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ✅ Allow both local and deployed frontends
const allowedOrigins = [
  'http://localhost:3000',
  'https://inventory-management-system-7qb6.onrender.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ✅ Parse JSON + form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ API Routes (Organized by feature)
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/cropper', cropperRoutes);
app.use('/api/orders', orderRoutes);

// ✅ Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Inventory Backend Server is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// ✅ 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ✅ Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 INVENTORY MANAGEMENT BACKEND SERVER');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Auth API: http://localhost:${PORT}/api/auth/...`);
  console.log(`👤 Profile API: http://localhost:${PORT}/api/profiles/...`);
  console.log(`📄 PDF API: http://localhost:${PORT}/api/pdf/...`);
  console.log(`📦 Inventory API: http://localhost:${PORT}/api/inventory/...`);
  console.log(`🔗 Mapping API: http://localhost:${PORT}/api/mappings/...`);
  console.log(`✂️  Cropper API: http://localhost:${PORT}/api/cropper/...`);
  console.log(`📋 Orders API: http://localhost:${PORT}/api/orders/...`);
  console.log(`🌍 Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});