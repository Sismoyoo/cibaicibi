let db;
const request = indexedDB.open("cibaicibi_db", 3);

request.onupgradeneeded = e => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("menu")) {
    db.createObjectStore("menu", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("penjualan")) {
    db.createObjectStore("penjualan", { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = e => {
  db = e.target.result;
  loadMenu();
};

// ================= MENU =================
function loadMenu() {
  const tx = db.transaction("menu", "readonly");
  const store = tx.objectStore("menu");
  const req = store.getAll();

  req.onsuccess = () => {
    const select = document.getElementById("menuSelect");
    select.innerHTML = `<option value="">-- Pilih Menu --</option>`;

    req.result.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.nama} - Rp${m.harga}`;
      opt.dataset.harga = m.harga;
      opt.dataset.kategori = m.kategori;
      opt.dataset.nama = m.nama;
      select.appendChild(opt);
    });
  };
}

document.addEventListener("change", e => {
  if (e.target.id === "menuSelect") {
    const opt = e.target.selectedOptions[0];
    if (!opt || !opt.dataset.harga) return;

    document.getElementById("harga").value = opt.dataset.harga;
    document.getElementById("kategori").value = opt.dataset.kategori;
    hitungTotal();
  }
});

document.getElementById("qty")?.addEventListener("input", hitungTotal);

function hitungTotal() {
  const qty = Number(document.getElementById("qty").value);
  const harga = Number(document.getElementById("harga").value);
  document.getElementById("total").value = qty * harga || "";
}

// ================= PENJUALAN =================
function simpanPenjualan() {
  const select = document.getElementById("menuSelect");
  const opt = select.selectedOptions[0];
  const qty = Number(document.getElementById("qty").value);
  const harga = Number(document.getElementById("harga").value);
  const total = qty * harga;

  if (!opt || !opt.dataset.nama || qty <= 0) {
    alert("Pilih menu & isi qty");
    return;
  }

  const data = {
    tanggal: new Date().toISOString().slice(0, 10),
    menu: opt.dataset.nama,
    kategori: opt.dataset.kategori,
    qty,
    harga,
    total,
    waktu: Date.now()
  };

  const tx = db.transaction("penjualan", "readwrite");
  tx.objectStore("penjualan").add(data);

  tx.oncomplete = () => {
    alert("Penjualan tersimpan");
    document.getElementById("qty").value = "";
    document.getElementById("total").value = "";
  };
}
