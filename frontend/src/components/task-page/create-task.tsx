"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import CreateTaskModal from "../modals/create-task-modal";

export default function CreateTask() {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setModalOpen(true)}>Create Task</Button>
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
