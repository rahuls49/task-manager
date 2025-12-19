"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { SortableTable } from "@/components/SortableTable"
import UploadFromCSV from "./upload-from-csv"
import { Button } from "@/components/ui/button"
import CreateTask from "@/components/task-page/create-task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, RefreshCw, Shield, Flag } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchTasks } from "@/lib/features/tasks/tasksSlice"
import { useRBAC, PERMISSIONS } from "@/lib/rbac"
import { CanCreateTask } from "@/components/rbac"
import axios from "axios"
import { Priority } from "./_types/task.types"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { tasks, loading, error } = useAppSelector((state) => state.tasks)
  const [activeTab, setActiveTab] = useState('all')
  const [activePriority, setActivePriority] = useState<number>(0) // 0 = all priorities
  const [priorities, setPriorities] = useState<Priority[]>([])

  // RBAC hooks for permission checking
  const { can, getHighestRole, isAdmin } = useRBAC()

  // Fetch priorities on mount
  useEffect(() => {
    const fetchPriorities = async () => {
      if (!session?.user?.token) return
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/management/priorities`,
          {
            headers: {
              Authorization: `Bearer ${session.user.token}`,
            },
          }
        )
        setPriorities(response.data.data || [])
      } catch (err) {
        console.error("Failed to fetch priorities:", err)
      }
    }
    fetchPriorities()
  }, [session?.user?.token])

  const loadTasks = useCallback(() => {
    if (session?.user?.token) {
      dispatch(fetchTasks({
        token: session.user.token,
        status: activeTab,
        priority: activePriority || undefined
      }))
    }
  }, [dispatch, session?.user?.token, activeTab, activePriority])

  // Handle authentication redirect
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push('/signin')
    }
  }, [session, status, router])

  // Load tasks when authenticated or when filters change
  useEffect(() => {
    if (status === "authenticated" && session?.user?.token) {
      dispatch(fetchTasks({
        token: session.user.token,
        status: activeTab,
        priority: activePriority || undefined
      }))
    }
  }, [dispatch, status, session?.user?.token, activeTab, activePriority])

  const handleRetry = () => {
    loadTasks()
  }

  const getPriorityColor = (priorityName: string | undefined) => {
    if (!priorityName) return ""
    const name = priorityName.toLowerCase()
    if (name.includes("high") || name.includes("urgent") || name.includes("critical")) {
      return "text-red-500"
    }
    if (name.includes("medium") || name.includes("normal")) {
      return "text-yellow-500"
    }
    if (name.includes("low")) {
      return "text-green-500"
    }
    return ""
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

  const highestRole = getHighestRole()

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
              {/* Display user role badge */}
              {highestRole && (
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    {highestRole}
                  </span>
                  {isAdmin() && (
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                      Full Access
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Only show Create Task button if user has permission */}
              <CanCreateTask>
                <CreateTask onTaskCreated={loadTasks} />
              </CanCreateTask>

              {/* Only show CSV Import if user has import permission */}
              {can(PERMISSIONS.TASK_IMPORT) && (
                <div className="hidden sm:block">
                  <UploadFromCSV onSuccess={loadTasks} />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Upload Button - only if has import permission */}
          {can(PERMISSIONS.TASK_IMPORT) && (
            <div className="sm:hidden mb-4">
              <UploadFromCSV onSuccess={loadTasks} />
            </div>
          )}
        </div>

        {/* Main Content */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
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

              {/* Priority Filter */}
              <div className="flex items-center gap-3">
                <Flag className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Filter by Priority:</span>
                <Select
                  value={activePriority.toString()}
                  onValueChange={(val) => setActivePriority(parseInt(val))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">
                      <div className="flex items-center gap-2">
                        <Flag className="h-3 w-3 text-gray-400" />
                        All Priorities
                      </div>
                    </SelectItem>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.Id} value={priority.Id.toString()}>
                        <div className="flex items-center gap-2">
                          <Flag className={`h-3 w-3 ${getPriorityColor(priority.PriorityName)}`} />
                          {priority.PriorityName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activePriority !== 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePriority(0)}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
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
