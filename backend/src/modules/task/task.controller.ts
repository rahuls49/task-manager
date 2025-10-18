import { Request, Response, NextFunction } from "express";
import { EDITABLE_FIELDS } from "./task.constants";
import * as taskService from "./task.service";
import { CSVRow } from "./task.types";
import { Readable } from "stream";
import csv from 'csv-parser';

function buildTaskTree(tasks: any[]) {
    const taskMap = new Map<number, any>();
    const rootTasks: any[] = [];
    tasks.forEach(task => {
        task.subtasks = [];
        taskMap.set(task.Id, task);
    });
    tasks.forEach(task => {
        if (task.ParentId) {
            const parent = taskMap.get(task.ParentId);
            if (parent) {
                parent.subtasks.push(task);
            }
        } else {
            rootTasks.push(task);
        }
    });
    return rootTasks;
}

export async function getTasks(req: Request, res: Response, next: NextFunction) {
    const tasks = await taskService.getTasks() as any[];
    if (tasks.length === 0) {
        return res.status(404).json({success : false, message: "No task available"});
    }
    const taskTree = buildTaskTree(tasks);
    console.log({userid: req.user?.id})
    return res.json({success : true, message: "Tasks fetched successfully", data : taskTree});
}

export async function getTaskById(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);
    console.log({task});
    if ((task as any).length === 0) {
        return res.status(404).json({success : false, message: "Task not found"});
    }
    return res.json({success : true, message: "Task fetched successfully", data : task});
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
    const { name } = req.body;

    if(!name) return res.status(400).json({success : false, message: "Name is required"});

    const payload = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => EDITABLE_FIELDS.includes(key))
    );

    const addTask = await taskService.createTask(payload);
    return res.status(201).json({success : true, data : addTask});
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    const payload = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => EDITABLE_FIELDS.includes(key))
    );
    console.log({payload})
    console.log(req.body)

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({success: false, message: 'Atleast one field is required' });
    }

    const updatedTask = await taskService.updateTask(id, payload);
    return res.json({success : true, message: "Task updated successfully"});
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const is_deleted = await taskService.deleteTask(id, req.user?.id as string);
    if (!is_deleted) {
        return res.status(404).json({success : false, message: "Task not found"});
    }
    return res.json({success : true, message: "Task deleted successfully"});
}

export async function importFromCsv(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const results: CSVRow[] = [];

    // Convert buffer to stream and parse CSV
    const stream = Readable.from(req.file.buffer);
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data: CSVRow) => {
          // Validate and transform data before saving
          const processedData = processCSVRow(data);
          results.push(processedData);
        })
        .on('end', async () => {
          try {
            // Save to database
            await taskService.saveCSVData(results);
            resolve(results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error: Error) => {
          next(error);
        });
    });
    return res.json({
      message: 'CSV file processed and saved to database successfully',
      totalRecords: results.length,
      data: results // Optional: return processed data
    });
}


// Process and validate CSV row
function processCSVRow(row: CSVRow): CSVRow {
  const processedRow: CSVRow = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Trim whitespace
    const cleanKey = key.trim();
    const cleanValue = value ? value.trim() : '';
    
    // Add any additional validation/transformation here
    processedRow[cleanKey] = cleanValue;
  }
  
  return processedRow;
}