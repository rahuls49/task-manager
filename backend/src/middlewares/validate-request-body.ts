import { NextFunction } from "express";
import * as whitelist from '../utils/whitelist'

export default function validateRequestBody(req: Request, res: Response, next: NextFunction) {
    // Build filters from request body
    const allowedFilters = whitelist.LIST_TASK_FILTER_WHITELIST;
    // const filters: TaskFilters = {};
    // for (const key of allowedFilters) {
    //     if (req.body?.hasOwnProperty(key)) {
    //         (filters as any)[key] = req.body[key];
    //     }
    // }
}

