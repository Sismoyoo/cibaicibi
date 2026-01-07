const CLIENT_ID="ISI_CLIENT_ID_GOOGLE"
const SCOPE="https://www.googleapis.com/auth/drive.file"
let token=null

function loginGoogle(){
google.accounts.oauth2.initTokenClient({
client_id:CLIENT_ID,
scope:SCOPE,
callback:t=>{
token=t.access_token
statusBackup.innerText="Login berhasil"
}
}).requestAccessToken()
}

function backupKeDrive(){
if(!token)return alert("Login Google dulu")
const data={}
db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
data.menu=e.target.result
db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=t=>{
data.transaksi=t.target.result
upload(data)
}
}
}

function upload(data){
const f=new FormData()
f.append("metadata",new Blob([JSON.stringify({name:`cibaicibi-${Date.now()}.json`})],{type:"application/json"}))
f.append("file",new Blob([JSON.stringify(data)],{type:"application/json"}))
fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",{
method:"POST",
headers:{Authorization:`Bearer ${token}`},
body:f
}).then(()=>statusBackup.innerText="Backup sukses")
}

function autoBackup(){
if(navigator.onLine&&token)backupKeDrive()
}
