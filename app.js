let db, chart
let menu = []
let keranjang = []
let dipilih = null

// ====== GANTI JIKA PERLU ======
const GITHUB_MENU_URL =
"https://raw.githubusercontent.com/Sismoyoo/cibaicibi/main/menu_sawah.csv"

// ====== INIT DATABASE ======
const req = indexedDB.open("cibaicibi_db", 6)

req.onupgradeneeded = e => {
  db = e.target.result
  if (!db.objectStoreNames.contains("menu")) {
    db.createObjectStore("menu", { keyPath: "id", autoIncrement: true })
  }
  if (!db.objectStoreNames.contains("transaksi")) {
    db.createObjectStore("transaksi", { keyPath: "id", autoIncrement: true })
  }
}

req.onsuccess = e => {
  db = e.target.result
  loadMenu()
  updateLaporan()

  // AUTO SYNC MENU PERTAMA KALI
  if (!localStorage.getItem("menuSynced")) {
    setTimeout(() => {
      syncMenuGithub(true)
      localStorage.setItem("menuSynced", "1")
    }, 500)
  }
}

// ====== TOAST ======
function toast(text) {
  popup.innerText = "✔ " + text
  popup.style.display = "block"
  setTimeout(() => popup.style.display = "none", 1500)
}

// ====== LOAD MENU ======
function loadMenu() {
  const tx = db.transaction("menu", "readonly")
  const store = tx.objectStore("menu")
  store.getAll().onsuccess = e => {
    menu = e.target.result || []
    renderMenu()
  }
}

// ====== RENDER MENU ======
function renderMenu() {
  menuList.innerHTML = ""
  const keyword = searchMenu.value.toLowerCase()

  const groups = {
    "⭐ Favorit": menu.filter(m => m.favorit),
    "🍽️ Makanan": menu.filter(m => m.kategori === "Makanan"),
    "🥤 Minuman": menu.filter(m => m.kategori === "Minuman"),
    "📦 Lainnya": menu.filter(m => m.kategori === "Lainnya")
  }

  Object.entries(groups).forEach(([title, items]) => {
    const list = items
      .filter(m => m.nama.toLowerCase().includes(keyword))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"))

    if (!list.length) return

    menuList.innerHTML += `<div class="group-title">${title}</div>`

    list.forEach(m => {
      const btn = document.createElement("button")
      btn.className = "menu-btn" + (dipilih && dipilih.id === m.id ? " active" : "")
      btn.innerHTML = `
        <span class="badge ${m.kategori.toLowerCase()}">${m.kategori}</span>
        ${m.favorit ? "⭐ " : ""}${m.nama}
        <small>Rp${m.harga}</small>
      `
      btn.onclick = () => {
        dipilih = m
        renderMenu()
        toast(m.nama + " dipilih")
      }
      btn.oncontextmenu = e => {
        e.preventDefault()
        toggleFavorit(m.id)
      }
      menuList.appendChild(btn)
    })
  })
}

// ====== FAVORIT ======
function toggleFavorit(id) {
  const tx = db.transaction("menu", "readwrite")
  const store = tx.objectStore("menu")
  store.get(id).onsuccess = e => {
    const m = e.target.result
    if (!m) return
    m.favorit = !m.favorit
    store.put(m)
    loadMenu()
  }
}

// ====== KERANJANG ======
function tambahKeKeranjang() {
  if (!dipilih || !qty.value) return
  const q = Number(qty.value)
  keranjang.push({
    nama: dipilih.nama,
    harga: dipilih.harga,
    qty: q,
    subtotal: q * dipilih.harga
  })
  qty.value = ""
  renderKeranjang()
  toast("Masuk keranjang")
}

function renderKeranjang() {
  keranjangList.innerHTML = ""
  let total = 0

  keranjang.forEach((i, idx) => {
    total += i.subtotal
    keranjangList.innerHTML += `
      <li>
        <div>${i.nama}</div>
        <div class="qty">
          <button class="qty-btn" onclick="ubahQty(${idx},-1)">−</button>
          <b>${i.qty}</b>
          <button class="qty-btn" onclick="ubahQty(${idx},1)">+</button>
          <button class="del" onclick="hapusItem(${idx})">✕</button>
        </div>
      </li>
    `
  })

  totalAll.innerText = total
}

