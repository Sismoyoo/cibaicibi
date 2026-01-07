let db, chart7hari;
let keranjang = [];

const req = indexedDB.open("cibaicibi_db", 1);

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
  top10Menu();
};

// ===== MENU MASTER =====
function tambahMenu() {
  if (!menuNama.value || !menuHarga.value) return alert("Lengkapi menu");
  db.transaction("menu","readwrite").objectStore("menu").add({
    nama: menuNama.value,
    kategori: menuKategori.value,
    harga: Number(menuHarga.value)
  });
  menuNama.value=""; menuHarga.value="";
  setTimeout(loadMenu,200);
}

// ===== BULK CSV =====
function importMenuCSV() {
  const file = csvMenu.files[0];
  if (!file) return alert("Pilih CSV");

  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split("\n");
    const store = db.transaction("menu","readwrite").objectStore("menu");
    for (let i=1;i<lines.length;i++) {
      const [n,k,h] = lines[i].split(",");
      if (n && h) store.add({
        nama:n.trim(),
        kategori:(k||"Lainnya").trim(),
        harga:Number(h.trim())
      });
    }
    alert("Import menu selesai");
    loadMenu();
  };
  reader.readAsText(file);
}

// ===== LOAD MENU =====
function loadMenu() {
  menuSelect.innerHTML="";
  db.transaction("menu").objectStore("menu").getAll().onsuccess = e => {
    e.target.result.forEach(m => {
      const o=document.createElement("option");
      o.text=`${m.nama} - Rp${m.harga}`;
      o.dataset.nama=m.nama;
      o.dataset.harga=m.harga;
      menuSelect.add(o);
    });
  };
}

menuSelect.onchange = () => harga.value =
  menuSelect.selectedOptions[0]?.dataset.harga || "";

// ===== KERANJANG =====
function tambahKeKeranjang() {
  const o = menuSelect.selectedOptions[0];
  const q = Number(qty.value);
  if (!o || q<=0) return alert("Pilih menu & qty");

  keranjang.push({
    menu:o.dataset.nama,
    harga:Number(o.dataset.harga),
    qty:q,
    subtotal:q*Number(o.dataset.harga)
  });
  qty.value="";
  renderKeranjang();
}

function renderKeranjang() {
  daftarPesanan.innerHTML="";
  let total=0;
  keranjang.forEach((i,idx)=>{
    total+=i.subtotal;
    const li=document.createElement("li");
    li.innerHTML=`${i.menu} x${i.qty} = Rp${i.subtotal}
      <button onclick="hapusItem(${idx})">❌</button>`;
    daftarPesanan.appendChild(li);
  });
  grandTotal.innerText=total;
}

function hapusItem(i) {
  keranjang.splice(i,1);
  renderKeranjang();
}

// ===== SIMPAN TRANSAKSI =====
function simpanTransaksi() {
  if (keranjang.length===0) return alert("Keranjang kosong");
  db.transaction("transaksi","readwrite").objectStore("transaksi").add({
    tanggal:new Date().toISOString().slice(0,10),
    items:keranjang,
    total:keranjang.reduce((s,i)=>s+i.subtotal,0)
  });
  keranjang=[];
  renderKeranjang();
  hitungOmzet30Hari();
  grafik7Hari();
  top10Menu();
  alert("Transaksi tersimpan");
}

// ===== OMZET 30 HARI =====
function hitungOmzet30Hari() {
  let sum=0;
  const now=new Date();
  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
    e.target.result.forEach(t=>{
      const d=new Date(t.tanggal);
      if ((now-d)/(1000*60*60*24)<=30) sum+=t.total;
    });
    omzet30.innerText=sum;
  };
}

// ===== GRAFIK 7 HARI =====
function grafik7Hari() {
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
    chart7hari=new Chart(chart7hariCtx,{
      type:"line",
      data:{labels,datasets:[{data}]}
    });
  };
}
const chart7hariCtx=document.getElementById("chart7hari");

// ===== TOP 10 MENU =====
function top10Menu() {
  const map={};
  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
    e.target.result.forEach(t=>{
      t.items.forEach(i=>{
        map[i.menu]=(map[i.menu]||0)+i.qty;
      });
    });
    const top=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
    topMenu.innerHTML="";
    top.forEach(([m,q])=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${m}</td><td>${q}</td>`;
      topMenu.appendChild(tr);
    });
  };
}
