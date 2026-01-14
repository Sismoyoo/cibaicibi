/* =====================
   CONFIG
===================== */
const GITHUB_MENU_URL =
"https://raw.githubusercontent.com/Sismoyoo/cibaicibi/main/menu_sawah.csv"

/* =====================
   STORAGE (SAFE iOS)
===================== */
const store = {
  get:k => JSON.parse(localStorage.getItem(k) || "[]"),
  set:(k,v) => localStorage.setItem(k, JSON.stringify(v))
}

/* =====================
   STATE
===================== */
let menu = []
let cart = []
let chart = null

/* =====================
   INIT
===================== */
window.onload = () => {
  menu = store.get("menu")
  if(!menu.length) seedMenu()
  renderMenu()
  updateLaporan()

  if(localStorage.getItem("dark")==="1"){
    document.body.classList.add("dark")
  }
}

/* =====================
   SEED MENU
===================== */
function seedMenu(){
  menu = [
    { nama:"Ayam Goreng", harga:12000, kategori:"Makanan" },
    { nama:"Es Teh", harga:4000, kategori:"Minuman" }
  ]
  store.set("menu", menu)
}

/* =====================
   MENU
===================== */
function renderMenu(){
  const key = searchMenu.value.toLowerCase()
  const kat = filterKategori.value
  menuList.innerHTML = ""

  menu
    .filter(m=>{
      return m.nama.toLowerCase().includes(key)
        && (!kat || (m.kategori||"Makanan") === kat)
    })
    .forEach(m=>{
      const btn = document.createElement("button")
      btn.className = "menu-btn"
      btn.innerHTML = `
        ${m.nama}<br>
        <small>${m.kategori||"Makanan"} • Rp${m.harga}</small>
      `
      btn.onclick = () => add(m)
      menuList.appendChild(btn)
    })
}

/* =====================
   CART
===================== */
function add(m){
  const f = cart.find(i=>i.nama===m.nama)
  f ? f.qty++ : cart.push({...m, qty:1})
  renderCart()
}

function renderCart(){
  cartList.innerHTML = ""
  let total = 0

  cart.forEach((c,i)=>{
    total += c.qty * c.harga
    cartList.innerHTML += `
      <div class="cart-item">
        ${c.nama}
        <div class="qty">
          <button onclick="chg(${i},-1)">−</button>
          ${c.qty}
          <button onclick="chg(${i},1)">+</button>
        </div>
      </div>
    `
  })

  document.getElementById("total").innerText = total
}

function chg(i,d){
  cart[i].qty += d
  if(cart[i].qty <= 0) cart.splice(i,1)
  renderCart()
}

/* =====================
   TRANSAKSI
===================== */
function simpanTransaksi(){
  if(!cart.length) return

  const trx = store.get("trx")
  trx.push({
    t: Date.now(),
    items: cart
  })
  store.set("trx", trx)

  cart = []
  renderCart()
  updateLaporan()
  alert("Transaksi tersimpan")
}

/* =====================
   LAPORAN + GRAFIK
===================== */
function updateLaporan(){
  const trx = store.get("trx")

  const mulai = tglMulai.value
    ? new Date(tglMulai.value).getTime()
    : 0

  const akhir = tglAkhir.value
    ? new Date(tglAkhir.value).getTime() + 86399999
    : Infinity

  const today = new Date().toISOString().slice(0,10)

  let omzetPeriode = 0
  let totalQty = 0
  let omzetHariIni = 0
  let mapMenu = {}
  let perHari = {}

  trx.forEach(t=>{
    const trxDate = new Date(t.t).toISOString().slice(0,10)

    // Omzet hari ini (tanpa filter)
    if(trxDate === today){
      t.items.forEach(i=>{
        omzetHariIni += i.qty * i.harga
      })
    }

    // Skip jika di luar filter
    if(t.t < mulai || t.t > akhir) return

    perHari[trxDate] = perHari[trxDate] || 0

    t.items.forEach(i=>{
      const sub = i.qty * i.harga
      omzetPeriode += sub
      totalQty += i.qty
      mapMenu[i.nama] = (mapMenu[i.nama] || 0) + i.qty
      perHari[trxDate] += sub
    })
  })

  // Update UI
  document.getElementById("omzetHari").innerText = omzetPeriode
  document.getElementById("totalTerjual").innerText = totalQty

  const elHariIni = document.getElementById("omzetHariIni")
  if(elHariIni) elHariIni.innerText = omzetHariIni

  // List menu terjual
  menu30Hari.innerHTML = ""
  Object.entries(mapMenu)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([n,q])=>{
      menu30Hari.innerHTML += `<li>${n} (${q})</li>`
    })

  renderGrafik(perHari)
}

