"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import { SortableTable } from "@/components/SortableTable"
import UploadFromCSV from "./upload-from-csv"
import { Button } from "@/components/ui/button"
import CreateTask from "@/components/task-page/create-task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

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
        setError(null)
        const queryParams = activeTab === 'all' ? '' : `?status=${activeTab}`
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

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    // Trigger re-fetch by changing activeTab temporarily
    const currentTab = activeTab
    setActiveTab('')
    setTimeout(() => setActiveTab(currentTab), 0)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-800 dark:text-red-200">Error Loading Tasks</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Task Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back, {session?.user?.name || 'User'}! Manage your tasks efficiently.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <CreateTask />
              <div className="hidden sm:block">
                <UploadFromCSV />
              </div>
            </div>
          </div>

          {/* Mobile Upload Button */}
          <div className="sm:hidden mb-4">
            <UploadFromCSV />
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">Your Tasks</CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                  <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
                  <TabsTrigger value="incompleted" className="text-sm">Incomplete</TabsTrigger>
                  <TabsTrigger value="completed" className="text-sm">Completed</TabsTrigger>
                  <TabsTrigger value="escalated" className="text-sm">Escalated</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <SortableTable
                  tasks={tasks}
                  token={session?.user?.token || ''}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
