"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import { SortableTable } from "@/components/SortableTable"
import UploadFromCSV from "./upload-from-csv"
import { Button } from "@/components/ui/button"
import CreateTask from "@/components/task-page/create-task"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push('/signin')
      return
    }

    const fetchTasks = async () => {
      try {
        setLoading(true)
        const queryParams = activeTab === 'completed' ? '?status=completed' : ''
        console.log('Fetching tasks with token:', session?.user?.token ? 'Token present' : 'No token')
        console.log('API URL:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks${queryParams}`)
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks${queryParams}`, {
          headers: {
            Authorization: `Bearer ${session?.user?.token}`
          }
        })
        console.log('Tasks response:', response.data)
        setTasks(response.data.data || [])
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
        const err = error as { response?: { data?: { message?: string }, status?: number } }
        console.error('Error response:', err.response?.data)
        console.error('Error status:', err.response?.status)
        setError(err.response?.data?.message || (error as Error)?.message || 'Failed to fetch tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [session, status, router, activeTab])

  if (status === "loading" || loading) {
    return (
      <div className="p-8 w-screen flex flex-col items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 w-screen flex flex-col items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8 w-screen flex flex-col items-center justify-center">
      <header className="flex justify-between gap-2 items-center mb-4 w-full">
        <CreateTask />
        <UploadFromCSV />
      </header>
      <div className="flex gap-2 mb-4">
        <Button 
          type="button"
          variant={activeTab === 'all' ? 'default' : 'outline'} 
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('all');
          }}
        >
          All
        </Button>
        <Button 
          type="button"
          variant={activeTab === 'completed' ? 'default' : 'outline'} 
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('completed');
          }}
        >
          Completed
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div>Loading tasks...</div>
        </div>
      ) : (
        <SortableTable tasks={tasks} userName={session?.user?.name || ''} token={session?.user?.token || ''} />
      )}
    </div>
  )
}
