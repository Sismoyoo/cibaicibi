let db;
let menu = [];
let keranjang = [];
let menuDipilih = null;

const req = indexedDB.open("cibaicibi_db", 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("menu", { keyPath:"id", autoIncrement:true });
  db.createObjectStore("transaksi", { keyPath:"id", autoIncrement:true });
};

req.onsuccess = e => {
  db = e.target.result;
  loadMenu();
};

// ===== POPUP =====
function popup(msg){
  const p=document.getElementById("popup");
  p.innerText="✔ "+msg;
  p.style.display="block";
  setTimeout(()=>p.style.display="none",1500);
}

// ===== MENU =====
function tambahMenu(){
  if(!menuNama.value||!menuHarga.value)return;
  db.transaction("menu","readwrite").objectStore("menu")
    .add({nama:menuNama.value,harga:Number(menuHarga.value)});
  menuNama.value="";menuHarga.value="";
  popup("Menu ditambahkan");
  loadMenu();
}

function importMenuCSV(){
  const f=csvMenu.files[0];
  if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    const lines=e.target.result.split("\n");
    const store=db.transaction("menu","readwrite").objectStore("menu");
    for(let i=1;i<lines.length;i++){
      const [n,,h]=lines[i].split(",");
      if(n&&h)store.add({nama:n.trim(),harga:Number(h)});
    }
    popup("Import selesai");
    loadMenu();
  };
  r.readAsText(f);
}

function loadMenu(){
  db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
    menu=e.target.result.sort((a,b)=>a.nama.localeCompare(b.nama));
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
  keranjang.forEach((i,idx)=>{
    t+=i.subtotal;
    keranjangList.innerHTML+=`<li>${i.nama} x${i.qty} = Rp${i.subtotal}</li>`;
  });
  totalAll.innerText=t;
}

// ===== SIMPAN =====
function simpanTransaksi(){
  if(keranjang.length===0)return;
  db.transaction("transaksi","readwrite").objectStore("transaksi")
    .add({tanggal:new Date().toISOString(),items:keranjang});
  keranjang=[];
  renderKeranjang();
  popup("Transaksi tersimpan");
  autoBackup();
}
