"use client";

import { useState } from "react";
import { Priority } from "@/app/_types/task.types";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Flag } from "lucide-react";

interface PrioritySectionProps {
    currentPriority?: Priority;
    priorities: Priority[];
    taskId: string;
}

export default function PrioritySection({ currentPriority, priorities, taskId }: PrioritySectionProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedPriority, setSelectedPriority] = useState<Priority | undefined>(currentPriority);

    const handlePriorityChange = async (newPriorityId: string) => {
        setIsUpdating(true);
        try {
            await axios.put(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}`,
                { priorityId: parseInt(newPriorityId) },
                {
                    headers: {
                        Authorization: `Bearer ${session?.user?.token}`,
                    },
                }
            );

            const newPriority = priorities.find(p => p.Id === parseInt(newPriorityId));
            setSelectedPriority(newPriority);
            router.refresh();
        } catch (err) {
            console.error("Failed to update priority:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const getPriorityColor = (priorityName: string | undefined) => {
        if (!priorityName) return "bg-slate-100 text-slate-700";
        const name = priorityName.toLowerCase();
        if (name.includes("high") || name.includes("urgent") || name.includes("critical")) {
            return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        }
        if (name.includes("medium") || name.includes("normal")) {
            return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
        }
        if (name.includes("low")) {
            return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        }
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    };

    const getPriorityIcon = (priorityName: string | undefined) => {
        if (!priorityName) return "text-slate-400";
        const name = priorityName.toLowerCase();
        if (name.includes("high") || name.includes("urgent") || name.includes("critical")) {
            return "text-red-500";
        }
        if (name.includes("medium") || name.includes("normal")) {
            return "text-yellow-500";
        }
        if (name.includes("low")) {
            return "text-green-500";
        }
        return "text-slate-400";
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Flag className={`w-4 h-4 ${getPriorityIcon(selectedPriority?.PriorityName)}`} />
                <span className="text-sm text-slate-500 dark:text-slate-400">Priority:</span>
            </div>

            {priorities.length === 0 ? (
                <span className="text-sm text-slate-400 italic">
                    {selectedPriority?.PriorityName || "Not set"}
                </span>
            ) : (
                <Select
                    value={selectedPriority?.Id?.toString() || ""}
                    onValueChange={handlePriorityChange}
                    disabled={isUpdating}
                >
                    <SelectTrigger className={`w-[160px] h-8 text-sm border-0 ${getPriorityColor(selectedPriority?.PriorityName)}`}>
                        {isUpdating ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Updating...
                            </div>
                        ) : (
                            <SelectValue placeholder="Select priority">
                                <div className="flex items-center gap-2">
                                    <Flag className={`w-3 h-3 ${getPriorityIcon(selectedPriority?.PriorityName)}`} />
                                    {selectedPriority?.PriorityName || "Not set"}
                                </div>
                            </SelectValue>
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {priorities.map((priority) => (
                            <SelectItem key={priority.Id} value={priority.Id.toString()}>
                                <div className="flex items-center gap-2">
                                    <Flag className={`w-3 h-3 ${getPriorityIcon(priority.PriorityName)}`} />
                                    {priority.PriorityName}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
