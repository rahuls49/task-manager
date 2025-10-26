"use client"
import { useState, useEffect } from "react";
import { Task } from "../_types/task.types";

export default function DueBanner({ task }: { task: Task }) {
    const [timeLeft, setTimeLeft] = useState<string>("");

    const datePart = task.DueDate.split('T')[0];
    const dueDateTime = new Date(`${datePart}T${task.DueTime}Z`);

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = dueDateTime.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft("Task Overdue Please take immediate action");
            } else {
                setTimeLeft(`Task due in ${formatTime(diff)}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [dueDateTime]);

    return (
        <section className={`p-4 rounded-lg text-center font-semibold mb-10 ${timeLeft.includes("Overdue") ? "bg-red-500 text-white" : "bg-yellow-200 text-black"}`}>
            {timeLeft}
        </section>
    );
}