WITH permissions(module, action, label) AS (
  VALUES ('asset','assignment.reject','Reject asset assignments')
)
INSERT INTO "Permission" (id, module, action, label, "isArchived")
SELECT gen_random_uuid()::text, p.module, p.action, p.label, false FROM permissions p
WHERE NOT EXISTS (SELECT 1 FROM "Permission" existing WHERE existing.module = p.module AND existing.action = p.action AND existing."isArchived" = false);
