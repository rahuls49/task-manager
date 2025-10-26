"use client";
import { Status } from "./_types/task.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { ChevronDown } from "lucide-react";

export default function StatusSwitch({ currentStatus, taskId, token }: { currentStatus: Status, taskId: number, token: string }) {
  const [activeStatus, setActiveStatus] = useState<Status>(currentStatus);
  const [statuses, setStatuses] = useState<Status[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching statuses from:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/management/statuses`);
        console.log('With token:', token);
        const statusList = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/statuses`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Response:', statusList);
        setStatuses(statusList.data.data);
        console.log('Statuses fetched:', statusList.data.data);
      } catch (error) {
        console.error('Failed to fetch statuses', error);
      }
    };
    fetchData();
  }, [])

  async function handleStatusChange(statusId: number) {
    if (statusId === activeStatus.Id) return;
    const loadingToast = toast.loading('Updating Status');
    try {
      const task = await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}`, {
        statusId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      })
      setActiveStatus(task.data.data.status)
      toast.success('Status updated successfully', { id: loadingToast });
    }
    catch (error) {
      console.log(error)
      toast.error('Something went wrong', { id: loadingToast });
    }
  }
  console.log('Rendering StatusSwitch with statuses:', statuses);
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button className="flex justify-between items-center w-full px-2">
        {activeStatus.StatusName}
        <ChevronDown size={10}/>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      className="w-48"
    >
      {statuses.map((statusItem: Status) => (
        <DropdownMenuItem
          key={statusItem.Id}
          onClick={() => handleStatusChange(statusItem.Id)}
        >
          {statusItem.StatusName}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>;
}
