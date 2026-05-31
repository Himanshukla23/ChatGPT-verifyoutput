import 'dotenv/config';
import app from './app';


const port = process.env.PORT || 3001;

const server = app.listen(port, () => {
  console.log(`[Server] Grounding AI Assistant backend is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${port}`);
});

// Handle termination signals gracefully
const gracefulShutdown = () => {
  console.log('[Server] Gracefully shutting down...');
  server.close(() => {
    console.log('[Server] Server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
