
// =========================================================
// V5.1 — MACHINE BOOT / HEAT + HOMING SEQUENCE
// =========================================================
(function machineBoot(){
  const boot=document.getElementById("machineBoot");
  if(!boot) return;

  const head=document.getElementById("bootHead");
  const temp=document.getElementById("bootTemp");
  const hotend=document.getElementById("bootHotend");
  const bed=document.getElementById("bootBed");
  const axes=document.getElementById("bootAxes");
  const status=document.getElementById("bootStatus");
  const bar=document.getElementById("bootBar");
  const pct=document.getElementById("bootPct");
  const filament=document.getElementById("bootFilament");

  const clamp01=v=>Math.max(0,Math.min(1,v));
  const ease=t=>1-Math.pow(1-t,3);
  const duration=2850;
  let start=null;

  function frame(ts){
    if(!start) start=ts;
    const p=clamp01((ts-start)/duration);
    const e=ease(p);

    bar.style.width=(e*100)+"%";
    pct.textContent=String(Math.floor(e*100)).padStart(2,"0")+"%";

    // Phase 1: real startup feeling — heat hotend from ambient to 220°C.
    if(p < .58){
      const q=ease(p/.58);
      const nozzle=Math.round(24+(220-24)*q);
      const bedT=Math.round(24+(60-24)*Math.min(1,q*1.15));
      temp.textContent=nozzle;
      hotend.textContent=nozzle+"°C";
      bed.textContent=bedT+"°C";
      axes.textContent="STANDBY";
      status.textContent="HEATING NOZZLE";
      head.style.left=(16 + Math.sin(p*32)*.45)+"%";
      head.style.top="calc(31% - 91px)";
      filament.style.opacity=.12;
    }
    // Phase 2: home X — head travels to the left stop and then sweeps right.
    else if(p < .78){
      const q=(p-.58)/.20;
      temp.textContent="220"; hotend.textContent="220°C"; bed.textContent="60°C";
      status.textContent="HOMING X AXIS";
      axes.textContent="X / HOMING";
      head.style.left=(12 + 70*q)+"%";
      head.style.top="calc(31% - 91px)";
      filament.style.opacity=.18;
    }
    // Phase 3: Y/Z calibration — return toward centre and make a subtle Z drop.
    else if(p < .92){
      const q=(p-.78)/.14;
      temp.textContent="220"; hotend.textContent="220°C"; bed.textContent="60°C";
      status.textContent=q<.52 ? "HOMING Y AXIS" : "CALIBRATING Z";
      axes.textContent=q<.52 ? "Y / HOMING" : "Z / CAL";
      head.style.left=(82 - 34*q)+"%";
      head.style.top=`calc(31% - ${91-18*q}px)`;
      filament.style.opacity=.35;
    }
    // Phase 4: ready.
    else{
      temp.textContent="220"; hotend.textContent="220°C"; bed.textContent="60°C";
      status.textContent="SYSTEM READY";
      axes.textContent="XYZ / READY";
      head.style.left="50%";
      head.style.top="calc(31% - 73px)";
      filament.style.opacity=.8;
    }

    if(p<1){
      requestAnimationFrame(frame);
    }else{
      setTimeout(()=>{
        boot.classList.add("done");
        document.body.classList.remove("booting");
        setTimeout(()=>boot.remove(),1000);
      },320);
    }
  }
  requestAnimationFrame(frame);
})();


let products=(window.LAYER_DEFAULT_PRODUCTS||[]).map(p=>window.LayerCatalog.normalize(p));
let cart=JSON.parse(localStorage.getItem("layer-cart")||localStorage.getItem("layer-v5-cart")||"{}"),active="ALL",searchTerm="";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>window.LayerCatalog.money(n);

function progress(){
 const story=$("#printStory"), r=story.getBoundingClientRect(), max=story.offsetHeight-innerHeight;
 return Math.max(0,Math.min(1,-r.top/max));
}
function animateHero(){
 const p=progress(),head=$("#printHead");
 const lines=[
  {a:.02,b:.29,y:19,x0:8,x1:82},
  {a:.24,b:.54,y:35,x0:82,x1:10},
  {a:.48,b:.84,y:51,x0:10,x1:86}
 ];
 let line=lines.find(l=>p>=l.a&&p<=l.b)|| (p<.24?lines[0]:p<.48?lines[1]:lines[2]);
 let t=Math.max(0,Math.min(1,(p-line.a)/(line.b-line.a)));
 head.style.left=(line.x0+(line.x1-line.x0)*t)+"%";
 head.style.top=line.y+"%";
 $("#layerCounter").textContent="LAYER "+String(1+Math.floor(p*246)).padStart(4,"0");
 $$(".ink").forEach(el=>{
   let s=+el.dataset.s,e=+el.dataset.e,q=Math.max(0,Math.min(1,(p-s)/(e-s)));
   el.style.clipPath=`inset(0 ${100-q*100}% 0 0)`;
 });
}
addEventListener("scroll",animateHero,{passive:true});addEventListener("resize",animateHero);animateHero();

