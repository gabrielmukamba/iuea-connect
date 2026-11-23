(() => {
const GEMINI_KEY="AQ.Ab8RN6IUbsbyEiiK9gTJTQDVioOjwCWNvTR3e7SJhmJN9Nzzxg";
const CSE_ID="b64b3285db0cd45c3";
// If one model name stops working, the next one is tried automatically
const MODELS=["gemini-3.8-flash","gemini-3.6-flash","gemini-3.5-flash-lite"];
const FEEDS=[["World","https://feeds.bbci.co.uk/news/world/rss.xml"],["Africa","https://feeds.bbci.co.uk/news/world/africa/rss.xml"],["Technology","https://feeds.bbci.co.uk/news/technology/rss.xml"],["Science","https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],["Business","https://feeds.bbci.co.uk/news/business/rss.xml"],["Education","https://feeds.bbci.co.uk/news/education/rss.xml"]];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plain=h=>new DOMParser().parseFromString(h||"","text/html").body.textContent.trim();
const when=d=>{const s=/^\d{4}-\d\d-\d\d \d/.test(d||"")?d.replace(" ","T")+"Z":d;const t=new Date(s);if(isNaN(t))return"";const m=(Date.now()-t)/60000;
  return m<60?Math.max(1,Math.floor(m))+" min ago":m<1440?Math.floor(m/60)+" h ago":t.toLocaleDateString()};
const okUrl=u=>/^https?:\/\//i.test(u||"");

// Tabs
let cseLoaded=false;
function show(p){
  ["news","search","ask"].forEach(k=>$("p-"+k).hidden=k!==p);
  document.querySelectorAll("[data-p]").forEach(b=>b.className="btn "+(b.dataset.p===p?"alt":"ghost"));
  if(location.hash!=="#"+p)history.replaceState(null,"","#"+p);
  if(p==="search"&&!cseLoaded)loadSearch();
}
document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>show(b.dataset.p));

// News
const cache={};
async function getFeed(url){
  if(cache[url])return cache[url];
  let items=null;
  try{const r=await fetch("https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent(url));const j=await r.json();
    if(j.status==="ok")items=j.items.map(i=>({title:i.title,link:i.link,date:i.pubDate,desc:i.description}))}catch{}
  if(!items||!items.length){try{const r=await fetch("https://api.allorigins.win/raw?url="+encodeURIComponent(url));
    const x=new DOMParser().parseFromString(await r.text(),"text/xml");
    items=[...x.querySelectorAll("item")].map(i=>({title:i.querySelector("title")?.textContent,link:i.querySelector("link")?.textContent,date:i.querySelector("pubDate")?.textContent,desc:i.querySelector("description")?.textContent}))}catch{}}
  if(items&&items.length)cache[url]=items;
  return items;
}
let cat=0;
async function drawNews(){
  const list=$("newsList"),msg=$("newsMsg");
  $("cats").innerHTML=FEEDS.map((f,i)=>`<button type="button" class="${i===cat?"on":""}" data-c="${i}">${f[0]}</button>`).join("");
  list.innerHTML="<p>Loading headlines...</p>";msg.hidden=true;
  const items=await getFeed(FEEDS[cat][1]);
  if(!items){list.innerHTML="";msg.textContent="Could not load the news right now. Please try again later, or visit bbc.com/news.";msg.hidden=false;return}
  list.innerHTML=items.slice(0,12).map(n=>{const d=plain(n.desc);
    return `<div class="card top"><span class="tag">${esc(FEEDS[cat][0])}</span><h3>${okUrl(n.link)?`<a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${esc(plain(n.title))}</a>`:esc(plain(n.title))}</h3>${d?`<p>${esc(d.slice(0,200))}${d.length>200?"...":""}</p>`:""}<small>${esc(when(n.date))}</small></div>`}).join("");
}
$("cats").addEventListener("click",e=>{const b=e.target.closest("button");if(b){cat=+b.dataset.c;drawNews()}});

// Search (Google Programmable Search Engine)
function loadSearch(){
  cseLoaded=true;
  if(CSE_ID.startsWith("PASTE")){$("searchMsg").textContent="Search is being set up. Please check back soon.";$("searchMsg").hidden=false;document.querySelector(".cse-wrap").hidden=true;return}
  const s=document.createElement("script");s.async=true;s.src="https://cse.google.com/cse.js?cx="+encodeURIComponent(CSE_ID);document.head.appendChild(s);
}

// Ask AI
const SYS="You are the IUEA Connect assistant, a friendly and accurate AI for students of the International University of East Africa (IUEA) in Kampala, Uganda. Help with studies, careers, technology, languages, general knowledge and world events. Keep answers clear and fairly short, in simple words. You have no live internet access. For recent events use only the headlines supplied below, and if you are not sure something is current, say so and suggest the World news tab or an official source. Do not present medical, legal or financial advice as certain. Never ask users for personal information.";
let hist=[],busy=false,lastAsk=0;
const fmt=t=>esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
function bubble(cls,html){const d=document.createElement("div");d.className="amsg "+cls;d.innerHTML=html;$("aiBox").appendChild(d);$("aiBox").scrollTop=$("aiBox").scrollHeight;return d}
async function context(){
  const a=(await getFeed(FEEDS[0][1]))||[],b=(await getFeed(FEEDS[1][1]))||[];
  const lines=[...a.slice(0,6),...b.slice(0,4)].map(n=>"- "+plain(n.title)).join("\n");
  return `\n\nToday's date: ${new Date().toDateString()}.\nLatest headlines (BBC News):\n${lines||"(not available)"}`;
}
async function gemini(sys,contents){
  for(const m of MODELS){
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents,generationConfig:{maxOutputTokens:2048}})});
    if(r.status===404)continue;
    if(!r.ok)throw {status:r.status};
    const j=await r.json();
    const t=(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
    if(!t)throw {status:0};
    return t;
  }
  throw {status:404};
}
async function ask(q){
  q=q.trim().slice(0,500);if(!q||busy)return;
  if(GEMINI_KEY.startsWith("PASTE")){bubble("bot","The AI assistant is being set up. Please check back soon.");return}
  if(Date.now()-lastAsk<4000){bubble("bot","Please wait a few seconds between questions.");return}
  lastAsk=Date.now();busy=true;
  bubble("user",esc(q));const wait=bubble("bot","Thinking...");
  hist.push({role:"user",parts:[{text:q}]});hist=hist.slice(-8);
  try{
    const ans=await gemini(SYS+await context(),hist);
    hist.push({role:"model",parts:[{text:ans}]});wait.innerHTML=fmt(ans);
  }catch(e){
    hist.pop();
    wait.textContent=e.status===429?"The assistant is busy right now. Please try again in a minute.":e.status===403||e.status===400?"The assistant is not available right now. Please try again later.":"Sorry, something went wrong. Please try again.";
  }
  busy=false;$("aiBox").scrollTop=$("aiBox").scrollHeight;
}
$("aiForm").addEventListener("submit",e=>{e.preventDefault();const t=$("aiText").value;$("aiText").value="";ask(t)});
$("aiChips").addEventListener("click",e=>{const b=e.target.closest("button");if(b)ask(b.textContent)});

// Start
drawNews();
const start=location.hash.slice(1);
show(["news","search","ask"].includes(start)?start:"news");
})();