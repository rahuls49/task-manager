import { auth } from "@/lib/auth"
import axios from "axios"
import { redirect } from "next/navigation"
import StatusSection from "./status"

export default async function TaskPage({
    params,
}: {
    params: Promise<{ taskId: string }>
}) {
    const session = await auth()
    if (!session) {
        redirect('/signin')
    }
    const { taskId } = await params;
    if (Number.isNaN(parseInt(taskId))) {
        redirect('/')
    }
    const task = await axios.get(`${process.env.API_BASE_URL}/tasks/${taskId}`, {
        headers: {
            Authorization: `Bearer ${session?.user?.token}`
        }
    })
    const status = await axios.get(`${process.env.API_BASE_URL}/management/statuses`, {
        headers: {
            Authorization: `Bearer ${session?.user?.token}`
        }
    })

    console.log(`task ${taskId}= `, task.data.data)

    console.log(Date.now())
    console.log(status.data.data)

    return (
        <div className="p-8 w-screen ">
            <h1 className="text-2xl font-bold">{task.data.data.Title}</h1>
            <p className="text-sm">{task.data.data.Description}</p>
            <p className="mt-4">Due Date: <strong>{task.data.data.DueDate.split('T')[0]}</strong></p>
            <p className="mt-2">Due Time: <strong>{task.data.data.DueTime}</strong></p>
            <StatusSection currentStatus={task.data.data.status} statuses={status.data.data} taskId={taskId} />
        </div>
    )
}