let db;
const request = indexedDB.open("cibaicibi_db", 2);

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

function tambahMenu() {
  const nama = menuNama.value.trim();
  const kategori = menuKategori.value;
  const harga = Number(menuHarga.value);

  if (!nama || !harga) {
    alert("Nama & harga wajib diisi");
    return;
  }

  const tx = db.transaction("menu", "readwrite");
  tx.objectStore("menu").add({ nama, kategori, harga });

  tx.oncomplete = () => {
    menuNama.value = "";
    menuHarga.value = "";
    loadMenu();
  };
}

function loadMenu() {
  const tx = db.transaction("menu", "readonly");
  const store = tx.objectStore("menu");
  const req = store.getAll();

  req.onsuccess = () => {
    const ul = document.getElementById("daftarMenu");
    ul.innerHTML = "";

    req.result.forEach(m => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${m.nama} (${m.kategori}) - Rp${m.harga}
        <button onclick="hapusMenu(${m.id})">❌</button>
      `;
      ul.appendChild(li);
    });
  };
}

function hapusMenu(id) {
  if (!confirm("Hapus menu ini?")) return;

  const tx = db.transaction("menu", "readwrite");
  tx.objectStore("menu").delete(id);
  tx.oncomplete = loadMenu;
}
