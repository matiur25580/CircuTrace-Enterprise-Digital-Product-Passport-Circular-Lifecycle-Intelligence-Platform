import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ApiClientError, createPartnerRelationship, listPartnerRelationships, updatePartnerRelationshipStatus,
  type Partner, type PartnerRelationship, type PartnerRelationshipInput, type PartnerRelationshipStatus, type PartnerRelationshipType,
} from './lib/api';

const relationshipTypes: { value: PartnerRelationshipType; label: string }[] = [
  { value: 'supplies_to', label: 'Supplies to' },
  { value: 'manufactures_for', label: 'Manufactures for' },
  { value: 'distributes_to', label: 'Distributes to' },
  { value: 'transports_for', label: 'Transports for' },
  { value: 'services', label: 'Provides services to' },
  { value: 'repairs_for', label: 'Repairs for' },
  { value: 'refurbishes_for', label: 'Refurbishes for' },
  { value: 'recycles_for', label: 'Recycles for' },
];

function errorMessage(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Could not connect to the partner relationship service. Try again.';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export function PartnerRelationships({ organizationId, partners, canManage }: {
  organizationId: string;
  partners: Partner[];
  canManage: boolean;
}) {
  const [relationships, setRelationships] = useState<PartnerRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterType, setFilterType] = useState<PartnerRelationshipType | ''>('');
  const [filterStatus, setFilterStatus] = useState<PartnerRelationshipStatus | ''>('active');
  const [sourcePartnerId, setSourcePartnerId] = useState('');
  const [targetPartnerId, setTargetPartnerId] = useState('');
  const [type, setType] = useState<PartnerRelationshipType>('supplies_to');
  const [description, setDescription] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRelationships(await listPartnerRelationships(organizationId, {
        partnerId: filterPartner, type: filterType, status: filterStatus,
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [organizationId, filterPartner, filterType, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourcePartnerId || !targetPartnerId || sourcePartnerId === targetPartnerId) {
      setError('Choose two different partner records.');
      return;
    }
    setBusy(true);
    setError('');
    const input: PartnerRelationshipInput = {
      sourcePartnerId, targetPartnerId, type,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(effectiveFrom ? { effectiveFrom: new Date(effectiveFrom).toISOString() } : {}),
      ...(effectiveTo ? { effectiveTo: new Date(effectiveTo).toISOString() } : {}),
    };
    try {
      await createPartnerRelationship(organizationId, input);
      setDescription('');
      setEffectiveFrom('');
      setEffectiveTo('');
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(relationship: PartnerRelationship) {
    const next: PartnerRelationshipStatus = relationship.status === 'active' ? 'inactive' : 'active';
    setBusy(true);
    setError('');
    try {
      await updatePartnerRelationshipStatus(organizationId, relationship._id, next);
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const activePartners = partners.filter((partner) => partner.status === 'active');

  return <section className="partner-relationships" aria-labelledby="partner-relationships-title">
    <div className="relationship-heading">
      <div><p className="eyebrow">CONNECTED SUPPLY CHAIN</p><h3 id="partner-relationships-title">Partner relationships</h3><p>Connect partners to describe how materials, products and services move through your network.</p></div>
      <span className="relationship-count">{relationships.length} shown</span>
    </div>
    {error && <div className="inline-alert" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss relationship error">×</button></div>}
    {canManage && <form className="relationship-create-form" onSubmit={submit}>
      <label>From partner<select value={sourcePartnerId} onChange={(event) => setSourcePartnerId(event.target.value)} required><option value="">Select source partner</option>{activePartners.map((partner) => <option key={partner._id} value={partner._id}>{partner.name}</option>)}</select></label>
      <label>Relationship<select value={type} onChange={(event) => setType(event.target.value as PartnerRelationshipType)}>{relationshipTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>To partner<select value={targetPartnerId} onChange={(event) => setTargetPartnerId(event.target.value)} required><option value="">Select destination partner</option>{activePartners.map((partner) => <option key={partner._id} value={partner._id} disabled={partner._id === sourcePartnerId}>{partner.name}</option>)}</select></label>
      <label className="relationship-description">Description (optional)<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="e.g. Supplies recycled polymer feedstock" /></label>
      <label>Effective from<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
      <label>Effective to<input type="date" min={effectiveFrom || undefined} value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></label>
      <div className="relationship-form-actions"><button className="primary-button" type="submit" disabled={busy || activePartners.length < 2}>{busy ? 'Saving…' : 'Add relationship'}</button></div>
    </form>}
    <div className="relationship-filters">
      <label>Partner<select value={filterPartner} onChange={(event) => setFilterPartner(event.target.value)}><option value="">All partners</option>{partners.map((partner) => <option key={partner._id} value={partner._id}>{partner.name}</option>)}</select></label>
      <label>Relationship type<select value={filterType} onChange={(event) => setFilterType(event.target.value as PartnerRelationshipType | '')}><option value="">All relationship types</option>{relationshipTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Status<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as PartnerRelationshipStatus | '')}><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></label>
      <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
    </div>
    {loading ? <div className="relationship-empty" role="status">Loading partner relationships…</div> : relationships.length === 0 ? <div className="relationship-empty"><strong>No relationships found</strong><span>{filterPartner || filterType || filterStatus === 'inactive' ? 'Try changing your filters.' : 'Create the first connection between two active partners.'}</span></div> :
      <div className="relationship-list">{relationships.map((relationship) => {
        const source = relationship.sourcePartnerId.name;
        const target = relationship.targetPartnerId.name;
        return <article className="relationship-card" key={relationship._id}>
          <div className="relationship-flow"><span className="relationship-node">{source || 'Partner'}</span><span className="relationship-arrow" aria-hidden="true">→</span><span className="relationship-node">{target || 'Partner'}</span></div>
          <div className="relationship-meta"><span className="relationship-kind">{relationshipTypes.find((item) => item.value === relationship.type)?.label || relationship.type}</span><span className={'partner-status ' + (relationship.status === 'active' ? 'status-active' : 'status-archived')}>{relationship.status}</span></div>
          {relationship.description && <p className="relationship-note">{relationship.description}</p>}
          <p className="relationship-dates">Effective: {formatDate(relationship.effectiveFrom)} – {formatDate(relationship.effectiveTo)}</p>
          {canManage && <button className="text-action" type="button" disabled={busy} onClick={() => void changeStatus(relationship)}>{relationship.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>}
        </article>;
      })}</div>}
    {!canManage && <p className="partner-permission-note">You have read-only access to this organization’s partner relationships.</p>}
  </section>;
}
