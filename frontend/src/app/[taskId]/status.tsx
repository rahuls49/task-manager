"use client"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";
import toast from 'react-hot-toast';

export default function StatusSection({ currentStatus, statuses, taskId }: { currentStatus: any, statuses: any, taskId: string }) {
    const { data: session } = useSession();
    const [activeStatus, setActiveStatus] = useState(currentStatus);
    console.log({ session })
    async function handleStatusChange(statusId: number) {
        if(statusId === activeStatus.Id) return;
        try {
            const task = await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}`, {
                statusId
            }, {
                headers: {
                    Authorization: `Bearer ${session?.user?.token}`
                },
            })
            setActiveStatus(task.data.data.status.StatusName)
            // console.log({ task })
            toast.success('Status updated successfully')
        }
        catch (error) {
            console.log(error)
            toast.error('Something went wrong')
        }
    }
    return (
        <section className="flex gap-8 items-center mt-4">
            <p>Current Status: {activeStatus.StatusName}</p>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2 rounded-lg bg-slate-900 text-white">Update Status</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-48"
                    sideOffset={5}
                    style={{ zIndex: 9999 }}
                >
                    {
                        statuses.map((statusItem: any) => (
                            <DropdownMenuItem key={statusItem.Id} onClick={() => handleStatusChange(statusItem.Id)}>
                                {statusItem.StatusName}
                            </DropdownMenuItem>
                        ))
                    }
                </DropdownMenuContent>
            </DropdownMenu>
        </section>
    )
}