import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText, Eye, History, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Document, DocumentVersion, DocumentClassification } from "@db/schema";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function formatFileSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

interface VersionHistoryProps {
  documentId: number;
  onClose: () => void;
}

function VersionHistory({ documentId, onClose }: VersionHistoryProps) {
  const { data: versions } = useQuery<DocumentVersion[]>({
    queryKey: [`/api/documents/${documentId}/versions`],
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions?.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>v{version.version}</TableCell>
                  <TableCell>{formatFileSize(version.size)}</TableCell>
                  <TableCell>{version.uploadedBy}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`/api/documents/${documentId}/download/${version.version}`}
                        download
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentList() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showVersions, setShowVersions] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const { data: classifications } = useQuery<DocumentClassification[]>({
    queryKey: ['/api/documents/classifications'],
  });

  const handleClassify = async (documentId: number, classificationId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classificationId: parseInt(classificationId) }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to classify document');
      }

      toast({
        title: "Success",
        description: "Document classified successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to classify document",
      });
    }
  };

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Classifications</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {doc.name}
                </TableCell>
                <TableCell>{doc.type}</TableCell>
                <TableCell>{formatFileSize(doc.size)}</TableCell>
                <TableCell>
                  <Select
                    onValueChange={(value) => handleClassify(doc.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Add classification" />
                    </SelectTrigger>
                    <SelectContent>
                      {classifications?.map((classification) => (
                        <SelectItem
                          key={classification.id}
                          value={classification.id.toString()}
                        >
                          {classification.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1 mt-1">
                    {doc.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.classification.name}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {doc.createdAt && formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVersions(doc.id)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        download
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!documents || documents.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No documents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showVersions && (
        <VersionHistory
          documentId={showVersions}
          onClose={() => setShowVersions(null)}
        />
      )}

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <iframe
              src={`/api/documents/${selectedDoc.id}/view`}
              className="w-full h-full border-0"
              title={selectedDoc.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}