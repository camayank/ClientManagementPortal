import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminClients() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Client Management</h1>
        
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : clients?.map((client: any) => (
                <TableRow key={client.id}>
                  <TableCell>{client.company}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.projects}</TableCell>
                  <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
