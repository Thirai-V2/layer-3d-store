window.LAYER_DEFAULT_PRODUCTS = [
  {id:"p1",name:"Arc Phone Stand",category:"DESK",price:149,material:"PLA+",finish:"Matte",estimated_delivery_days:1,stock:20,tag:"BESTSELLER",image_url:"assets/phone-stand.svg",image_urls:["assets/phone-stand.svg"],description:"Low-profile phone stand for study desks, lab benches and charging stations."},
  {id:"p2",name:"Modular Desk Organiser",category:"DESK",price:229,material:"PLA+",finish:"Fine",estimated_delivery_days:1,stock:12,tag:"MODULAR",image_url:"assets/desk-organiser.svg",image_urls:["assets/desk-organiser.svg"],description:"Geometric organiser for pens, tools, cables and small electronic components."},
  {id:"p3",name:"Gear Demo Model",category:"ENGINEERING",price:299,material:"PLA+",finish:"Fine",estimated_delivery_days:2,stock:10,tag:"STEM",image_url:"assets/gear-model.svg",image_urls:["assets/gear-model.svg"],description:"Hands-on mechanism model for classroom explanation and project demonstrations."},
  {id:"p4",name:"Campus Name Tag",category:"CAMPUS",price:79,material:"PLA+",finish:"Dual tone",estimated_delivery_days:1,stock:50,tag:"PERSONALISE",image_url:"assets/campus-keytag.svg",image_urls:["assets/campus-keytag.svg"],description:"Personalised name or identity tag with department and campus styling."},
  {id:"p5",name:"Fold Mini Planter",category:"DECOR",price:179,material:"PLA+",finish:"Textured",estimated_delivery_days:1,stock:15,tag:"DESIGN PICK",image_url:"assets/planter.svg",image_urls:["assets/planter.svg"],description:"Architectural planter with faceted printed surfaces for desk and indoor spaces."},
  {id:"p6",name:"Project Enclosure S",category:"ENGINEERING",price:199,material:"PETG",finish:"Standard",estimated_delivery_days:2,stock:10,tag:"PROJECT READY",image_url:"assets/enclosure.svg",image_urls:["assets/enclosure.svg"],description:"Compact electronics enclosure for sensors, controllers and prototype boards."}
];

window.LayerCatalog = {
  money(n){ return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2}); },
  fallbackImage(id){
    return (window.LAYER_DEFAULT_PRODUCTS.find(p=>p.id===id)||{}).image_url || "assets/phone-stand.svg";
  },
  normalize(p){
    const fb=window.LAYER_DEFAULT_PRODUCTS.find(x=>x.id===p.id)||{};
    let imgs=Array.isArray(p.image_urls)?p.image_urls:[];
    if(!imgs.length && p.image_url) imgs=[p.image_url];
    if(!imgs.length && fb.image_url) imgs=[fb.image_url];
    return {
      ...fb,...p,
      category:(p.category||fb.category||"OBJECT").replace(" / UTILITY","").replace(" EDITION","").replace(" / GIFT",""),
      estimated_delivery_days:Number(p.estimated_delivery_days ?? fb.estimated_delivery_days ?? 1),
      stock:Number(p.stock ?? fb.stock ?? 0),
      image_url:imgs[0] || fb.image_url,
      image_urls:imgs
    };
  },
  async load(client){
    if(!client) return window.LAYER_DEFAULT_PRODUCTS.map(this.normalize);
    const {data,error}=await client.from("products").select("*").eq("active",true).order("featured",{ascending:false}).order("created_at",{ascending:true});
    if(error || !data?.length) return window.LAYER_DEFAULT_PRODUCTS.map(this.normalize);
    return data.map(this.normalize);
  }
};