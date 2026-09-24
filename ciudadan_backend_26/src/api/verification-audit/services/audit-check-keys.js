"use strict";

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 6 (sección 26):
// checklist del auditor — qué debe poder revisar, en orden.
const AUDIT_CHECK_KEYS = [
  "session_matches_appointment",
  "checklist_complete",
  "expected_evidence_linked",
  "hashes_metadata_consistent",
  "media_matches_case",
  "official_check_present_when_required",
  "official_results_match_ciudadan_data",
  "no_suspicious_reuse",
  "incidents_well_documented",
  "verifier_did_not_modify_original_evidence",
];

module.exports = { AUDIT_CHECK_KEYS };
