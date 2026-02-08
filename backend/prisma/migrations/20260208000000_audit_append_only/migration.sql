-- Audit Events: Append-Only Enforcement
-- BEFORE UPDATE trigger prevents any modification of audit records.
-- DELETE is allowed (needed by retention purge job).

CREATE OR REPLACE FUNCTION prevent_audit_event_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are append-only and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON cgt_audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_event_update();
