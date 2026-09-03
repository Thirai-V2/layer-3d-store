let products = [
  {id:"p1",name:"Arc Phone Stand",category:"DESK / UTILITY",price:149,material:"PLA+",finish:"MATTE",lead:"SAME DAY*",tag:"BESTSELLER",image:"assets/arc-phone-stand.png",desc:"A sculptural low-profile stand for phones on study desks, lab benches and charging stations."},
  {id:"p2",name:"Campus Key Tag",category:"CAMPUS EDITION",price:49,material:"PLA+",finish:"DUAL TONE",lead:"SAME DAY*",tag:"PERSONALISE",image:"assets/campus-keytag.png",desc:"Personalised campus key tags for names, departments, labs, events and student teams."},
  {id:"p3",name:"Hex Desk Organiser",category:"DESK / UTILITY",price:229,material:"PLA+",finish:"FINE",lead:"1 DAY",tag:"MODULAR",image:"assets/hex-organiser.png",desc:"Modular geometric storage for pens, markers, cables and small electronic components."},
  {id:"p4",name:"Gear Motion Model",category:"ENGINEERING",price:299,material:"PLA+",finish:"FINE",lead:"1–2 DAYS",tag:"STEM",image:"assets/gear-model.png",desc:"A tactile motion model for mechanism demonstrations, classrooms and engineering presentations."},
  {id:"p5",name:"Mini Planter — Fold",category:"DECOR / GIFT",price:179,material:"PLA+",finish:"TEXTURED",lead:"1 DAY",tag:"DESIGN PICK",image:"assets/mini-planter.png",desc:"A folded geometric planter with a strong architectural silhouette for desks and indoor spaces."},
  {id:"p6",name:"Cable Dock Trio",category:"DESK / UTILITY",price:99,material:"TPU / PLA+",finish:"STANDARD",lead:"SAME DAY*",tag:"UTILITY",image:"assets/cable-dock.png",desc:"A three-slot cable dock that stops charging leads from disappearing behind desks and benches."},
  {id:"p7",name:"Miniature Campus Block",category:"CAMPUS EDITION",price:349,material:"PLA+",finish:"FINE",lead:"2–3 DAYS",tag:"COLLECTIBLE",image:"assets/campus-miniature.png",desc:"A stylised architectural miniature for souvenirs, presentations, gifting and display."},
  {id:"p8",name:"Project Enclosure S",category:"ENGINEERING",price:199,material:"PETG",finish:"STANDARD",lead:"1–2 DAYS",tag:"PROJECT READY",image:"assets/project-enclosure.png",desc:"Compact project enclosure for controller boards, sensors and prototype electronics."}
];

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const money=n=>`₹${n.toLocaleString("en-IN")}`;

let cart=JSON.parse(localStorage.getItem("layer-cart")||"{}");
let ticking=false;

const printStory=document.getElementById("printStory");
const printHead=document.getElementById("printHead");
const rail=document.querySelector(".rail");
const nozzleFilament=document.getElementById("nozzleFilament");
const bedLine=document.getElementById("bedLine");
const heroDescription=document.getElementById("heroDescription");
const layerCounter=document.getElementById("layerCounter");
const siteHeader=document.getElementById("siteHeader");

const vaultGrid=document.getElementById("vaultGrid");
const vaultCount=document.getElementById("vaultCount");
let vaultFilter="ALL";

function boot(){
  const boot=document.getElementById("boot"), bar=document.getElementById("bootBar"), pct=document.getElementById("bootPct"), temp=document.getElementById("bootTemp"), status=document.getElementById("bootStatus");
  let start=null;
  const duration=1300;
  function frame(ts){
    if(!start)start=ts;
    const p=clamp((ts-start)/duration);
    const eased=1-Math.pow(1-p,3);
    bar.style.width=`${eased*100}%`;
    pct.textContent=String(Math.floor(eased*100)).padStart(2,"0")+"%";
    temp.textContent=Math.round(24+(220-24)*eased);
    if(p>.62)status.textContent="HOMING AXES";
    if(p>.83)status.textContent="SYSTEM READY";
    if(p<1)requestAnimationFrame(frame);
    else setTimeout(()=>boot.classList.add("done"),180);
  }
  requestAnimationFrame(frame);
}
boot();

