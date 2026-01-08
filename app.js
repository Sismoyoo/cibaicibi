const GITHUB_MENU_URL =
"https://raw.githubusercontent.com/Sismoyoo/cibaicibi/main/menu_sawah.csv"

/* STORAGE */
const store={
  get(k){return JSON.parse(localStorage.getItem(k)||"[]")},
  set(k,v){localStorage.setItem(k,JSON.stringify(v))}
}

let menu=[],cart=[]

/* INIT */
window.onload=()=>{
  menu=store.get("menu")
  if(!menu.length) seedMenu()
  renderMenu()
  updateLaporan()
  if(localStorage.getItem("dark")==="1")document.body.classList.add("dark")
}

function seedMenu(){
  menu=[
    {nama:"Ayam Goreng",harga:12000},
    {nama:"Ayam Bakar",harga:15000},
    {nama:"Nasi Goreng",harga:14000},
    {nama:"Es Teh",harga:4000}
  ]
  store.set("menu",menu)
}

/* MENU */
function renderMenu(){
  const key=search.value.toLowerCase()
  menuList.innerHTML=""
  menu.filter(m=>m.nama.toLowerCase().includes(key))
      .forEach(m=>{
    const b=document.createElement("button")
    b.className="menu-btn"
    b.innerHTML=`${m.nama}<br><small>Rp${m.harga}</small>`
    b.onclick=()=>add(m)
    menuList.appendChild(b)
  })
}

/* CART */
function add(m){
  const f=cart.find(i=>i.nama===m.nama)
  f?f.qty++:cart.push({...m,qty:1})
  renderCart()
}
function renderCart(){
  cartList.innerHTML=""
  let t=0
  cart.forEach((c,i)=>{
    t+=c.qty*c.harga
    cartList.innerHTML+=`
      <div class="cart-item">
        ${c.nama}
        <div class="qty">
          <button onclick="chg(${i},-1)">−</button>
          ${c.qty}
          <button onclick="chg(${i},1)">+</button>
        </div>
      </div>`
  })
  total.innerText=t
}
function chg(i,d){
  cart[i].qty+=d
  if(cart[i].qty<=0)cart.splice(i,1)
  renderCart()
}

/* TRANSAKSI */
function simpanTransaksi(){
  if(!cart.length)return
  const trx=store.get("trx")
  trx.push({
    t:Date.now(),
    items:cart
  })
  store.set("trx",trx)
  cart=[]
  renderCart()
  updateLaporan()
  alert("Tersimpan")
}

/* LAPORAN + TOP */
function updateLaporan(){
  const trx=store.get("trx")
  let h=0,d7=0,d30=0,map={}
  const now=Date.now()
  trx.forEach(t=>{
    const diff=(now-t.t)/86400000
    const sum=t.items.reduce((s,i)=>s+i.qty*i.harga,0)
    if(diff<1)h+=sum
    if(diff<=7)d7+=sum
    if(diff<=30)d30+=sum
    t.items.forEach(i=>{
      map[i.nama]=(map[i.nama]||0)+i.qty
    })
  })
  omzetHari.innerText=h
  omzet7.innerText=d7
  omzet30.innerText=d30

  topMenu.innerHTML=""
  Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .forEach(i=>{
      topMenu.innerHTML+=`<li>${i[0]} (${i[1]})</li>`
    })
}

/* SYNC */
function syncMenuGithub(){
  fetch(GITHUB_MENU_URL)
    .then(r=>r.text())
    .then(csv=>{
      const rows=csv.trim().split("\n")
      menu=[]
      for(let i=1;i<rows.length;i++){
        const [n,,h]=rows[i].split(",")
        if(n&&h)menu.push({nama:n.trim(),harga:+h})
      }
      store.set("menu",menu)
      renderMenu()
      alert("Menu tersync")
    })
}

/* BACKUP */
function backupLocal(){
  const data={menu:store.get("menu"),trx:store.get("trx")}
  const a=document.createElement("a")
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}))
  a.download="cibaicibi-backup.json"
  a.click()
}
function restoreLocal(){
  const f=restoreFile.files[0]
  if(!f)return
  const r=new FileReader()
  r.onload=e=>{
    const d=JSON.parse(e.target.result)
    store.set("menu",d.menu||[])
    store.set("trx",d.trx||[])
    menu=store.get("menu")
    renderMenu()
    updateLaporan()
  }
  r.readAsText(f)
}

/* DARK MODE */
function toggleDark(){
  document.body.classList.toggle("dark")
  localStorage.setItem("dark",document.body.classList.contains("dark")?"1":"0")
}
window.onload = init
