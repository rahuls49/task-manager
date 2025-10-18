import 'dotenv/config'
import express from 'express';
import globalErrorHandler from './middlewares/global-error-handler';
import taskRouter from './modules/task/task.route';

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(globalErrorHandler);

app.use('/task', taskRouter)

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});