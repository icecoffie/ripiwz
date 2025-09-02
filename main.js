const seedPlaces = [
  {
    id: cryptoRandomId(),
    name: "Tierpark Hellabrunn — Penguin House",
    category: "Wisata",
    rating: 4.8,
    reviews: 320,
    desc: "Cute penguin views at Munich Zoo — chill vibes and family-friendly.",
    lat: 48.0916, lng: 11.5541,
    address: "Tierparkstrasse 30, 81543 München",
    // YT search-embed for Hellabrunn penguins (playlist of playable results)
    video: "https://www.youtube.com/embed?rel=0&listType=search&list=Hellabrunn%20penguins",
    createdAt: Date.now() - 1000*60*60*24*2
  },
  {
    id: cryptoRandomId(),
    name: "Eisbachwelle — Surf Spot",
    category: "Wisata",
    rating: 4.7,
    reviews: 210,
    desc: "Iconic river wave by the Englischer Garten. Ice-cold water, pro surfers — must see.",
    lat: 48.1421, lng: 11.5876,
    address: "Prinzregentenstr., 80538 München",
    video: "https://www.youtube.com/embed?rel=0&listType=search&list=arctic%20ice%20cinematic",
    createdAt: Date.now() - 1000*60*60*24*5
  },
  {
    id: cryptoRandomId(),
    name: "Man Versus Machine Coffee",
    category: "Kafe",
    rating: 4.6,
    reviews: 128,
    desc: "Specialty roaster with minimalist vibes and excellent espresso.",
    lat: 48.1359, lng: 11.5669,
    address: "Müllerstraße 23, 80469 München",
    video: "https://www.youtube.com/embed?rel=0&listType=search&list=cute%20penguins%204k",
    createdAt: Date.now() - 1000*60*60*24*15
  },
  {
    id: cryptoRandomId(),
    name: "Viktualienmarkt",
    category: "Wisata",
    rating: 4.7,
    reviews: 540,
    desc: "A lively market with Bavarian snacks, flowers, and fresh produce — right in the old town.",
    lat: 48.1355, lng: 11.5769,
    address: "Viktualienmarkt 3, 80331 München",
    video: "https://www.youtube.com/embed?rel=0&listType=search&list=emperor%20penguins%20documentary",
    createdAt: Date.now() - 1000*60*60*24*7
  },
  {
    id: cryptoRandomId(),
    name: "Café Frischhut (Schmalznudel)",
    category: "Restoran",
    rating: 4.5,
    reviews: 460,
    desc: "Legendary fried-dough pastries — best enjoyed fresh and warm.",
    lat: 48.1350, lng: 11.5756,
    address: "Prälat-Zistl-Straße 8, 80331 München",
    video: "https://www.youtube.com/embed?rel=0&listType=search&list=penguins%20ice%20funny",
    createdAt: Date.now() - 1000*60*60*24*30
  }
];

// --- State ---
let userPos = null;
let places = loadPlaces();
if(!places.length){ places = seedPlaces; savePlaces(); }

// --- Map (centered on Munich) ---
const map = L.map('map',{ scrollWheelZoom: true }).setView([48.137, 11.575], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:'&copy; OpenStreetMap'
}).addTo(map);
const markers = new Map(); // id -> marker

// --- Init ---
document.getElementById('y').textContent = new Date().getFullYear();
render();

// --- Event binding ---
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('categoryFilter').addEventListener('change', render);
document.getElementById('minRating').addEventListener('change', render);
document.getElementById('sortBy').addEventListener('change', render);
document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value='';
  document.getElementById('categoryFilter').value='';
  document.getElementById('minRating').value='0';
  document.getElementById('sortBy').value='top';
  render();
});
document.getElementById('geoBtn').addEventListener('click', useGeolocation);

// Add Review form
const addForm = document.getElementById('addForm');
// rating input interactions
const ratingStars = addForm.querySelectorAll('.rating-input .fa-star');
ratingStars.forEach(star=>{
  star.addEventListener('click', ()=> setRating(parseInt(star.dataset.val)));
  star.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setRating(parseInt(star.dataset.val)); }});
  star.addEventListener('mouseover', ()=> paintStars(parseInt(star.dataset.val)));
  star.addEventListener('mouseleave', ()=> paintStars(parseInt(addForm.rating.value||0)));
});
function setRating(val){
  addForm.rating.value = val;
  ratingStars.forEach(s=> s.setAttribute('aria-checked', s.dataset.val==val ? 'true':'false'));
  paintStars(val);
}
function paintStars(val){
  ratingStars.forEach((s,i)=> s.className = (i<val)?'fa-solid fa-star':'fa-regular fa-star');
}

addForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(addForm);
  const ratingVal = parseInt(f.get('rating')||'0');
  if(ratingVal<1){ alert('Pick a rating first ✨'); return; }
  const lat = parseFloat(f.get('lat')), lng = parseFloat(f.get('lng'));
  if(Number.isNaN(lat) || Number.isNaN(lng)){ alert('Invalid coordinates.'); return; }
  const p = {
    id: cryptoRandomId(),
    name: f.get('name').trim(),
    category: f.get('category'),
    rating: ratingVal,
    reviews: 1,
    desc: f.get('desc').trim(),
    lat, lng,
    address: f.get('address').trim(),
    video: (f.get('video')||'').trim(),
    createdAt: Date.now()
  };
  places.unshift(p);
  savePlaces();
  addForm.reset(); paintStars(0);
  bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
  render();
  focusCard(p.id);
});

// --- Render functions ---
function render(){
  syncMarkers();
  const filtered = getFilteredAndSorted();
  renderCards(filtered);
  renderAverage();
}

function renderCards(data){
  const wrap = document.getElementById('cards');
  wrap.innerHTML = '';
  if(!data.length){
    wrap.innerHTML = `<div class="col-12"><div class="card p-5 text-center">
      <h3 class="h5">No results</h3><p class="mb-0 opa-70">Try changing the keyword or filters.</p></div></div>`;
    return;
  }
  for(const p of data){
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-xl-4';
    col.innerHTML = cardTemplate(p);
    wrap.appendChild(col);

    // bind actions
    col.querySelector('[data-action="center"]').addEventListener('click', ()=>{ centerTo(p); });
    const playBtn = col.querySelector('[data-action="play"]');
    if(playBtn) playBtn.addEventListener('click', ()=> playVideo(p));
  }
}

function cardTemplate(p){
  const stars = renderStars(p.rating);
  const tags = `<span class="tag"><i class="fa-solid fa-tag me-1"></i>${p.category}</span>`;
  const videoBtn = p.video ? `<button class="btn btn-outline-light btn-sm" data-action="play"><i class="fa-solid fa-play me-1"></i>Play Video</button>` : '';
  return `
    <article class="card h-100">
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h3 class="h5 mb-0">${escapeHTML(p.name)}</h3>
          <button class="btn btn-outline-info btn-sm" data-action="center" title="Show on map"><i class="fa-regular fa-map"></i></button>
        </div>
        <div class="mb-2">${stars}</div>
        <p class="small opa-70 mb-2"><i class="fa-solid fa-location-dot me-1 text-info"></i>${escapeHTML(p.address||'Location unavailable')}</p>
        <p class="flex-grow-1">${escapeHTML(p.desc)}</p>
        <div class="d-flex align-items-center gap-2 flex-wrap mt-2">
          ${tags}
          <span class="tag"><i class="fa-regular fa-message me-1"></i>${p.reviews} reviews</span>
          <span class="tag"><i class="fa-regular fa-clock me-1"></i>${timeAgo(p.createdAt)}</span>
        </div>
        <div class="divider my-3"></div>
        <div class="d-flex gap-2">
          ${videoBtn}
          <a class="btn btn-outline-light btn-sm" href="#mapSection" data-action="center"><i class="fa-solid fa-map-location-dot me-1"></i>Open Map</a>
        </div>
      </div>
    </article>
  `;
}

function renderStars(score){
  const full = Math.floor(score);
  const half = (score - full)>=0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return `
    <div class="star" aria-label="Rating ${score.toFixed(1)} of 5">
      ${'★'.repeat(full)}${half? '½':''}${'☆'.repeat(empty)}
      <span class="ms-2 small opa-70">${score.toFixed(1)}</span>
    </div>
  `;
}

function renderAverage(){
  const avg = places.reduce((a,b)=>a+b.rating,0)/(places.length||1);
  const wrap = document.getElementById('avgStars');
  const scoreSpan = document.getElementById('avgScore');
  wrap.innerHTML = renderStars(avg);
  scoreSpan.textContent = `(${avg.toFixed(2)} from ${places.length} places)`;
}

