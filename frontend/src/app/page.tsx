import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import axios from "axios"
import { SortableTable } from "@/components/SortableTable"
import UploadFromCSV from "./upload-from-csv"

export default async function Home() {
  const session = await auth()
  if (!session) {
    redirect('/signin')
  }

  const tasks = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks`, {
    headers: {
      Authorization: `Bearer ${session?.user?.token}`
    }
  })

  return (
    <div className="p-8 w-screen flex flex-col items-center justify-center">
      <UploadFromCSV/>
      <SortableTable tasks={tasks.data.data || []} userName={session.user?.name || ''} token={session.user?.token || ''} />
    </div>
  )
}
