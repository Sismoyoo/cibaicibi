let db, chart7hari;
const req = indexedDB.open("cibaicibi_db", 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("menu", { keyPath:"id", autoIncrement:true });
  db.createObjectStore("penjualan", { keyPath:"id", autoIncrement:true });
};

req.onsuccess = e => {
  db = e.target.result;
  loadMenu();
  hitungOmzet30Hari();
  grafik7Hari();
  top10Menu();
};

// ===== MENU =====
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
  if (!file) return alert("Pilih file CSV");

  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split("\n");
    const tx = db.transaction("menu","readwrite");
    const store = tx.objectStore("menu");

    for (let i=1;i<lines.length;i++) {
      const [nama,kategori,harga] = lines[i].split(",");
      if (nama && harga) {
        store.add({
          nama: nama.trim(),
          kategori: (kategori||"Lainnya").trim(),
          harga: Number(harga.trim())
        });
      }
    }
    tx.oncomplete = () => {
      alert("Import menu selesai");
      loadMenu();
    };
  };
  reader.readAsText(file);
}

// ===== LOAD MENU =====
function loadMenu() {
  menuSelect.innerHTML="";
  db.transaction("menu").objectStore("menu").getAll().onsuccess = e => {
    e.target.result.forEach(m => {
      const o = document.createElement("option");
      o.text = `${m.nama} - Rp${m.harga}`;
      o.dataset.nama = m.nama;
      o.dataset.harga = m.harga;
      menuSelect.add(o);
    });
  };
}

menuSelect.onchange = () => {
  const o = menuSelect.selectedOptions[0];
  harga.value = o.dataset.harga;
  hitungTotal();
};

qty.oninput = hitungTotal;
function hitungTotal() {
  total.value = qty.value * harga.value || "";
}

// ===== PENJUALAN =====
function simpanPenjualan() {
  if (!qty.value) return alert("Isi qty");
  const o = menuSelect.selectedOptions[0];

  db.transaction("penjualan","readwrite").objectStore("penjualan").add({
    tanggal: new Date().toISOString().slice(0,10),
    menu: o.dataset.nama,
    qty: Number(qty.value),
    total: Number(total.value)
  });

  qty.value=""; total.value="";
  setTimeout(() => {
    hitungOmzet30Hari();
    grafik7Hari();
    top10Menu();
  },200);
}

// ===== OMZET 30 HARI =====
function hitungOmzet30Hari() {
  let sum = 0;
  const now = new Date();

  db.transaction("penjualan").objectStore("penjualan").getAll().onsuccess = e => {
    e.target.result.forEach(p => {
      const d = new Date(p.tanggal);
      const diff = (now - d) / (1000*60*60*24);
      if (diff <= 30) sum += p.total;
    });
    omzet30.innerText = sum;
  };
}

// ===== GRAFIK 7 HARI =====
function grafik7Hari() {
  const map={}, labels=[], data=[];
  for (let i=6;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=d.toISOString().slice(0,10);
    labels.push(k.slice(5));
    map[k]=0;
  }

  db.transaction("penjualan").objectStore("penjualan").getAll().onsuccess = e => {
    e.target.result.forEach(p => {
      if (map[p.tanggal]!=null) map[p.tanggal]+=p.total;
    });
    Object.values(map).forEach(v=>data.push(v));

    if (chart7hari) chart7hari.destroy();
    chart7hari = new Chart(document.getElementById("chart7hari"),{
      type:"line",
      data:{ labels, datasets:[{ data }] }
    });
  };
}

// ===== TOP 10 MENU =====
function top10Menu() {
  const map = {};
  db.transaction("penjualan").objectStore("penjualan").getAll().onsuccess = e => {
    e.target.result.forEach(p => {
      map[p.menu] = (map[p.menu]||0) + p.qty;
    });

    const sorted = Object.entries(map)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10);

    topMenu.innerHTML="";
    sorted.forEach(([menu,qty]) => {
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${menu}</td><td>${qty}</td>`;
      topMenu.appendChild(tr);
    });
  };
}
