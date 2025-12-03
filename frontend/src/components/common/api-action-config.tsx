"use client";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  TaskActionEvent,
  TaskActionEventLabels,
  HttpMethod,
  InlineApiActionDto,
  ApiDefinition,
  getAllActionEvents,
  getAllHttpMethods,
} from "@/app/_types/action.types";
import axios from "axios";
import { useSession } from "next-auth/react";

interface ApiActionConfigProps {
  apiActions: InlineApiActionDto[];
  onChange: (apiActions: InlineApiActionDto[]) => void;
  existingApiActions?: ApiDefinition[];
}

interface ApiActionFormState {
  useExisting: boolean;
  apiDefinitionId?: number;
  name: string;
  description: string;
  endpoint: string;
  httpMethod: HttpMethod;
  headers: string;
  body: string;
  triggerEvent: TaskActionEvent;
  isActive: boolean;
}

const defaultFormState: ApiActionFormState = {
  useExisting: false,
  apiDefinitionId: undefined,
  name: "",
  description: "",
  endpoint: "",
  httpMethod: HttpMethod.GET,
  headers: "{}",
  body: "{}",
  triggerEvent: TaskActionEvent.TASK_CREATED,
  isActive: true,
};

export default function ApiActionConfig({
  apiActions,
  onChange,
  existingApiActions: initialApiDefinitions,
}: ApiActionConfigProps) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [apiDefinitions, setApiDefinitions] = useState<ApiDefinition[]>(
    initialApiDefinitions || []
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [formState, setFormState] = useState<ApiActionFormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing API definitions
  useEffect(() => {
    const fetchApiDefinitions = async () => {
      if (!session?.user?.token) return;
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/actions/api-definitions`,
          {
            headers: { Authorization: `Bearer ${session.user.token}` },
          }
        );
        setApiDefinitions(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch API definitions:", error);
      }
    };
    fetchApiDefinitions();
  }, [session?.user?.token]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formState.useExisting) {
      if (!formState.apiDefinitionId) {
        newErrors.apiDefinitionId = "Please select an API definition";
      }
    } else {
      if (!formState.name.trim()) {
        newErrors.name = "Name is required";
      }
      if (!formState.endpoint.trim()) {
        newErrors.endpoint = "Endpoint is required";
      }
      try {
        if (formState.headers.trim()) {
          JSON.parse(formState.headers);
        }
      } catch {
        newErrors.headers = "Invalid JSON format";
      }
      try {
        if (formState.body.trim()) {
          JSON.parse(formState.body);
        }
      } catch {
        newErrors.body = "Invalid JSON format";
      }
    }

    if (!formState.triggerEvent) {
      newErrors.triggerEvent = "Please select a trigger event";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAction = () => {
    if (!validateForm()) return;

    const newAction: InlineApiActionDto = {
      triggerEvent: formState.triggerEvent,
      isActive: formState.isActive,
    };

    if (formState.useExisting && formState.apiDefinitionId) {
      newAction.apiDefinitionId = formState.apiDefinitionId;
    } else {
      newAction.apiDefinition = {
        name: formState.name,
        description: formState.description || undefined,
        endpoint: formState.endpoint,
        httpMethod: formState.httpMethod,
        headers: formState.headers.trim() ? JSON.parse(formState.headers) : undefined,
        body: formState.body.trim() ? JSON.parse(formState.body) : undefined,
        isActive: true,
      };
    }

    onChange([...apiActions, newAction]);
    setFormState(defaultFormState);
    setShowAddForm(false);
    setErrors({});
  };

  const handleRemoveAction = (index: number) => {
    const newActions = [...apiActions];
    newActions.splice(index, 1);
    onChange(newActions);
  };

  const getActionDisplayName = (action: InlineApiActionDto): string => {
    if (action.apiDefinitionId) {
      const def = apiDefinitions.find((d) => d.Id === action.apiDefinitionId);
      return def?.Name || `API Definition #${action.apiDefinitionId}`;
    }
    return action.apiDefinition?.name || "New API Action";
  };

  const actionEvents = getAllActionEvents();
  const httpMethods = getAllHttpMethods();

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer p-2 bg-gray-50 rounded hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-medium text-sm">
          API Actions ({apiActions.length})
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>

      {expanded && (
        <div className="space-y-3 pl-2">
          {/* Existing Actions List */}
          {apiActions.map((action, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{getActionDisplayName(action)}</p>
                  <p className="text-xs text-gray-500">
                    Trigger: {TaskActionEventLabels[action.triggerEvent]}
                  </p>
                  {action.apiDefinition && (
                    <p className="text-xs text-gray-400">
                      {action.apiDefinition.httpMethod} {action.apiDefinition.endpoint}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAction(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Add New Action Form */}
          {showAddForm ? (
            <Card className="p-3">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm">Add API Action</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                {/* Use Existing or Create New */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useExisting"
                    checked={formState.useExisting}
                    onCheckedChange={(checked) =>
                      setFormState({ ...formState, useExisting: !!checked })
                    }
                  />
                  <label htmlFor="useExisting" className="text-sm">
                    Use existing API definition
                  </label>
                </div>

                {formState.useExisting ? (
                  <div>
                    <label className="text-xs font-medium">API Definition</label>
                    <Select
                      value={formState.apiDefinitionId?.toString() || ""}
                      onValueChange={(value) =>
                        setFormState({
                          ...formState,
                          apiDefinitionId: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select API definition" />
                      </SelectTrigger>
                      <SelectContent>
                        {apiDefinitions.map((def) => (
                          <SelectItem key={def.Id} value={def.Id.toString()}>
                            {def.Name} ({def.HttpMethod} {def.Endpoint})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.apiDefinitionId && (
                      <p className="text-xs text-red-500">{errors.apiDefinitionId}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium">Name *</label>
                      <Input
                        placeholder="API action name"
                        value={formState.name}
                        onChange={(e) =>
                          setFormState({ ...formState, name: e.target.value })
                        }
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium">Description</label>
                      <Input
                        placeholder="Optional description"
                        value={formState.description}
                        onChange={(e) =>
                          setFormState({ ...formState, description: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs font-medium">Method</label>
                        <Select
                          value={formState.httpMethod}
                          onValueChange={(value) =>
                            setFormState({
                              ...formState,
                              httpMethod: value as HttpMethod,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {httpMethods.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-medium">Endpoint *</label>
                        <Input
                          placeholder="https://api.example.com/webhook"
                          value={formState.endpoint}
                          onChange={(e) =>
                            setFormState({ ...formState, endpoint: e.target.value })
                          }
                        />
                        {errors.endpoint && (
                          <p className="text-xs text-red-500">{errors.endpoint}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium">Headers (JSON)</label>
                      <Textarea
                        placeholder='{"Authorization": "Bearer token"}'
                        value={formState.headers}
                        onChange={(e) =>
                          setFormState({ ...formState, headers: e.target.value })
                        }
                        rows={2}
                      />
                      {errors.headers && (
                        <p className="text-xs text-red-500">{errors.headers}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium">Body (JSON)</label>
                      <Textarea
                        placeholder='{"taskId": "{{Id}}", "title": "{{Title}}"}'
                        value={formState.body}
                        onChange={(e) =>
                          setFormState({ ...formState, body: e.target.value })
                        }
                        rows={3}
                      />
                      {errors.body && (
                        <p className="text-xs text-red-500">{errors.body}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Use {"{{fieldName}}"} for template variables (e.g., {"{{Id}}"}, {"{{Title}}"})
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-medium">Trigger Event *</label>
                  <Select
                    value={formState.triggerEvent}
                    onValueChange={(value) =>
                      setFormState({
                        ...formState,
                        triggerEvent: value as TaskActionEvent,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger event" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionEvents.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.triggerEvent && (
                    <p className="text-xs text-red-500">{errors.triggerEvent}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formState.isActive}
                    onCheckedChange={(checked) =>
                      setFormState({ ...formState, isActive: !!checked })
                    }
                  />
                  <label htmlFor="isActive" className="text-sm">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormState(defaultFormState);
                      setErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddAction}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add API Action
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
