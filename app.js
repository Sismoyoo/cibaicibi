let db;
const request = indexedDB.open("cibaicibi_db", 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("penjualan", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = e => db = e.target.result;

function simpan() {
  const menu = document.getElementById("menu").value;
  const kategori = document.getElementById("kategori").value;
  const qty = Number(document.getElementById("qty").value);
  const harga = Number(document.getElementById("harga").value);
  const total = qty * harga;

  document.getElementById("total").value = total;

  const tx = db.transaction("penjualan", "readwrite");
  tx.objectStore("penjualan").add({
    tanggal: new Date().toISOString().slice(0,10),
    menu, kategori, qty, harga, total
  });

  alert("Data tersimpan");
}
