"use client";
import { Status } from "./_types/task.types";
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
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { ChevronDown } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { updateTask } from "@/lib/features/tasks/tasksSlice";

export default function StatusSwitch({ currentStatus, taskId, token, taskTypeId }: { currentStatus: Status, taskId: number, token: string, taskTypeId?: number }) {
  const dispatch = useAppDispatch();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [remark, setRemark] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching statuses from:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/management/statuses${taskTypeId ? `?taskTypeId=${taskTypeId}` : ''}`);
        console.log('With token:', token);
        const statusList = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/statuses${taskTypeId ? `?taskTypeId=${taskTypeId}` : ''}`, {
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
  }, [taskTypeId, token])

  async function handleStatusChange(statusId: number) {
    const status = statuses.find(s => s.Id === statusId);
    if (!status || statusId === currentStatus.Id) return;

    setSelectedStatus(status);
    setIsModalOpen(true);
  }

  async function confirmStatusChange() {
    if (!selectedStatus) return;

    const loadingToast = toast.loading('Updating Status');
    try {
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}`, {
        statusId: selectedStatus.Id,
        statusRemark: remark.trim() || undefined
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });
      dispatch(updateTask(response.data.data));
      toast.success('Status updated successfully', { id: loadingToast });
      setIsModalOpen(false);
      setRemark("");
      setSelectedStatus(null);
    } catch (error) {
      console.log(error);
      toast.error('Something went wrong', { id: loadingToast });
    }
  }
  console.log('Rendering StatusSwitch with statuses:', statuses);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button className="flex justify-between items-center w-full px-2">
            {currentStatus.StatusName}
            <ChevronDown size={10} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
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
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Task Status</DialogTitle>
            <DialogDescription>
              Change status from &quot;{currentStatus.StatusName}&quot; to &quot;{selectedStatus?.StatusName}&quot;.
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
    </>
  );
}
