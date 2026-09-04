const products=[
{id:"p1",name:"Arc Phone Stand",cat:"DESK",price:149,mat:"PLA+",finish:"Matte",lead:"Same day*",img:"assets/phone-stand.svg",desc:"Low-profile phone stand for study desks, lab benches and charging stations."},
{id:"p2",name:"Modular Desk Organiser",cat:"DESK",price:229,mat:"PLA+",finish:"Fine",lead:"1 day",img:"assets/desk-organiser.svg",desc:"Geometric organiser for pens, tools, cables and small electronic components."},
{id:"p3",name:"Gear Demo Model",cat:"ENGINEERING",price:299,mat:"PLA+",finish:"Fine",lead:"1–2 days",img:"assets/gear-model.svg",desc:"Hands-on mechanism model for classroom explanation and project demonstrations."},
{id:"p4",name:"Campus Name Tag",cat:"CAMPUS",price:79,mat:"PLA+",finish:"Dual tone",lead:"Same day*",img:"assets/campus-keytag.svg",desc:"Personalised name or identity tag with department and campus styling."},
{id:"p5",name:"Fold Mini Planter",cat:"DECOR",price:179,mat:"PLA+",finish:"Textured",lead:"1 day",img:"assets/planter.svg",desc:"Architectural planter with faceted printed surfaces for desk and indoor spaces."},
{id:"p6",name:"Project Enclosure S",cat:"ENGINEERING",price:199,mat:"PETG",finish:"Standard",lead:"1–2 days",img:"assets/enclosure.svg",desc:"Compact electronics enclosure for sensors, controllers and prototype boards."}
];
let cart=JSON.parse(localStorage.getItem("layer-v5-cart")||"{}"),active="ALL";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>"₹"+Number(n).toLocaleString("en-IN");

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

function renderProducts(){
 const list=products.filter(p=>active==="ALL"||p.cat===active);
 $("#objectCount").textContent=String(list.length).padStart(2,"0")+" OBJECTS";
 $("#productGrid").innerHTML=list.map((p,i)=>`<article class="product-card">
  <div class="product-media" onclick="openProduct('${p.id}')"><img src="${p.img}" alt="${p.name}"><span class="product-index">${String(i+1).padStart(2,"0")} / ${p.cat}</span><button class="product-add" onclick="event.stopPropagation();add('${p.id}')">＋</button></div>
  <div class="product-info"><div><h3>${p.name}</h3><b>${money(p.price)}</b></div><p>${p.mat} · ${p.finish} · ${p.lead}</p><button class="product-detail" onclick="openProduct('${p.id}')">VIEW OBJECT ↗</button></div>
 </article>`).join("");
}
$$("[data-filter]").forEach(b=>b.onclick=()=>{active=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderProducts()});
renderProducts();

function toast(t){let el=$("#toast");el.textContent=t;el.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>el.classList.remove("show"),1400)}
window.add=id=>{cart[id]=(cart[id]||0)+1;save();toast("ADDED TO BAG")};
function save(){localStorage.setItem("layer-v5-cart",JSON.stringify(cart));renderCart()}
function renderCart(){
 let entries=Object.entries(cart).filter(([,q])=>q>0),count=entries.reduce((a,[,q])=>a+q,0);$("#bagCount").textContent=count;
 $("#bagEmpty").style.display=entries.length?"none":"block";
 $("#bagItems").innerHTML=entries.map(([id,q])=>{let p=products.find(x=>x.id===id);return `<div class="bag-item"><img src="${p.img}"><div><h4>${p.name}</h4><p>${p.mat} · QTY ${q}</p><button onclick="removeItem('${id}')">REMOVE</button></div><b>${money(p.price*q)}</b></div>`}).join("");
 $("#bagSubtotal").textContent=money(entries.reduce((s,[id,q])=>s+products.find(p=>p.id===id).price*q,0));
}
window.removeItem=id=>{delete cart[id];save()};renderCart();

const bag=$("#bagPanel"),scrim=$("#scrim");
$("#bagButton").onclick=()=>{bag.classList.add("open");scrim.classList.add("show")};
$("#bagClose").onclick=()=>{bag.classList.remove("open");scrim.classList.remove("show")};
scrim.onclick=()=>{$("#bagClose").click()};

window.openProduct=id=>{let p=products.find(x=>x.id===id),d=$("#productDialog");$("#productDialogBody").innerHTML=`<div class="product-modal-grid"><img src="${p.img}" alt="${p.name}"><div class="product-modal-copy"><span class="eyebrow dark">${p.cat} / OBJECT</span><h3>${p.name}</h3><div class="price">${money(p.price)}</div><p>${p.desc}</p><div class="spec"><div><span>MATERIAL</span><b>${p.mat}</b></div><div><span>FINISH</span><b>${p.finish}</b></div><div><span>LEAD TIME</span><b>${p.lead}</b></div><div><span>PICKUP</span><b>CAMPUS</b></div></div><button onclick="add('${p.id}');document.querySelector('#productDialog').close()">ADD TO BAG ↗</button></div></div>`;d.showModal()};
$("#productClose").onclick=()=>$("#productDialog").close();

$("#modelFile").onchange=e=>$("#modelFileName").textContent=e.target.files[0]?.name||"STL, 3MF, OBJ or STEP";
$("#fabricationForm").onsubmit=async e=>{
 e.preventDefault();
 if(window.LayerAuth?.submitPrintRequest){await window.LayerAuth.submitPrintRequest(e.currentTarget,$("#modelFile").files[0]);}
 else toast("LOGIN TO SUBMIT A PRINT JOB");
};
$("#orderButton").onclick=async()=>{if(!Object.keys(cart).length)return toast("YOUR BAG IS EMPTY");if(window.LayerAuth?.createOrder)await window.LayerAuth.createOrder(cart,products);else toast("LOGIN TO CREATE ORDER")};

$$("[data-account]").forEach(b=>b.onclick=()=>{$$("[data-account]").forEach(x=>x.classList.toggle("active",x===b));$$(".account-view").forEach(v=>v.classList.toggle("active",v.dataset.view===b.dataset.account));});
