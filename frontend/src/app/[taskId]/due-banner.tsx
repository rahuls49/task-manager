"use client"
import { useState, useEffect } from "react";
import { Task } from "../_types/task.types";
import { AlertCircle, Clock } from "lucide-react";

export default function DueBanner({ task }: { task: Task }) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOverdue, setIsOverdue] = useState(false);

    const datePart = task.DueDate?.split('T')[0];
    const rawTime = task.DueTime || '00:00';
    const timePart = rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime;
    const dueDateTime = new Date(`${datePart}T${timePart}+05:30`);

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        // const seconds = Math.floor((ms % (1000 * 60)) / 1000); // Optional: remove seconds for cleaner look
        return `${hours}h ${minutes}m`;
    };

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const diff = dueDateTime.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft("Overdue");
                setIsOverdue(true);
            } else {
                setTimeLeft(`${formatTime(diff)} remaining`);
                setIsOverdue(false);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [dueDateTime]);

    return (
        <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300
            ${isOverdue
                ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
            }
        `}>
            {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {timeLeft}
        </div>
    );
}