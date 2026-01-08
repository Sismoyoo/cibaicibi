const GITHUB_MENU_URL =
"https://raw.githubusercontent.com/Sismoyoo/cibaicibi/main/menu_sawah.csv"

const store={
  get:k=>JSON.parse(localStorage.getItem(k)||"[]"),
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
}

let menu=[],cart=[],chart=null

window.onload=()=>{
  menu=store.get("menu")
  if(!menu.length) seedMenu()
  renderMenu()
  updateLaporan()
  if(localStorage.getItem("dark")==="1")
    document.body.classList.add("dark")
}

function seedMenu(){
  menu=[
    {nama:"Ayam Goreng",harga:12000,kategori:"Makanan"},
    {nama:"Es Teh",harga:4000,kategori:"Minuman"}
  ]
  store.set("menu",menu)
}

/* MENU */
function renderMenu(){
  const key=searchMenu.value.toLowerCase()
  const kat=filterKategori.value
  menuList.innerHTML=""
  menu.filter(m=>{
    return m.nama.toLowerCase().includes(key)
      && (!kat || m.kategori===kat)
  }).forEach(m=>{
    const b=document.createElement("button")
    b.className="menu-btn"
    b.innerHTML=`${m.nama}<br><small>${m.kategori} • Rp${m.harga}</small>`
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
  trx.push({t:Date.now(),items:cart})
  store.set("trx",trx)
  cart=[]
  renderCart()
  updateLaporan()
}

/* LAPORAN + GRAFIK */
function updateLaporan(){
  const trx=store.get("trx")
  const mulai=tglMulai.value?new Date(tglMulai.value).getTime():0
  const akhir=tglAkhir.value?new Date(tglAkhir.value).getTime()+86399999:Infinity

  let omzet=0,qty=0,map={},perHari={}
  trx.forEach(t=>{
    if(t.t<mulai||t.t>akhir)return
    const d=new Date(t.t).toISOString().slice(0,10)
    perHari[d]=perHari[d]||0
    t.items.forEach(i=>{
      omzet+=i.qty*i.harga
      qty+=i.qty
      map[i.nama]=(map[i.nama]||0)+i.qty
      perHari[d]+=i.qty*i.harga
    })
  })

  omzetHari.innerText=omzet
  totalTerjual.innerText=qty

  menu30Hari.innerHTML=""
  Object.entries(map).forEach(([n,q])=>{
    menu30Hari.innerHTML+=`<li>${n} (${q})</li>`
  })

  renderGrafik(perHari)
}

function renderGrafik(data){
  const labels=Object.keys(data).sort()
  const values=labels.map(l=>data[l])
  if(chart)chart.destroy()
  chart=new Chart(grafikOmzet,{
    type:"line",
    data:{labels,datasets:[{label:"Omzet",data:values}]},
    options:{responsive:true}
  })
}

/* CSV */
function exportCSV(){
  const trx = store.get("trx")

  const mulai = tglMulai.value ? new Date(tglMulai.value).getTime() : 0
  const akhir = tglAkhir.value
    ? new Date(tglAkhir.value).getTime() + 86399999
    : Infinity

  // Struktur: tanggal -> { omzetHarian, menu:{ nama:{qty, omzet} } }
  const data = {}

  trx.forEach(t=>{
    if(t.t < mulai || t.t > akhir) return

    const tanggal = new Date(t.t).toISOString().slice(0,10)
    if(!data[tanggal]){
      data[tanggal] = { omzetHarian:0, menu:{} }
    }

    t.items.forEach(i=>{
      const omzetItem = i.qty * i.harga
      data[tanggal].omzetHarian += omzetItem

      if(!data[tanggal].menu[i.nama]){
        data[tanggal].menu[i.nama] = { qty:0, omzet:0 }
      }

      data[tanggal].menu[i.nama].qty += i.qty
      data[tanggal].menu[i.nama].omzet += omzetItem
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

  const blob = new Blob([csv],{type:"text/csv"})
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "laporan_penjualan_detail.csv"
  a.click()
}

/* SYNC */
function syncMenuGithub(){
  fetch(GITHUB_MENU_URL)
    .then(r=>r.text())
    .then(csv=>{
      menu=[]
      csv.trim().split("\n").slice(1).forEach(r=>{
        const [n,k,h]=r.split(",")
        if(n&&h)menu.push({
          nama:n.trim(),
          kategori:(k||"Makanan").trim(),
          harga:+h
        })
      })
      store.set("menu",menu)
      renderMenu()
    })
}

/* BACKUP */
function backupLocal(){
  const d={menu:store.get("menu"),trx:store.get("trx")}
  const a=document.createElement("a")
  a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:"application/json"}))
  a.download="backup.json"
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
