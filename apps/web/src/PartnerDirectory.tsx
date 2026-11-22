import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ApiClientError, createPartner, listPartners, updatePartnerStatus,
  type Partner, type PartnerInput, type PartnerStatus, type PartnerType,
} from './lib/api';

const partnerTypes: { value: PartnerType; label: string }[] = [
  { value: 'supplier', label: 'Supplier' }, { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'brand', label: 'Brand' }, { value: 'logistics', label: 'Logistics' },
  { value: 'service_provider', label: 'Service provider' }, { value: 'recycler', label: 'Recycler' },
  { value: 'other', label: 'Other' },
];
function message(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Could not connect to the partner service. Try again.';
}
export function PartnerDirectory({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PartnerType | ''>('');
  const [status, setStatus] = useState<PartnerStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [name, setName] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('supplier');
  const [legalName, setLegalName] = useState('');
  const [website, setWebsite] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [externalReference, setExternalReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPartners(await listPartners(organizationId, { search, type, status })); }
    catch (cause) { setError(message(cause)); }
    finally { setLoading(false); }
  }, [organizationId, search, type, status]);
  useEffect(() => { void load(); }, [load]);

  function resetForm() {
    setName(''); setPartnerType('supplier'); setLegalName(''); setWebsite('');
    setCountryCode(''); setContactName(''); setContactEmail(''); setExternalReference('');
    setShowForm(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const input: PartnerInput = {
      name, type: partnerType,
      ...(legalName.trim() ? { legalName: legalName.trim() } : {}),
      ...(website.trim() ? { website: website.trim() } : {}),
      ...(countryCode.trim() ? { countryCode: countryCode.trim().toUpperCase() } : {}),
      ...(contactName.trim() || contactEmail.trim() ? { contact: { ...(contactName.trim() ? { name: contactName.trim() } : {}), ...(contactEmail.trim() ? { email: contactEmail.trim() } : {}) } } : {}),
      ...(externalReference.trim() ? { externalReference: externalReference.trim() } : {}),
    };
    try { const created = await createPartner(organizationId, input); setPartners((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name))); resetForm(); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  async function changeStatus(partner: Partner, next: PartnerStatus) {
    setBusy(true); setError('');
    try {
      const updated = await updatePartnerStatus(organizationId, partner._id, next);
      setPartners((items) => items.map((item) => item._id === updated._id ? updated : item).filter((item) => !status || item.status === status));
      if (selected?._id === updated._id) setSelected(updated);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }

  return <section id="partners" className="partner-directory" aria-labelledby="partners-title">
    <div className="partner-heading"><div><p className="eyebrow">SUPPLY CHAIN RELATIONSHIPS</p><h2 id="partners-title">Partner network</h2><p className="partner-intro">Manage the organizations connected to your product lifecycle.</p></div>{canManage && <button className="primary-button" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Close form' : '+ Add partner'}</button>}</div>
    {error && <div className="inline-alert" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    {showForm && canManage && <form className="partner-form" onSubmit={submit}>
      <h3>Add a partner</h3>
      <div className="partner-form-grid">
        <label>Partner name<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={160} required /></label>
        <label>Partner type<select value={partnerType} onChange={(e) => setPartnerType(e.target.value as PartnerType)}>{partnerTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Legal name<input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={200} /></label>
        <label>Website<input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" /></label>
        <label>Country code<input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} pattern="[A-Za-z]{2}" maxLength={2} placeholder="IN" /></label>
        <label>External reference<input value={externalReference} onChange={(e) => setExternalReference(e.target.value)} maxLength={120} /></label>
        <label>Contact name<input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={120} /></label>
        <label>Contact email<input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={254} /></label>
      </div>
      <div className="partner-form-actions"><button className="secondary-button" type="button" onClick={resetForm}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save partner'}</button></div>
    </form>}
    <div className="partner-filters">
      <label>Search partners<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by partner name" /></label>
      <label>Partner type<select value={type} onChange={(e) => setType(e.target.value as PartnerType | '')}><option value="">All types</option>{partnerTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as PartnerStatus | '')}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></label>
      <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
    </div>
    {loading ? <div className="partner-empty" role="status">Loading organization partners…</div> : partners.length === 0 ? <div className="partner-empty"><span aria-hidden="true">◎</span><h3>No partners found</h3><p>{search || type || status ? 'Try changing your search or filters.' : 'Add your first supplier, manufacturer, or circularity partner to begin.'}</p></div> :
      <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th scope="col">Partner</th><th scope="col">Type</th><th scope="col">Country</th><th scope="col">Status</th><th scope="col">Contact</th><th scope="col">Actions</th></tr></thead><tbody>{partners.map((partner) => <tr key={partner._id}><td><button className="partner-name-button" type="button" onClick={() => setSelected(partner)}>{partner.name}</button><small>{partner.legalName || partner.externalReference || 'Partner record'}</small></td><td>{partnerTypes.find((item) => item.value === partner.type)?.label || partner.type}</td><td>{partner.countryCode || '—'}</td><td><span className={'partner-status status-' + partner.status}>{partner.status}</span></td><td>{partner.contact?.name || partner.contact?.email || '—'}</td><td><button className="text-action" type="button" onClick={() => setSelected(partner)}>View</button>{canManage && partner.status !== 'archived' && <button className="text-action" type="button" disabled={busy} onClick={() => void changeStatus(partner, partner.status === 'active' ? 'suspended' : 'active')}>{partner.status === 'active' ? 'Suspend' : 'Reactivate'}</button>}</td></tr>)}</tbody></table></div>}
    {selected && <div className="partner-detail-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="partner-detail" role="dialog" aria-modal="true" aria-labelledby="partner-detail-title" onClick={(event) => event.stopPropagation()}><button className="detail-close" type="button" onClick={() => setSelected(null)} aria-label="Close partner details">×</button><p className="eyebrow">PARTNER PROFILE</p><h2 id="partner-detail-title">{selected.name}</h2><p className="partner-detail-type">{partnerTypes.find((item) => item.value === selected.type)?.label} · {selected.status}</p><dl><dt>Legal name</dt><dd>{selected.legalName || '—'}</dd><dt>Website</dt><dd>{selected.website || '—'}</dd><dt>Country</dt><dd>{selected.countryCode || '—'}</dd><dt>External reference</dt><dd>{selected.externalReference || '—'}</dd><dt>Contact</dt><dd>{selected.contact?.name || '—'} {selected.contact?.email ? `· ${selected.contact.email}` : ''}</dd><dt>Created</dt><dd>{new Date(selected.createdAt).toLocaleDateString()}</dd></dl></section></div>}
  </section>;
}
