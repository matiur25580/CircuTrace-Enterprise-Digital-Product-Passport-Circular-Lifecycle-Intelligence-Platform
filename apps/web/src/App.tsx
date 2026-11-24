// Keep the landing-page capability highlights together as data for consistent rendering.
const capabilities = [
  { number: '01', title: 'Product passports', description: 'A structured identity for product attributes, disclosures, and lifecycle history.' },
  { number: '02', title: 'Verified provenance', description: 'Connect components, materials, suppliers, and supporting evidence.' },
  { number: '03', title: 'Circular operations', description: 'Make repair, reuse, refurbishment, and recovery part of the product record.' },
];

export default function App() {
  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="CircuTrace home">
          <span className="brand-mark" aria-hidden="true">C</span><span>CircuTrace</span>
        </a>
        <span className="environment-label">FOUNDATION PREVIEW</span>
      </nav>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">DIGITAL PRODUCT PASSPORT · CIRCULAR INTELLIGENCE</p>
        <h1 id="hero-title">Every product has a story.<br /><span>Make yours traceable.</span></h1>
        <p className="hero-copy">A connected foundation for product provenance, trusted evidence, and circular lifecycle operations — from material origin to next life.</p>
        <div className="hero-actions">
          <a className="primary-link" href="#capabilities">Explore the platform <span aria-hidden="true">↗</span></a>
          <span className="status"><span className="status-dot" /> Platform foundation in progress</span>
        </div>
      </section>
      <section className="capabilities" id="capabilities" aria-labelledby="capabilities-title">
        <div className="section-heading">
          <p className="eyebrow">THE PLATFORM VISION</p>
          <h2 id="capabilities-title">One lifecycle. Connected intelligence.</h2>
        </div>
        <div className="capability-grid">
          {capabilities.map((item) => (
            <article className="capability-card" key={item.number}>
              <span className="card-number">{item.number}</span>
              <h3>{item.title}</h3><p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="footer">
        <span>CircuTrace · Enterprise Product Lifecycle Intelligence</span>
        <span>Early foundation build · Not a compliance certification</span>
      </footer>
    </main>
  );
}
