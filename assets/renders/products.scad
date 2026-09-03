$fn=72;
product_id = is_undef(product_id) ? 1 : product_id;

module rounded_box(size=[60,40,10], r=5){
  minkowski(){ cube([size[0]-2*r,size[1]-2*r,size[2]-2*r], center=true); sphere(r=r); }
}

module phone_stand(){
  color([0.10,0.10,0.12])
  union(){
    translate([0,0,4]) rounded_box([72,54,8],5);
    translate([0,16,33]) rotate([18,0,0]) difference(){
      rounded_box([58,9,66],4);
      translate([0,-4,1]) cube([36,20,44],center=true);
    }
    translate([0,-15,10]) rotate([-18,0,0]) rounded_box([48,8,16],3);
  }
}

module key_tag(){
  color([0.78,1.0,0.18])
  difference(){
    linear_extrude(6) offset(r=7) square([82,34],center=true);
    translate([-31,0,-2]) cylinder(h=12,r=5);
  }
  color([0.08,0.08,0.09]) translate([7,-6,6]) linear_extrude(2) text("ACET",size=16,font="DejaVu Sans:style=Bold",halign="center");
}

module hex_cup(){
  color([0.42,0.30,0.95])
  difference(){
    cylinder(h=68,r=34,$fn=6);
    translate([0,0,5]) cylinder(h=68,r=27,$fn=6);
  }
  color([0.12,0.12,0.14]) translate([47,0,0]) difference(){cylinder(h=48,r=23,$fn=6);translate([0,0,5])cylinder(h=48,r=17,$fn=6);} 
}

module gear(teeth=16,r=30,h=9,hole=7){
  difference(){
    union(){
      cylinder(h=h,r=r);
      for(i=[0:teeth-1]) rotate([0,0,i*360/teeth]) translate([r,0,h/2]) cube([10,8,h],center=true);
    }
    translate([0,0,-1]) cylinder(h=h+2,r=hole);
  }
}
module gear_model(){
  color([0.42,0.30,0.95]) gear(18,31,10,7);
  color([0.78,1.0,0.18]) translate([51,17,2]) gear(12,21,10,6);
  color([0.16,0.16,0.18]) translate([-39,-28,1]) gear(10,18,10,5);
  color([0.10,0.10,0.12]) translate([5,0,-5]) rounded_box([115,85,7],6);
}

module planter(){
  color([0.95,0.32,0.12])
  difference(){
    linear_extrude(height=62,scale=.72) circle(r=36,$fn=7);
    translate([0,0,6]) linear_extrude(height=62,scale=.72) circle(r=29,$fn=7);
  }
}

module cable_dock(){
  color([0.78,1.0,0.18]) difference(){
    rounded_box([96,40,18],8);
    for(x=[-28,0,28]) translate([x,0,4]) cylinder(h=24,r=5);
    for(x=[-28,0,28]) translate([x,-16,4]) cube([6,24,24],center=true);
  }
  color([0.42,0.30,0.95]) translate([0,0,-10]) rounded_box([66,28,5],3);
}

module campus_block(){
  color([0.82,0.82,0.80]) union(){
    translate([0,0,14]) cube([92,54,28],center=true);
    translate([0,0,33]) linear_extrude(12,scale=.8) square([92,54],center=true);
    translate([0,-27,24]) cube([28,7,30],center=true);
  }
  color([0.42,0.30,0.95]) for(x=[-30,0,30]) translate([x,-28,16]) cube([16,3,13],center=true);
  color([0.78,1.0,0.18]) translate([0,-31,35]) cube([35,3,7],center=true);
}

module enclosure(){
  color([0.12,0.12,0.14]) difference(){
    rounded_box([92,64,32],6);
    translate([0,0,8]) rounded_box([78,50,26],4);
    translate([46,0,1]) cube([14,22,10],center=true);
  }
  color([0.25,0.25,0.28]) translate([0,0,18]) rounded_box([92,64,5],5);
  color([0.42,0.30,0.95]) for(y=[-17,-7,3,13]) translate([0,y,22]) cube([42,2.5,2],center=true);
}

if(product_id==1) phone_stand();
if(product_id==2) key_tag();
if(product_id==3) hex_cup();
if(product_id==4) gear_model();
if(product_id==5) planter();
if(product_id==6) cable_dock();
if(product_id==7) campus_block();
if(product_id==8) enclosure();
