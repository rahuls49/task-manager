"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { SortableTable } from "@/components/SortableTable"
import UploadFromCSV from "./upload-from-csv"
import { Button } from "@/components/ui/button"
import CreateTask from "@/components/task-page/create-task"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, RefreshCw, Shield, Flag, Search, X, ListFilter, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchTasks } from "@/lib/features/tasks/tasksSlice"
import { useRBAC, PERMISSIONS } from "@/lib/rbac"
import { CanCreateTask } from "@/components/rbac"
import axios from "axios"
import { Priority } from "./_types/task.types"
import { Input } from "@/components/ui/input"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { tasks, loading, error } = useAppSelector((state) => state.tasks)
  const [activeTab, setActiveTab] = useState('all')
  const [activePriority, setActivePriority] = useState<number>(0)
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadTasks = useCallback(() => {
    if (session?.user?.token) {
      dispatch(fetchTasks({
        token: session.user.token,
        status: activeTab,
        priority: activePriority || undefined,
        search: debouncedSearch || undefined
      }))
    }
  }, [dispatch, session?.user?.token, activeTab, activePriority, debouncedSearch])

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push('/signin')
    }
  }, [session, status, router])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.token) {
      dispatch(fetchTasks({
        token: session.user.token,
        status: activeTab,
        priority: activePriority || undefined,
        search: debouncedSearch || undefined
      }))
    }
  }, [dispatch, status, session?.user?.token, activeTab, activePriority, debouncedSearch])

  const handleRetry = () => loadTasks()

  const getPriorityColor = (priorityName: string | undefined) => {
    if (!priorityName) return ""
    const name = priorityName.toLowerCase()
    if (name.includes("high") || name.includes("urgent") || name.includes("critical")) return "text-red-500"
    if (name.includes("medium") || name.includes("normal")) return "text-amber-500"
    if (name.includes("low")) return "text-emerald-500"
    return "text-gray-500"
  }

  const statusTabs = [
    { value: 'all', label: 'All Tasks', icon: ListFilter, color: 'bg-indigo-500' },
    { value: 'incompleted', label: 'In Progress', icon: Clock, color: 'bg-amber-500' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-500' },
    { value: 'escalated', label: 'Escalated', icon: AlertTriangle, color: 'bg-rose-500' },
  ]

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 mx-auto" />
            <Loader2 className="h-16 w-16 animate-spin text-indigo-600 absolute top-0 left-1/2 -translate-x-1/2" />
          </div>
          <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md border-rose-200 dark:border-rose-800 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-semibold text-rose-800 dark:text-rose-200">Failed to Load Tasks</h2>
            <p className="text-rose-600 dark:text-rose-400 text-sm">{error}</p>
            <Button onClick={handleRetry} className="w-full bg-rose-600 hover:bg-rose-700">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">

        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
            {/* Title & Welcome */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Task Manager
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Welcome back, <span className="font-medium text-slate-800 dark:text-slate-200">{session?.user?.name || 'User'}</span>
              </p>
              {highestRole && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Shield className="h-3.5 w-3.5" />
                    {highestRole}
                  </span>
                  {isAdmin() && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Full Access
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <CanCreateTask>
                <CreateTask onTaskCreated={loadTasks} />
              </CanCreateTask>
              {can(PERMISSIONS.TASK_IMPORT) && (
                <UploadFromCSV onSuccess={loadTasks} />
              )}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-4 lg:mb-6 space-y-4">
          {/* Status Tabs - Mobile: Scrollable, Desktop: Grid */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 whitespace-nowrap flex-shrink-0
                  ${activeTab === tab.value
                    ? `${tab.color} text-white shadow-lg shadow-${tab.color}/25`
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }
                `}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className="xs:hidden sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Search & Priority Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <Select
                value={activePriority.toString()}
                onValueChange={(val) => setActivePriority(parseInt(val))}
              >
                <SelectTrigger className="w-full sm:w-[160px] h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Priority" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <span className="text-slate-600 dark:text-slate-300">All Priorities</span>
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
                  size="icon"
                  onClick={() => setActivePriority(0)}
                  className="h-11 w-11 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || activePriority !== 0) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <Search className="h-3 w-3" />
                  &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery('')} className="hover:text-indigo-800">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activePriority !== 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Flag className="h-3 w-3" />
                  {priorities.find(p => p.Id === activePriority)?.PriorityName}
                  <button onClick={() => setActivePriority(0)} className="hover:text-amber-800">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => { setSearchQuery(''); setActivePriority(0); }}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Task Table */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-indigo-100 dark:border-indigo-900" />
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-600 absolute top-0" />
                </div>
                <p className="mt-4 text-slate-500 dark:text-slate-400">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <ListFilter className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">No tasks found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                  {searchQuery || activePriority !== 0
                    ? "Try adjusting your filters or search query"
                    : "Create your first task to get started"
                  }
                </p>
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

        {/* Task Count Footer */}
        {!loading && tasks.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
