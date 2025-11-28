"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { toast } from "react-hot-toast";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  // Daily
  dailyRecurEveryXDays: z.number().optional(),
  dailyIntraDayType: z.string().optional(),
  dailyIntraDayInterval: z.number().optional(),
  // Weekly
  weeklyRecurEveryNWeeks: z.number().optional(),
  weeklyDays: z.array(z.string()).optional(),
  // Monthly
  monthlyRuleType: z.string().optional(),
  monthlyDaysOfMonth: z.array(z.number()).optional(),
  monthlyLastDay: z.boolean().optional(),
  monthlyOrdinal: z.string().optional(),
  monthlyDayOfWeek: z.string().optional(),
  monthlyMonths: z.array(z.number()).optional(),
  taskTypeId: z.string().min(1, "Task type is required"),
  priorityId: z.string().optional(),
  assigneeIds: z.array(z.number()).optional(),
  groupIds: z.array(z.number()).optional(),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
  task?: any; // Task object for editing
}

interface TaskType {
  Id: number;
  TypeName: string;
}

interface Priority {
  Id: number;
  PriorityName: string;
}

interface Assignee {
  Id: number;
  Name: string;
  Email: string;
  Phone: string;
}

interface Group {
  Id: number;
  GroupName: string;
  ParentId: number | null;
}

