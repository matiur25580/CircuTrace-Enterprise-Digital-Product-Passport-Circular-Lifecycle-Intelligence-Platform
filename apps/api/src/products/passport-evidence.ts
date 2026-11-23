import { createHash } from 'node:crypto';

export interface EvidenceHashInput {
  organizationId: string;
  productId: string;
  lifecycleEventId: string | null;
  sequence: number;
  claimType: string;
  claimDescription: string;
  evidenceUri: string;
  evidenceSha256: string;
  issuer: string;
  issuedAt: string;
  recordedBy: string;
  previousRecordHash: string | null;
}

export function hashEvidenceRecord(input: EvidenceHashInput): string {
  // Fixed-position serialization avoids object-key ordering ambiguity.
  const canonical = JSON.stringify([
    input.organizationId, input.productId, input.lifecycleEventId, input.sequence,
    input.claimType, input.claimDescription, input.evidenceUri, input.evidenceSha256,
    input.issuer, input.issuedAt, input.recordedBy, input.previousRecordHash
  ]);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function verifyEvidenceChain(records: Array<EvidenceHashInput & { recordHash: string }>) {
  let previousRecordHash: string | null = null;
  let expectedSequence = 1;
  const failures: Array<{ sequence: number; reason: string }> = [];
  for (const record of records) {
    if (record.sequence !== expectedSequence) {
      failures.push({ sequence: record.sequence, reason: 'sequence_gap_or_reordering' });
    }
    if (record.previousRecordHash !== previousRecordHash) {
      failures.push({ sequence: record.sequence, reason: 'previous_hash_mismatch' });
    }
    const calculated = hashEvidenceRecord(record);
    if (calculated !== record.recordHash) {
      failures.push({ sequence: record.sequence, reason: 'record_hash_mismatch' });
    }
    previousRecordHash = record.recordHash;
    expectedSequence = record.sequence + 1;
  }
  return {
    valid: failures.length === 0,
    recordsChecked: records.length,
    headHash: records.at(-1)?.recordHash ?? null,
    failures
  };
}
