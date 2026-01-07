let db, chart
let menu=[], keranjang=[], dipilih=null

const GITHUB_MENU_URL = "ISI_URL_RAW_CSV_GITHUB"

const req=indexedDB.open("cibaicibi_db",6)
req.onupgradeneeded=e=>{
  db=e.target.result
  db.createObjectStore("menu",{keyPath:"id",autoIncrement:true})
  db.createObjectStore("transaksi",{keyPath:"id",autoIncrement:true})
}
req.onsuccess=e=>{
  db=e.target.result
  loadMenu()
  updateLaporan()
}

function toast(t){
  popup.innerText="✔ "+t
  popup.style.display="block"
  setTimeout(()=>popup.style.display="none",1200)
}

/* MENU */
function loadMenu(){
  db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
    menu=e.target.result
    renderMenu()
  }
}

function renderMenu(){
  menuList.innerHTML=""
  const key=searchMenu.value.toLowerCase()
  const grup={
    "⭐ Favorit":menu.filter(m=>m.favorit),
    "🍽️ Makanan":menu.filter(m=>m.kategori==="Makanan"),
    "🥤 Minuman":menu.filter(m=>m.kategori==="Minuman"),
    "📦 Lainnya":menu.filter(m=>m.kategori==="Lainnya")
  }
  Object.entries(grup).forEach(([g,arr])=>{
    const list=arr.filter(m=>m.nama.toLowerCase().includes(key))
      .sort((a,b)=>a.nama.localeCompare(b.nama,"id"))
    if(!list.length)return
    menuList.innerHTML+=`<div class="group-title">${g}</div>`
    list.forEach(m=>{
      const b=document.createElement("button")
      b.className="menu-btn"+(dipilih&&dipilih.id===m.id?" active":"")
      b.innerHTML=`
        <span class="badge ${m.kategori.toLowerCase()}">${m.kategori}</span>
        ${m.nama}<small>Rp${m.harga}</small>`
      b.onclick=()=>{dipilih=m;renderMenu()}
      b.oncontextmenu=e=>{e.preventDefault();toggleFavorit(m.id)}
      menuList.appendChild(b)
    })
  })
}

function toggleFavorit(id){
  const s=db.transaction("menu","readwrite").objectStore("menu")
  s.get(id).onsuccess=e=>{
    const m=e.target.result
    m.favorit=!m.favorit
    s.put(m); loadMenu()
  }
}

/* KERANJANG */
function tambahKeKeranjang(){
  if(!dipilih||!qty.value)return
  const q=+qty.value
  keranjang.push({nama:dipilih.nama,harga:dipilih.harga,qty:q,subtotal:q*dipilih.harga})
  qty.value=""
  renderKeranjang()
}

function renderKeranjang(){
  keranjangList.innerHTML=""
  let t=0
  keranjang.forEach((i,idx)=>{
    t+=i.subtotal
    keranjangList.innerHTML+=`
      <li>
        ${i.nama}
        <div class="qty">
          <button class="qty-btn" onclick="ubahQty(${idx},-1)">−</button>
          ${i.qty}
          <button class="qty-btn" onclick="ubahQty(${idx},1)">+</button>
          <button class="del" onclick="hapusItem(${idx})">✕</button>
        </div>
      </li>`
  })
  totalAll.innerText=t
}

function ubahQty(i,d){
  keranjang[i].qty+=d
  if(keranjang[i].qty<=0)keranjang.splice(i,1)
  else keranjang[i].subtotal=keranjang[i].harga*keranjang[i].qty
  renderKeranjang()
}
function hapusItem(i){keranjang.splice(i,1);renderKeranjang()}

/* TRANSAKSI */
function simpanTransaksi(){
  if(!keranjang.length)return
  db.transaction("transaksi","readwrite").objectStore("transaksi")
    .add({
      tanggal:new Date().toISOString().slice(0,10),
      items:keranjang,
      total:keranjang.reduce((s,i)=>s+i.subtotal,0)
    })
  keranjang=[]
  renderKeranjang()
  toast("Transaksi tersimpan")
  updateLaporan()
}

/* LAPORAN */
function updateLaporan(){
  let now=new Date(), sum=0, map={}
  db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
    e.target.result.forEach(t=>{
      if((now-new Date(t.tanggal))/86400000<=30) sum+=t.total
      map[t.tanggal]=(map[t.tanggal]||0)+t.total
    })
    omzet30.innerText=sum
    renderChart(map)
  }
}

function renderChart(map){
  const labels=[],data=[]
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i)
    const k=d.toISOString().slice(0,10)
    labels.push(k.slice(5))
    data.push(map[k]||0)
  }
  if(chart)chart.destroy()
  chart=new Chart(chart7,{type:"line",data:{labels,datasets:[{data}]}})
}

/* BACKUP */
function backupLocal(){
  const data={}
  db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
    data.menu=e.target.result
    db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=t=>{
      data.transaksi=t.target.result
      const a=document.createElement("a")
      a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}))
      a.download="cibaicibi-backup.json"
      a.click()
    }
  }
}

function restoreLocal(){
  const f=restoreFile.files[0]; if(!f)return
  const r=new FileReader()
  r.onload=e=>{
    const d=JSON.parse(e.target.result)
    const m=db.transaction("menu","readwrite").objectStore("menu")
    const t=db.transaction("transaksi","readwrite").objectStore("transaksi")
    m.clear();t.clear()
    d.menu.forEach(x=>m.add(x))
    d.transaksi.forEach(x=>t.add(x))
    loadMenu();updateLaporan()
  }
  r.readAsText(f)
}

/* GITHUB SYNC */
function syncMenuGithub(){
  if(!confirm("Menu lama akan ditimpa"))return
  fetch(GITHUB_MENU_URL).then(r=>r.text()).then(csv=>{
    const rows=csv.split("\n")
    const s=db.transaction("menu","readwrite").objectStore("menu")
    s.clear()
    for(let i=1;i<rows.length;i++){
      const [n,k,h]=rows[i].split(",")
      if(n&&h)s.add({nama:n.trim(),kategori:(k||"Makanan").trim(),harga:+h,favorit:false})
    }
    loadMenu()
    toast("Menu sync berhasil")
  })
}

/* DARK MODE */
function toggleDark(){
  document.body.classList.toggle("dark")
  localStorage.setItem("darkMode",
    document.body.classList.contains("dark")?"1":"0")
}
if(localStorage.getItem("darkMode")==="1"){
  document.body.classList.add("dark")
}
