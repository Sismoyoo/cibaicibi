let db,chart7hari
let menu=[],keranjang=[],dipilih=null

const req=indexedDB.open("cibaicibi_db",4)
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

// ===== TOAST =====
function toast(t){
popup.innerText="✔ "+t
popup.style.display="block"
setTimeout(()=>popup.style.display="none",1500)
}

// ===== MENU MASTER =====
function tambahMenu(){
if(!menuNama.value||!menuHarga.value)return
db.transaction("menu","readwrite").objectStore("menu")
.add({nama:menuNama.value,harga:+menuHarga.value,kategori:menuKategori.value,favorit:false})
menuNama.value="";menuHarga.value=""
toast("Menu ditambahkan")
loadMenu()
}

function importMenuCSV(){
const f=csvMenu.files[0]; if(!f)return
const r=new FileReader()
r.onload=e=>{
const l=e.target.result.split("\n")
const s=db.transaction("menu","readwrite").objectStore("menu")
for(let i=1;i<l.length;i++){
const[n,k,h]=l[i].split(",")
if(n&&h)s.add({nama:n.trim(),harga:+h,kategori:k||"Lainnya",favorit:false})
}
toast("Import selesai")
loadMenu()
}
r.readAsText(f)
}

function loadMenu(){
db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
menu=e.target.result
renderMenu()
}
}

// ===== MENU LIST =====
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
const list=arr
.filter(m=>m.nama.toLowerCase().includes(key))
.sort((a,b)=>a.nama.localeCompare(b.nama,"id"))
if(!list.length)return
menuList.innerHTML+=`<div class="group-title">${g}</div>`
list.forEach(m=>{
const b=document.createElement("button")
b.textContent=`${m.favorit?"⭐ ":""}${m.nama} - Rp${m.harga}`
b.onclick=()=>{dipilih=m;toast(m.nama+" dipilih")}
b.oncontextmenu=e=>{
e.preventDefault()
toggleFavorit(m.id)
}
menuList.appendChild(b)
})
})
}

function toggleFavorit(id){
const s=db.transaction("menu","readwrite").objectStore("menu")
s.get(id).onsuccess=e=>{
const m=e.target.result
m.favorit=!m.favorit
s.put(m)
toast("Favorit diubah")
loadMenu()
}
}

// ===== KERANJANG =====
function tambahKeKeranjang(){
if(!dipilih||!qty.value)return
keranjang.push({
nama:dipilih.nama,
qty:+qty.value,
subtotal:dipilih.harga*qty.value
})
qty.value=""
renderKeranjang()
toast("Masuk keranjang")
}

function renderKeranjang(){
keranjangList.innerHTML=""
let t=0
keranjang.forEach(i=>{
t+=i.subtotal
keranjangList.innerHTML+=`<li>${i.nama} x${i.qty} = Rp${i.subtotal}</li>`
})
totalAll.innerText=t
}

// ===== TRANSAKSI =====
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
autoBackup()
}

// ===== LAPORAN =====
function updateLaporan(){
omzet30Hari()
grafik7Hari()
top20Menu()
}

function omzet30Hari(){
let sum=0,now=new Date()
db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
e.target.result.forEach(t=>{
if((now-new Date(t.tanggal))/86400000<=30)sum+=t.total
})
omzet30.innerText=sum
}
}

function grafik7Hari(){
const map={},labels=[],data=[]
for(let i=6;i>=0;i--){
const d=new Date();d.setDate(d.getDate()-i)
const k=d.toISOString().slice(0,10)
labels.push(k.slice(5)); map[k]=0
}
db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
e.target.result.forEach(t=>{
if(map[t.tanggal]!=null)map[t.tanggal]+=t.total
})
Object.values(map).forEach(v=>data.push(v))
if(chart7hari)chart7hari.destroy()
chart7hari=new Chart(document.getElementById("chart7hari"),{
type:"line",
data:{labels,datasets:[{data}]}
})
}
}

function top20Menu(){
const m={}
db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=e=>{
e.target.result.forEach(t=>{
t.items.forEach(i=>m[i.nama]=(m[i.nama]||0)+i.qty)
})
top20.innerHTML=""
Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,20)
.forEach(([n,q])=>{
top20.innerHTML+=`<tr><td>${n}</td><td>${q}</td></tr>`
})
}
}

// ===== BACKUP LOCAL =====
function backupLocal(){
const data={}
db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
data.menu=e.target.result
db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=t=>{
data.transaksi=t.target.result
const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"})
const a=document.createElement("a")
a.href=URL.createObjectURL(blob)
a.download=`cibaicibi-backup-${Date.now()}.json`
a.click()
toast("Backup local berhasil")
}
}
}

function restoreLocal(){
const f=restoreFile.files[0]
if(!f||!confirm("Data lama akan ditimpa"))return
const r=new FileReader()
r.onload=e=>{
const d=JSON.parse(e.target.result)
const tm=db.transaction("menu","readwrite").objectStore("menu")
tm.clear(); d.menu.forEach(m=>tm.add(m))
const tt=db.transaction("transaksi","readwrite").objectStore("transaksi")
tt.clear(); d.transaksi.forEach(t=>tt.add(t))
toast("Restore selesai")
loadMenu(); updateLaporan()
}
r.readAsText(f)
}