function renderGrafik(data){
  const labels = Object.keys(data).sort()
  const values = labels.map(l=>data[l])

  if(chart) chart.destroy()

  chart = new Chart(grafikOmzet,{
    type:"line",
    data:{
      labels,
      datasets:[{
        label:"Omzet Harian",
        data: values
      }]
    },
    options:{
      responsive:true,
      scales:{
        y:{ beginAtZero:true }
      }
    }
  })
}

/* =====================
   EXPORT CSV (DETAIL)
===================== */
function exportCSV(){
  const trx = store.get("trx")

  const mulai = tglMulai.value ? new Date(tglMulai.value).getTime() : 0
  const akhir = tglAkhir.value
    ? new Date(tglAkhir.value).getTime() + 86399999
    : Infinity

  const data = {}

  trx.forEach(t=>{
    if(t.t < mulai || t.t > akhir) return
    const tanggal = new Date(t.t).toISOString().slice(0,10)

    if(!data[tanggal]){
      data[tanggal] = { omzetHarian:0, menu:{} }
    }

    t.items.forEach(i=>{
      const sub = i.qty * i.harga
      data[tanggal].omzetHarian += sub
      if(!data[tanggal].menu[i.nama]){
        data[tanggal].menu[i.nama] = { qty:0, omzet:0 }
      }
      data[tanggal].menu[i.nama].qty += i.qty
      data[tanggal].menu[i.nama].omzet += sub
    })
  })

  let csv = "tanggal,menu,jumlah_terjual,omzet_menu,omzet_harian\n"

  Object.entries(data)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .forEach(([tgl,info])=>{
      Object.entries(info.menu).forEach(([nama,m])=>{
        csv += `${tgl},${nama},${m.qty},${m.omzet},${info.omzetHarian}\n`
      })
    })

  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}))
  a.download = "laporan_penjualan_detail.csv"
  a.click()
}

/* =====================
   SYNC GITHUB
===================== */
function syncMenuGithub(){
  if(!confirm("Menu lama akan ditimpa")) return

  fetch(GITHUB_MENU_URL)
    .then(r=>r.text())
    .then(csv=>{
      menu = []
      csv.trim().split("\n").slice(1).forEach(r=>{
        const [n,k,h] = r.split(",")
        if(n && h){
          menu.push({
            nama: n.trim(),
            kategori: (k||"Makanan").trim(),
            harga: Number(h)
          })
        }
      })
      store.set("menu", menu)
      renderMenu()
      alert("Menu berhasil sync")
    })
}

/* =====================
   BACKUP & RESTORE
===================== */
function backupLocal(){
  const data = {
    menu: store.get("menu"),
    trx: store.get("trx")
  }
  const a = document.createElement("a")
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data)],{type:"application/json"})
  )
  a.download = "cibaicibi-backup.json"
  a.click()
}

function restoreLocal(){
  const f = restoreFile.files[0]
  if(!f) return

  const r = new FileReader()
  r.onload = e=>{
    const d = JSON.parse(e.target.result)
    store.set("menu", d.menu || [])
    store.set("trx", d.trx || [])
    menu = store.get("menu")
    renderMenu()
    updateLaporan()
    alert("Restore selesai")
  }
  r.readAsText(f)
}

/* =====================
   DARK MODE
===================== */
function toggleDark(){
  document.body.classList.toggle("dark")
  localStorage.setItem(
    "dark",
    document.body.classList.contains("dark") ? "1" : "0"
  )
}
