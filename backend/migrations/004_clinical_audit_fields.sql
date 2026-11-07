-- 004_clinical_audit_fields.sql: Medical Audit Trail & NEWS2 Risk Scoring for Module 5

ALTER TABLE activity_logs ADD COLUMN voided BOOLEAN DEFAULT 0;
ALTER TABLE activity_logs ADD COLUMN void_reason TEXT;

ALTER TABLE vital_notes ADD COLUMN news2_score INTEGER DEFAULT 0;
ALTER TABLE vital_notes ADD COLUMN voided BOOLEAN DEFAULT 0;
ALTER TABLE vital_notes ADD COLUMN void_reason TEXT;