export default function CreateTaskModal({ open, onOpenChange, onTaskCreated, task }: CreateTaskModalProps) {
  const { data: session } = useSession();
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.Title || "",
      description: task?.Description || "",
      startDate: task?.StartDate ? new Date(task.StartDate).toISOString().split('T')[0] : "",
      startTime: task?.StartTime ? task.StartTime.substring(0, 5) : "",
      dueDate: task?.DueDate ? new Date(task.DueDate).toISOString().split('T')[0] : "",
      dueTime: task?.DueTime ? task.DueTime.substring(0, 5) : "",
      isRecurring: task?.IsRecurring || false,
      recurrenceType: task?.recurrence?.RecurrenceType || "",
      recurrenceEndDate: task?.recurrence?.EndDate ? new Date(task.recurrence.EndDate).toISOString().split('T')[0] : "",
      dailyRecurEveryXDays: task?.recurrence?.dailyRule?.RecurEveryXDays || 1,
      dailyIntraDayType: task?.recurrence?.dailyRule?.IntraDayFrequencyType || "",
      dailyIntraDayInterval: task?.recurrence?.dailyRule?.IntraDayInterval || 1,
      weeklyRecurEveryNWeeks: task?.recurrence?.weeklyRule?.RecurEveryNWeeks || 1,
      weeklyDays: task?.recurrence?.weeklyRule ? Object.keys(task.recurrence.weeklyRule).filter(k => k.startsWith('On') && task.recurrence.weeklyRule[k]).map(k => k.replace('On', '').toLowerCase()) : [],
      monthlyRuleType: task?.recurrence?.monthlyRule?.RuleType || "",
      monthlyDaysOfMonth: task?.recurrence?.monthlyRule?.dayNumbers?.map((d: any) => parseInt(d.DayNumber)) || [],
      monthlyLastDay: task?.recurrence?.monthlyRule?.dayNumbers?.some((d: any) => d.DayNumber === 'L') || false,
      monthlyOrdinal: task?.recurrence?.monthlyRule?.ordinals?.[0]?.Ordinal || "",
      monthlyDayOfWeek: task?.recurrence?.monthlyRule?.ordinals?.[0]?.DayOfWeek?.toLowerCase() || "",
      monthlyMonths: task?.recurrence?.monthlyRule?.months?.map((m: any) => m.MonthNumber) || [],
      taskTypeId: task?.TaskTypeId?.toString() || "",
      priorityId: task?.PriorityId?.toString() || "",
      assigneeIds: [],
      groupIds: [],
    },
  });

  useEffect(() => {
    const fetchOptions = async () => {
      if (!session?.user?.token) return;
      try {
        const [taskTypesRes, prioritiesRes, assigneesRes, groupsRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/system/task-types`, {
            headers: { Authorization: `Bearer ${session.user.token}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/priorities`, {
            headers: { Authorization: `Bearer ${session.user.token}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/assignees`, {
            headers: { Authorization: `Bearer ${session.user.token}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/groups`, {
            headers: { Authorization: `Bearer ${session.user.token}` }
          }),
        ]);
        setTaskTypes(taskTypesRes.data.data);
        setPriorities(prioritiesRes.data.data);
        setAssignees(assigneesRes.data.data);
        setGroups(groupsRes.data.data);
      } catch (error) {
        console.error("Failed to fetch options:", error);
      }
    };
    if (open) {
      fetchOptions();
      if (task) {
        setSelectedAssignees(task.assignees || []);
        setSelectedGroups(task.groups || []);
        form.reset({
          title: task.Title || "",
          description: task.Description || "",
          startDate: task.StartDate ? new Date(task.StartDate).toISOString().split('T')[0] : "",
          startTime: task.StartTime ? task.StartTime.substring(0, 5) : "",
          dueDate: task.DueDate ? new Date(task.DueDate).toISOString().split('T')[0] : "",
          dueTime: task.DueTime ? task.DueTime.substring(0, 5) : "",
          isRecurring: task.IsRecurring || false,
          recurrenceType: task.recurrence?.RecurrenceType || "",
          recurrenceEndDate: task.recurrence?.EndDate ? new Date(task.recurrence.EndDate).toISOString().split('T')[0] : "",
          dailyRecurEveryXDays: task.recurrence?.dailyRule?.RecurEveryXDays || 1,
          dailyIntraDayType: task.recurrence?.dailyRule?.IntraDayFrequencyType || "",
          dailyIntraDayInterval: task.recurrence?.dailyRule?.IntraDayInterval || 1,
          weeklyRecurEveryNWeeks: task.recurrence?.weeklyRule?.RecurEveryNWeeks || 1,
          weeklyDays: task.recurrence?.weeklyRule ? Object.keys(task.recurrence.weeklyRule).filter(k => k.startsWith('On') && task.recurrence.weeklyRule[k]).map(k => k.replace('On', '').toLowerCase()) : [],
          monthlyRuleType: task.recurrence?.monthlyRule?.RuleType || "",
          monthlyDaysOfMonth: task.recurrence?.monthlyRule?.dayNumbers?.map((d: any) => parseInt(d.DayNumber)) || [],
          monthlyLastDay: task.recurrence?.monthlyRule?.dayNumbers?.some((d: any) => d.DayNumber === 'L') || false,
          monthlyOrdinal: task.recurrence?.monthlyRule?.ordinals?.[0]?.Ordinal || "",
          monthlyDayOfWeek: task.recurrence?.monthlyRule?.ordinals?.[0]?.DayOfWeek?.toLowerCase() || "",
          monthlyMonths: task.recurrence?.monthlyRule?.months?.map((m: any) => m.MonthNumber) || [],
          taskTypeId: task.TaskTypeId?.toString() || "",
          priorityId: task.PriorityId?.toString() || "",
          assigneeIds: [],
          groupIds: [],
        });
      } else {
        setSelectedAssignees([]);
        setSelectedGroups([]);
        form.reset({
          title: "",
          description: "",
          startDate: "",
          startTime: "",
          dueDate: "",
          dueTime: "",
          isRecurring: false,
          recurrenceType: "",
          recurrenceEndDate: "",
          dailyRecurEveryXDays: 1,
          dailyIntraDayType: "",
          dailyIntraDayInterval: 1,
          weeklyRecurEveryNWeeks: 1,
          weeklyDays: [],
          monthlyRuleType: "",
          monthlyDaysOfMonth: [],
          monthlyLastDay: false,
          monthlyOrdinal: "",
          monthlyDayOfWeek: "",
          monthlyMonths: [],
          taskTypeId: "",
          priorityId: "",
          assigneeIds: [],
          groupIds: [],
        });
      }
      setAssigneeSearch("");
    }
  }, [open, session, task, form]);

  const searchAssignees = async (query: string) => {
    if (!session?.user?.token) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/management/assignees?search=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${session.user.token}` }
        }
      );
      setAssignees(response.data.data);
    } catch (error) {
      console.error("Failed to search assignees:", error);
    }
  };

  const handleAssigneeSearch = (query: string) => {
    setAssigneeSearch(query);
    if (query.length > 0) {
      searchAssignees(query);
    } else {
      // Reset to all assignees when search is cleared
      const fetchAllAssignees = async () => {
        if (!session?.user?.token) return;
        try {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/management/assignees`, {
            headers: { Authorization: `Bearer ${session.user.token}` }
          });
          setAssignees(response.data.data);
        } catch (error) {
          console.error("Failed to fetch assignees:", error);
        }
      };
      fetchAllAssignees();
    }
  };

  const addAssignee = (assignee: Assignee) => {
    if (!selectedAssignees.find(a => a.Id === assignee.Id)) {
      setSelectedAssignees([...selectedAssignees, assignee]);
    }
  };

  const removeAssignee = (assigneeId: number) => {
    setSelectedAssignees(selectedAssignees.filter(a => a.Id !== assigneeId));
  };

  const addGroup = (group: Group) => {
    if (!selectedGroups.find(g => g.Id === group.Id)) {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const removeGroup = (groupId: number) => {
    setSelectedGroups(selectedGroups.filter(g => g.Id !== groupId));
  };

  const onSubmit = async (data: CreateTaskForm) => {
    if (!session?.user?.token) {
      toast.error("Not authenticated");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        ...data,
        taskTypeId: parseInt(data.taskTypeId),
        priorityId: data.priorityId ? parseInt(data.priorityId) : undefined,
        assigneeIds: selectedAssignees.map(a => a.Id),
        groupIds: selectedGroups.map(g => g.Id),
        isRecurring: data.isRecurring || false,
        recurrence: data.isRecurring && data.recurrenceType ? buildRecurrence(data) : undefined,
      };

      // Clean up empty strings
      if (!payload.startDate) delete payload.startDate;
      if (!payload.startTime) delete payload.startTime;
      if (!payload.dueDate) delete payload.dueDate;
      if (!payload.dueTime) delete payload.dueTime;
      if (!payload.description) delete payload.description;
      if (!payload.recurrenceEndDate) delete payload.recurrenceEndDate;
      if (!payload.recurrenceType) delete payload.recurrenceType;
      if (!payload.dailyIntraDayType) delete payload.dailyIntraDayType;
      if (!payload.monthlyRuleType) delete payload.monthlyRuleType;
      if (!payload.monthlyOrdinal) delete payload.monthlyOrdinal;
      if (!payload.monthlyDayOfWeek) delete payload.monthlyDayOfWeek;
      if (!payload.priorityId) delete payload.priorityId;


      if (task) {
        // Update existing task
        await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${task.Id}`, payload, {
          headers: { Authorization: `Bearer ${session.user.token}` }
        });
        toast.success("Task updated successfully!");
      } else {
        // Create new task
        await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks`, payload, {
          headers: { Authorization: `Bearer ${session.user.token}` }
        });
        toast.success("Task created successfully!");
      }

      form.reset();
      setSelectedAssignees([]);
      setSelectedGroups([]);
      onOpenChange(false);
      onTaskCreated?.();
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error(task ? "Failed to update task" : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const buildRecurrence = (data: CreateTaskForm) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recurrence: any = {
      recurrenceType: data.recurrenceType,
      endDate: data.recurrenceEndDate || undefined,
    };
    if (data.recurrenceType === "DAILY") {
      recurrence.dailyRule = {
        recurEveryXDays: data.dailyRecurEveryXDays || 1,
      };
      if (data.dailyIntraDayType && data.dailyIntraDayInterval) {
        recurrence.dailyRule.intraDayFrequencyType = data.dailyIntraDayType;
        recurrence.dailyRule.intraDayInterval = data.dailyIntraDayInterval;
      }
    } else if (data.recurrenceType === "WEEKLY") {
      recurrence.weeklyRule = {
        recurEveryNWeeks: data.weeklyRecurEveryNWeeks || 1,
        daysOfWeek: data.weeklyDays?.reduce((acc, day) => ({ ...acc, [day]: true }), {}),
      };
    } else if (data.recurrenceType === "MONTHLY") {
      recurrence.monthlyRule = {
        ruleType: data.monthlyRuleType,
        months: data.monthlyMonths?.length ? data.monthlyMonths : undefined,
      };
      if (data.monthlyRuleType === "BY_DAY_OF_MONTH") {
        recurrence.monthlyRule.monthlyDaysOfMonth = data.monthlyDaysOfMonth;
        recurrence.monthlyRule.lastDay = data.monthlyLastDay;
      } else if (data.monthlyRuleType === "BY_ORDINAL_DAY_OF_WEEK") {
        recurrence.monthlyRule.ordinal = data.monthlyOrdinal;
        recurrence.monthlyRule.dayOfWeek = data.monthlyDayOfWeek;
      }
    }
    return recurrence;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details of the task." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taskTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.Id} value={type.Id.toString()}>
                          {type.TypeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Is Recurring</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {form.watch("isRecurring") && (
              <FormField
                control={form.control}
                name="recurrenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {form.watch("isRecurring") && form.watch("recurrenceType") === "DAILY" && (
              <>
                <FormField
                  control={form.control}
                  name="dailyRecurEveryXDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recur Every X Days</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dailyIntraDayType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intra-Day Frequency (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MINUTES">Minutes</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("dailyIntraDayType") && (
                  <FormField
                    control={form.control}
                    name="dailyIntraDayInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interval</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
            {form.watch("isRecurring") && form.watch("recurrenceType") === "WEEKLY" && (
              <>
                <FormField
                  control={form.control}
                  name="weeklyRecurEveryNWeeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recur Every N Weeks</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weeklyDays"
                  render={() => (
                    <FormItem>
                      <FormLabel>Days of Week</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
                          <FormField
                            key={day}
                            control={form.control}
                            name="weeklyDays"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, day]);
                                      } else {
                                        field.onChange(current.filter((d) => d !== day));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="capitalize">{day}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {form.watch("isRecurring") && form.watch("recurrenceType") === "MONTHLY" && (
              <>
                <FormField
                  control={form.control}
                  name="monthlyRuleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rule Type</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="BY_DAY_OF_MONTH" id="by-day" />
                            <FormLabel htmlFor="by-day">By Day of Month</FormLabel>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="BY_ORDINAL_DAY_OF_WEEK" id="by-ordinal" />
                            <FormLabel htmlFor="by-ordinal">By Ordinal Day of Week</FormLabel>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("monthlyRuleType") === "BY_DAY_OF_MONTH" && (
                  <>
                    <FormField
                      control={form.control}
                      name="monthlyDaysOfMonth"
                      render={() => (
                        <FormItem>
                          <FormLabel>Days of Month (1-31)</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <FormField
                                key={day}
                                control={form.control}
                                name="monthlyDaysOfMonth"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(day)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, day]);
                                          } else {
                                            field.onChange(current.filter((d) => d !== day));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel>{day}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlyLastDay"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Last Day of Month</FormLabel>
                        </FormItem>
                      )}
                    />
                  </>
                )}
                {form.watch("monthlyRuleType") === "BY_ORDINAL_DAY_OF_WEEK" && (
                  <>
                    <FormField
                      control={form.control}
                      name="monthlyOrdinal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ordinal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ordinal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">First</SelectItem>
                              <SelectItem value="2">Second</SelectItem>
                              <SelectItem value="3">Third</SelectItem>
                              <SelectItem value="4">Fourth</SelectItem>
                              <SelectItem value="LAST">Last</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlyDayOfWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Week</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sunday">Sunday</SelectItem>
                              <SelectItem value="monday">Monday</SelectItem>
                              <SelectItem value="tuesday">Tuesday</SelectItem>
                              <SelectItem value="wednesday">Wednesday</SelectItem>
                              <SelectItem value="thursday">Thursday</SelectItem>
                              <SelectItem value="friday">Friday</SelectItem>
                              <SelectItem value="saturday">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="monthlyMonths"
                  render={() => (
                    <FormItem>
                      <FormLabel>Months (Optional, leave empty for all)</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"
                        ].map((month, index) => (
                          <FormField
                            key={month}
                            control={form.control}
                            name="monthlyMonths"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(index + 1)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, index + 1]);
                                      } else {
                                        field.onChange(current.filter((m) => m !== index + 1));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel>{month}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="priorityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.Id} value={priority.Id.toString()}>
                          {priority.PriorityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Assignees</FormLabel>
              <Input
                placeholder="Search assignees by name or email..."
                value={assigneeSearch}
                onChange={(e) => handleAssigneeSearch(e.target.value)}
              />
              {assignees.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded p-2">
                  {assignees
                    .filter(assignee => !selectedAssignees.find(sa => sa.Id === assignee.Id))
                    .map((assignee) => (
                      <div
                        key={assignee.Id}
                        className="flex justify-between items-center p-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => addAssignee(assignee)}
                      >
                        <span className="text-sm">{assignee.Name} ({assignee.Email})</span>
                        <Button type="button" size="sm" variant="outline">
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              )}
              {selectedAssignees.length > 0 && (
                <div className="space-y-1">
                  <FormLabel>Selected Assignees:</FormLabel>
                  {selectedAssignees.map((assignee) => (
                    <div key={assignee.Id} className="flex justify-between items-center bg-blue-50 p-2 rounded">
                      <span>{assignee.Name} ({assignee.Email})</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeAssignee(assignee.Id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <FormLabel>Groups</FormLabel>
              <Input
                placeholder="Search groups by name..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
              />
              {groups.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded p-2">
                  {groups
                    .filter(group =>
                      !selectedGroups.find(sg => sg.Id === group.Id) &&
                      group.GroupName.toLowerCase().includes(groupSearch.toLowerCase())
                    )
                    .map((group) => (
                      <div
                        key={group.Id}
                        className="flex justify-between items-center p-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => addGroup(group)}
                      >
                        <span className="text-sm">{group.GroupName}</span>
                        <Button type="button" size="sm" variant="outline">
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              )}
              {selectedGroups.length > 0 && (
                <div className="space-y-1">
                  <FormLabel>Selected Groups:</FormLabel>
                  {selectedGroups.map((group) => (
                    <div key={group.Id} className="flex justify-between items-center bg-green-50 p-2 rounded">
                      <span>{group.GroupName}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeGroup(group.Id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-1/2"
              >
                Cancel
              </Button>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (task ? "Updating..." : "Creating...") : (task ? "Update Task" : "Create Task")}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}