function ubahQty(i, delta) {
  keranjang[i].qty += delta
  if (keranjang[i].qty <= 0) {
    keranjang.splice(i, 1)
  } else {
    keranjang[i].subtotal = keranjang[i].qty * keranjang[i].harga
  }
  renderKeranjang()
}

function hapusItem(i) {
  keranjang.splice(i, 1)
  renderKeranjang()
}

// ====== SIMPAN TRANSAKSI ======
function simpanTransaksi() {
  if (!keranjang.length) return

  const tx = db.transaction("transaksi", "readwrite")
  tx.objectStore("transaksi").add({
    tanggal: new Date().toISOString().slice(0, 10),
    items: keranjang,
    total: keranjang.reduce((s, i) => s + i.subtotal, 0)
  })

  keranjang = []
  renderKeranjang()
  toast("Transaksi tersimpan")
  updateLaporan()
}

// ====== LAPORAN ======
function updateLaporan() {
  let sum = 0
  let now = new Date()
  let map = {}

  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess = e => {
    e.target.result.forEach(t => {
      if ((now - new Date(t.tanggal)) / 86400000 <= 30) {
        sum += t.total
      }
      map[t.tanggal] = (map[t.tanggal] || 0) + t.total
    })
    if (omzet30) omzet30.innerText = sum
    if (chart7) renderChart(map)
  }
}

function renderChart(map) {
  const labels = []
  const data = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    labels.push(k.slice(5))
    data.push(map[k] || 0)
  }
  if (chart) chart.destroy()
  chart = new Chart(chart7, {
    type: "line",
    data: { labels, datasets: [{ data }] }
  })
}

// ====== BACKUP LOCAL ======
function backupLocal() {
  const data = {}
  db.transaction("menu").objectStore("menu").getAll().onsuccess = e => {
    data.menu = e.target.result
    db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess = t => {
      data.transaksi = t.target.result
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "cibaicibi-backup.json"
      a.click()
    }
  }
}

// ====== RESTORE ======
function restoreLocal() {
  const f = restoreFile.files[0]
  if (!f) return
  const r = new FileReader()
  r.onload = e => {
    const d = JSON.parse(e.target.result)
    const tm = db.transaction("menu", "readwrite").objectStore("menu")
    const tt = db.transaction("transaksi", "readwrite").objectStore("transaksi")
    tm.clear()
    tt.clear()
    d.menu.forEach(x => tm.add(x))
    d.transaksi.forEach(x => tt.add(x))
    loadMenu()
    updateLaporan()
    toast("Restore selesai")
  }
  r.readAsText(f)
}

// ====== SYNC MENU GITHUB (FINAL FIX) ======
function waitForDB(cb){
  if(db){
    cb()
  } else {
    setTimeout(()=>waitForDB(cb),100)
  }
}

function syncMenuGithub(silent = false){
  if(!silent && !confirm("Menu lama akan ditimpa")) return

  waitForDB(() => {

    menu = []
    menuList.innerHTML = ""

    fetch(GITHUB_MENU_URL)
      .then(r=>{
        if(!r.ok) throw new Error("CSV tidak ditemukan")
        return r.text()
      })
      .then(csv=>{
        const rows = csv.trim().split("\n")
        const store = db.transaction("menu","readwrite").objectStore("menu")
        store.clear()

        for(let i=1;i<rows.length;i++){
          const cols = rows[i].split(",").map(c=>c.trim())
          if(cols.length < 3) continue

          const [nama,kategori,harga] = cols
          if(!nama || !harga) continue

          store.add({
            nama,
            kategori: kategori || "Makanan",
            harga: Number(harga),
            favorit:false
          })
        }

        loadMenu()
        setTimeout(loadMenu,300)
        if(!silent) toast("Menu berhasil sync dari GitHub")
      })
      .catch(err=>{
        alert("Sync gagal: " + err.message)
      })

  })
}

// ====== DARK MODE ======
function toggleDark() {
  document.body.classList.toggle("dark")
  localStorage.setItem("darkMode",
    document.body.classList.contains("dark") ? "1" : "0")
}
if (localStorage.getItem("darkMode") === "1") {
  document.body.classList.add("dark")
}
