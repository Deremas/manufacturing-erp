INSERT INTO "Permission" (id, module, action, label, "isArchived")
VALUES
  ('procurement.invoice.approve', 'procurement', 'invoice.approve', 'Approve supplier invoices', false),
  ('procurement.invoice.reject', 'procurement', 'invoice.reject', 'Reject supplier invoices', false),
  ('procurement.payment.approve', 'procurement', 'payment.approve', 'Approve supplier payments', false),
  ('procurement.payment.reject', 'procurement', 'payment.reject', 'Reject supplier payments', false),
  ('procurement.supplierReturn.approve', 'procurement', 'supplierReturn.approve', 'Approve supplier returns', false),
  ('procurement.supplierReturn.reject', 'procurement', 'supplierReturn.reject', 'Reject supplier returns', false)
ON CONFLICT (id) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  label = EXCLUDED.label,
  "isArchived" = false;
