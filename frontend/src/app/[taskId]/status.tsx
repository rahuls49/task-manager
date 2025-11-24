"use client"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";
import toast from 'react-hot-toast';
import { Status } from "../_types/task.types";
import { ChevronDown, Check } from "lucide-react";

export default function StatusSection({ currentStatus, statuses, taskId }: { currentStatus: Status, statuses: Status[], taskId: string }) {
    const { data: session } = useSession();
    const [activeStatus, setActiveStatus] = useState<Status>(currentStatus);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
    const [remark, setRemark] = useState("");

    async function handleStatusChange(statusId: number) {
        const status = statuses.find(s => s.Id === statusId);
        if (!status || statusId === activeStatus.Id) return;

        setSelectedStatus(status);
        setIsModalOpen(true);
    }

    async function confirmStatusChange() {
        if (!selectedStatus) return;

        try {
            const response = await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}`, {
                statusId: selectedStatus.Id,
                statusRemark: remark.trim() || undefined
            }, {
                headers: {
                    Authorization: `Bearer ${session?.user?.token}`
                },
            });
            setActiveStatus(response.data.data.status);
            toast.success('Status updated successfully');
            setIsModalOpen(false);
            setRemark("");
            setSelectedStatus(null);
        } catch (error) {
            console.log(error);
            toast.error('Something went wrong');
        }
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Status:</span>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button className="
                        group flex items-center gap-2 px-4 py-2 rounded-full 
                        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                        hover:border-indigo-500 dark:hover:border-indigo-500 
                        text-sm font-medium text-slate-900 dark:text-white 
                        transition-all duration-200 shadow-sm hover:shadow-md
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                    ">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        {activeStatus.StatusName}
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-56 p-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl"
                    sideOffset={8}
                >
                    {
                        statuses.map((statusItem: Status) => (
                            <DropdownMenuItem
                                key={statusItem.Id}
                                onClick={() => handleStatusChange(statusItem.Id)}
                                className={`
                                    flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
                                    ${activeStatus.Id === statusItem.Id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }
                                `}
                            >
                                {statusItem.StatusName}
                                {activeStatus.Id === statusItem.Id && <Check className="w-4 h-4" />}
                            </DropdownMenuItem>
                        ))
                    }
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Change Task Status</DialogTitle>
                        <DialogDescription>
                            Change status from &quot;{activeStatus.StatusName}&quot; to &quot;{selectedStatus?.StatusName}&quot;.
                            Please provide a remark for this status change.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="remark">Remark *</Label>
                            <Textarea
                                id="remark"
                                placeholder="Enter a remark for this status change..."
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmStatusChange} disabled={!remark.trim()}>
                            Change Status
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}