function focusCard(id){
  const el = [...document.querySelectorAll('#cards .card')].find(c => c.innerHTML.includes(id));
  if(!el) return;
  el.scrollIntoView({behavior:'smooth', block:'center'});
}

// --- Map helpers ---
function syncMarkers(){
  // remove stale markers
  for(const [id, m] of markers){
    if(!places.find(p=>p.id===id)){
      map.removeLayer(m); markers.delete(id);
    }
  }
  // add/update markers
  for(const p of places){
    if(!markers.has(p.id)){
      const m = L.marker([p.lat, p.lng]).addTo(map).bindPopup(`
        <strong>${escapeHTML(p.name)}</strong><br>
        ${renderStars(p.rating)}<br>
        <span class="small opa-70">${escapeHTML(p.address||'')}</span><br>
        <button class="btn btn-sm btn-accent mt-2" onclick="window.__centerFromPopup('${p.id}')">Details</button>
      `);
      markers.set(p.id, m);
    }else{
      markers.get(p.id).setLatLng([p.lat, p.lng]);
    }
  }
}
// expose for popup button
window.__centerFromPopup = (id)=>{
  const p = places.find(x=>x.id===id); if(!p) return;
  centerTo(p);
};
function centerTo(p){
  map.setView([p.lat, p.lng], 15, { animate: true });
  markers.get(p.id).openPopup();
}
function playVideo(p){
  if(p.video.includes('youtube.com/embed/')){
    // swap to iframe mode (responsive)
    const wrap = document.querySelector('#videoSection .video-wrap');
    wrap.innerHTML = `<iframe title="${escapeHTML(p.name)}" src="${p.video}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }else{
    // native video
    const wrap = document.querySelector('#videoSection .video-wrap');
    wrap.innerHTML = `
      <video id="videoPlayer" controls preload="metadata">
        <source id="videoSrc" src="${p.video}" type="video/mp4">
      </video>`;
  }
  document.getElementById('videoSection').scrollIntoView({behavior:'smooth'});
}

// --- Filters / sorting ---
function getFilteredAndSorted(){
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const cat = document.getElementById('categoryFilter').value;
  const minR = parseFloat(document.getElementById('minRating').value);
  const sortBy = document.getElementById('sortBy').value;

  let arr = places.filter(p=>{
    const matchesQ =
      !q || [p.name, p.category, p.address, p.desc].join(' ').toLowerCase().includes(q);
    const matchesC = !cat || p.category===cat;
    const matchesR = (p.rating >= minR);
    return matchesQ && matchesC && matchesR;
  });

  if(sortBy==='top'){
    arr.sort((a,b)=> (b.rating - a.rating) || (b.reviews - a.reviews));
  }else if(sortBy==='new'){
    arr.sort((a,b)=> b.createdAt - a.createdAt);
  }else if(sortBy==='near' && userPos){
    arr.sort((a,b)=> dist(userPos,[a.lat,a.lng]) - dist(userPos,[b.lat,b.lng]));
  }
  return arr;
}

// --- Geolocation ---
function useGeolocation(){
  if(!navigator.geolocation){ alert('Geolocation is not supported by this browser.'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    userPos = [pos.coords.latitude, pos.coords.longitude];
    L.circle(userPos,{ radius:200, color:'#60a5fa', fillColor:'#60a5fa', fillOpacity:.15 }).addTo(map);
    map.setView(userPos, 13);
    render();
  }, err=>{
    alert('Failed to get location: '+err.message);
  }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
}

// --- Utils ---
function timeAgo(ts){
  const diff = Math.floor((Date.now()-ts)/1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for(const [name, sec] of units){
    const v = Math.floor(diff/sec);
    if(v>=1) return v+' '+name+(v>1?'s':'')+' ago';
  }
  return 'just now';
}
function dist([lat1,lon1],[lat2,lon2]){
  const toRad = d=> d*Math.PI/180;
  const R=6371;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function loadPlaces(){
  try{ return JSON.parse(localStorage.getItem('ripiwz-places')||'[]'); }catch(e){ return []; }
}
function savePlaces(){ localStorage.setItem('ripiwz-places', JSON.stringify(places)); }
function cryptoRandomId(){ return 'p_'+Math.random().toString(36).slice(2)+Date.now().toString(36); }
function escapeHTML(str){ return (str||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