function categoryKey(p){
  if(p.category.includes("DESK")) return "DESK";
  if(p.category.includes("CAMPUS")) return "CAMPUS";
  if(p.category.includes("ENGINEERING")) return "ENGINEERING";
  return "DECOR";
}

async function loadBackendCatalog(){
  if(!window.LayerAuth?.configured) return;
  try{
    const {data,error}=await LayerAuth.client.from("products").select("*").eq("active",true).order("featured",{ascending:false}).order("name");
    if(error||!data?.length) return;
    const localImages=Object.fromEntries(products.map(p=>[p.id,p.image]));
    products=data.map(row=>({
      id:row.id,
      name:row.name,
      category:row.category,
      price:Number(row.price),
      material:row.material||"PLA+",
      finish:row.finish||"STANDARD",
      lead:row.lead_time||"TO CONFIRM",
      tag:row.tag||"OBJECT",
      image:row.image_url||localImages[row.id]||"assets/project-enclosure.png",
      desc:row.description||"Campus fabricated object.",
      stock:row.stock
    }));
    renderVault();
    renderBag();
  }catch(error){
    console.warn("LAYER catalogue fallback active",error);
  }
}

function renderVault(){
  const visible=products.filter(p=>vaultFilter==="ALL"||categoryKey(p)===vaultFilter);
  vaultCount.textContent=`${String(visible.length).padStart(2,"0")} OBJECT${visible.length===1?"":"S"}`;
  vaultGrid.innerHTML=visible.map((p,i)=>`
    <article class="vault-card">
      <div class="vault-card-media" onclick="viewObject('${p.id}')">
        <span class="vault-card-index">${String(i+1).padStart(2,"0")} / ${String(visible.length).padStart(2,"0")}</span>
        <span class="vault-card-tag">${p.tag}</span>
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="vault-card-info">
        <div class="vault-card-meta"><span>${p.category}</span><span>${p.material} · ${p.finish}</span></div>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="vault-card-bottom">
          <strong class="vault-card-price">${money(p.price)}</strong>
          <div class="vault-card-actions">
            <button onclick="viewObject('${p.id}')">DETAILS</button>
            <button class="vault-add" onclick="addObject('${p.id}')">ADD +</button>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}
renderVault();

document.querySelectorAll("[data-vault-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  vaultFilter=btn.dataset.vaultFilter;
  document.querySelectorAll("[data-vault-filter]").forEach(b=>b.classList.toggle("active",b===btn));
  renderVault();
}));

function syncBodyLock(){
  const locked=document.getElementById("bagPanel")?.classList.contains("open");
  document.body.classList.toggle("locked",locked);
}

function scanPosition(progress){
  // three deliberate print passes: L→R, R→L, L→R
  const starts=[.07,.34,.61], ends=[.30,.57,.86];
  let line=0, local=0;
  if(progress>=starts[2]){line=2;local=clamp((progress-starts[2])/(ends[2]-starts[2]));}
  else if(progress>=starts[1]){line=1;local=clamp((progress-starts[1])/(ends[1]-starts[1]));}
  else {line=0;local=clamp((progress-starts[0])/(ends[0]-starts[0]));}
  const reverse=line===1;
  const scan=reverse?1-local:local;
  return {line,local,scan,active:progress>=starts[line]&&progress<=ends[line]};
}

function updateScroll(){
  const y=window.scrollY;
  const viewport=window.innerHeight;
  const storyTop=printStory.offsetTop;
  const storyRange=printStory.offsetHeight-viewport;
  const hp=clamp((y-storyTop)/storyRange);

  const scan=scanPosition(hp);
  const mobile=window.innerWidth<720;
  const headWidth=mobile?132:(window.innerWidth<1000?165:190);
  const leftGutter=mobile?window.innerWidth*.04:window.innerWidth*.052;
  const rightGutter=mobile?window.innerWidth*.05:window.innerWidth*.075;
  const available=Math.max(80,window.innerWidth-leftGutter-rightGutter-headWidth);
  const x=available*scan.scan;

  // gantry descends between each printed line
  const lineStep=mobile?window.innerHeight*.105:window.innerHeight*.125;
  const yShift=scan.line*lineStep;
  const vibration=scan.active?Math.sin(scan.local*Math.PI*18)*1.15:0;
  const scale=1;
  printHead.style.transform=`translate3d(${x}px,${yShift+vibration}px,0) scale(${scale})`;
  rail.style.transform=`translate3d(0,${yShift}px,0)`;
  rail.style.transition="transform .18s linear";

  const flow=scan.active?.95:.28;
  nozzleFilament.style.transform=`scaleY(${flow})`;
  nozzleFilament.style.opacity=scan.active?.98:.32;

  bedLine.style.width=`${clamp(hp/.88)*100}%`;
  layerCounter.textContent=`LAYER ${String(Math.max(1,Math.floor(hp*247))).padStart(4,"0")}`;

  const phases=[{s:.07,e:.30,reverse:false},{s:.34,e:.57,reverse:true},{s:.61,e:.86,reverse:false}];
  document.querySelectorAll(".print-word .fill").forEach((el,i)=>{
    const ph=phases[i];
    const rp=clamp((hp-ph.s)/(ph.e-ph.s));
    if(ph.reverse) el.style.clipPath=`inset(0 0 0 ${100-rp*100}%)`;
    else el.style.clipPath=`inset(0 ${100-rp*100}% 0 0)`;
  });

  const dp=clamp((hp-.82)/.12);
  heroDescription.style.opacity=dp;
  heroDescription.style.transform=`translateY(${lerp(20,0,dp)}px)`;

  // navigation stays out of the way while the first layer is being laid down
  const navp=clamp((hp-.12)/.12);
  siteHeader.style.opacity=navp;
  siteHeader.style.transform=`translateY(${lerp(-10,0,navp)}px)`;

  ticking=false;
}
window.addEventListener("scroll",()=>{if(!ticking){ticking=true;requestAnimationFrame(updateScroll)}},{passive:true});
window.addEventListener("resize",()=>requestAnimationFrame(updateScroll));
requestAnimationFrame(updateScroll);

// custom cursor
const cursor=document.getElementById("cursor");
window.addEventListener("mousemove",e=>{
  cursor.style.left=e.clientX+"px";cursor.style.top=e.clientY+"px";
  const dark=e.target.closest(".print-story,.objects-section,.metrics-section,footer,.fabrication-console");
  cursor.classList.toggle("inverse",!!dark);
});
document.addEventListener("mouseover",e=>{cursor.classList.toggle("hover",!!e.target.closest("a,button,label,.vault-card"))});

// card parallax / tilt
document.addEventListener("mousemove",e=>{
  document.querySelectorAll(".vault-card").forEach(card=>{
    const r=card.getBoundingClientRect();
    if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
      const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
      const img=card.querySelector("img");
      img.style.transform=`scale(1.045) translate(${px*8}px,${py*8}px)`;
    }
  });
});

// bag
const bagPanel=document.getElementById("bagPanel"),scrim=document.getElementById("scrim"),bagItems=document.getElementById("bagItems"),bagEmpty=document.getElementById("bagEmpty"),bagSubtotal=document.getElementById("bagSubtotal"),bagCount=document.getElementById("bagCount");
function saveCart(){localStorage.setItem("layer-cart",JSON.stringify(cart));renderBag()}
function renderBag(){
  const entries=Object.entries(cart).filter(([,q])=>q>0);
  bagCount.textContent=entries.reduce((s,[,q])=>s+q,0);
  bagEmpty.style.display=entries.length?"none":"block";
  bagItems.innerHTML=entries.map(([id,q])=>{
    const p=products.find(x=>x.id===id);
    return `<div class="bag-item">
      <img src="${p.image}" alt="${p.name}">
      <div><h4>${p.name}</h4><p>${p.material} · ${p.category}</p>
        <div class="bag-qty">
          <button onclick="changeQty('${id}',-1)">−</button><span>${q}</span><button onclick="changeQty('${id}',1)">+</button>
          <button class="remove-item" onclick="removeObject('${id}')">REMOVE</button>
        </div>
      </div>
      <strong>${money(p.price*q)}</strong>
    </div>`;
  }).join("");
  bagSubtotal.textContent=money(entries.reduce((s,[id,q])=>s+products.find(p=>p.id===id).price*q,0));
}
window.addObject=id=>{cart[id]=(cart[id]||0)+1;saveCart();toast("OBJECT ADDED")};
window.changeQty=(id,d)=>{cart[id]=Math.max(0,(cart[id]||0)+d);if(!cart[id])delete cart[id];saveCart()};
window.removeObject=id=>{delete cart[id];saveCart()};
function openBag(){bagPanel.classList.add("open");scrim.classList.add("show");syncBodyLock()}
function closeBag(){bagPanel.classList.remove("open");scrim.classList.remove("show");syncBodyLock()}
document.getElementById("bagButton").onclick=openBag;
document.getElementById("bagClose").onclick=closeBag;
scrim.onclick=closeBag;
renderBag();

// product dialog
const objectModal=document.getElementById("objectModal"),objectModalBody=document.getElementById("objectModalBody");
window.viewObject=id=>{
  const p=products.find(x=>x.id===id);
  objectModalBody.innerHTML=`<div class="modal-object-grid">
    <img src="${p.image}" alt="${p.name}">
    <div class="modal-object-info">
      <span>${p.category} / ${p.tag}</span>
      <h2>${p.name}</h2>
      <p>${p.desc}</p>
      <p class="modal-price">${money(p.price)}</p>
      <div class="modal-specs">
        <div><span>MATERIAL</span><b>${p.material}</b></div>
        <div><span>FINISH</span><b>${p.finish}</b></div>
        <div><span>TYPICAL LEAD</span><b>${p.lead}</b></div>
        <div><span>FULFILMENT</span><b>CAMPUS PICKUP</b></div>
      </div>
      <button class="modal-add" onclick="addObject('${p.id}');objectModal.close()">ADD TO CAMPUS BAG <b>＋</b></button>
    </div>
  </div>`;
  objectModal.showModal();
};
document.getElementById("objectModalClose").onclick=()=>objectModal.close();

// custom fabrication
const file=document.getElementById("modelFile"),modelFileName=document.getElementById("modelFileName");
file.onchange=()=>modelFileName.textContent=file.files[0]?.name||"or click to select a fabrication file";

const summaryDialog=document.getElementById("summaryDialog"),summaryContent=document.getElementById("summaryContent"),summaryHeading=document.getElementById("summaryHeading");
function showSummary(title,text){summaryHeading.textContent=title;summaryContent.textContent=text;summaryDialog.showModal()}
document.getElementById("summaryDialogClose").onclick=()=>summaryDialog.close();

document.getElementById("fabricationForm").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const values=Object.fromEntries(fd.entries());
  const submit=e.currentTarget.querySelector(".execute-btn");

  if(window.LayerAuth?.configured){
    if(!LayerAuth.getUser()){
      LayerAuth.openLogin("Login to submit this fabrication job and track its progress in My LAYER.");
      return;
    }
    submit.disabled=true;
    submit.querySelector("span").textContent="UPLOADING / SUBMITTING…";
    try{
      const job=await LayerAuth.submitFabrication(values,file.files[0]||null);
      showSummary("Fabrication job submitted.",
`LAYER / CUSTOM FABRICATION REQUEST

REQUEST: ${job.request_number}
Name: ${fd.get("name")}
Department: ${fd.get("department")}
Quantity: ${fd.get("quantity")}
Material: ${fd.get("material")}
Model file: ${file.files[0]?.name||"To be shared separately"}

Job notes:
${fd.get("notes")||"—"}

Fulfilment: Campus pickup
Status: ${job.status}`);
      await LayerAuth.refreshDashboard();
      toast("FABRICATION JOB SUBMITTED");
    }catch(error){
      if(error.message!=="AUTH_REQUIRED") toast(error.message||"REQUEST FAILED");
    }finally{
      submit.disabled=false;
      submit.querySelector("span").textContent="SUBMIT FABRICATION REQUEST";
    }
    return;
  }

  showSummary("Fabrication request preview.",
`LAYER / CUSTOM FABRICATION REQUEST

Name: ${fd.get("name")}
Department: ${fd.get("department")}
Quantity: ${fd.get("quantity")}
Material: ${fd.get("material")}
Model file: ${file.files[0]?.name||"To be shared separately"}

Job notes:
${fd.get("notes")||"—"}

Fulfilment: Campus pickup
Status: Preview only — connect Supabase to submit`);
};

document.getElementById("orderSummaryButton").onclick=async()=>{
  const entries=Object.entries(cart);
  if(!entries.length){toast("BAG IS EMPTY");return}
  const items=entries.map(([id,q])=>{const p=products.find(x=>x.id===id);return {...p,qty:q}});
  const lines=items.map((p,i)=>`${String(i+1).padStart(2,"0")} / ${p.name} × ${p.qty} — ${money(p.price*p.qty)}`);
  const subtotal=items.reduce((s,p)=>s+p.price*p.qty,0);

  if(window.LayerAuth?.configured){
    if(!LayerAuth.getUser()){
      closeBag();
      LayerAuth.openLogin("Login to place this campus order and track printing / pickup status.");
      return;
    }
    const btn=document.getElementById("orderSummaryButton");
    btn.disabled=true;btn.innerHTML="CREATING ORDER…";
    try{
      const order=await LayerAuth.createCampusOrder(items,subtotal);
      showSummary("Campus order submitted.",
`LAYER / CAMPUS ORDER

ORDER: ${order.order_number}

${lines.join("\n")}

SUBTOTAL: ${money(subtotal)}

Fulfilment: Campus pickup
Status: ${order.status}
Pickup: ${order.pickup_status}`);
      cart={};saveCart();closeBag();
      await LayerAuth.refreshDashboard();
      toast("ORDER SUBMITTED");
    }catch(error){
      if(error.message!=="AUTH_REQUIRED") toast(error.message||"ORDER FAILED");
    }finally{
      btn.disabled=false;btn.innerHTML="CREATE CAMPUS ORDER <b>↗</b>";
    }
    return;
  }

  showSummary("Campus order preview.",
`LAYER / CAMPUS ORDER

${lines.join("\n")}

SUBTOTAL: ${money(subtotal)}

Fulfilment: Campus pickup
Status: Preview only — connect Supabase to submit`);
  closeBag();
};

document.getElementById("copyButton").onclick=async()=>{await navigator.clipboard.writeText(summaryContent.textContent);toast("SUMMARY COPIED")};

function toast(text){
  const t=document.getElementById("toast");t.textContent=text;t.classList.add("show");
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),1500);
}

// drag hover
const dz=document.getElementById("dropZone");
["dragenter","dragover"].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault();dz.style.borderColor="#cfff33"}));
["dragleave","drop"].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault();dz.style.borderColor="#37373d"}));
dz.addEventListener("drop",e=>{
  if(e.dataTransfer.files.length){
    try{file.files=e.dataTransfer.files;modelFileName.textContent=e.dataTransfer.files[0].name}catch(_){}
  }
});

// magnetic buttons
document.querySelectorAll(".magnetic").forEach(el=>{
  el.addEventListener("mousemove",e=>{
    const r=el.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
    el.style.transform=`translate(${x*.08}px,${y*.12}px)`;
  });
  el.addEventListener("mouseleave",()=>el.style.transform="");
});

loadBackendCatalog();
