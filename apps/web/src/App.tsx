import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ApiClientError, createOrganization, listOrganizations, login, logout, refreshSession, register,
  type AuthUser, type Organization,
} from './lib/api';

const navigation = [
  { id: 'overview', label: 'Overview', icon: '◫', group: 'WORKSPACE' },
  { id: 'products', label: 'Product passports', icon: '▤', group: 'WORKSPACE' },
  { id: 'partners', label: 'Partner network', icon: '◎', group: 'WORKSPACE' },
  { id: 'lifecycle', label: 'Lifecycle events', icon: '↗', group: 'WORKSPACE' },
  { id: 'evidence', label: 'Evidence vault', icon: '▧', group: 'GOVERNANCE' },
  { id: 'compliance', label: 'Compliance', icon: '◇', group: 'GOVERNANCE' },
  { id: 'settings', label: 'Settings', icon: '⚙', group: 'ADMINISTRATION' },
];
const metrics = [
  { label: 'Products tracked', note: 'Product catalog integration pending', icon: '▤' },
  { label: 'Active partners', note: 'Partner network integration pending', icon: '◎' },
  { label: 'Lifecycle events', note: 'Lifecycle API integration pending', icon: '↗' },
  { label: 'Evidence records', note: 'Evidence vault integration pending', icon: '▧' },
];
const stages = [
  { label: 'Material origin', detail: 'Source and composition' },
  { label: 'Manufacturing', detail: 'Build and assembly' },
  { label: 'Distribution', detail: 'Movement and custody' },
  { label: 'Use & repair', detail: 'Service history' },
  { label: 'Next life', detail: 'Reuse and recovery' },
];
type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unavailable';
function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) return error.message;
  return 'The API could not be reached. Check that the CircuTrace API and database are running, then retry.';
}
function Brand() {
  return <a className="brand" href="#overview" aria-label="CircuTrace dashboard home"><span className="brand-mark" aria-hidden="true">C</span><span>CircuTrace</span></a>;
}
export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(displayName, email, password);
      onAuthenticated(result.user);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title"><Brand /><p className="eyebrow">SECURE WORKSPACE ACCESS</p><h1 id="auth-title">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1><p className="auth-description">Sign in to access your organization’s product passport workspace.</p>
    <div className="auth-tabs" role="group" aria-label="Authentication method"><button type="button" className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button type="button" className={mode === 'register' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('register'); setError(''); }}>Create account</button></div>
    <form className="auth-form" onSubmit={submit}>{mode === 'register' && <label>Display name<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required /></label>}<label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label><label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'register' ? 12 : 1} maxLength={72} required />{mode === 'register' && <small>Use at least 12 characters.</small>}</label>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in securely' : 'Create account'}</button></form>
    <p className="auth-security-note">Refresh sessions are held in an HttpOnly cookie. Access tokens remain in memory and are not stored in browser storage.</p>
  </section></main>;
}
export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [organizationBusy, setOrganizationBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const selectedOrganization = organizations.find((item) => item._id === selectedOrganizationId) ?? null;
  const filteredNavigation = useMemo(() => navigation.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  async function loadOrganizations(preferredId?: string) {
    const items = await listOrganizations();
    setOrganizations(items);
    const rememberedId = preferredId || window.localStorage.getItem('circutrace.activeOrganizationId') || '';
    const activeId = items.some((item) => item._id === rememberedId) ? rememberedId : items[0]?._id || '';
    setSelectedOrganizationId(activeId);
    if (activeId) window.localStorage.setItem('circutrace.activeOrganizationId', activeId);
    else window.localStorage.removeItem('circutrace.activeOrganizationId');
  }
  useEffect(() => {
    let mounted = true;
    void refreshSession().then(async (result) => {
      if (!mounted) return;
      setUser(result.user);
      await loadOrganizations();
      if (mounted) setAuthStatus('authenticated');
    }).catch((error: unknown) => {
      if (!mounted) return;
      if (error instanceof ApiClientError && error.status === 401) setAuthStatus('anonymous');
      else { setWorkspaceError(errorMessage(error)); setAuthStatus('unavailable'); }
    });
    return () => { mounted = false; };
  }, []);
  function handleAuthenticated(nextUser: AuthUser) {
    setUser(nextUser); setWorkspaceError('');
    void loadOrganizations().then(() => setAuthStatus('authenticated')).catch((error: unknown) => { setWorkspaceError(errorMessage(error)); setAuthStatus('authenticated'); });
  }
  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setOrganizationBusy(true); setWorkspaceError('');
    try {
      const organization = await createOrganization({ name: organizationName });
      setOrganizations((current) => [...current, organization].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedOrganizationId(organization._id);
      window.localStorage.setItem('circutrace.activeOrganizationId', organization._id);
      setOrganizationName(''); setShowCreateOrganization(false);
    } catch (error) { setWorkspaceError(errorMessage(error)); }
    finally { setOrganizationBusy(false); }
  }
  async function handleLogout() {
    try { await logout(); } catch (error) { setWorkspaceError(errorMessage(error)); }
    setUser(null); setOrganizations([]); setSelectedOrganizationId(''); setAuthStatus('anonymous');
    window.localStorage.removeItem('circutrace.activeOrganizationId');
  }
  function selectOrganization(id: string) {
    setSelectedOrganizationId(id);
    if (id) window.localStorage.setItem('circutrace.activeOrganizationId', id);
    else window.localStorage.removeItem('circutrace.activeOrganizationId');
  }
  const navigate = (id: string) => { setActiveSection(id); setMobileNavOpen(false); };
  if (authStatus === 'loading') return <main className="auth-page"><div className="auth-loading"><span className="loading-spinner" />Restoring your secure session…</div></main>;
  if (authStatus === 'anonymous' || authStatus === 'unavailable') return <><AuthScreen onAuthenticated={handleAuthenticated} />{authStatus === 'unavailable' && <div className="connection-banner" role="alert"><span>{workspaceError || 'Unable to restore your session.'}</span><button type="button" onClick={() => { setWorkspaceError(''); setAuthStatus('loading'); void refreshSession().then(async (result) => { setUser(result.user); await loadOrganizations(); setAuthStatus('authenticated'); }).catch((error: unknown) => { setWorkspaceError(errorMessage(error)); setAuthStatus(error instanceof ApiClientError && error.status === 401 ? 'anonymous' : 'unavailable'); }); }}>Retry connection</button></div>}</>;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={'sidebar ' + (mobileNavOpen ? 'sidebar-open' : '')} aria-label="Workspace navigation">
        <div className="sidebar-brand"><Brand /><button className="icon-button mobile-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">×</button></div>
        <div className="workspace-switcher"><span className="workspace-avatar" aria-hidden="true">{selectedOrganization?.name.slice(0,1).toUpperCase() || 'W'}</span><span className="workspace-copy"><strong>{selectedOrganization?.name || 'No organization'}</strong><small>{selectedOrganization ? `Your role: ${selectedOrganization.role}` : 'Organization context'}</small></span><span className="switcher-caret" aria-hidden="true">⌄</span></div>
        {organizations.length > 1 && <label className="organization-select-label" htmlFor="organization-select">ACTIVE ORGANIZATION<select id="organization-select" value={selectedOrganizationId} onChange={(event) => selectOrganization(event.target.value)}>{organizations.map((organization) => <option key={organization._id} value={organization._id}>{organization.name}</option>)}</select></label>}
        <label className="nav-search-label" htmlFor="navigation-search">QUICK FIND</label>
        <input id="navigation-search" className="nav-search" type="search" placeholder="Find a page..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <nav className="primary-navigation" aria-label="Primary">{['WORKSPACE','GOVERNANCE','ADMINISTRATION'].map((group) => { const items = filteredNavigation.filter((item) => item.group === group); if (!items.length) return null; return <div className="nav-group" key={group}><p className="nav-group-label">{group}</p>{items.map((item) => <a key={item.id} href={'#' + item.id} className={'nav-link ' + (activeSection === item.id ? 'nav-link-active' : '')} aria-current={activeSection === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></a>)}</div>; })}
          {filteredNavigation.length === 0 && <p className="nav-empty">No pages match “{query}”.</p>}</nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon" aria-hidden="true">?</span><div><strong>Need a hand?</strong><p>Explore the platform guide as your workspace takes shape.</p></div></div><div className="profile-row"><span className="profile-avatar" aria-hidden="true">{user?.displayName.split(/\s+/).map((part) => part[0]).slice(0,2).join('').toUpperCase()}</span><span><strong>{user?.displayName}</strong><small>{user?.email}</small></span><button className="sign-out-button" type="button" onClick={handleLogout}>Sign out</button></div></div>
      </aside>
      {mobileNavOpen && <button className="mobile-backdrop" type="button" aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} />}
      <div className="main-column">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">☰</button><span className="breadcrumb-muted">{selectedOrganization?.name || 'Workspace'}</span><span className="breadcrumb-divider">/</span><strong>Overview</strong></div><div className="topbar-actions"><span className="environment-pill"><span className="environment-dot" /> AUTHENTICATED WORKSPACE</span><span className="topbar-avatar" aria-label="Account">{user?.displayName.split(/\s+/).map((part) => part[0]).slice(0,2).join('').toUpperCase()}</span></div></header>
        <main id="main-content" className="dashboard-content">
          <section id="overview" className="welcome-section" aria-labelledby="welcome-title"><div><p className="eyebrow">YOUR ORGANIZATION WORKSPACE</p><h1 id="welcome-title">Good to see you, {user?.displayName.split(' ')[0]}.</h1><p className="welcome-copy">A clear view of your product lifecycle intelligence starts here.</p></div><div className="workspace-status"><span className="status-indicator" /> Secure session active</div></section>
          {workspaceError && <div className="inline-alert" role="alert">{workspaceError}<button type="button" onClick={() => setWorkspaceError('')} aria-label="Dismiss message">×</button></div>}
          {!organizations.length ? <section className="setup-banner organization-setup"><div className="setup-icon" aria-hidden="true">✳</div><div className="setup-message"><p className="setup-kicker">FIRST WORKSPACE STEP</p><h2 id="setup-title">Create your first organization</h2><p>Organizations isolate members and workspace access. You will become the owner of the organization you create.</p><form className="create-organization-form" onSubmit={handleCreateOrganization}><input aria-label="Organization name" placeholder="e.g. Acme Manufacturing" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} minLength={2} maxLength={160} required /><button className="primary-button" type="submit" disabled={organizationBusy}>{organizationBusy ? 'Creating…' : 'Create organization'}</button></form></div></section> : <section className="setup-banner"><div className="setup-icon" aria-hidden="true">✳</div><div className="setup-message"><p className="setup-kicker">ACTIVE ORGANIZATION</p><h2>{selectedOrganization?.name}</h2><p>You are signed in as {user?.email}. Your organization role is <strong>{selectedOrganization?.role}</strong>. Workspace data is always requested through organization-scoped APIs.</p></div><span className="setup-badge">MEMBERSHIP VERIFIED</span></section>}
          {organizations.length > 0 && <div className="organization-toolbar"><div><span className="eyebrow">ORGANIZATION CONTEXT</span><p>{organizations.length} organization{organizations.length === 1 ? '' : 's'} available to this account</p></div><button className="secondary-button" type="button" onClick={() => setShowCreateOrganization((value) => !value)}>{showCreateOrganization ? 'Cancel' : '+ New organization'}</button></div>}
          {showCreateOrganization && <form className="create-organization-inline" onSubmit={handleCreateOrganization}><label htmlFor="new-organization-name">Organization name</label><input id="new-organization-name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} minLength={2} maxLength={160} required placeholder="Organization name" /><button className="primary-button" type="submit" disabled={organizationBusy}>{organizationBusy ? 'Creating…' : 'Create organization'}</button></form>}
          <section className="metric-section" aria-labelledby="metrics-title"><div className="section-title-row"><div><p className="eyebrow">WORKSPACE CAPABILITIES</p><h2 id="metrics-title">Operational snapshot</h2></div><span className="data-state">Domain data integration pending</span></div><div className="metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon" aria-hidden="true">{metric.icon}</span></div><p className="metric-value">—</p><p className="metric-note">{metric.note}</p></article>)}</div></section>
          <div className="dashboard-grid"><section className="panel lifecycle-panel" id="lifecycle" aria-labelledby="lifecycle-title"><div className="panel-heading"><div><p className="eyebrow">END-TO-END TRACEABILITY</p><h2 id="lifecycle-title">Product lifecycle</h2></div><span className="panel-tag">PLATFORM MODEL</span></div><p className="panel-description">A connected product record follows materials and components through every stage of its useful life.</p><ol className="lifecycle-list">{stages.map((stage, index) => <li className="lifecycle-stage" key={stage.label}><span className="stage-number">{String(index + 1).padStart(2, '0')}</span><span className="stage-copy"><strong>{stage.label}</strong><small>{stage.detail}</small></span></li>)}</ol></section><section className="panel activity-panel" id="products" aria-labelledby="activity-title"><div className="panel-heading"><div><p className="eyebrow">YOUR AUDIT TRAIL</p><h2 id="activity-title">Recent activity</h2></div><span className="activity-count">NOT CONNECTED</span></div><div className="empty-state"><span className="empty-state-icon" aria-hidden="true">◷</span><h3>Activity feed is the next integration</h3><p>Product, partner, and lifecycle events will appear after their domain APIs are implemented.</p></div></section></div>
          <section className="lower-grid" aria-label="Platform areas"><article className="area-card" id="partners"><span className="area-icon" aria-hidden="true">◎</span><div><h3>Partner network</h3><p>Build trusted connections across your supply chain.</p></div><span className="area-state">PLANNED</span></article><article className="area-card" id="evidence"><span className="area-icon" aria-hidden="true">▧</span><div><h3>Evidence vault</h3><p>Keep certificates and provenance evidence connected.</p></div><span className="area-state">PLANNED</span></article><article className="area-card" id="compliance"><span className="area-icon" aria-hidden="true">◇</span><div><h3>Compliance workspace</h3><p>Review claims and supporting documentation.</p></div><span className="area-state">PLANNED</span></article><article className="area-card" id="settings"><span className="area-icon" aria-hidden="true">⚙</span><div><h3>Organization settings</h3><p>Manage workspace access and configuration.</p></div><span className="area-state">API AVAILABLE</span></article></section>
          <footer className="dashboard-footer"><span>CircuTrace · Digital Product Passport & Circular Lifecycle Intelligence</span><span>Authenticated workspace · No fabricated operational metrics</span></footer>
        </main>
      </div>
    </div>
  );
}
