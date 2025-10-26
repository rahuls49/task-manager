import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import axios from "axios"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Task } from "./_types/task.types"
import { formatDateTime } from "@/lib/convert-to-ist"
import StatusSwitch from "./status-switch"
export default async function Home() {
  const session = await auth()
  if (!session) {
    redirect('/signin')
  }
  const tasks = await axios.get(`${process.env.API_BASE_URL}/tasks`, {
    headers: {
      Authorization: `Bearer ${session?.user?.token}`
    }
  })
  return (
    <div className="p-8 w-screen flex items-center justify-center">
      {/* <h1 className="text-2xl font-bold mb-4">Welcome, {session.user?.name}!</h1>
      <p className="mb-4">Your User ID: {session.user?.id}</p>
      <p className="mb-4 max-w-full break-words">Your JWT Token: {session.user?.token}</p> */}
      <Table>
        <TableCaption>Tasks Assigned to {session.user?.name}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Sr. No.</TableHead>
            <TableHead>Title</TableHead>
            {/* <TableHead>Description</TableHead> */}
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            tasks?.data?.data.map((task: Task, index: number) => {
              const datePart = task.DueDate.split('T')[0];
              const dueDateTime = new Date(`${datePart}T${task.DueTime}Z`);
              const now = new Date();
              const isOverdue = dueDateTime < now;
              return (
                <TableRow key={task.Id} className={isOverdue ? "bg-red-200" : ""}>
                  <TableCell>{index}</TableCell>
                  <TableCell>
                    <Link href={`/${task.Id}`}>
                    <h2 className="font-medium">{task.Title}</h2>
                    <p className="text-sm">{task.Description}</p>
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateTime(task.DueDate, task.DueTime)}</TableCell>
                  <TableCell><StatusSwitch currentStatus={task.status} taskId={task.Id} token={session.user.token}/></TableCell>
                </TableRow>
              );
            })
          }
        </TableBody>
      </Table>
    </div>
  )
}
