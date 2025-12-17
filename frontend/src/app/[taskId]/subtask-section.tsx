"use client";

import { useState, useEffect } from "react";
import { Task } from "@/app/_types/task.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, ChevronDown, ChevronRight, Trash2, Loader2, Calendar, Clock, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { formatDate, formatTime } from "@/lib/convert-to-ist";

interface SubtaskSectionProps {
    parentTask: Task;
    subtasks: Task[];
}

interface CreateSubtaskFormData {
    title: string;
    description: string;
    dueDate: string;
    dueTime: string;
}

interface Status {
    Id: number;
    StatusName: string;
}

export default function SubtaskSection({ parentTask, subtasks: initialSubtasks }: SubtaskSectionProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [subtasks, setSubtasks] = useState<Task[]>(initialSubtasks || []);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // Store statuses per task type: { taskTypeId: Status[] }
    const [statusesByType, setStatusesByType] = useState<Record<number, Status[]>>({});
    const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CreateSubtaskFormData>({
        title: "",
        description: "",
        dueDate: parentTask.DueDate?.split("T")[0] || "",
        dueTime: parentTask.DueTime || "",
    });
    const [error, setError] = useState<string | null>(null);

    // Fetch available statuses for parent task type (subtasks inherit parent's type)
    useEffect(() => {
        const fetchStatuses = async () => {
            if (!session?.user?.token || !parentTask.TaskTypeId) return;

            try {
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/management/statuses?taskTypeId=${parentTask.TaskTypeId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.user.token}`,
                        },
                    }
                );
                setStatusesByType({
                    [parentTask.TaskTypeId]: response.data.data || []
                });
                console.log('Fetched statuses for task type:', parentTask.TaskTypeId, response.data.data);
            } catch (err) {
                console.error(`Failed to fetch statuses for task type ${parentTask.TaskTypeId}:`, err);
            }
        };
        fetchStatuses();
    }, [session?.user?.token, parentTask.TaskTypeId]);

    const handleCreateSubtask = async () => {
        if (!formData.title.trim()) {
            setError("Title is required");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${parentTask.Id}/subtasks`,
                {
                    title: formData.title,
                    description: formData.description,
                    dueDate: formData.dueDate || null,
                    dueTime: formData.dueTime || null,
                    taskTypeId: parentTask.TaskTypeId || 1,
                },
                {
                    headers: {
                        Authorization: `Bearer ${session?.user?.token}`,
                    },
                }
            );

            if (response.data.success) {
                setSubtasks([...subtasks, response.data.data]);
                setFormData({
                    title: "",
                    description: "",
                    dueDate: parentTask.DueDate?.split("T")[0] || "",
                    dueTime: parentTask.DueTime || "",
                });
                setIsModalOpen(false);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create subtask");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSubtask = async (e: React.MouseEvent, subtaskId: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this subtask?")) return;

        try {
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${subtaskId}`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.user?.token}`,
                    },
                }
            );
            setSubtasks(subtasks.filter((s) => s.Id !== subtaskId));
            router.refresh();
        } catch (err) {
            console.error("Failed to delete subtask:", err);
        }
    };

    const handleStatusChange = async (subtask: Task, newStatusId: string) => {
        setUpdatingStatusId(subtask.Id);
        try {
            console.log('Updating subtask status:', {
                subtaskId: subtask.Id,
                subtaskTaskTypeId: subtask.TaskTypeId,
                newStatusId: parseInt(newStatusId),
                availableStatuses: getStatusesForSubtask()
            });

            const response = await axios.put(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${subtask.Id}`,
                { statusId: parseInt(newStatusId) },
                {
                    headers: {
                        Authorization: `Bearer ${session?.user?.token}`,
                    },
                }
            );
            console.log('Status update response:', response.data);

            // Get statuses for this subtask's task type
            const subtaskStatuses = getStatusesForSubtask();
            const newStatus = subtaskStatuses.find(s => s.Id === parseInt(newStatusId));

            setSubtasks(
                subtasks.map((s) =>
                    s.Id === subtask.Id ? {
                        ...s,
                        StatusId: parseInt(newStatusId),
                        status: newStatus ? { Id: newStatus.Id, StatusName: newStatus.StatusName } : s.status
                    } : s
                )
            );

            console.log('Status updated successfully, refreshing page...');
            router.refresh();
        } catch (err: any) {
            console.error("Failed to update subtask status - Full error:", err);
            console.error("Error details:", {
                name: err?.name,
                message: err?.message,
                response: err?.response,
                stack: err?.stack
            });
            const errorMessage = err?.response?.data?.message || err?.message || 'Unknown error occurred';
            alert(`Failed to update status: ${errorMessage}`);
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // Helper function to get statuses for subtasks (use parent's task type)
    const getStatusesForSubtask = () => {
        const taskTypeId = parentTask.TaskTypeId || 0;
        return statusesByType[taskTypeId] || [];
    };

    const getStatusColor = (statusName: string | undefined) => {
        if (!statusName) return "bg-slate-100 text-slate-700";
        const name = statusName.toLowerCase();
        if (name.includes("complete") || name.includes("done")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        if (name.includes("progress") || name.includes("working")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        if (name.includes("pending") || name.includes("todo")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
        if (name.includes("cancel") || name.includes("block")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                    ) : (
                        <ChevronRight className="w-5 h-5" />
                    )}
                    Subtasks
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                        ({subtasks.length})
                    </span>
                </button>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950"
                        >
                            <Plus className="w-4 h-4" />
                            Add Subtask
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Subtask</DialogTitle>
                            <DialogDescription>
                                Add a subtask to &quot;{parentTask.Title}&quot;
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="Enter subtask title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Description
                                </label>
                                <Textarea
                                    placeholder="Enter subtask description (optional)"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Due Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.dueDate}
                                        max={parentTask.DueDate?.split("T")[0]}
                                        onChange={(e) =>
                                            setFormData({ ...formData, dueDate: e.target.value })
                                        }
                                    />
                                    <p className="text-xs text-slate-500">
                                        Cannot exceed parent due date
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Due Time
                                    </label>
                                    <Input
                                        type="time"
                                        value={formData.dueTime}
                                        onChange={(e) =>
                                            setFormData({ ...formData, dueTime: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                                    {error}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleCreateSubtask} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Subtask"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Subtask List with Accordion */}
            {isExpanded && (
                <div className="space-y-2">
                    {subtasks.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <p className="text-sm">No subtasks yet</p>
                            <p className="text-xs mt-1">
                                Click &quot;Add Subtask&quot; to break this task into smaller pieces
                            </p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="space-y-2">
                            {subtasks.map((subtask) => (
                                <AccordionItem
                                    key={subtask.Id}
                                    value={`subtask-${subtask.Id}`}
                                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800"
                                >
                                    <div className="flex items-center group">
                                        <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <div className="flex items-center gap-3 flex-1 text-left">
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {subtask.Title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(subtask.status?.StatusName)}`}>
                                                            {subtask.status?.StatusName || "Unknown"}
                                                        </span>
                                                        {subtask.DueDate && (
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                Due: {formatDate(subtask.DueDate)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteSubtask(e, subtask.Id)}
                                            className="mr-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                                            {/* Description */}
                                            {subtask.Description && (
                                                <div className="flex items-start gap-3">
                                                    <FileText className="w-4 h-4 text-slate-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Description</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                                                            {subtask.Description}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Due Date & Time */}
                                            <div className="flex items-start gap-3">
                                                <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Due Date</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                                                        {subtask.DueDate ? formatDate(subtask.DueDate) : "Not set"}
                                                        {subtask.DueTime && (
                                                            <span className="ml-2 text-slate-500">
                                                                at {formatTime(subtask.DueDate, subtask.DueTime)}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Selector */}
                                            <div className="flex items-start gap-3">
                                                <Clock className="w-4 h-4 text-slate-400 mt-1" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Status</p>
                                                    <Select
                                                        value={subtask.StatusId?.toString() || ""}
                                                        onValueChange={(value) => handleStatusChange(subtask, value)}
                                                        disabled={updatingStatusId === subtask.Id}
                                                    >
                                                        <SelectTrigger className="w-full max-w-[200px]">
                                                            {updatingStatusId === subtask.Id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    Updating...
                                                                </div>
                                                            ) : (
                                                                <SelectValue placeholder="Select status" />
                                                            )}
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {getStatusesForSubtask().map((status: Status) => (
                                                                <SelectItem key={status.Id} value={status.Id.toString()}>
                                                                    {status.StatusName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            )}
        </div>
    );
}
