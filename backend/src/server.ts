import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdfRoutes';

dotenv.config();

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
      // Allow requests with no origin (like Postman or curl)
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

// ✅ API Routes
app.use('/api', pdfRoutes);

// ✅ Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'PDF Parser Backend Server is running',
    timestamp: new Date().toISOString(),
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
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 PDF PARSER BACKEND SERVER');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API endpoint: http://localhost:${PORT}/api/parse-pdf`);
  console.log(`🌍 Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});
