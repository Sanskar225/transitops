const fs = require('fs/promises');
const prisma = require('../../config/db');
const ApiError = require('../../utils/apiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');

// NOTE on rule #16 (File Upload Race): vehicle deletion in this system is
// modeled as "retire" (soft), never a hard DELETE, specifically so an
// in-flight document upload can never reference a vehicle row that vanished
// mid-request. Document rows use onDelete: Cascade in schema as a safety net
// if a hard delete is ever introduced, and deleteDocument always removes the
// DB row and the on-disk file in the same handler (not a separate cleanup job)
// to avoid orphaned files.

const uploadDocument = asyncHandler(async (req, res) => {
  const vehicleId = req.params.id;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    // Vehicle disappeared between validation and upload completing - clean up orphan file immediately.
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    throw ApiError.notFound('Vehicle not found', { vehicleId }, 'VEHICLE_NOT_FOUND');
  }
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const doc = await prisma.vehicleDocument.create({
    data: {
      vehicleId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
    },
  });
  created(res, doc);
});

const listDocuments = asyncHandler(async (req, res) => {
  const docs = await prisma.vehicleDocument.findMany({ where: { vehicleId: req.params.id } });
  ok(res, docs);
});

const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await prisma.vehicleDocument.findUnique({ where: { id: req.params.docId } });
  if (!doc) throw ApiError.notFound('Document not found');
  await prisma.vehicleDocument.delete({ where: { id: doc.id } });
  await fs.unlink(doc.filePath).catch(() => {}); // best-effort; DB row is source of truth
  ok(res, { message: 'Document deleted' });
});

module.exports = { uploadDocument, listDocuments, deleteDocument };
