let db, chart7hari;
let menu = [];
let keranjang = [];
let menuDipilih = null;

// ===== POPUP =====
function popup(msg){
  const p=document.getElementById("popup");
  p.innerText="✔ "+msg;
  p.style.display="block";
  setTimeout(()=>p.style.display="none",1500);
}

// ===== DATABASE =====
const req = indexedDB.open("cibaicibi_db", 2);

req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("menu", { keyPath:"id", autoIncrement:true });
  db.createObjectStore("transaksi", { keyPath:"id", autoIncrement:true });
};

req.onsuccess = e => {
  db = e.target.result;
  loadMenu();
  hitungOmzet30Hari();
  grafik7Hari();
  top20Menu();
};

// ===== MENU =====
function loadMenu(){
  db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
    menu = e.target.result.sort((a,b)=>a.nama.localeCompare(b.nama));
    renderMenu();
  };
}

function renderMenu(){
  menuList.innerHTML="";
  const s=searchMenu.value.toLowerCase();
  menu.filter(m=>m.nama.toLowerCase().includes(s))
    .forEach(m=>{
      const b=document.createElement("button");
      b.innerText=`${m.nama} - Rp${m.harga}`;
      b.onclick=()=>{menuDipilih=m;popup(m.nama+" dipilih")};
      menuList.appendChild(b);
    });
}

// ===== KERANJANG =====
function tambahKeKeranjang(){
  if(!menuDipilih||!qty.value)return;
  keranjang.push({
    nama:menuDipilih.nama,
    harga:menuDipilih.harga,
    qty:Number(qty.value),
    subtotal:menuDipilih.harga*qty.value
  });
  qty.value="";
  renderKeranjang();
  popup("Masuk keranjang");
}

function renderKeranjang(){
  keranjangList.innerHTML="";
  let t=0;
  keranjang.forEach(i=>{
    t+=i.subtotal;
    keranjangList.innerHTML+=`<li>${i.nama} x${i.qty} = Rp${i.subtotal}</li>`;
  });
  totalAll.innerText=t;
}

// ===== SIMPAN TRANSAKSI =====
function simpanTransaksi(){
  if(keranjang.length===0)return;
  db.transaction("transaksi","readwrite").objectStore("transaksi")
    .add({
      tanggal:new Date().toISOString().slice(0,10),
      items:keranjang,
      total:keranjang.reduce((s,i)=>s+i.subtotal,0)
    });
  keranjang=[];
  renderKeranjang();
  popup("Transaksi tersimpan");
  hitungOmzet30Hari();
  grafik7Hari();
  top20Menu();
  autoBackup();
}

// ===== OMZET 30 HARI =====
function hitungOmzet30Hari(){
  let sum=0;
  const now=new Date();
  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
    e.target.result.forEach(t=>{
      const d=new Date(t.tanggal);
      if((now-d)/(1000*60*60*24)<=30) sum+=t.total;
    });
    omzet30.innerText=sum;
  };
}

// ===== GRAFIK 7 HARI =====
function grafik7Hari(){
  const map={},labels=[],data=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const k=d.toISOString().slice(0,10);
    labels.push(k.slice(5));
    map[k]=0;
  }
  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
    e.target.result.forEach(t=>{
      if(map[t.tanggal]!=null) map[t.tanggal]+=t.total;
    });
    Object.values(map).forEach(v=>data.push(v));
    if(chart7hari) chart7hari.destroy();
    chart7hari=new Chart(document.getElementById("chart7hari"),{
      type:"line",
      data:{labels,datasets:[{data}]}
    });
  };
}

// ===== TOP 20 MENU =====
function top20Menu(){
  const map={};
  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
    e.target.result.forEach(t=>{
      t.items.forEach(i=>{
        map[i.nama]=(map[i.nama]||0)+i.qty;
      });
    });
    const top=Object.entries(map)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,20);
    topMenu20.innerHTML="";
    top.forEach(([m,q])=>{
      topMenu20.innerHTML+=`<tr><td>${m}</td><td>${q}</td></tr>`;
    });
  };
}
