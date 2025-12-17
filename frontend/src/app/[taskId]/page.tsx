import { auth } from "@/lib/auth"
import axios from "axios"
import { redirect } from "next/navigation"
import StatusSection from "./status"
import { formatDate, formatTime } from "@/lib/convert-to-ist"
import DueBanner from "./due-banner"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, FileText, Users } from "lucide-react"
import { Task } from "../_types/task.types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import EscalateButton from "./escalate-button"
import { EditTaskButton } from "./edit-task-button"
import { StatusHistory } from "./status-history"
import SubtaskSection from "./subtask-section"

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
    const task = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}`, {
        headers: {
            Authorization: `Bearer ${session?.user?.token}`
        }
    })
    const status = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/statuses${task.data.data.TaskTypeId ? `?taskTypeId=${task.data.data.TaskTypeId}` : ''}`, {
        headers: {
            Authorization: `Bearer ${session?.user?.token}`
        }
    })
    const history = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}/status-history`, {
        headers: {
            Authorization: `Bearer ${session?.user?.token}`
        }
    })

    const taskData: Task = task.data.data;
    const statusData = status.data.data;
    const historyData = history.data.data;

    return (
        <div className="min-h-screen w-full bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-12 flex justify-center items-start">
            <div className="max-w-4xl w-full space-y-6">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Tasks
                </Link>

                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-8 md:p-10 space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        {taskData.Title}
                                    </h1>
                                </div>
                                <StatusSection currentStatus={taskData.status} statuses={statusData} taskId={taskId} />
                            </div>
                            <div className="flex flex-col gap-4 md:w-auto w-full">
                                <div className="flex gap-2">
                                    <EditTaskButton task={taskData} />
                                    <EscalateButton taskId={taskId} />
                                </div>
                                <DueBanner task={taskData} />
                            </div>
                        </div>

                        <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

                        {/* Details Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            <div className="md:col-span-2 space-y-4">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Description</h2>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                                    {taskData.Description}
                                </p>

                                {/* Subtasks Section */}
                                <div className="pt-8">
                                    <SubtaskSection parentTask={taskData} subtasks={taskData.subtasks || []} />
                                </div>

                                <div className="pt-8">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Status History</h2>
                                    <StatusHistory history={historyData} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Assignees & Groups Card */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-6 border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Assigned To
                                    </h3>

                                    {/* Users */}
                                    {taskData.assignees && taskData.assignees.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-xs font-medium text-slate-400 uppercase">People</p>
                                            <div className="flex flex-wrap gap-2">
                                                {taskData.assignees.map((assignee) => (
                                                    <div key={assignee.Id} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 pr-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                                                {assignee.Name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{assignee.Name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Groups */}
                                    {taskData.groups && taskData.groups.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-xs font-medium text-slate-400 uppercase">Groups</p>
                                            <div className="flex flex-wrap gap-2">
                                                {taskData.groups.map((group) => (
                                                    <div key={group.GroupId} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{group.GroupName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(!taskData.assignees?.length && !taskData.groups?.length) && (
                                        <p className="text-sm text-slate-400 italic">No assignees</p>
                                    )}
                                </div>

                                {/* Due Date Card */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4 border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Due Date & Time
                                    </h3>

                                    <div className="flex items-start gap-4">
                                        <Calendar className="w-5 h-5 text-indigo-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {formatDate(taskData.DueDate)}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <Clock className="w-5 h-5 text-indigo-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {formatTime(taskData.DueDate, taskData.DueTime)}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Time</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Start Date Card */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4 border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Start Date & Time
                                    </h3>

                                    <div className="flex items-start gap-4">
                                        <Calendar className="w-5 h-5 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {formatDate(taskData.StartDate)}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <Clock className="w-5 h-5 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {formatTime(taskData.StartDate, taskData.StartTime)}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Time</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
