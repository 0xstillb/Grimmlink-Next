ALTER TABLE phase06_offline_progress
  ADD COLUMN position_evidence TEXT CHECK (
    position_evidence IS NULL OR position_evidence IN (
      'OFFLINE_SYNTHETIC_FIXTURE_ONLY',
      'EPUB_DOM_ROUNDTRIP_ONLY',
      'OFFLINE_FIXTURE_PAGE_COUNT_ONLY'
    )
  );
--> statement-breakpoint
UPDATE phase06_offline_progress
SET position_evidence = CASE position_kind
  WHEN 'EPUB_EXACT' THEN 'OFFLINE_SYNTHETIC_FIXTURE_ONLY'
  WHEN 'PDF_PAGE' THEN 'OFFLINE_FIXTURE_PAGE_COUNT_ONLY'
  ELSE NULL
END
WHERE position_kind IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER phase06_position_evidence_insert_guard
BEFORE INSERT ON phase06_offline_progress
WHEN
  (NEW.position_kind IS NULL AND NEW.position_evidence IS NOT NULL) OR
  (NEW.position_kind='EPUB_EXACT' AND COALESCE(NEW.position_evidence,'') NOT IN (
    'OFFLINE_SYNTHETIC_FIXTURE_ONLY','EPUB_DOM_ROUNDTRIP_ONLY'
  )) OR
  (NEW.position_kind='PDF_PAGE' AND COALESCE(NEW.position_evidence,'') <> 'OFFLINE_FIXTURE_PAGE_COUNT_ONLY') OR
  (NEW.position_kind IS NOT NULL AND NEW.position_kind NOT IN ('EPUB_EXACT','PDF_PAGE'))
BEGIN
  SELECT RAISE(ABORT, 'PHASE06_EVIDENCE_MISMATCH');
END;
--> statement-breakpoint
CREATE TRIGGER phase06_position_evidence_update_guard
BEFORE UPDATE OF position_kind,position_evidence ON phase06_offline_progress
WHEN
  (NEW.position_kind IS NULL AND NEW.position_evidence IS NOT NULL) OR
  (NEW.position_kind='EPUB_EXACT' AND COALESCE(NEW.position_evidence,'') NOT IN (
    'OFFLINE_SYNTHETIC_FIXTURE_ONLY','EPUB_DOM_ROUNDTRIP_ONLY'
  )) OR
  (NEW.position_kind='PDF_PAGE' AND COALESCE(NEW.position_evidence,'') <> 'OFFLINE_FIXTURE_PAGE_COUNT_ONLY') OR
  (NEW.position_kind IS NOT NULL AND NEW.position_kind NOT IN ('EPUB_EXACT','PDF_PAGE'))
BEGIN
  SELECT RAISE(ABORT, 'PHASE06_EVIDENCE_MISMATCH');
END;
