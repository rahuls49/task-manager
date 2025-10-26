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
import UploadFromCSV from "./upload-from-csv"
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
    <div className="p-8 w-screen flex flex-col items-center justify-center">
      <UploadFromCSV/>
      <Table>
        <TableCaption>Tasks Assigned to {session.user?.name}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Sr. No.</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            tasks.data.data && tasks.data.data.map((task: Task, index: number) => {
              const isOverdue = task.DueDate && task.DueTime ? new Date(`${task.DueDate.split('T')[0]}T${task.DueTime}Z`) < new Date() : false;
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
