const cfg=window.LAYER_SUPABASE||{}, client=(window.supabase&&cfg.url&&!cfg.url.includes("YOUR_"))?window.supabase.createClient(cfg.url,cfg.anonKey):null;
const $=s=>document.querySelector(s),money=window.LayerCatalog.money;
let cart=JSON.parse(localStorage.getItem("layer-cart")||"{}"),product=null;
function syncCart(){localStorage.setItem("layer-cart",JSON.stringify(cart));$("#cartCount").textContent=Object.values(cart).reduce((a,b)=>a+b,0)}
syncCart();
const id=new URLSearchParams(location.search).get("id")||"p1";
function eta(days){let d=new Date();d.setDate(d.getDate()+Math.max(1,+days||1));return d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
async function load(){
 let p=null;
 if(client){let {data}=await client.from("products").select("*").eq("id",id).eq("active",true).maybeSingle();p=data}
 p=window.LayerCatalog.normalize(p||window.LAYER_DEFAULT_PRODUCTS.find(x=>x.id===id)||window.LAYER_DEFAULT_PRODUCTS[0]); product=p; render();
}
function render(){
 const imgs=product.image_urls?.length?product.image_urls:[product.image_url];
 $("#productPage").innerHTML=`<nav class="breadcrumbs"><a href="index.html">LAYER</a><span>/</span><a href="index.html#objects">OBJECTS</a><span>/</span><b>${product.name}</b></nav>
 <section class="detail-grid">
  <div class="gallery"><div class="thumbs">${imgs.map((x,i)=>`<button class="${i===0?'active':''}" onclick="setImage('${x}',this)"><img src="${x}"></button>`).join("")}</div><div class="hero-image"><img id="mainImage" src="${imgs[0]}" alt="${product.name}"></div></div>
  <article class="buy-panel"><span class="object-kicker">${product.category} / ${product.tag||"3D PRINTED"}</span><h1>${product.name}</h1>
   ${product.compare_at_price?`<div class="compare">${money(product.compare_at_price)}</div>`:""}<div class="object-price">${money(product.price)}</div>
   <p class="tax-note">Campus fabrication price · taxes/charges if applicable shown at checkout.</p>
   <div class="delivery-card"><span>ESTIMATED READY</span><strong>${eta(product.estimated_delivery_days)}</strong><small>${product.estimated_delivery_days||1} fabrication day${(+product.estimated_delivery_days||1)>1?"s":""}</small></div>
   <div class="availability">${product.stock>0?`<b>IN STOCK</b><span>${product.stock} available</span>`:`<b>MADE TO ORDER</b><span>Fabrication starts after confirmation</span>`}</div>
   <label class="qty">QUANTITY <select id="qty">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join("")}</select></label>
   <button class="add-cart" onclick="addCart(false)">ADD TO CART</button><button class="buy-now-main" onclick="addCart(true)">BUY NOW</button>
   <div class="secure-row"><span>▣ CAMPUS ACCOUNT</span><span>⌁ LOCAL FABRICATION</span><span>⌖ PICKUP / DELIVERY</span></div>
  </article>
 </section>
 <section class="product-description"><div><span>OBJECT DETAILS</span><h2>Made layer by layer.</h2></div><p>${product.description||""}</p>
 <dl><div><dt>MATERIAL</dt><dd>${product.material||"—"}</dd></div><div><dt>FINISH</dt><dd>${product.finish||"—"}</dd></div><div><dt>DELIVERY</dt><dd>${product.estimated_delivery_days||1} day(s)</dd></div><div><dt>STOCK</dt><dd>${product.stock||0}</dd></div></dl></section>`;
}
window.setImage=(url,btn)=>{$("#mainImage").src=url;document.querySelectorAll(".thumbs button").forEach(x=>x.classList.remove("active"));btn.classList.add("active")};
window.addCart=(buy)=>{let q=+$("#qty").value;cart[product.id]=(cart[product.id]||0)+q;syncCart();if(buy)location.href="checkout.html";else{document.querySelector(".add-cart").textContent="ADDED ✓";setTimeout(()=>document.querySelector(".add-cart").textContent="ADD TO CART",1200)}};
load();