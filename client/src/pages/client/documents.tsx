import { ClientLayout } from "@/components/layouts/ClientLayout";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentList } from "@/components/documents/DocumentList";
import { useWebSocket } from "@/hooks/use-websocket";

export default function ClientDocuments() {
  // Initialize WebSocket connection
  useWebSocket();

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Manage your documents and files</p>
          </div>
        </div>

        <DocumentUpload />

        <DocumentList />
      </div>
    </ClientLayout>
  );
}