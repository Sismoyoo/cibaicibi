let db, chartHarian, chartBulanan;
const request = indexedDB.open("cibaicibi_db", 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("menu", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("penjualan", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = e => {
  db = e.target.result;
  loadMenu();
  hitungHariIni();
  grafik7Hari();
};

// ===== MENU =====
function tambahMenu() {
  if (!menuNama.value || !menuHarga.value) return alert("Lengkapi menu");
  db.transaction("menu", "readwrite")
    .objectStore("menu")
    .add({
      nama: menuNama.value,
      kategori: menuKategori.value,
      harga: Number(menuHarga.value)
    });
  menuNama.value = "";
  menuHarga.value = "";
  setTimeout(loadMenu, 200);
}

function loadMenu() {
  const store = db.transaction("menu").objectStore("menu");
  store.getAll().onsuccess = e => {
    menuSelect.innerHTML = `<option value="">-- Pilih Menu --</option>`;
    e.target.result.forEach(m => {
      const opt = document.createElement("option");
      opt.text = `${m.nama} - Rp${m.harga}`;
      opt.dataset = m;
      menuSelect.add(opt);
    });
  };
}

// ===== INPUT PENJUALAN =====
menuSelect.onchange = () => {
  const o = menuSelect.selectedOptions[0];
  if (!o?.dataset?.harga) return;
  harga.value = o.dataset.harga;
  hitungTotal();
};

qty.oninput = hitungTotal;
function hitungTotal() {
  total.value = qty.value * harga.value || "";
}

function simpanPenjualan() {
  const o = menuSelect.selectedOptions[0];
  if (!o || !qty.value) return alert("Lengkapi data");

  db.transaction("penjualan", "readwrite")
    .objectStore("penjualan")
    .add({
      tanggal: new Date().toISOString().slice(0,10),
      total: Number(total.value)
    });

  qty.value = "";
  total.value = "";
  setTimeout(() => {
    hitungHariIni();
    grafik7Hari();
  }, 200);
}

// ===== REKAP HARIAN =====
function hitungHariIni() {
  const today = new Date().toISOString().slice(0,10);
  let sum = 0;
  db.transaction("penjualan")
    .objectStore("penjualan")
    .getAll().onsuccess = e => {
      e.target.result.forEach(p => {
        if (p.tanggal === today) sum += p.total;
      });
      totalHari.innerText = sum;
    };
}

// ===== GRAFIK 7 HARI =====
function grafik7Hari() {
  const dataMap = {};
  const labels = [];
  const values = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    labels.push(key.slice(5));
    dataMap[key] = 0;
  }

  db.transaction("penjualan")
    .objectStore("penjualan")
    .getAll().onsuccess = e => {
      e.target.result.forEach(p => {
        if (dataMap[p.tanggal] !== undefined) {
          dataMap[p.tanggal] += p.total;
        }
      });

      Object.values(dataMap).forEach(v => values.push(v));

      if (chartHarian) chartHarian.destroy();
      chartHarian = new Chart(chartHarianCtx, {
        type: "line",
        data: {
          labels,
          datasets: [{ data: values }]
        }
      });
    };
}

// ===== GRAFIK BULANAN =====
function grafikBulanan() {
  const bulan = document.getElementById("bulan").value;
  if (!bulan) return;

  const map = {};
  db.transaction("penjualan")
    .objectStore("penjualan")
    .getAll().onsuccess = e => {
      e.target.result.forEach(p => {
        if (p.tanggal.startsWith(bulan)) {
          map[p.tanggal] = (map[p.tanggal] || 0) + p.total;
        }
      });

      const labels = Object.keys(map).sort();
      const values = labels.map(l => map[l]);

      if (chartBulanan) chartBulanan.destroy();
      chartBulanan = new Chart(chartBulananCtx, {
        type: "bar",
        data: {
          labels: labels.map(l => l.slice(8)),
          datasets: [{ data: values }]
        }
      });
    };
}

// ===== EXPORT =====
function exportCSV() {
  db.transaction("penjualan")
    .objectStore("penjualan")
    .getAll().onsuccess = e => {
      let csv = "Tanggal,Total\n";
      e.target.result.forEach(p => {
        csv += `${p.tanggal},${p.total}\n`;
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cibaicibi.csv";
      a.click();
    };
}

// ===== IMPORT CSV MENU =====
function importCSVMenu() {
  const fileInput = document.getElementById("csvFile");
  if (!fileInput.files.length) {
    alert("Pilih file CSV dulu");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const text = e.target.result;
    prosesCSVMenu(text);
  };

  reader.readAsText(file);
}

function prosesCSVMenu(text) {
  const lines = text.split("\n");
  if (lines.length < 2) {
    alert("CSV kosong atau salah format");
    return;
  }

  const tx = db.transaction("menu", "readwrite");
  const store = tx.objectStore("menu");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [nama, kategori, harga] = line.split(",");

    if (!nama || !kategori || !harga) continue;

    store.add({
      nama: nama.trim(),
      kategori: kategori.trim(),
      harga: Number(harga.trim())
    });
  }

  tx.oncomplete = () => {
    alert("Import menu selesai");
    loadMenu();
  };
}

const chartHarianCtx = document.getElementById("chartHarian");
const chartBulananCtx = document.getElementById("chartBulanan");
