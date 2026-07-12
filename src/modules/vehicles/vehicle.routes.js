const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const controller = require('./vehicle.controller');
const documentController = require('../documents/document.controller');
const upload = require('../documents/upload.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

router.post(
  '/',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [
    body('registrationNumber').isString().trim().notEmpty(),
    body('maxLoadCapacityKg').isFloat({ gt: 0 }),
    body('acquisitionCost').optional().isFloat({ min: 0 }),
  ],
  validate,
  controller.create
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'FLEET_MANAGER'),
  [param('id').isUUID(), body('version').isInt({ min: 0 })],
  validate,
  controller.update
);

router.post('/:id/retire', requireRole('ADMIN', 'FLEET_MANAGER'), param('id').isUUID(), validate, controller.retire);

// Vehicle documents (bonus: document management)
router.post('/:id/documents', requireRole('ADMIN', 'FLEET_MANAGER'), param('id').isUUID(), validate, upload.single('file'), documentController.uploadDocument);
router.get('/:id/documents', param('id').isUUID(), validate, documentController.listDocuments);
router.delete('/:id/documents/:docId', requireRole('ADMIN', 'FLEET_MANAGER'), documentController.deleteDocument);

module.exports = router;
