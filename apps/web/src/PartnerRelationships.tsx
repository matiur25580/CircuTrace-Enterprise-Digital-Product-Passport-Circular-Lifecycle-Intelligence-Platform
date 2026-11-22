import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ApiClientError, createPartnerRelationship, listPartnerRelationships, listPartners, updatePartnerRelationshipStatus,
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

type NetworkNode = { id: string; name: string; type: string; status: string; x: number; y: number };
type NetworkEdge = { id: string; source: string; target: string; type: string; status: string };

export function buildPartnerNetworkLayout(partners: Partner[], relationships: PartnerRelationship[]) {
  const endpoints = new Map<string, { name: string; type: string; status: string }>();
  partners.forEach((partner) => endpoints.set(partner._id, { name: partner.name, type: partner.type, status: partner.status }));
  relationships.forEach((relationship) => {
    endpoints.set(relationship.sourcePartnerId._id, {
      name: relationship.sourcePartnerId.name, type: relationship.sourcePartnerId.type, status: relationship.sourcePartnerId.status,
    });
    endpoints.set(relationship.targetPartnerId._id, {
      name: relationship.targetPartnerId.name, type: relationship.targetPartnerId.type, status: relationship.targetPartnerId.status,
    });
  });
  const ordered = [...endpoints.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)).slice(0, 18);
  const nodes: NetworkNode[] = ordered.map(([id, partner], index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(ordered.length, 1);
    return { id, ...partner, x: 400 + Math.cos(angle) * (ordered.length > 8 ? 300 : 245), y: 215 + Math.sin(angle) * 145 };
  });
  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges: NetworkEdge[] = relationships
    .filter((item) => visibleIds.has(item.sourcePartnerId._id) && visibleIds.has(item.targetPartnerId._id))
    .map((item) => ({ id: item._id, source: item.sourcePartnerId._id, target: item.targetPartnerId._id, type: item.type, status: item.status }));
  return { nodes, edges, truncated: endpoints.size > nodes.length };
}

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
  const [networkPartners, setNetworkPartners] = useState<Partner[]>(partners);
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
      const result = await listPartnerRelationships(organizationId, {
        partnerId: filterPartner, type: filterType, status: filterStatus,
      });
      setRelationships(result);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [organizationId, filterPartner, filterType, filterStatus]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    void listPartners(organizationId).then((result) => {
      if (active) setNetworkPartners(result);
    }).catch(() => {
      if (active) setNetworkPartners(partners);
    });
    return () => { active = false; };
  }, [organizationId, partners]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourcePartnerId || !targetPartnerId || sourcePartnerId === targetPartnerId) {
      setError('Choose two different partner records.');
      return;
    }
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
      setError('The effective-to date must be on or after the effective-from date.');
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

  const activePartners = networkPartners.filter((partner) => partner.status === 'active');
  const network = useMemo(() => buildPartnerNetworkLayout(networkPartners, relationships), [networkPartners, relationships]);
  const nodeById = useMemo(() => new Map(network.nodes.map((node) => [node.id, node])), [network.nodes]);
  const relationshipLabel = (value: string) => relationshipTypes.find((item) => item.value === value)?.label || value;
  function activateNode(partnerId: string) { setFilterPartner(partnerId); }
  function handleNodeKey(event: KeyboardEvent<SVGGElement>, partnerId: string) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateNode(partnerId); }
  }

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
      <label>Partner<select value={filterPartner} onChange={(event) => setFilterPartner(event.target.value)}><option value="">All partners</option>{networkPartners.map((partner) => <option key={partner._id} value={partner._id}>{partner.name}</option>)}</select></label>
      <label>Relationship type<select value={filterType} onChange={(event) => setFilterType(event.target.value as PartnerRelationshipType | '')}><option value="">All relationship types</option>{relationshipTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Status<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as PartnerRelationshipStatus | '')}><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></label>
      <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
    </div>
    {!loading && relationships.length > 0 && <div className="partner-network-panel">
      <div className="network-panel-heading"><div><h4>Network map</h4><p>Select a partner node to filter the relationship records below.</p></div><span>{network.nodes.length} partners · {network.edges.length} links</span></div>
      <div className="partner-network-scroll">
        <svg className="partner-network-svg" viewBox="0 0 800 430" role="img" aria-labelledby="partner-network-title partner-network-description">
          <title id="partner-network-title">Partner relationship network</title>
          <desc id="partner-network-description">A directed map of partners and their active or inactive connections. Select a node to filter the relationship list.</desc>
          <defs><marker id="partner-network-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#80e0bd" /></marker></defs>
          {network.edges.map((edge) => {
            const source = nodeById.get(edge.source); const target = nodeById.get(edge.target);
            if (!source || !target) return null;
            return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={edge.status === 'active' ? 'network-edge' : 'network-edge network-edge-inactive'} markerEnd="url(#partner-network-arrow)" />;
          })}
          {network.nodes.map((node) => <g key={node.id} className="network-node" role="button" tabIndex={0} aria-label={'Filter relationships for ' + node.name} onClick={() => activateNode(node.id)} onKeyDown={(event) => handleNodeKey(event, node.id)}>
            <circle cx={node.x} cy={node.y} r="25" />
            <text x={node.x} y={node.y + 4} textAnchor="middle">{node.name.slice(0, 2).toUpperCase()}</text>
            <text className="network-node-label" x={node.x} y={node.y + 43} textAnchor="middle">{node.name.length > 22 ? node.name.slice(0, 20) + '…' : node.name}</text>
          </g>)}
        </svg>
      </div>
      <div className="network-legend"><span><i className="network-legend-line" /> Active relationship</span><span><i className="network-legend-line network-legend-inactive" /> Inactive relationship</span><span>Choose a node to filter</span></div>
      {network.truncated && <p className="network-truncated">Showing the first 18 partners alphabetically. Use the partner filter to inspect a specific connection.</p>}
    </div>}
    {loading ? <div className="relationship-empty" role="status">Loading partner relationships…</div> : relationships.length === 0 ? <div className="relationship-empty"><strong>No relationships found</strong><span>{filterPartner || filterType || filterStatus === 'inactive' ? 'Try changing your filters.' : 'Create the first connection between two active partners.'}</span></div> :
      <div className="relationship-list">{relationships.map((relationship) => {
        const source = relationship.sourcePartnerId.name;
        const target = relationship.targetPartnerId.name;
        return <article className="relationship-card" key={relationship._id}>
          <div className="relationship-flow"><span className="relationship-node">{source || 'Partner'}</span><span className="relationship-arrow" aria-hidden="true">→</span><span className="relationship-node">{target || 'Partner'}</span></div>
          <div className="relationship-meta"><span className="relationship-kind">{relationshipLabel(relationship.type)}</span><span className={'partner-status ' + (relationship.status === 'active' ? 'status-active' : 'status-archived')}>{relationship.status}</span></div>
          {relationship.description && <p className="relationship-note">{relationship.description}</p>}
          <p className="relationship-dates">Effective: {formatDate(relationship.effectiveFrom)} – {formatDate(relationship.effectiveTo)}</p>
          {canManage && <button className="text-action" type="button" disabled={busy} onClick={() => void changeStatus(relationship)}>{relationship.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>}
        </article>;
      })}</div>}
    {!canManage && <p className="partner-permission-note">You have read-only access to this organization’s partner relationships.</p>}
  </section>;
}
