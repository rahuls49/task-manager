"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import CreateTaskModal from "../modals/create-task-modal";
import { Plus } from "lucide-react";

export default function CreateTask() {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setModalOpen(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
            >
                <Plus className="mr-2 h-5 w-5" />
                Create Task
            </Button>
            <CreateTaskModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onTaskCreated={() => {
                    // Optionally refresh the task list or something
                    // window.location.reload(); // Removed to prevent page reload
                    setModalOpen(false);
                }}
            />
        </>
    );
}
