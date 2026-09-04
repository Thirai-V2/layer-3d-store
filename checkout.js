const cfg=window.LAYER_SUPABASE||{},client=(window.supabase&&cfg.url&&!cfg.url.includes("YOUR_"))?window.supabase.createClient(cfg.url,cfg.anonKey):null;
const $=s=>document.querySelector(s),money=window.LayerCatalog.money;
let cart=JSON.parse(localStorage.getItem("layer-cart")||"{}"),products=[],user=null,addresses=[],deliveryMode="DELIVERY",selectedAddress=null,coupon=null,settings={},paymentMethod="ONLINE_LINK";
async function init(){
 products=await window.LayerCatalog.load(client); renderSummary();
 if(!client){$("#authGate").hidden=false;return}
 let {data}=await client.auth.getSession();user=data.session?.user||null;
 if(!user){$("#authGate").hidden=false;$("#placeOrder").disabled=true;return}
 $("#checkoutContent").hidden=false;
 await Promise.all([loadAddresses(),loadSettings()]);renderPayments();
}
function cartEntries(){return Object.entries(cart).filter(([,q])=>q>0).map(([id,q])=>({p:products.find(x=>x.id===id),q})).filter(x=>x.p)}
function localSubtotal(){return cartEntries().reduce((s,x)=>s+x.p.price*x.q,0)}
function renderSummary(){
 let rows=cartEntries();$("#summaryItems").innerHTML=rows.map(x=>`<div class="summary-item"><img src="${x.p.image_url}"><div><b>${x.p.name}</b><span>Qty ${x.q} · ${x.p.material||""}</span></div><strong>${money(x.p.price*x.q)}</strong></div>`).join("")||"<p>Your cart is empty.</p>";
 updateTotals();
}
function updateTotals(){let sub=localSubtotal(),disc=coupon?.discount_amount||0;$("#subtotal").textContent=money(sub);$("#discount").textContent="− "+money(disc);$("#total").textContent=money(Math.max(0,sub-disc))}
async function loadAddresses(){let {data}=await client.from("addresses").select("*").eq("user_id",user.id).order("is_default",{ascending:false}).order("created_at",{ascending:false});addresses=data||[];selectedAddress=addresses[0]?.id||null;renderAddresses()}
function renderAddresses(){
 $("#addressList").innerHTML=addresses.map(a=>`<label class="address-card ${selectedAddress===a.id?'selected':''}"><input type="radio" name="address" ${selectedAddress===a.id?'checked':''} onchange="selectAddress('${a.id}')"><div><b>${a.full_name}</b><p>${a.address_line1}${a.address_line2?', '+a.address_line2:''}<br>${a.city}, ${a.state} ${a.postal_code}<br>${a.mobile}</p></div><span>${a.address_type||"Address"}</span></label>`).join("")||"<p class='empty-address'>No saved address yet.</p>";
}
window.selectAddress=id=>{selectedAddress=id;renderAddresses()};
$("#newAddressBtn").onclick=()=>$("#addressForm").hidden=!$("#addressForm").hidden;
$("#addressForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.currentTarget),payload=Object.fromEntries(f.entries());payload.user_id=user.id;payload.is_default=addresses.length===0;let {error}=await client.from("addresses").insert(payload);if(error)return alert(error.message);e.currentTarget.reset();e.currentTarget.hidden=true;await loadAddresses()};
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{deliveryMode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));$("#addressArea").hidden=deliveryMode==="PICKUP";$("#pickupArea").hidden=deliveryMode!=="PICKUP"});
async function loadSettings(){let {data}=await client.from("store_settings").select("value").eq("key","checkout").maybeSingle();settings=data?.value||{}}
function renderPayments(){
 const opts=[
  {id:"ONLINE_LINK",title:"ONLINE PAYMENT LINK",text:settings.payment_link_url?"Secure external payment page configured by admin.":"Admin has not configured a payment page yet.",disabled:!settings.payment_link_url},
  {id:"UPI",title:"UPI",text:settings.upi_id?`Pay to ${settings.upi_id}`:"UPI ID not configured.",disabled:!settings.upi_id},
  {id:"PAY_AT_DESK",title:"PAY AT CAMPUS DESK",text:"Place the order now and pay when instructed by the fabrication desk.",disabled:settings.allow_pay_at_desk===false}
 ];
 if(opts.find(x=>x.id===paymentMethod)?.disabled) paymentMethod=opts.find(x=>!x.disabled)?.id||"PAY_AT_DESK";
 $("#paymentOptions").innerHTML=opts.map(o=>`<label class="payment-card ${paymentMethod===o.id?'selected':''} ${o.disabled?'disabled':''}"><input type="radio" name="payment" value="${o.id}" ${paymentMethod===o.id?'checked':''} ${o.disabled?'disabled':''} onchange="selectPayment('${o.id}')"><div><b>${o.title}</b><p>${o.text}</p></div></label>`).join("")
}
window.selectPayment=id=>{paymentMethod=id;renderPayments()};
$("#applyCoupon").onclick=async()=>{let code=$("#couponInput").value.trim().toUpperCase();if(!code){coupon=null;$("#couponMessage").textContent="Enter a coupon code.";return updateTotals()}let {data,error}=await client.rpc("validate_coupon",{p_code:code,p_subtotal:localSubtotal()});if(error){coupon=null;$("#couponMessage").textContent=error.message;return updateTotals()}let r=Array.isArray(data)?data[0]:data;if(!r?.valid){coupon=null;$("#couponMessage").textContent=r?.message||"Coupon is not valid.";return updateTotals()}coupon=r;$("#couponMessage").textContent=`${r.code} applied · You save ${money(r.discount_amount)}`;updateTotals()};
$("#placeOrder").onclick=async()=>{
 if(!cartEntries().length)return alert("Your cart is empty.");
 if(deliveryMode==="DELIVERY"&&!selectedAddress)return alert("Please add or select a delivery address.");
 $("#placeOrder").disabled=true;$("#placeOrder").textContent="CREATING ORDER…";
 const items=cartEntries().map(x=>({product_id:x.p.id,quantity:x.q}));
 let {data,error}=await client.rpc("create_checkout_order",{p_items:items,p_address_id:deliveryMode==="DELIVERY"?selectedAddress:null,p_delivery_mode:deliveryMode,p_coupon_code:coupon?.code||null,p_payment_method:paymentMethod});
 $("#placeOrder").disabled=false;$("#placeOrder").textContent="PLACE ORDER ↗";
 if(error)return alert(error.message);
 let r=Array.isArray(data)?data[0]:data;localStorage.removeItem("layer-cart");
 $("#successOrder").textContent=r.order_number;
 let link=null;
 if(paymentMethod==="ONLINE_LINK"&&settings.payment_link_url)link=settings.payment_link_url;
 if(paymentMethod==="UPI"&&settings.upi_id)link=`upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.payee_name||"LAYER Campus 3D Lab")}&am=${encodeURIComponent(r.total)}&cu=INR&tn=${encodeURIComponent(r.order_number)}`;
 if(link){$("#paymentLinkBtn").href=link;$("#paymentLinkBtn").hidden=false;$("#successText").textContent="Order created. Complete payment using the button below; payment remains pending until verified."}
 else $("#successText").textContent="Order created successfully. The fabrication desk will confirm the next step.";
 $("#successDialog").showModal();
};
init();