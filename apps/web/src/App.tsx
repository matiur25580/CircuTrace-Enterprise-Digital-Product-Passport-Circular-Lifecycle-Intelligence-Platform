import { useMemo, useState } from 'react';

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
  { label: 'Products tracked', value: '—', note: 'Awaiting workspace data', icon: '▤' },
  { label: 'Active partners', value: '—', note: 'Supplier network not connected', icon: '◎' },
  { label: 'Lifecycle events', value: '—', note: 'No events recorded yet', icon: '↗' },
  { label: 'Evidence records', value: '—', note: 'Evidence vault is empty', icon: '▧' },
];
const stages = [
  { label: 'Material origin', detail: 'Source and composition' },
  { label: 'Manufacturing', detail: 'Build and assembly' },
  { label: 'Distribution', detail: 'Movement and custody' },
  { label: 'Use & repair', detail: 'Service history' },
  { label: 'Next life', detail: 'Reuse and recovery' },
];
function Brand() {
  return <a className="brand" href="#overview" aria-label="CircuTrace dashboard home"><span className="brand-mark" aria-hidden="true">C</span><span>CircuTrace</span></a>;
}
export default function App() {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const filteredNavigation = useMemo(() => navigation.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const navigate = (id: string) => { setActiveSection(id); setMobileNavOpen(false); };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={"sidebar " + (mobileNavOpen ? 'sidebar-open' : '')} aria-label="Workspace navigation">
        <div className="sidebar-brand"><Brand /><button className="icon-button mobile-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">×</button></div>
        <div className="workspace-switcher"><span className="workspace-avatar" aria-hidden="true">W</span><span className="workspace-copy"><strong>Workspace</strong><small>Organization context</small></span><span className="switcher-caret" aria-hidden="true">⌄</span></div>
        <label className="nav-search-label" htmlFor="navigation-search">QUICK FIND</label>
        <input id="navigation-search" className="nav-search" type="search" placeholder="Find a page..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <nav className="primary-navigation" aria-label="Primary">
          {['WORKSPACE', 'GOVERNANCE', 'ADMINISTRATION'].map((group) => {
            const items = filteredNavigation.filter((item) => item.group === group);
            if (!items.length) return null;
            return <div className="nav-group" key={group}><p className="nav-group-label">{group}</p>{items.map((item) => (
              <a key={item.id} href={"#" + item.id} className={"nav-link " + (activeSection === item.id ? 'nav-link-active' : '')} aria-current={activeSection === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              </a>
            ))}</div>;
          })}
          {filteredNavigation.length === 0 && <p className="nav-empty">No pages match “{query}”.</p>}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon" aria-hidden="true">?</span><div><strong>Need a hand?</strong><p>Explore the platform guide as your workspace takes shape.</p></div></div><div className="profile-row"><span className="profile-avatar" aria-hidden="true">CT</span><span><strong>CircuTrace user</strong><small>Account preview</small></span><span className="profile-menu" aria-hidden="true">···</span></div></div>
      </aside>
      {mobileNavOpen && <button className="mobile-backdrop" type="button" aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} />}
      <div className="main-column">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">☰</button><span className="breadcrumb-muted">Workspace</span><span className="breadcrumb-divider">/</span><strong>Overview</strong></div><div className="topbar-actions"><span className="environment-pill"><span className="environment-dot" /> FOUNDATION PREVIEW</span><button className="icon-button notification-button" type="button" aria-label="Notifications" title="Notifications">♧<span className="notification-dot" /></button><span className="topbar-avatar" aria-label="Account">CT</span></div></header>
        <main id="main-content" className="dashboard-content">
          <section id="overview" className="welcome-section" aria-labelledby="welcome-title"><div><p className="eyebrow">MONDAY, YOUR WORKSPACE AT A GLANCE</p><h1 id="welcome-title">Good to see you.</h1><p className="welcome-copy">A clear view of your product lifecycle intelligence starts here.</p></div><div className="workspace-status"><span className="status-indicator" /> Workspace setup in progress</div></section>
          <section className="setup-banner" id="workspace" aria-labelledby="setup-title"><div className="setup-icon" aria-hidden="true">✳</div><div className="setup-message"><p className="setup-kicker">YOUR NEXT STEP</p><h2 id="setup-title">Connect your organization to get started</h2><p>Sign in and select an organization to load tenant-scoped product, partner, lifecycle, and evidence data. This preview does not display fabricated business metrics.</p></div><span className="setup-badge">SETUP REQUIRED</span></section>
          <section className="metric-section" aria-labelledby="metrics-title"><div className="section-title-row"><div><p className="eyebrow">LIVE WORKSPACE SIGNALS</p><h2 id="metrics-title">Operational snapshot</h2></div><span className="data-state">No workspace connected</span></div><div className="metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon" aria-hidden="true">{metric.icon}</span></div><p className="metric-value">{metric.value}</p><p className="metric-note">{metric.note}</p></article>)}</div></section>
          <div className="dashboard-grid">
            <section className="panel lifecycle-panel" id="lifecycle" aria-labelledby="lifecycle-title"><div className="panel-heading"><div><p className="eyebrow">END-TO-END TRACEABILITY</p><h2 id="lifecycle-title">Product lifecycle</h2></div><span className="panel-tag">PLATFORM MODEL</span></div><p className="panel-description">A connected product record follows materials and components through every stage of its useful life.</p><ol className="lifecycle-list">{stages.map((stage, index) => <li className="lifecycle-stage" key={stage.label}><span className="stage-number">{String(index + 1).padStart(2, '0')}</span><span className="stage-copy"><strong>{stage.label}</strong><small>{stage.detail}</small></span></li>)}</ol></section>
            <section className="panel activity-panel" id="products" aria-labelledby="activity-title"><div className="panel-heading"><div><p className="eyebrow">YOUR AUDIT TRAIL</p><h2 id="activity-title">Recent activity</h2></div><span className="activity-count">0 EVENTS</span></div><div className="empty-state"><span className="empty-state-icon" aria-hidden="true">◷</span><h3>No activity to show yet</h3><p>Product registrations, partner updates, and lifecycle events will appear here once your organization is connected.</p></div></section>
          </div>
          <section className="lower-grid" aria-label="Platform areas">
            <article className="area-card" id="partners"><span className="area-icon" aria-hidden="true">◎</span><div><h3>Partner network</h3><p>Build trusted connections across your supply chain.</p></div><span className="area-state">COMING NEXT</span></article>
            <article className="area-card" id="evidence"><span className="area-icon" aria-hidden="true">▧</span><div><h3>Evidence vault</h3><p>Keep certificates and provenance evidence connected.</p></div><span className="area-state">PLANNED</span></article>
            <article className="area-card" id="compliance"><span className="area-icon" aria-hidden="true">◇</span><div><h3>Compliance workspace</h3><p>Review claims and supporting documentation.</p></div><span className="area-state">PLANNED</span></article>
            <article className="area-card" id="settings"><span className="area-icon" aria-hidden="true">⚙</span><div><h3>Organization settings</h3><p>Manage workspace access and configuration.</p></div><span className="area-state">AVAILABLE VIA API</span></article>
          </section>
          <footer className="dashboard-footer"><span>CircuTrace · Digital Product Passport & Circular Lifecycle Intelligence</span><span>Preview environment · Not a compliance certification</span></footer>
        </main>
      </div>
    </div>
  );
}
