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
  hitungHariIni();
  grafik7Hari();
};

// ===== MENU MANUAL =====
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

// ===== BULK IMPORT CSV =====
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

// ===== LOAD MENU KE KASIR =====
function loadMenu() {
  menuSelect.innerHTML="";
  db.transaction("menu").objectStore("menu").getAll().onsuccess = e => {
    e.target.result.forEach(m => {
      const o = document.createElement("option");
      o.text = `${m.nama} - Rp${m.harga}`;
      o.dataset.harga = m.harga;
      o.dataset.nama = m.nama;
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
  db.transaction("penjualan","readwrite").objectStore("penjualan").add({
    tanggal: new Date().toISOString().slice(0,10),
    total: Number(total.value)
  });
  qty.value=""; total.value="";
  setTimeout(() => {
    hitungHariIni();
    grafik7Hari();
  },200);
}

// ===== REKAP =====
function hitungHariIni() {
  const today = new Date().toISOString().slice(0,10);
  let sum = 0;
  db.transaction("penjualan").objectStore("penjualan").getAll().onsuccess = e => {
    e.target.result.forEach(p => {
      if (p.tanggal===today) sum+=p.total;
    });
    totalHari.innerText=sum;
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
