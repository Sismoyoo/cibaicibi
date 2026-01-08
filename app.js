/* =====================
   STORAGE ABSTRACTION
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
  cartList.innerHTML=""
  let total=0
  cart.forEach((c,i)=>{
    total+=c.qty*c.harga
    cartList.innerHTML+=`
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
  totalEl.innerText=total
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
  alert("Transaksi tersimpan (offline)")
}

/* =====================
   START
===================== */
init()
