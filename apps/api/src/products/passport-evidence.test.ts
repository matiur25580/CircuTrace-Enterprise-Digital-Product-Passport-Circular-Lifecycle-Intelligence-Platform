import { describe, expect, it } from 'vitest';
import { hashEvidenceRecord, verifyEvidenceChain, type EvidenceHashInput } from './passport-evidence.js';

const base: EvidenceHashInput = {
  organizationId: 'org-1', productId: 'product-1', lifecycleEventId: null,
  sequence: 1, claimType: 'recycled_content', claimDescription: 'Supplier declares 80% recycled input',
  evidenceUri: 'https://evidence.example/certificate.pdf',
  evidenceSha256: 'a'.repeat(64), issuer: 'Supplier A',
  issuedAt: '2026-11-22T00:00:00.000Z', recordedBy: 'user-1', previousRecordHash: null
};

describe('passport evidence hash chain', () => {
  it('verifies a correctly linked sequence of immutable evidence records', () => {
    const firstHash = hashEvidenceRecord(base);
    const second = { ...base, sequence: 2, claimType: 'repair', previousRecordHash: firstHash };
    const records = [
      { ...base, recordHash: firstHash },
      { ...second, recordHash: hashEvidenceRecord(second) }
    ];
    expect(verifyEvidenceChain(records)).toMatchObject({ valid: true, recordsChecked: 2, failures: [] });
  });

  it('detects a modified claim after its record was hashed', () => {
    const recordHash = hashEvidenceRecord(base);
    expect(verifyEvidenceChain([{ ...base, claimDescription: 'Changed claim', recordHash }])).toMatchObject({
      valid: false, failures: [{ sequence: 1, reason: 'record_hash_mismatch' }]
    });
  });

  it('detects broken predecessor links and missing sequence numbers', () => {
    const second = { ...base, sequence: 3, previousRecordHash: 'b'.repeat(64) };
    const records = [
      { ...base, recordHash: hashEvidenceRecord(base) },
      { ...second, recordHash: hashEvidenceRecord(second) }
    ];
    expect(verifyEvidenceChain(records).valid).toBe(false);
    expect(verifyEvidenceChain(records).failures.map(failure => failure.reason)).toContain('sequence_gap_or_reordering');
    expect(verifyEvidenceChain(records).failures.map(failure => failure.reason)).toContain('previous_hash_mismatch');
  });

  it('returns a valid empty chain', () => {
    expect(verifyEvidenceChain([])).toMatchObject({ valid: true, recordsChecked: 0, headHash: null });
  });
});
