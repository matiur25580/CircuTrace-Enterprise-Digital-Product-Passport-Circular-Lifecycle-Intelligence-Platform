import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiClientError, createProduct, createProductComponent, createProductMaterial, listProductComponents, listProductMaterials, listProducts, type MaterialCategory, type Product, type ProductComponent, type ProductMaterial, type ProductStatus } from './lib/api';

const categories: MaterialCategory[] = ['metal','plastic','textile','chemical','wood','glass','paper','composite','other'];
const errorText = (error: unknown) => error instanceof ApiClientError ? error.message : 'Could not connect to the product registry. Try again.';

export function ProductCatalogue({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [products,setProducts]=useState<Product[]>([]);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState<ProductStatus|''>('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [sku,setSku]=useState(''),[name,setName]=useState(''),[category,setCategory]=useState(''),[description,setDescription]=useState('');
  const [selected,setSelected]=useState<Product|null>(null);
  const [components,setComponents]=useState<ProductComponent[]>([]);
  const [materials,setMaterials]=useState<Record<string,ProductMaterial[]>>({});
  const [componentForm,setComponentForm]=useState(false),[componentCode,setComponentCode]=useState(''),[componentName,setComponentName]=useState(''),[quantity,setQuantity]=useState('1'),[unit,setUnit]=useState('piece');
  const [materialFor,setMaterialFor]=useState(''),[materialName,setMaterialName]=useState(''),[materialCategory,setMaterialCategory]=useState<MaterialCategory>('textile'),[mass,setMass]=useState(''),[massUnit,setMassUnit]=useState<'g'|'kg'|'mg'>('g'),[recycled,setRecycled]=useState(''),[origin,setOrigin]=useState('');

  const load=useCallback(async()=>{setLoading(true);setError('');try{setProducts(await listProducts(organizationId,{search,status}));}catch(e){setError(errorText(e));}finally{setLoading(false);}},[organizationId,search,status]);
  useEffect(()=>{void load();},[load]);
  async function openProduct(product:Product){
    setSelected(product);setError('');
    try{const rows=await listProductComponents(organizationId,product._id);setComponents(rows);const pairs=await Promise.all(rows.map(async c=>[c._id,await listProductMaterials(organizationId,product._id,c._id)] as const));setMaterials(Object.fromEntries(pairs));}
    catch(e){setError(errorText(e));}
  }
  async function submitProduct(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    try{const p=await createProduct(organizationId,{sku,name,...(category.trim()?{category:category.trim()}:{}),...(description.trim()?{description:description.trim()}:{})});setProducts(x=>[...x,p].sort((a,b)=>a.name.localeCompare(b.name)));setShowForm(false);setSku('');setName('');setCategory('');setDescription('');await openProduct(p);}
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function submitComponent(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!selected)return;setBusy(true);
    try{const c=await createProductComponent(organizationId,selected._id,{code:componentCode,name:componentName,quantity:Number(quantity),unit});setComponents(x=>[...x,c]);setMaterials(x=>({...x,[c._id]:[]}));setComponentForm(false);setComponentCode('');setComponentName('');}
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function submitMaterial(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!selected||!materialFor)return;setBusy(true);
    try{const m=await createProductMaterial(organizationId,selected._id,materialFor,{name:materialName,category:materialCategory,mass:Number(mass),massUnit,...(recycled.trim()?{recycledContentPct:Number(recycled)}:{}),...(origin.trim()?{originCountryCode:origin.toUpperCase()}:{})});setMaterials(x=>({...x,[materialFor]:[...(x[materialFor]||[]),m]}));setMaterialName('');setMass('');setRecycled('');setOrigin('');setMaterialFor('');}
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  }

  return <section id="products" className="product-catalogue" aria-labelledby="products-title">
    <div className="product-heading"><div><p className="eyebrow">DIGITAL PRODUCT PASSPORT FOUNDATION</p><h2 id="products-title">Product catalogue</h2><p className="product-intro">Register products, map components, and record material composition.</p></div>{canManage&&<button className="primary-button" type="button" onClick={()=>setShowForm(x=>!x)}>{showForm?'Close form':'+ Add product'}</button>}</div>
    {error&&<div className="inline-alert" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
    {showForm&&canManage&&<form className="product-form" onSubmit={submitProduct}><h3>Register a product</h3><div className="product-form-grid"><label>SKU<input value={sku} onChange={e=>setSku(e.target.value)} minLength={2} maxLength={80} required/></label><label>Product name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={200} required/></label><label>Category<input value={category} onChange={e=>setCategory(e.target.value)} maxLength={120}/></label><label>Description<input value={description} onChange={e=>setDescription(e.target.value)} maxLength={4000}/></label></div><div className="product-form-actions"><button className="secondary-button" type="button" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?'Saving…':'Create product'}</button></div></form>}
    <div className="product-filters"><label>Search products<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by product name"/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as ProductStatus|')}><option value="">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label><button className="secondary-button" type="button" onClick={()=>void load()} disabled={loading}>Refresh</button></div>
    {loading?<div className="product-empty" role="status">Loading organization products…</div>:products.length===0?<div className="product-empty"><h3>No products found</h3><p>{search||Boolean(status)?'Try changing your search or status filter.':'Register your first product to start its digital passport.'}</p></div>:<div className="product-table-wrap"><table className="product-table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Status</th><th>Updated</th><th>Details</th></tr></thead><tbody>{products.map(p=><tr key={p._id}><td><strong>{p.name}</strong><small>{p.description||'Product record'}</small></td><td>{p.sku}</td><td>{p.category||'—'}</td><td><span className="product-status">{p.status}</span></td><td>{new Date(p.updatedAt).toLocaleDateString()}</td><td><button className="product-action" type="button" onClick={()=>void openProduct(p)}>Open registry</button></td></tr>)}</tbody></table></div>}
    {selected&&<div className="product-detail-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className="product-detail" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onClick={e=>e.stopPropagation()}><button className="detail-close" type="button" onClick={()=>setSelected(null)} aria-label="Close product details">×</button><p className="eyebrow">PRODUCT COMPOSITION</p><h2 id="product-detail-title">{selected.name}</h2><p className="product-intro">{selected.sku} · {selected.category||'Uncategorized'} · {selected.status}</p><div className="product-component-heading"><h3>Components and materials</h3>{canManage&&<button className="secondary-button" type="button" onClick={()=>setComponentForm(x=>!x)}>+ Add component</button>}</div>
      {componentForm&&<form className="product-form" onSubmit={submitComponent}><div className="product-form-grid"><label>Component code<input value={componentCode} onChange={e=>setComponentCode(e.target.value)} minLength={2} required/></label><label>Component name<input value={componentName} onChange={e=>setComponentName(e.target.value)} minLength={2} required/></label><label>Quantity<input type="number" min="0.000001" step="any" value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label><label>Unit<input value={unit} onChange={e=>setUnit(e.target.value)} required/></label></div><div className="product-form-actions"><button className="primary-button" disabled={busy}>Save component</button></div></form>}
      {components.length===0?<div className="product-empty">No components registered yet.</div>:components.map(c=><article className="product-component" key={c._id}><div className="product-component-heading"><span><strong>{c.name}</strong><small>{c.code} · {c.quantity} {c.unit}</small></span>{canManage&&<button className="product-action" type="button" onClick={()=>setMaterialFor(x=>x===c._id?'':c._id)}>+ Add material</button>}</div>{(materials[c._id]||[]).map(m=><div className="product-material-row" key={m._id}><span>{m.name}<small>{m.category} · {m.mass} {m.massUnit}</small></span><span>{m.recycledContentPct==null?'Recycled content not recorded':m.recycledContentPct+'% recycled'}</span></div>)}{materialFor===c._id&&<form className="product-form" onSubmit={submitMaterial}><div className="product-form-grid"><label>Material name<input value={materialName} onChange={e=>setMaterialName(e.target.value)} minLength={2} required/></label><label>Category<select value={materialCategory} onChange={e=>setMaterialCategory(e.target.value as MaterialCategory)}>{categories.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Mass<input type="number" min="0.000001" step="any" value={mass} onChange={e=>setMass(e.target.value)} required/></label><label>Mass unit<select value={massUnit} onChange={e=>setMassUnit(e.target.value as 'g'|'kg'|'mg')}><option value="g">g</option><option value="kg">kg</option><option value="mg">mg</option></select></label><label>Recycled content %<input type="number" min="0" max="100" value={recycled} onChange={e=>setRecycled(e.target.value)}/></label><label>Origin country code<input value={origin} onChange={e=>setOrigin(e.target.value)} pattern="[A-Za-z]{2}" maxLength={2} placeholder="IN"/></label></div><div className="product-form-actions"><button className="primary-button" disabled={busy}>Save material</button></div></form>}</article>)}
    </section></div>}
  </section>;
}
