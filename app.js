let db;
const request = indexedDB.open("cibaicibi_db", 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("menu", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("penjualan", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = e => {
  db = e.target.result;
  loadMenu();
  loadMenuList();
};

// ================= MENU MASTER =================
function tambahMenu() {
  const nama = menuNama.value.trim();
  const kategori = menuKategori.value;
  const harga = Number(menuHarga.value);

  if (!nama || !harga) {
    alert("Nama dan harga wajib diisi");
    return;
  }

  const tx = db.transaction("menu", "readwrite");
  tx.objectStore("menu").add({ nama, kategori, harga });

  tx.oncomplete = () => {
    menuNama.value = "";
    menuHarga.value = "";
    loadMenu();
    loadMenuList();
  };
}

function loadMenu() {
  const tx = db.transaction("menu", "readonly");
  const store = tx.objectStore("menu");
  const req = store.getAll();

  req.onsuccess = () => {
    menuSelect.innerHTML = `<option value="">-- Pilih Menu --</option>`;
    req.result.forEach(m => {
      const opt = document.createElement("option");
      opt.textContent = `${m.nama} - Rp${m.harga}`;
      opt.dataset.nama = m.nama;
      opt.dataset.kategori = m.kategori;
      opt.dataset.harga = m.harga;
      menuSelect.appendChild(opt);
    });
  };
}

function loadMenuList() {
  const tx = db.transaction("menu", "readonly");
  const store = tx.objectStore("menu");
  const req = store.getAll();

  req.onsuccess = () => {
    daftarMenu.innerHTML = "";
    req.result.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `${m.nama} (${m.kategori}) - Rp${m.harga}`;
      daftarMenu.appendChild(li);
    });
  };
}

// ================= INPUT PENJUALAN =================
menuSelect.onchange = () => {
  const opt = menuSelect.selectedOptions[0];
  if (!opt || !opt.dataset.harga) return;

  harga.value = opt.dataset.harga;
  kategori.value = opt.dataset.kategori;
  hitungTotal();
};

qty.oninput = hitungTotal;

function hitungTotal() {
  total.value = qty.value * harga.value || "";
}

function simpanPenjualan() {
  const opt = menuSelect.selectedOptions[0];
  const jumlah = Number(qty.value);

  if (!opt || !jumlah) {
    alert("Pilih menu dan isi qty");
    return;
  }

  const data = {
    tanggal: new Date().toISOString().slice(0, 10),
    menu: opt.dataset.nama,
    kategori: opt.dataset.kategori,
    harga: Number(opt.dataset.harga),
    qty: jumlah,
    total: jumlah * Number(opt.dataset.harga),
    waktu: Date.now()
  };

  const tx = db.transaction("penjualan", "readwrite");
  tx.objectStore("penjualan").add(data);

  tx.oncomplete = () => {
    alert("Penjualan tersimpan");
    qty.value = "";
    total.value = "";
  };
}
