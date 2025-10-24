import 'dotenv/config'
import express from 'express';
import globalErrorHandler from './middlewares/global-error-handler';
import taskRouter from './modules/task/task.route';
import authRouter from './modules/auth/auth.route';
import verifyAuthToken from './middlewares/auth-middleware';
import managementRouter from './modules/task/task.management.route';

const app = express();
const port:number = parseInt(process.env.PORT as string || "5000");

// Middlewares
app.use(express.json());
app.use(globalErrorHandler);

app.use('/tasks', verifyAuthToken, taskRouter);
app.use('/auth', authRouter);
app.use('/management', managementRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});