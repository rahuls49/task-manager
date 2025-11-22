"use client"

import * as React from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Task } from "@/app/_types/task.types"
import { formatDateTime } from "@/lib/convert-to-ist"
import StatusSwitch from "@/app/status-switch"
import Link from "next/link"

interface SortableTableProps {
  tasks: Task[]
  userName: string
  token: string
}

export function SortableTable({ tasks, userName, token }: SortableTableProps) {
  const columns: ColumnDef<Task>[] = [
    {
      id: 'taskId',
      header: 'Task Id',
      // Display Task Id (useful for quick referencing)
      cell: ({ row }) => row.original.Id,
    },
    {
      accessorKey: 'Title',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const task = row.original
        return (
          <Link href={`/${task.Id}`}>
            <h2 className="font-medium">{task.Title}</h2>
            <p className="text-sm">{task.Description}</p>
          </Link>
        )
      },
    },
    {
      accessorKey: 'StartDate',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Start Date
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => formatDateTime(row.original.StartDate, row.original.StartTime),
      sortingFn: (rowA, rowB) => {
        const aTime = rowA.original.StartTime && rowA.original.StartTime.split(':').length === 2 ? `${rowA.original.StartTime}:00` : rowA.original.StartTime
        const bTime = rowB.original.StartTime && rowB.original.StartTime.split(':').length === 2 ? `${rowB.original.StartTime}:00` : rowB.original.StartTime
        const aDate = rowA.original.StartDate && aTime ? new Date(`${rowA.original.StartDate.split('T')[0]}T${aTime}+05:30`) : new Date(0)
        const bDate = rowB.original.StartDate && bTime ? new Date(`${rowB.original.StartDate.split('T')[0]}T${bTime}+05:30`) : new Date(0)
        return aDate.getTime() - bDate.getTime()
      },
    },
    {
      accessorKey: 'DueDate',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Due Date
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => formatDateTime(row.original.DueDate, row.original.DueTime),
      sortingFn: (rowA, rowB) => {
        const aTime = rowA.original.DueTime && rowA.original.DueTime.split(':').length === 2 ? `${rowA.original.DueTime}:00` : rowA.original.DueTime
        const bTime = rowB.original.DueTime && rowB.original.DueTime.split(':').length === 2 ? `${rowB.original.DueTime}:00` : rowB.original.DueTime
        const aDate = rowA.original.DueDate && aTime ? new Date(`${rowA.original.DueDate.split('T')[0]}T${aTime}+05:30`) : new Date(0)
        const bDate = rowB.original.DueDate && bTime ? new Date(`${rowB.original.DueDate.split('T')[0]}T${bTime}+05:30`) : new Date(0)
        return aDate.getTime() - bDate.getTime()
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusSwitch currentStatus={row.original.status} taskId={row.original.Id} token={token} taskTypeId={row.original.TaskTypeId} />,
      enableSorting: false,
    },
  ]

  const [sorting, setSorting] = React.useState<SortingState>([])
  const table = useReactTable({
    data: tasks,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  return (
    <Table>
      <TableCaption>Tasks Assigned to {userName}</TableCaption>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const time = row.original.DueTime && row.original.DueTime.split(':').length === 2 ? `${row.original.DueTime}:00` : row.original.DueTime;
            const isOverdue = row.original.DueDate && time ? new Date(`${row.original.DueDate.split('T')[0]}T${time}+05:30`) < new Date() : false;
            return (
              <TableRow
                key={row.id}
                className={isOverdue ? "bg-red-200" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}