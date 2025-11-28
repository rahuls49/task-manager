"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import CreateTaskModal from "@/components/modals/create-task-modal";
import { useRouter } from "next/navigation";

interface EditTaskButtonProps {
    task: any;
}

export function EditTaskButton({ task }: EditTaskButtonProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleTaskUpdated = () => {
        router.refresh();
        setOpen(false);
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Task
            </Button>
            <CreateTaskModal
                open={open}
                onOpenChange={setOpen}
                onTaskCreated={handleTaskUpdated}
                task={task}
            />
        </>
    );
}
