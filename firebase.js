import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,updateProfile,sendEmailVerification,sendPasswordResetEmail} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,addDoc,setDoc,deleteDoc,updateDoc,arrayUnion,arrayRemove,query,orderBy,limit,onSnapshot,serverTimestamp,getCountFromServer} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CONFIG={
  apiKey:"AIzaSyDMPGj-SB45jYeCiosKRd1TJKzq-VQZZp0",
  authDomain:"iuea-equal.firebaseapp.com",
  projectId:"iuea-equal",
  storageBucket:"iuea-equal.firebasestorage.app",
  messagingSenderId:"194358711293",
  appId:"1:194358711293:web:aee6026e409a734e02ff94"
};
// Photo, video, document and profile picture uploads (Cloudinary). Keep your own values here.
const CLOUD={name:"rjjzbgbm",preset:"iuea_connect"};
const mediaReady=CLOUD.name!=="PASTE_CLOUD_NAME";

const app=initializeApp(CONFIG),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(id,t)=>{const e=$(id);if(e){e.textContent=t;e.hidden=false}};
const cloudOk=u=>typeof u==="string"&&u.startsWith("https://res.cloudinary.com/");
const httpsOk=u=>typeof u==="string"&&/^https:\/\//i.test(u);
const ago=ts=>{if(!ts)return"just now";const s=Math.max(0,Date.now()/1000-ts.seconds);if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+" min ago";if(s<86400)return Math.floor(s/3600)+" h ago";return new Date(ts.seconds*1000).toLocaleDateString()};
const ERR={"auth/email-already-in-use":"That email is already registered. Try logging in.","auth/invalid-credential":"Wrong email or password.","auth/wrong-password":"Wrong email or password.","auth/user-not-found":"Wrong email or password.","auth/weak-password":"The password must have at least 6 characters.","auth/invalid-email":"Please enter a valid email address.","auth/operation-not-allowed":"Email sign-in is not switched on yet.","auth/too-many-requests":"Too many attempts. Please wait and try again.","auth/network-request-failed":"No internet connection."};
const fe=e=>ERR[e.code]||"Something went wrong. Please try again.";
const myName=()=>((auth.currentUser&&auth.currentUser.displayName)||"Member").slice(0,40);
const photoOf=u=>u&&cloudOk(u.photoURL)?u.photoURL:"";
const avatar=(name,photo,size)=>cloudOk(photo)
  ?`<img class="av ${size||""}" src="${esc(photo)}" alt="" loading="lazy">`
  :`<span class="av ${size||""}">${esc(((name||"?").trim().charAt(0)||"?").toUpperCase())}</span>`;

const FACULTIES=["Engineering","Science and Technology","Business and Management","Law","Foundation / Higher Education Certificate","Other"];
["suFaculty","pfFaculty"].forEach(id=>{const s=$(id);if(s)s.innerHTML='<option value="">Faculty (optional)</option>'+FACULTIES.map(f=>`<option>${f}</option>`).join("")});
let myProfile={},pendingPhoto="",unsubProfile=null,unsubMembers=null,allProfiles=[],signingUp=false;
let user=null,posts=[],unsubChat=null,panelTab="emoji";
const unsubs={};
const EMOJI="😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😎 🤩 🥳 🤔 😮 😢 😭 😡 🙏 👍 👎 👏 🙌 💪 🔥 ❤️ 💯 🎉 🎓 📚 💡 🚀 ✅ ⭐ 🇺🇬 🇨🇩 🌍 🤝 😴 🤗 😜 🙈 🎶 ⚽ ☕ 🍕".split(" ");
const STICKERS="🎉 👍 ❤️ 😂 🔥 🙏 🎓 🚀 💡 👏 😎 🥳 😍 💯 🤝 🌍".split(" ");

