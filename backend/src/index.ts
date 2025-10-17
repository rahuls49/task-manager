import express from 'express';
import globalErrorHandler from './middlewares/global-error-handler';

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(express.json());
app.use(globalErrorHandler);

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});