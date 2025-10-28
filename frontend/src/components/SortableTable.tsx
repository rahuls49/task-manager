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
      id: 'srNo',
      header: 'Sr. No.',
      cell: ({ row }) => row.index + 1,
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
        const aDate = rowA.original.DueDate && rowA.original.DueTime ? new Date(`${rowA.original.DueDate.split('T')[0]}T${rowA.original.DueTime}Z`) : new Date(0)
        const bDate = rowB.original.DueDate && rowB.original.DueTime ? new Date(`${rowB.original.DueDate.split('T')[0]}T${rowB.original.DueTime}Z`) : new Date(0)
        return aDate.getTime() - bDate.getTime()
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusSwitch currentStatus={row.original.status} taskId={row.original.Id} token={token} />,
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
            const isOverdue = row.original.DueDate && row.original.DueTime ? new Date(`${row.original.DueDate.split('T')[0]}T${row.original.DueTime}Z`) < new Date() : false;
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