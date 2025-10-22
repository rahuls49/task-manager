import z from "zod"

export const ASSIGNEE_WHITELIST = z.object({
    status: z.string()
})

export const CTREATOR_WHITELIST = z.object({
    ...ASSIGNEE_WHITELIST,
    name: z.string(),
    description: z.string(),
    duedate: z.string(),
    expected_start_date: z.string(),
    expected_end_date: z.string(),
    priority: z.string(),
    points: z.number(),
    parent_id: z.number(),
    task_frequency: z.string(),
    duetime: z.string()
})