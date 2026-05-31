import express, { Express } from 'express';
import cors from 'cors';
import { getHealth } from './controllers/health.controller';
import { globalErrorHandler } from './middlewares/error.middleware';
import groundingRouter from './routes/grounding.routes';

const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', getHealth);
app.use('/grounding', groundingRouter);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
