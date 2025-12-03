import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import globalErrorHandler from './middlewares/global-error-handler';
import taskRouter from './modules/task/task.route';
import authRouter from './modules/auth/auth.route';
import verifyAuthToken from './middlewares/auth-middleware';
import managementRouter from './modules/task/task.management.route';
import taskSystemRouter from './modules/task/task.system.route';
import { actionRouter } from './modules/action';
import { recurringTaskScheduler } from '@task-manager/rescheduler-lib';

const app = express();
const port: number = parseInt(process.env.PORT as string || "5000");

// Middlewares
app.use(express.json());
app.use(globalErrorHandler);
app.use(cors(
  { origin: true, credentials: true }
));

app.use('/tasks', taskRouter);
app.use('/system', taskSystemRouter);
app.use('/auth', authRouter);
app.use('/management', managementRouter);
app.use('/actions', actionRouter);

app.listen(port, "0.0.0.0", async () => {
  console.log(`Server running on port ${port}`);
  
  // Initialize the recurring task scheduler
  try {
    await recurringTaskScheduler.initialize();
  } catch (error) {
    console.error('Failed to initialize recurring task scheduler:', error);
  }
});