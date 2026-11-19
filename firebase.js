import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,addDoc,query,orderBy,limit,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CONFIG={
  apiKey:"AIzaSyDMPGj-SB45jYeCiosKRd1TJKzq-VQZZp0",
  authDomain:"iuea-equal.firebaseapp.com",
  projectId:"iuea-equal",
  storageBucket:"iuea-equal.firebasestorage.app",
  messagingSenderId:"194358711293",
  appId:"1:194358711293:web:aee6026e409a734e02ff94"
};

const db=getFirestore(initializeApp(CONFIG));
const ROOM="connect_messages";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(id,t)=>{const e=$(id);if(e){e.textContent=t;e.hidden=false}};

const chat=$("chatBox");
if(chat){
  let cid=localStorage.getItem("cid");if(!cid){cid=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2));localStorage.setItem("cid",cid)}
  const nameIn=$("chatName"),textIn=$("chatText");nameIn.value=localStorage.getItem("chatName")||"";
  onSnapshot(query(collection(db,ROOM),orderBy("ts","desc"),limit(100)),snap=>{
    const near=chat.scrollHeight-chat.scrollTop-chat.clientHeight<120;
    const rows=snap.docs.map(d=>d.data({serverTimestamps:"estimate"})).reverse();
    chat.innerHTML=rows.length?rows.map(m=>{const t=m.ts?new Date(m.ts.seconds*1000).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";
      return `<div class="msg${m.cid===cid?" me":""}"><b>${m.cid===cid?"You":esc(m.name)}</b>${esc(m.text)}<small>${t}</small></div>`}).join(""):"<p>No messages yet. Say hello!</p>";
    if(near||!chat.dataset.init){chat.scrollTop=chat.scrollHeight;chat.dataset.init="1"}},
    ()=>{chat.innerHTML="<p>Could not load the chat right now.</p>"});
  let last=0;
  $("chatForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const name=nameIn.value.trim().slice(0,40),text=textIn.value.trim().slice(0,500);
    if(!name||!text)return;
    if(Date.now()-last<2000)return say("chatErr","Please wait a moment before sending again.");
    last=Date.now();localStorage.setItem("chatName",name);
    try{await addDoc(collection(db,ROOM),{name,text,cid,ts:serverTimestamp()});textIn.value="";$("chatErr").hidden=true}
    catch(err){say("chatErr","Message not sent. Please try again.")}})}