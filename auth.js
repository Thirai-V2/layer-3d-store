(()=> {
const cfg=window.LAYER_SUPABASE||{};
if(!window.supabase||!cfg.url||!cfg.anonKey||cfg.url.includes("YOUR_")){console.warn("Supabase not configured");return;}
const client=window.supabase.createClient(cfg.url,cfg.anonKey);
let user=null,profile=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function msg(t,bad=false){let e=$("#authMessage");if(!e)return;e.textContent=t;e.style.color=bad?"#b74343":"#647348"}
function openAuth(tab="login"){$("#authDialog")?.showModal();switchTab(tab)}
function switchTab(tab){
 $("#loginTab")?.classList.toggle("active",tab==="login");$("#registerTab")?.classList.toggle("active",tab==="register");
 $("#loginForm")?.classList.toggle("active",tab==="login");$("#registerForm")?.classList.toggle("active",tab==="register");msg("");
}
$("#loginButton")&&( $("#loginButton").onclick=()=>openAuth("login") );
$("#registerButton")&&( $("#registerButton").onclick=()=>openAuth("register") );
$("#authClose")&&( $("#authClose").onclick=()=>$("#authDialog").close() );
$("#loginTab")&&( $("#loginTab").onclick=()=>switchTab("login") );
$("#registerTab")&&( $("#registerTab").onclick=()=>switchTab("register") );

$("#loginForm")&&( $("#loginForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.currentTarget);msg("Signing in…");let {error}=await client.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error)return msg(error.message,true);msg("Signed in.");setTimeout(()=>$("#authDialog").close(),350)} );
$("#registerForm")&&( $("#registerForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.currentTarget);msg("Creating account…");let {error}=await client.auth.signUp({email:f.get("email"),password:f.get("password"),options:{data:{full_name:f.get("full_name"),campus_id:f.get("campus_id"),user_type:f.get("user_type"),department:f.get("department"),year_of_study:f.get("year_of_study"),mobile:f.get("mobile")}}});if(error)return msg(error.message,true);msg("Account created. You can continue immediately.");setTimeout(()=>$("#authDialog").close(),700)} );

async function hydrate(u){
 user=u;profile=null;
 if(u){let {data}=await client.from("profiles").select("*").eq("id",u.id).maybeSingle();profile=data||u.user_metadata||{};}
 $("#loginButton")&&( $("#loginButton").hidden=!!u );
 $("#registerButton")&&( $("#registerButton").hidden=!!u );
 $("#myLayerButton")&&( $("#myLayerButton").hidden=!u );
 $("#adminButton")&&( $("#adminButton").hidden=!(u && profile?.role==="admin") );
 if(u){
   let n=profile?.full_name||u.email||"User";
   $("#userInitial")&&( $("#userInitial").textContent=n[0].toUpperCase() );
   $("#accountAvatar")&&( $("#accountAvatar").textContent=n[0].toUpperCase() );
   $("#accountName")&&( $("#accountName").textContent=n );
   $("#accountMeta")&&( $("#accountMeta").textContent=[profile?.department,profile?.campus_id].filter(Boolean).join(" · ")||"LAYER MEMBER" );
 }
}
client.auth.getSession().then(({data})=>hydrate(data.session?.user||null));
client.auth.onAuthStateChange((_e,s)=>hydrate(s?.user||null));

$("#myLayerButton")&&( $("#myLayerButton").onclick=async()=>{if(!user)return openAuth();await loadAccount();$("#accountDialog").showModal()} );
$("#accountClose")&&( $("#accountClose").onclick=()=>$("#accountDialog").close() );
$("#logoutButton")&&( $("#logoutButton").onclick=async()=>{await client.auth.signOut();$("#accountDialog").close()} );

async function loadAccount(){
 let [o,p]=await Promise.all([
   client.from("orders").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
   client.from("custom_print_requests").select("*").eq("user_id",user.id).order("created_at",{ascending:false})
 ]);
 let orders=o.data||[],prints=p.data||[];
 $("#orderCount")&&( $("#orderCount").textContent=String(orders.length).padStart(2,"0") );
 $("#printCount")&&( $("#printCount").textContent=String(prints.length).padStart(2,"0") );
 $("#readyCount")&&( $("#readyCount").textContent=String(orders.filter(x=>(x.status||"").toUpperCase().includes("READY")).length).padStart(2,"0") );
 $("#recentActivity")&&( $("#recentActivity").innerHTML=[...orders.slice(0,2).map(x=>`<div class="activity-item"><b>${x.order_number||"ORDER"}</b><br>${x.status||"SUBMITTED"} · ${x.payment_status||"PAYMENT PENDING"}</div>`),...prints.slice(0,2).map(x=>`<div class="activity-item"><b>${x.request_number||"CUSTOM PRINT"}</b><br>${x.status||"UNDER REVIEW"}</div>`)].join("")||"No activity yet." );
 $("#ordersList")&&( $("#ordersList").innerHTML=orders.map(x=>`<div class="activity-item"><b>${x.order_number||x.id}</b><br>${x.status||"SUBMITTED"} · ${x.payment_status||"PAYMENT PENDING"} · ₹${x.total||0}</div>`).join("")||"No orders yet." );
 $("#printsList")&&( $("#printsList").innerHTML=prints.map(x=>`<div class="activity-item"><b>${x.request_number||x.original_filename||"CUSTOM PRINT"}</b><br>${x.status||"UNDER REVIEW"}</div>`).join("")||"No custom print jobs yet." );
 $("#profileCard")&&( $("#profileCard").innerHTML=`<b>${profile?.full_name||user.email}</b><br>${profile?.campus_id||""}<br>${profile?.department||""}<br>${profile?.user_type||""}<br>${user.email}` );
}
async function submitPrintRequest(form,file){
 if(!user)return openAuth("login");
 let f=new FormData(form),path=null;
 if(file){path=`${user.id}/${Date.now()}-${file.name}`;let {error}=await client.storage.from("models").upload(path,file);if(error)return alert(error.message)}
 let payload={
   request_number:"LYR-C-"+Date.now().toString().slice(-8),
   user_id:user.id,requester_name:f.get("name"),department:f.get("department"),
   material:f.get("material"),quantity:+f.get("quantity"),model_path:path,
   original_filename:file?.name||null,notes:f.get("notes"),status:"UNDER REVIEW"
 };
 let {error}=await client.from("custom_print_requests").insert(payload);
 if(error)return alert(error.message);
 form.reset();$("#modelFileName").textContent="STL, 3MF, OBJ or STEP";alert("Fabrication request submitted.");
}
window.LayerAuth={client,openAuth,getUser:()=>user,getProfile:()=>profile,submitPrintRequest};
})();