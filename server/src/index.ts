import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Nginx reverse proxy to get correct IP
app.set('trust proxy', true);

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

// Serve frontend (client/dist) in production

const clientDistPath = path.join(__dirname, "..", "..", "client", "dist");

app.use(express.static(clientDistPath));

app.get("*", (req, res) => {

  res.sendFile(path.join(clientDistPath, "index.html"));

});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DAFA Warehouse Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
