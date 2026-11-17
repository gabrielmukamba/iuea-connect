const SIGNUP="https://applicant.iuea.ac.ug/signup";
const PAGES=[["index.html","Home"],["about.html","About IUEA"],["faculties.html","Faculties"],["community.html","Community"],["resources.html","Resources"],["apply.html","Apply"],["contact.html","Contact"]];
const API="http://127.0.0.1:5000/api";
const here=location.pathname.split("/").pop()||"index.html";
const SOCIAL=`<div class="social-pills" style="margin-top:14px">
<a href="https://www.instagram.com/iuea_uganda" target="_blank" rel="noopener">Instagram</a>
<a href="https://www.facebook.com/IUEAUganda" target="_blank" rel="noopener">Facebook</a>
<a href="https://www.tiktok.com/@iuea_uganda" target="_blank" rel="noopener">TikTok</a>
<a href="https://youtube.com/@iuea_uganda" target="_blank" rel="noopener">YouTube</a>
<a href="https://www.linkedin.com/school/international-university-of-east-africa-iuea-/" target="_blank" rel="noopener">LinkedIn</a></div>`;

document.body.insertAdjacentHTML("afterbegin",`<header class="site-header"><nav class="navbar">
<a class="brand" href="index.html"><img src="images/iuea-logo.png" alt="IUEA logo" onerror="this.style.display='none'">IUEA Connect</a>
<button class="menu-btn" aria-label="Menu" onclick="document.querySelector('.links').classList.toggle('open')">Menu</button>
<ul class="links">${PAGES.map(([h,t])=>`<li><a href="${h}" class="${h===here?"active":""}">${t}</a></li>`).join("")}
<li><a class="join" href="${SIGNUP}" target="_blank" rel="noopener">Join IUEA</a></li></ul></nav></header>`);

document.body.insertAdjacentHTML("beforeend",`<footer class="site-footer"><div class="wrap">
<div class="foot-cta"><img src="images/iuea-logo.png" alt="IUEA logo" onerror="this.style.display='none'"><p>Kampala · Science, Business, Engineering &amp; Law.</p>
<a class="btn alt" href="${SIGNUP}" target="_blank" rel="noopener">Join IUEA</a><a class="btn ghost" href="mailto:info@iuea.ac.ug">Request Info</a></div>
<div class="foot-grid"><div><h4>Quick links</h4><ul>
<li><a href="community.html">Community</a></li><li><a href="resources.html">Resources</a></li><li><a href="apply.html">Apply</a></li><li><a href="contact.html">Contact</a></li><li><a href="privacy.html">Privacy</a></li>
<li><a href="https://iuea.ac.ug" target="_blank" rel="noopener">IUEA website</a></li><li><a href="https://vote.iuea.ac.ug/vote" target="_blank" rel="noopener">IUEA Ballot</a></li></ul></div>
<div><h4>Contact</h4><address>Plot No. 11/13, Kansanga Ggaba Rd, P.O. Box 23332, Kampala, Uganda
<a href="tel:+256703722300">+256 703 722 300</a><a href="tel:800330330">Toll-Free 800 330 330</a><a href="mailto:info@iuea.ac.ug">info@iuea.ac.ug</a></address>${SOCIAL}</div></div>
<h4>Find us</h4><iframe title="IUEA map" loading="lazy" src="https://www.google.com/maps?q=International+University+of+East+Africa+Kansanga&output=embed"></iframe></div>
<p class="copy">&copy; 2026 IUEA Connect · Not an official IUEA system.<br>Designed and created by <a href="contact.html" style="color:var(--gold)">Gabriel Mukamba</a></p></footer>`);

const store={get:k=>JSON.parse(localStorage.getItem(k)||"[]"),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
async function load(kind){try{const r=await fetch(`${API}/${kind}`);if(!r.ok)throw 0;return await r.json()}catch{return store.get(kind)}}
async function save(kind,item){try{const r=await fetch(`${API}/${kind}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item)});if(!r.ok)throw 0}catch{const a=store.get(kind);a.unshift(item);store.set(kind,a)}}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function render(kind,el,fn){const items=await load(kind);document.getElementById(el).innerHTML=items.length?items.map(fn).join(""):"<p>Nothing here yet. Be the first to post.</p>"}
const postCard=p=>`<div class="card top"><span class="tag">${esc(p.faculty)}</span><span class="tag">${esc(p.type)}</span><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p><small>${esc(p.name)}</small></div>`;
function wire(kind,formId,listId,fn){const f=document.getElementById(formId);if(!f)return;render(kind,listId,fn);
f.addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));d.time=new Date().toISOString();await save(kind,d);f.reset();render(kind,listId,fn)})}
wire("posts","postForm","postList",postCard);
wire("groups","groupForm","groupList",g=>`<div class="card"><span class="tag">${esc(g.faculty)}</span><h3>${esc(g.title)}</h3><p>${esc(g.body)}</p><a href="mailto:${esc(g.contact)}">Contact organiser</a></div>`);