/* =====================
   DATABASE INIT
===================== */
let db
let menu = []
let cart = []

const DB_NAME = "cibaicibi_phase3"
const DB_VERSION = 1

const req = indexedDB.open(DB_NAME, DB_VERSION)

req.onupgradeneeded = e => {
  const database = e.target.result
  if (!database.objectStoreNames.contains("menu")) {
    database.createObjectStore("menu", { keyPath: "id", autoIncrement: true })
  }
  if (!database.objectStoreNames.contains("transaksi")) {
    database.createObjectStore("transaksi", { keyPath: "id", autoIncrement: true })
  }
}

req.onsuccess = e => {
  db = e.target.result
  initMenu()
}

req.onerror = e => {
  alert("DB Error: " + e.target.error)
}

/* =====================
   MENU (DB)
===================== */
function initMenu() {
  const store = db.transaction("menu", "readonly").objectStore("menu")
  store.getAll().onsuccess = e => {
    if (e.target.result.length) {
      menu = e.target.result
      renderMenu()
    } else {
      seedMenu()
    }
  }
}

function seedMenu() {
  const dummy = [
    { nama: "Ayam Goreng", harga: 12000 },
    { nama: "Ayam Bakar", harga: 15000 },
    { nama: "Nasi Goreng", harga: 14000 },
    { nama: "Mie Goreng", harga: 13000 },
    { nama: "Es Teh", harga: 4000 },
    { nama: "Es Jeruk", harga: 6000 }
  ]

  const tx = db.transaction("menu", "readwrite")
  const store = tx.objectStore("menu")

  dummy.forEach(m => store.add(m))

  tx.oncomplete = () => initMenu()
}

function renderMenu() {
  menuList.innerHTML = ""
  menu.forEach(m => {
    const btn = document.createElement("button")
    btn.className = "menu-btn"
    btn.innerHTML = `${m.nama}<br><small>Rp${m.harga}</small>`
    btn.onclick = () => tambahKeCart(m)
    menuList.appendChild(btn)
  })
}

/* =====================
   CART
===================== */
function tambahKeCart(item) {
  const found = cart.find(c => c.nama === item.nama)
  if (found) {
    found.qty++
  } else {
    cart.push({ ...item, qty: 1 })
  }
  renderCart()
}

function renderCart() {
  cartList.innerHTML = ""
  let total = 0

  cart.forEach((c, i) => {
    total += c.qty * c.harga
    cartList.innerHTML += `
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

  document.getElementById("total").innerText = total
}

function ubahQty(i, d) {
  cart[i].qty += d
  if (cart[i].qty <= 0) cart.splice(i, 1)
  renderCart()
}

/* =====================
   TRANSAKSI
===================== */
function simpanTransaksi() {
  if (!cart.length) return

  const total = cart.reduce((s, i) => s + i.qty * i.harga, 0)
  const tx = db.transaction("transaksi", "readwrite")
  tx.objectStore("transaksi").add({
    tanggal: new Date().toISOString(),
    items: cart,
    total
  })

  cart = []
  renderCart()
  alert("Transaksi disimpan (offline)")
}