// Uploads
async function upload(file,fname){
  if(file.size>25*1024*1024)throw new Error("big");
  const fd=new FormData();fd.append("file",file,fname||file.name||"file");fd.append("upload_preset",CLOUD.preset);
  const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD.name}/auto/upload`,{method:"POST",body:fd});
  if(!r.ok)throw new Error("upload");
  return (await r.json()).secure_url;
}
// Profile pictures are cropped to a small square first (smaller file, and the original photo data is removed)
async function shrink(file,size){
  const bmp=await createImageBitmap(file);
  const s=Math.min(bmp.width,bmp.height),sx=(bmp.width-s)/2,sy=(bmp.height-s)/2;
  const c=document.createElement("canvas");c.width=c.height=size;
  c.getContext("2d").drawImage(bmp,sx,sy,s,s,0,0,size,size);
  return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("image")),"image/jpeg",0.85));
}
async function uploadAvatar(file){
  if(!file.type.startsWith("image/"))throw new Error("type");
  return upload(await shrink(file,256),"avatar.jpg");
}

// Member counter
if($("memberCount")){
  const loadCount=async()=>{try{const s=await getCountFromServer(collection(db,"members"));$("memberCount").textContent=s.data().count}catch{$("memberCount").textContent="–"}};
  window.refreshMembers=loadCount;loadCount();setInterval(loadCount,30000);
}

// Join, log in, sign out
if($("signupForm")){
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{const s=b.dataset.tab==="signup";$("signupForm").hidden=!s;$("loginForm").hidden=s;
    document.querySelectorAll("[data-tab]").forEach(x=>x.className="btn "+(x===b?"alt":"ghost"));$("authMsg").hidden=true});
  $("suPhoto").addEventListener("change",e=>{$("suPhotoName").textContent=e.target.files[0]?e.target.files[0].name:""});
  $("signupForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;signingUp=true;
    try{
      const c=await createUserWithEmailAndPassword(auth,$("suEmail").value.trim(),$("suPass").value);
      let photo="",note="";
      const f=$("suPhoto").files[0];
      if(f){
        if(!mediaReady)note=" Photo uploads are being set up, so you can add your photo later.";
        else{try{photo=await uploadAvatar(f)}catch{note=" Your photo could not be uploaded. You can add it later."}}
      }
      const nm=$("suName").value.trim().slice(0,40);
      await updateProfile(c.user,photo?{displayName:nm,photoURL:photo}:{displayName:nm});
      try{await setDoc(doc(db,"members",c.user.uid),{ts:serverTimestamp()})}catch{}
      try{await setDoc(doc(db,"profiles",c.user.uid),{name:nm,photo,faculty:$("suFaculty").value,bio:"",ts:serverTimestamp()})}catch{}
      sendEmailVerification(c.user).catch(()=>{});
      user=auth.currentUser;paintAuth();if(window.refreshMembers)window.refreshMembers();
      say("authMsg","Welcome! We sent a verification link to your email."+note);
    }catch(err){say("authMsg",fe(err))}
    signingUp=false;btn.disabled=false});
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=e.target.querySelector("button");btn.disabled=true;
    try{await signInWithEmailAndPassword(auth,$("liEmail").value.trim(),$("liPass").value);$("authMsg").hidden=true}
    catch(err){say("authMsg",fe(err))}
    btn.disabled=false});
  $("forgot").addEventListener("click",async e=>{
    e.preventDefault();const m=$("liEmail").value.trim();
    if(!m)return say("authMsg","Type your email above first, then press Forgot password.");
    try{await sendPasswordResetEmail(auth,m);say("authMsg","Password reset link sent. Check your email.")}catch(err){say("authMsg",fe(err))}});
  $("signOutBtn").addEventListener("click",()=>signOut(auth));
  // Profile: edit photo, name, faculty and bio
  const fillForm=()=>{$("pfName").value=user.displayName||"";$("pfFaculty").value=myProfile.faculty||"";$("pfBio").value=myProfile.bio||"";pendingPhoto="";$("pfAvatar").innerHTML=avatar(user.displayName||user.email,photoOf(user),"xl")};
  $("editProfileBtn").onclick=()=>{const f=$("profileForm");f.hidden=!f.hidden;if(!f.hidden&&user)fillForm();$("profileMsg").hidden=true};
  $("profilePhoto").addEventListener("change",async e=>{
    const f=e.target.files[0];e.target.value="";if(!f||!user)return;
    if(!mediaReady)return say("profileMsg","Photo uploads are being set up. Please check back soon.");
    say("profileMsg","Uploading your photo...");
    try{pendingPhoto=await uploadAvatar(f);$("pfAvatar").innerHTML=avatar($("pfName").value,pendingPhoto,"xl");say("profileMsg","Photo ready. Press Save profile.")}
    catch(err){say("profileMsg",err.message==="type"?"Please choose an image file.":"Could not upload your photo. Please try again.")}});
  $("profileForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!user)return;
    const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;
    const name=$("pfName").value.trim().slice(0,40),faculty=$("pfFaculty").value,bio=$("pfBio").value.trim().slice(0,160),photo=pendingPhoto||photoOf(user);
    if(!name){btn.disabled=false;return}
    try{
      await updateProfile(auth.currentUser,photo?{displayName:name,photoURL:photo}:{displayName:name});
      await setDoc(doc(db,"profiles",user.uid),{name,photo,faculty,bio,ts:serverTimestamp()});
      user=auth.currentUser;pendingPhoto="";paintAuth();$("profileForm").hidden=true;say("profileMsg","Profile saved!");
    }catch(err){say("profileMsg","Could not save your profile. Please try again.")}
    btn.disabled=false});
}
const needJoin=()=>{say("authMsg","Please create an account or log in to continue.");const j=$("join");if(j)j.scrollIntoView({behavior:"smooth"})};

onAuthStateChanged(auth,u=>{user=u;paintAuth()});
function paintAuth(){
  if($("joinBox"))$("joinBox").hidden=!!user;
  if($("userBar")){$("userBar").hidden=!user;
    if(user){$("userName").textContent=user.displayName||user.email;$("userFaculty").textContent=myProfile.faculty||"";$("myAvatar").innerHTML=avatar(user.displayName||user.email,photoOf(user),"xl")}}
  if($("chatGate"))$("chatGate").hidden=!!user;
  if($("memGate"))$("memGate").hidden=!!user;
  if($("memBox"))$("memBox").hidden=!user;
  if(user){startChat();startProfile();startMembers()}else{stopChat();stopProfile();stopMembers()}
  drawFeed();
}
// My own profile (created automatically for members who joined before profiles existed)
function startProfile(){
  if(unsubProfile||!user)return;
  const uid=user.uid;
  unsubProfile=onSnapshot(doc(db,"profiles",uid),s=>{
    if(s.exists()){myProfile=s.data();if($("userFaculty"))$("userFaculty").textContent=myProfile.faculty||"";return}
    if(signingUp||s.metadata.fromCache)return;
    myProfile={};
    setDoc(doc(db,"profiles",uid),{name:myName(),photo:photoOf(auth.currentUser),faculty:"",bio:"",ts:serverTimestamp()}).catch(()=>{});
  },()=>{});
}
function stopProfile(){if(unsubProfile){unsubProfile();unsubProfile=null}myProfile={}}
// Members directory (only for signed-in members)
function startMembers(){
  if(unsubMembers||!$("memList"))return;
  unsubMembers=onSnapshot(query(collection(db,"profiles"),orderBy("ts","desc"),limit(300)),snap=>{
    allProfiles=snap.docs.map(d=>({id:d.id,...d.data({serverTimestamps:"estimate"})}));drawMembers()},
    ()=>{$("memList").innerHTML="<p>Could not load members right now.</p>"});
}
function stopMembers(){if(unsubMembers){unsubMembers();unsubMembers=null}allProfiles=[];if($("memList"))$("memList").innerHTML=""}
function drawMembers(){
  const q=(($("memSearch")&&$("memSearch").value)||"").trim().toLowerCase();
  const rows=allProfiles.filter(p=>!q||(p.name||"").toLowerCase().includes(q)||(p.faculty||"").toLowerCase().includes(q));
  $("memCountText").textContent=rows.length+(rows.length===1?" member":" members");
  $("memList").innerHTML=rows.length?rows.map(p=>`<div class="mcard">${avatar(p.name,p.photo,"xl")}<b>${esc(p.name||"Member")}</b>${p.faculty?`<span class="tag">${esc(p.faculty)}</span>`:""}${p.bio?`<p>${esc(p.bio)}</p>`:""}${user&&p.id===user.uid?"<small>This is you</small>":""}</div>`).join(""):"<p>No members found.</p>";
}
if($("memSearch"))$("memSearch").addEventListener("input",drawMembers);

// Community chat
function msgHTML(m){
  const me=user&&m.uid===user.uid;
  const t=m.ts?new Date(m.ts.seconds*1000).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";
  let body;
  if(m.type==="sticker")body=`<span class="sticker">${esc(m.text)}</span>`;
  else if(m.type==="image"&&cloudOk(m.url))body=`<a href="${esc(m.url)}" target="_blank" rel="noopener"><img class="media" src="${esc(m.url)}" alt="Photo" loading="lazy"></a>`;
  else if(m.type==="video"&&cloudOk(m.url))body=`<video class="media" src="${esc(m.url)}" controls preload="metadata"></video>`;
  else if(m.type==="file"&&cloudOk(m.url))body=`<a class="filecard" href="${esc(m.url)}" target="_blank" rel="noopener">📄 ${esc(m.fname||"Document")}<em>Tap to open</em></a>`;
  else if(m.type==="location"&&typeof m.lat==="number"&&typeof m.lng==="number")body=`<a class="filecard" href="https://www.google.com/maps?q=${m.lat},${m.lng}" target="_blank" rel="noopener">📍 Shared location<em>Open in Maps</em></a>`;
  else body=esc(m.text||"");
  return `<div class="msg${me?" me":""}"><div class="mh">${avatar(m.name,m.photo,"sm")}<b>${me?"You":esc(m.name)}</b></div>${body}<small>${t}</small></div>`;
}
function startChat(){
  const box=$("chatBox");if(!box||unsubChat)return;
  unsubChat=onSnapshot(query(collection(db,"connect_chat"),orderBy("ts","desc"),limit(100)),snap=>{
    const near=box.scrollHeight-box.scrollTop-box.clientHeight<120;
    const rows=snap.docs.map(d=>d.data({serverTimestamps:"estimate"})).reverse();
    box.innerHTML=rows.length?rows.map(msgHTML).join(""):"<p>No messages yet. Say hello!</p>";
    if(near||!box.dataset.init){box.scrollTop=box.scrollHeight;box.dataset.init="1"}},
    ()=>{box.innerHTML="<p>Could not load the chat right now.</p>"});
}
function stopChat(){if(unsubChat){unsubChat();unsubChat=null}const b=$("chatBox");if(b){b.innerHTML="";delete b.dataset.init}}

let last=0;
async function sendMsg(data){
  if(!user){needJoin();return false}
  if(Date.now()-last<1500){say("chatErr","Please wait a moment before sending again.");return false}
  last=Date.now();
  try{await addDoc(collection(db,"connect_chat"),{uid:user.uid,name:myName(),photo:photoOf(user),...data,ts:serverTimestamp()});$("chatErr").hidden=true;return true}
  catch(e){say("chatErr","Message not sent. Please try again.");return false}
}
const kindOf=f=>f.type.startsWith("image/")?"image":f.type.startsWith("video/")?"video":"file";
async function sendFile(f){
  if(!user)return needJoin();
  if(!mediaReady)return say("chatErr","Photo, video and document sharing is being set up.");
  say("chatErr","Uploading...");
  try{const url=await upload(f);await sendMsg({type:kindOf(f),url,fname:f.name.slice(0,120)})}
  catch(e){say("chatErr",e.message==="big"?"That file is larger than 25 MB.":"Upload failed. Please try again.")}
}
function sendLocation(){
  if(!navigator.geolocation)return say("chatErr","Location is not available on this device.");
  if(!confirm("Share your current location with everyone in the chat?"))return;
  navigator.geolocation.getCurrentPosition(p=>sendMsg({type:"location",lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)}),
    ()=>say("chatErr","Could not get your location. Please allow location access."),{enableHighAccuracy:true,timeout:10000});
}
if($("chatForm")){
  const sheet=$("attachSheet"),panel=$("emojiPanel");
  const drawPanel=()=>{panel.innerHTML=`<div class="ptabs"><button type="button" data-t="emoji" class="${panelTab==="emoji"?"on":""}">Emoji</button><button type="button" data-t="sticker" class="${panelTab==="sticker"?"on":""}">Stickers</button></div><div class="${panelTab==="emoji"?"emojigrid":"stickergrid"}">${(panelTab==="emoji"?EMOJI:STICKERS).map(x=>`<button type="button" data-e="${x}">${x}</button>`).join("")}</div>`};
  $("chatForm").addEventListener("submit",async e=>{e.preventDefault();const t=$("chatText").value.trim().slice(0,500);if(!t)return;if(await sendMsg({type:"text",text:t}))$("chatText").value=""});
  $("attachBtn").onclick=()=>{sheet.hidden=!sheet.hidden;panel.hidden=true};
  $("emojiBtn").onclick=()=>{panel.hidden=!panel.hidden;sheet.hidden=true;drawPanel()};
  $("camBtn").onclick=()=>$("fileCam").click();
  sheet.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.a;sheet.hidden=true;
    if(a==="doc")$("fileDoc").click();else if(a==="gallery")$("fileMedia").click();else if(a==="camera")$("fileCam").click();
    else if(a==="location")sendLocation();else if(a==="sticker"){panelTab="sticker";panel.hidden=false;drawPanel()}});
  panel.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.dataset.t){panelTab=b.dataset.t;drawPanel()}
    else if(b.dataset.e){if(panelTab==="emoji")$("chatText").value+=b.dataset.e;else{sendMsg({type:"sticker",text:b.dataset.e});panel.hidden=true}}});
  ["fileDoc","fileMedia","fileCam"].forEach(id=>$(id).addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)sendFile(f)}));
}

// Community feed (posts, likes, comments)
const feed=$("feedList");
const postHTML=p=>`<div class="head">${avatar(p.name,p.photo,"lg")}<div class="meta"><b>${esc(p.name)}</b><br><small class="when"></small></div></div>
<div><span class="tag">${esc(p.tag)}</span><span class="tag">${esc(p.faculty)}</span></div>
<p class="ptext">${esc(p.text)}</p>
${cloudOk(p.image)?`<img class="photo" src="${esc(p.image)}" alt="Photo shared by ${esc(p.name)}" loading="lazy">`:""}
${httpsOk(p.link)?`<p><a class="btn ghost sm" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">View project</a></p>`:""}
<div class="actions"><button type="button" class="like">🤍 <span class="lc">0</span></button><button type="button" class="cbtn">💬 Comments</button><button type="button" class="del" hidden>Delete</button></div>
<div class="comments" hidden><div class="clist"></div><form class="cform"><input maxlength="300" placeholder="Write a comment" required><button class="btn alt sm" type="submit">Send</button></form></div>`;
function drawFeed(){
  if(!feed)return;
  if(!posts.length){feed.innerHTML="<p>No posts yet. Be the first to share a project or idea.</p>";return}
  if(feed.querySelector(":scope > p"))feed.innerHTML="";
  const ids=new Set(posts.map(p=>p.id));
  [...feed.children].forEach(c=>{if(!ids.has(c.dataset.id)){if(unsubs[c.dataset.id]){unsubs[c.dataset.id]();delete unsubs[c.dataset.id]}c.remove()}});
  posts.forEach((p,i)=>{
    let c=feed.querySelector(`[data-id="${p.id}"]`);
    if(!c){c=document.createElement("div");c.className="card post";c.dataset.id=p.id;c.innerHTML=postHTML(p);feed.insertBefore(c,feed.children[i]||null)}
    const liked=!!user&&(p.likedBy||[]).includes(user.uid);
    c.querySelector(".lc").textContent=(p.likedBy||[]).length;
    const lb=c.querySelector(".like");lb.classList.toggle("on",liked);lb.firstChild.textContent=liked?"❤️ ":"🤍 ";
    c.querySelector(".when").textContent=ago(p.ts);
    c.querySelector(".del").hidden=!(user&&p.uid===user.uid);
  });
}
if(feed){
  feed.innerHTML="<p>Loading posts...</p>";
  onSnapshot(query(collection(db,"connect_posts"),orderBy("ts","desc"),limit(30)),snap=>{
    posts=snap.docs.map(d=>({id:d.id,...d.data({serverTimestamps:"estimate"})}));drawFeed()},
    ()=>{feed.innerHTML="<p>Could not load posts right now.</p>"});
  feed.addEventListener("click",async e=>{
    const c=e.target.closest(".post");if(!c)return;const id=c.dataset.id;
    if(e.target.closest(".like")){
      if(!user)return needJoin();
      const p=posts.find(x=>x.id===id),liked=(p.likedBy||[]).includes(user.uid);
      try{await updateDoc(doc(db,"connect_posts",id),{likedBy:liked?arrayRemove(user.uid):arrayUnion(user.uid)})}catch{}
    }else if(e.target.closest(".cbtn")){
      const box=c.querySelector(".comments");
      if(!box.hidden){box.hidden=true;if(unsubs[id]){unsubs[id]();delete unsubs[id]}return}
      box.hidden=false;
      unsubs[id]=onSnapshot(query(collection(db,"connect_posts",id,"comments"),orderBy("ts","asc"),limit(100)),s=>{
        box.querySelector(".clist").innerHTML=s.docs.map(d=>{const m=d.data({serverTimestamps:"estimate"});return `<div class="comment">${avatar(m.name,m.photo,"sm")}<div><b>${esc(m.name)}</b> ${esc(m.text)}</div></div>`}).join("")||"<p>No comments yet.</p>"});
    }else if(e.target.closest(".del")){
      if(confirm("Delete this post?"))deleteDoc(doc(db,"connect_posts",id)).catch(()=>{});
    }});
  feed.addEventListener("submit",async e=>{
    const f=e.target.closest(".cform");if(!f)return;e.preventDefault();
    if(!user)return needJoin();
    const inp=f.querySelector("input"),text=inp.value.trim();if(!text)return;
    try{await addDoc(collection(db,"connect_posts",f.closest(".post").dataset.id,"comments"),{uid:user.uid,name:myName(),photo:photoOf(user),text:text.slice(0,300),ts:serverTimestamp()});inp.value=""}catch{}});
}
if($("postBox")){
  $("pPhoto").addEventListener("change",e=>{$("pFile").textContent=e.target.files[0]?e.target.files[0].name:""});
  $("postBox").addEventListener("submit",async e=>{
    e.preventDefault();if(!user)return needJoin();
    const text=$("pText").value.trim();if(!text)return;
    const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;
    try{
      let image="";const f=$("pPhoto").files[0];
      if(f){if(!mediaReady)throw new Error("media");image=await upload(f)}
      const link=$("pLink").value.trim();
      await addDoc(collection(db,"connect_posts"),{uid:user.uid,name:myName(),photo:photoOf(user),text,tag:$("pTag").value,faculty:$("pFaculty").value,link:httpsOk(link)?link:"",image,likedBy:[],ts:serverTimestamp()});
      e.target.reset();$("pFile").textContent="";say("postMsg","Posted!");
    }catch(err){say("postMsg",err.message==="media"?"Photo sharing is being set up. Post without a photo for now.":err.message==="big"?"That photo is larger than 25 MB.":"Could not post. Please try again.")}
    btn.disabled=false});
}