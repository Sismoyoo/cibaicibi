/* =====================
   CONFIG
===================== */
const GITHUB_MENU_URL =
"https://raw.githubusercontent.com/Sismoyoo/cibaicibi/main/menu_sawah.csv"

/* =====================
   STORAGE (SAFE iOS)
===================== */
const storage = {
  getMenu(){
    return JSON.parse(localStorage.getItem("menu") || "[]")
  },
  saveMenu(data){
    localStorage.setItem("menu", JSON.stringify(data))
  },
  getTransaksi(){
    return JSON.parse(localStorage.getItem("transaksi") || "[]")
  },
  saveTransaksi(data){
    localStorage.setItem("transaksi", JSON.stringify(data))
  }
}

/* =====================
   DATA
===================== */
let menu = []
let cart = []

/* =====================
   INIT
===================== */
function init(){
  menu = storage.getMenu()
  if(menu.length){
    renderMenu()
  }else{
    seedMenu()
  }
}
window.onload = init

function seedMenu(){
  menu = [
    { nama:"Ayam Goreng", harga:12000 },
    { nama:"Ayam Bakar", harga:15000 },
    { nama:"Nasi Goreng", harga:14000 },
    { nama:"Mie Goreng", harga:13000 },
    { nama:"Es Teh", harga:4000 },
    { nama:"Es Jeruk", harga:6000 }
  ]
  storage.saveMenu(menu)
  renderMenu()
}

/* =====================
   MENU
===================== */
function renderMenu(){
  menuList.innerHTML=""
  menu.forEach(m=>{
    const btn=document.createElement("button")
    btn.className="menu-btn"
    btn.innerHTML=`${m.nama}<br><small>Rp${m.harga}</small>`
    btn.onclick=()=>tambahKeCart(m)
    menuList.appendChild(btn)
  })
}

/* =====================
   CART
===================== */
function tambahKeCart(item){
  const found=cart.find(c=>c.nama===item.nama)
  if(found){
    found.qty++
  }else{
    cart.push({...item,qty:1})
  }
  renderCart()
}

function renderCart(){
  const cartListEl = document.getElementById("cartList")
  const totalEl = document.getElementById("total")

  if(!cartListEl || !totalEl) return

  cartListEl.innerHTML = ""
  let total = 0

  cart.forEach((c,i)=>{
    total += c.qty * c.harga
    cartListEl.innerHTML += `
      <div class="cart-item">
        <div>${c.nama}</div>
        <div class="qty">
          <button onclick="ubahQty(${i},-1)">−</button>
          <b>${c.qty}</b>
          <button onclick="ubahQty(${i},1)">+</button>
        </div>
      </div>
    `
  })
  document.getElementById("total").innerText=total
}

function ubahQty(i,d){
  cart[i].qty+=d
  if(cart[i].qty<=0) cart.splice(i,1)
  renderCart()
}

/* =====================
   TRANSAKSI
===================== */
function simpanTransaksi(){
  if(!cart.length) return
  const data = storage.getTransaksi()
  data.push({
    tanggal: new Date().toISOString(),
    items: cart,
    total: cart.reduce((s,i)=>s+i.qty*i.harga,0)
  })
  storage.saveTransaksi(data)
  cart=[]
  renderCart()
  alert("Transaksi tersimpan")
}

/* =====================
   SYNC GITHUB CSV
===================== */
function syncMenuGithub(){
  if(!confirm("Menu lama akan ditimpa")) return

  fetch(GITHUB_MENU_URL)
    .then(r=>{
      if(!r.ok) throw new Error("CSV tidak ditemukan")
      return r.text()
    })
    .then(csv=>{
      const rows = csv.trim().split("\n")
      const newMenu = []

      for(let i=1;i<rows.length;i++){
        const cols = rows[i].split(",").map(c=>c.trim())
        if(cols.length < 3) continue
        const [nama, kategori, harga] = cols
        if(!nama || !harga) continue
        newMenu.push({ nama, harga:Number(harga) })
      }

      menu = newMenu
      storage.saveMenu(menu)
      renderMenu()
      alert("Menu berhasil sync dari GitHub")
    })
    .catch(err=>{
      alert("Sync gagal: " + err.message)
    })
}

/* =====================
   BACKUP & RESTORE
===================== */
function backupLocal(){
  const data = {
    menu: storage.getMenu(),
    transaksi: storage.getTransaksi()
  }
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"})
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "cibaicibi-backup.json"
  a.click()
}

function restoreLocal(){
  const f = restoreFile.files[0]
  if(!f) return
  const r = new FileReader()
  r.onload = e=>{
    const data = JSON.parse(e.target.result)
    storage.saveMenu(data.menu||[])
    storage.saveTransaksi(data.transaksi||[])
    menu = storage.getMenu()
    renderMenu()
    alert("Restore selesai")
  }
  r.readAsText(f)
}
window.onload = init
