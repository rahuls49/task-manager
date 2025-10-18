import pool from "../../lib/connection";
import { EDITABLE_FIELDS } from "./task.constants";
import { CSVRow } from "./task.types";

function mapToSqlKeys(payload: Record<string, any>): Record<string, any> {
    const mapping: Record<string, string> = {
        name: 'Name',
        description: 'Description',
        duedate: 'DueDate',
        expected_start_date: 'ExpectedStartDate',
        expected_end_date: 'ExpectedEndDate',
        priority: 'Priority',
        status: 'Status',
        parent_id: 'ParentId',
        task_frequency: 'TaskFrequency',
        duetime: 'DueTime',
    };
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
        const sqlKey = mapping[key];
        if (sqlKey) {
            result[sqlKey] = value;
        }
    }
    return result;
}

export async function getTasks() {
    const [rows] = await pool.execute(`SELECT * FROM TaskMaster`);
    return rows;
}

export async function getTaskById(taskId: string) {
    const [rows] = await pool.execute(`SELECT * FROM TaskMaster WHERE Id = ?`, [taskId]);
    return rows;
}

export async function createTask(payload: Record<string, any>) {
    const mappedPayload = mapToSqlKeys(payload);
    const fields = Object.keys(mappedPayload);
    const values = Object.values(mappedPayload);

    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO TaskMaster (${fields.join(', ')}) VALUES (${placeholders})`;

    const [result] = await pool.execute(sql, values);
    return result;
}


export async function updateTask(taskId: string, payload: Record<string, any>) {
    const mappedPayload = mapToSqlKeys(payload);
    const setClause = Object.keys(mappedPayload)
        .map(field => `${field} = ?`)
        .join(', ');

    const values = Object.values(mappedPayload);
    values.push(taskId);

    const [rows] = await pool.execute(
        `UPDATE TaskMaster SET ${setClause}, UpdatedAt = NOW() WHERE Id = ?`,
        values
    );
    return rows;
}

export async function deleteTask(taskId: string, userid: string) {
    const [rows] = await pool.execute(`Delete FROM TaskMaster WHERE Id = ?`, [taskId]);
    return (rows as any)?.affectedRows > 0;
}

export async function saveCSVData(csvData:CSVRow[]) {
    for (const row of csvData) {
        // Map CSV row to payload
        const payload: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
            const lowerKey = key.toLowerCase().replace(/ /g, '_');
            payload[lowerKey] = value;
        }
        // Filter to editable fields
        const filteredPayload = Object.fromEntries(
            Object.entries(payload).filter(([key]) => EDITABLE_FIELDS.includes(key))
        );
        if (filteredPayload.name) { // Only insert if name exists
            await createTask(filteredPayload);
        }
    }
}