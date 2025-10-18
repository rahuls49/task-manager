import { Router } from "express";
import csv from 'csv-parser';
import multer from 'multer';
import { Readable } from 'stream';
import { createTask, getTasks, getTaskById, updateTask, deleteTask, importFromCsv } from "./task.controller";
const taskRouter = Router();

// Configure multer for memory storage (no disk storage)
const storage = multer.memoryStorage(); // Store files in memory as Buffer

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

taskRouter.get('/', getTasks)
taskRouter.get('/:id', getTaskById)
taskRouter.post('/', createTask)
taskRouter.put('/:id', updateTask)
taskRouter.delete('/:id', deleteTask)

taskRouter.post('/csv', upload.single('file'), importFromCsv)

export default taskRouter;