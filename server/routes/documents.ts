import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";
import { documentLimiter } from "../middleware/rate-limit";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { db } from "../db/index";
import { 
  documents, 
  documentVersions, 
  documentTags,
  documentAuditLogs,
  documentClassifications
} from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Request, Response } from "express";

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Helper function to create audit log
async function createAuditLog(
  documentId: number, 
  userId: number, 
  action: string, 
  req: Request,
  metadata?: any
) {
  await db.insert(documentAuditLogs).values({
    documentId,
    userId,
    action,
    metadata,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

// Get document classifications
router.get("/classifications",
  documentLimiter,
  requirePermission('documents', 'read'),
  async (_req: Request, res: Response) => {
    try {
      const classifications = await db.query.documentClassifications.findMany();
      res.json(classifications);
    } catch (error: any) {
      console.error("Error fetching classifications:", error);
      res.status(500).json({ message: "Failed to fetch classifications" });
    }
  }
);

// Get all documents with their latest version and classifications
router.get("/",
  documentLimiter,
  requirePermission('documents', 'read'),
  async (req: Request, res: Response) => {
    try {
      const docs = await db.query.documents.findMany({
        with: {
          versions: {
            orderBy: desc(documentVersions.version),
            limit: 1,
          },
          tags: {
            with: {
              classification: true,
            },
          },
        },
      });

      await createAuditLog(0, req.user!.id, 'view', req, { action: 'list_all' });
      res.json(docs);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  }
);

// Upload new document or new version
router.post("/upload",
  documentLimiter,
  requirePermission('documents', 'write'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { originalname, path: filePath, size } = req.file;
    const contentHash = crypto.createHash('sha256').update(filePath).digest('hex');

    try {
      // Start transaction
      const result = await db.transaction(async (tx) => {
        let doc;
        const existingDoc = await tx.query.documents.findFirst({
          where: eq(documents.name, originalname),
        });

        if (existingDoc) {
          // Create new version
          const lastVersion = await tx.query.documentVersions.findFirst({
            where: eq(documentVersions.documentId, existingDoc.id),
            orderBy: desc(documentVersions.version),
          });

          const newVersion = await tx.insert(documentVersions).values({
            documentId: existingDoc.id,
            version: (lastVersion?.version || 0) + 1,
            filename: path.basename(filePath),
            contentHash,
            size,
            uploadedBy: req.user!.id,
          }).returning();

          doc = existingDoc;
          await createAuditLog(doc.id, req.user!.id, 'version', req, {
            version: newVersion[0].version,
            size,
          });
        } else {
          // Create new document
          doc = (await tx.insert(documents).values({
            name: originalname,
            type: path.extname(originalname),
            size,
            uploadedBy: req.user!.id,
          }).returning())[0];

          // Create first version
          await tx.insert(documentVersions).values({
            documentId: doc.id,
            version: 1,
            filename: path.basename(filePath),
            contentHash,
            size,
            uploadedBy: req.user!.id,
          });

          await createAuditLog(doc.id, req.user!.id, 'upload', req, {
            size,
            type: path.extname(originalname),
          });
        }

        return doc;
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error in document upload:", error);
      res.status(500).json({ message: "Document upload failed" });
    }
  }
);

// Get document versions
router.get("/:id/versions",
  documentLimiter,
  requirePermission('documents', 'read'),
  async (req: Request, res: Response) => {
    try {
      const versions = await db.query.documentVersions.findMany({
        where: eq(documentVersions.documentId, parseInt(req.params.id)),
        orderBy: desc(documentVersions.version),
        with: {
          uploader: true,
        },
      });

      await createAuditLog(parseInt(req.params.id), req.user!.id, 'view', req, {
        action: 'list_versions',
      });

      res.json(versions);
    } catch (error: any) {
      console.error("Error fetching versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  }
);

// Add classification to document
router.post("/:id/classify",
  documentLimiter,
  requirePermission('documents', 'write'),
  async (req: Request, res: Response) => {
    const { classificationId } = req.body;
    const documentId = parseInt(req.params.id);

    try {
      const existingTag = await db.query.documentTags.findFirst({
        where: and(
          eq(documentTags.documentId, documentId),
          eq(documentTags.classificationId, classificationId)
        ),
      });

      if (!existingTag) {
        await db.insert(documentTags).values({
          documentId,
          classificationId,
          addedBy: req.user!.id,
        });

        await createAuditLog(documentId, req.user!.id, 'classify', req, {
          classificationId,
        });
      }

      res.json({ message: "Classification added successfully" });
    } catch (error: any) {
      console.error("Error classifying document:", error);
      res.status(500).json({ message: "Failed to classify document" });
    }
  }
);

// Download specific version
router.get("/:id/download/:version?",
  documentLimiter,
  requirePermission('documents', 'read'),
  async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const version = req.params.version ? parseInt(req.params.version) : undefined;

      let documentVersion;
      if (version) {
        documentVersion = await db.query.documentVersions.findFirst({
          where: and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.version, version)
          ),
        });
      } else {
        documentVersion = await db.query.documentVersions.findFirst({
          where: eq(documentVersions.documentId, documentId),
          orderBy: desc(documentVersions.version),
        });
      }

      if (!documentVersion) {
        return res.status(404).json({ message: "Document version not found" });
      }

      await createAuditLog(documentId, req.user!.id, 'download', req, {
        version: documentVersion.version,
      });

      res.download(
        path.join(process.cwd(), 'uploads', documentVersion.filename),
        documentVersion.filename
      );
    } catch (error: any) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  }
);

export default router;