import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<T> {
  columns: {
    accessorKey: keyof T;
    header: string;
    cell?: (props: { row: { original: T } }) => React.ReactNode;
  }[];
  data: T[];
  pagination?: boolean;
}

export function DataTable<T>({ columns, data, pagination = false }: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const paginatedData = pagination
    ? data.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
    : data;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.accessorKey)}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, i) => (
            <TableRow key={i}>
              {columns.map((column) => (
                <TableCell key={String(column.accessorKey)}>
                  {column.cell
                    ? column.cell({ row: { original: row } })
                    : String(row[column.accessorKey])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && data.length > rowsPerPage && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(data.length / rowsPerPage) - 1, p + 1))}
            disabled={page >= Math.ceil(data.length / rowsPerPage) - 1}
            className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
