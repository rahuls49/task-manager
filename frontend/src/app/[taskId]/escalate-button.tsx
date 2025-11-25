"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";

interface Assignee {
  Id: number;
  Name: string;
}

interface EscalateButtonProps {
  taskId: string;
}

export default function EscalateButton({ taskId }: EscalateButtonProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAssignees, setIsFetchingAssignees] = useState(false);

  const fetchAssignees = async () => {
    if (assignees.length > 0) return; // Already fetched
    setIsFetchingAssignees(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/assignees`, {
        headers: {
          Authorization: `Bearer ${session?.user?.token}`,
        },
      });
      setAssignees(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch assignees:", error);
      toast.error("Failed to load assignees");
    } finally {
      setIsFetchingAssignees(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedAssignee) {
      toast.error("Please select an assignee");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}/escalate`,
        {
          assigneeIds: [parseInt(selectedAssignee)],
          notes: notes.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${session?.user?.token}`,
          },
        }
      );
      toast.success("Task escalated successfully");
      setIsOpen(false);
      setSelectedAssignee("");
      setNotes("");
      // Optionally refresh the page or update state
      window.location.reload();
    } catch (error: any) {
      console.error("Escalation failed:", error);
      toast.error(error.response?.data?.message || "Failed to escalate task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
          onClick={fetchAssignees}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Escalate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escalate Task</DialogTitle>
          <DialogDescription>
            Select a new assignee and optionally add notes for the escalation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="assignee">New Assignee</Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee} disabled={isFetchingAssignees}>
              <SelectTrigger>
                <SelectValue placeholder={isFetchingAssignees ? "Loading assignees..." : "Select an assignee"} />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.Id} value={assignee.Id.toString()}>
                    {assignee.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about the escalation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleEscalate} disabled={isLoading || !selectedAssignee}>
            {isLoading ? "Escalating..." : "Escalate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}