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
  console.log("Tasks=", tasks.data.data)
  console.log("User=", session.user)
  return (
    <div className="p-8 w-screen flex items-center justify-center">
      {/* <h1 className="text-2xl font-bold mb-4">Welcome, {session.user?.name}!</h1>
      <p className="mb-4">Your User ID: {session.user?.id}</p>
      <p className="mb-4 max-w-full break-words">Your JWT Token: {session.user?.token}</p> */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sr. No.</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            tasks?.data?.data.map((task: any, index: number) => (
              <TableRow key={task.Id}>
                <TableCell>{index}</TableCell>
                <TableCell>
                  <Link href={`/${task.Id}`}>{task.Title}</Link>
                </TableCell>
                <TableCell>{task.Description}</TableCell>
                <TableCell>{task.DueDate.split('T')[0]} <br /> {task.DueTime}</TableCell>
                <TableCell>{task.status.StatusName}</TableCell>
              </TableRow>
            ))
          }
        </TableBody>
      </Table>
    </div>
  )
}