function etaText(days){
 const d=new Date(); d.setDate(d.getDate()+Math.max(1,Number(days||1)));
 return d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
}
function renderProducts(){
 const list=products.filter(p=>(active==="ALL"||p.category===active) && `${p.name} ${p.category} ${p.material} ${p.description}`.toLowerCase().includes(searchTerm.toLowerCase()));
 $("#objectCount").textContent=String(list.length).padStart(2,"0")+" OBJECTS";
 $("#productGrid").innerHTML=list.map((p,i)=>`<article class="product-card">
  <div class="product-media" onclick="location.href='product.html?id=${encodeURIComponent(p.id)}'">
    <img src="${p.image_url}" alt="${p.name}">
    <span class="product-index">${String(i+1).padStart(2,"0")} / ${p.category}</span>
    <button class="product-add" onclick="event.stopPropagation();add('${p.id}')">＋</button>
  </div>
  <div class="product-info">
    <div><h3>${p.name}</h3><b>${money(p.price)}</b></div>
    <p>${p.material||"—"} · ${p.finish||"—"}</p>
    <p class="delivery">Estimated ready by <b>${etaText(p.estimated_delivery_days)}</b></p>
    <p class="stock-line"><span class="${p.stock<=3?'low-stock':''}"><i></i>${p.stock>0?(p.stock<=3?`Only ${p.stock} left`:`${p.stock} available`):"Made to order"}</span></p>
    <button class="product-detail" onclick="location.href='product.html?id=${encodeURIComponent(p.id)}'">VIEW DETAILS ↗</button>
    <button class="buy-now" onclick="buyNow('${p.id}')">BUY NOW</button>
  </div>
 </article>`).join("");
}
$$("[data-filter]").forEach(b=>b.onclick=()=>{active=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderProducts()});
$("#catalogSearch")?.addEventListener("input",e=>{searchTerm=e.target.value;renderProducts()});

async function hydrateCatalog(){
 const client=window.LayerAuth?.client||null;
 products=await window.LayerCatalog.load(client);
 renderProducts(); renderCart();
}
renderProducts();
setTimeout(hydrateCatalog,50);

function toast(t){let el=$("#toast");el.textContent=t;el.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>el.classList.remove("show"),1600)}
window.add=id=>{cart[id]=(cart[id]||0)+1;save();toast("ADDED TO BAG")};
window.buyNow=id=>{cart[id]=(cart[id]||0)+1;save();location.href="checkout.html"};
function save(){localStorage.setItem("layer-cart",JSON.stringify(cart));renderCart()}
function renderCart(){
 let entries=Object.entries(cart).filter(([,q])=>q>0),count=entries.reduce((a,[,q])=>a+q,0);$("#bagCount").textContent=count;
 $("#bagEmpty").style.display=entries.length?"none":"block";
 $("#bagItems").innerHTML=entries.map(([id,q])=>{let p=products.find(x=>x.id===id)||window.LayerCatalog.normalize({id});return `<div class="bag-item"><img src="${p.image_url}"><div><h4>${p.name||id}</h4><p>${p.material||""} · QTY ${q}</p><div class="bag-qty"><button onclick="changeQty('${id}',-1)">−</button><span>${q}</span><button onclick="changeQty('${id}',1)">＋</button></div><button onclick="removeItem('${id}')">REMOVE</button></div><b>${money((p.price||0)*q)}</b></div>`}).join("");
 $("#bagSubtotal").textContent=money(entries.reduce((s,[id,q])=>s+(products.find(p=>p.id===id)?.price||0)*q,0));
}
window.changeQty=(id,d)=>{cart[id]=Math.max(0,(cart[id]||0)+d);if(!cart[id])delete cart[id];save()};
window.removeItem=id=>{delete cart[id];save()};renderCart();

const bag=$("#bagPanel"),scrim=$("#scrim");
$("#bagButton").onclick=()=>{bag.classList.add("open");scrim.classList.add("show")};
$("#bagClose").onclick=()=>{bag.classList.remove("open");scrim.classList.remove("show")};
scrim.onclick=()=>{$("#bagClose").click()};
$("#orderButton").onclick=()=>{if(!Object.keys(cart).length)return toast("YOUR BAG IS EMPTY");location.href="checkout.html"};

window.openProduct=id=>location.href=`product.html?id=${encodeURIComponent(id)}`;
$("#productClose")?.addEventListener("click",()=>$("#productDialog").close());

$("#modelFile").onchange=e=>$("#modelFileName").textContent=e.target.files[0]?.name||"STL, 3MF, OBJ or STEP";
$("#fabricationForm").onsubmit=async e=>{
 e.preventDefault();
 if(window.LayerAuth?.submitPrintRequest){await window.LayerAuth.submitPrintRequest(e.currentTarget,$("#modelFile").files[0]);}
 else toast("LOGIN TO SUBMIT A PRINT JOB");
};

$$("[data-account]").forEach(b=>b.onclick=()=>{$$("[data-account]").forEach(x=>x.classList.toggle("active",x===b));$$(".account-view").forEach(v=>v.classList.toggle("active",v.dataset.view===b.dataset.account));});
