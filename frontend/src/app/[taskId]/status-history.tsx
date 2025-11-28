"use client";

import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface StatusHistoryItem {
    Id: number;
    OldStatusName: string | null;
    NewStatusName: string;
    Remark: string | null;
    ChangedByUser: {
        Name: string;
        Email: string;
    } | null;
    ChangedAt: string;
}

interface StatusHistoryProps {
    history: StatusHistoryItem[];
}

export function StatusHistory({ history }: StatusHistoryProps) {
    if (!history || history.length === 0) {
        return (
            <div className="text-sm text-muted-foreground italic">
                No status history available.
            </div>
        );
    }

    return (
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-4">
                {history.map((item, index) => (
                    <div key={item.Id} className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold text-sm">
                                    {item.OldStatusName ? (
                                        <>
                                            {item.OldStatusName} &rarr; {item.NewStatusName}
                                        </>
                                    ) : (
                                        <>Initialized to {item.NewStatusName}</>
                                    )}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {format(new Date(item.ChangedAt), "MMM d, yyyy HH:mm")}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            by {item.ChangedByUser?.Name || "Unknown"}
                        </div>
                        {item.Remark && (
                            <div className="text-sm mt-1 bg-muted/50 p-2 rounded-md">
                                {item.Remark}
                            </div>
                        )}
                        {index < history.length - 1 && <Separator className="my-2" />}
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
