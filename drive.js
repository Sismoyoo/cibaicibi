const CLIENT_ID = "ISI_CLIENT_ID";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
let accessToken = null;

function loginGoogle(){
  google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: t=>{
      accessToken=t.access_token;
      statusBackup.innerText="Login berhasil";
    }
  }).requestAccessToken();
}

function backupKeDrive(){
  if(!accessToken)return alert("Login Google dulu");

  const data={};
  db.transaction("menu").objectStore("menu").getAll().onsuccess=e=>{
    data.menu=e.target.result;
    db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess=p=>{
      data.transaksi=p.target.result;
      upload(data);
    };
  };
}

function upload(data){
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  const meta={name:`cibaicibi-${Date.now()}.json`};
  const form=new FormData();
  form.append("metadata",new Blob([JSON.stringify(meta)],{type:"application/json"}));
  form.append("file",blob);

  fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",{
    method:"POST",
    headers:{Authorization:`Bearer ${accessToken}`},
    body:form
  }).then(()=>statusBackup.innerText="Backup sukses");
}

function autoBackup(){
  if(navigator.onLine && accessToken) backupKeDrive();
}
