/* ---------- Storage Layer ---------- */
const LS_KEY = 'power-subscribers-v1';

function loadSubs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function saveSubs(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function genSubNumber(existing) {
  // SUB-YYYYMMDD-XXXX (ensures uniqueness inside current storage)
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  let no;
  do { no = `SUB-${date}-${Math.floor(1000 + Math.random()*9000)}`; }
  while (existing.some(s => s.subNo === no));
  return no;
}

/* ---------- DOM Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function setText(id, val){ $(id).textContent = val; }
function setBadge(on){
  const badge = $('#powerBadge');
  badge.classList.toggle('on', on);
  badge.classList.toggle('off', !on);
  badge.textContent = on ? 'ჩართულია' : 'გამორთულია';
}

/* ---------- Global State ---------- */
let subs = loadSubs();
let current = null; // currently selected subscriber

/* ---------- UI: Registration ---------- */
$('#registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const firstName = fd.get('firstName').trim();
  const lastName  = fd.get('lastName').trim();
  const personalId = fd.get('personalId').trim();
  const phone = fd.get('phone').trim();
  const address = fd.get('address').trim();

  if(!firstName || !lastName || !personalId || !phone || !address){
    alert('ყველა ველი აუცილებელია.');
    return;
  }

  const subNo = genSubNumber(subs);
  const sub = {
    subNo, firstName, lastName, personalId, phone, address,
    powerOn: true,
    damage: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  subs.push(sub);
  saveSubs(subs);
  $('#newSubNumber').textContent = `დარეგისტრირდა! აბონენტის №: ${subNo}`;
  e.target.reset();
  renderTable();
});

/* ---------- UI: Search ---------- */
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if(!q){ return; }
  const found = subs.find(s => s.subNo.toLowerCase() === q.toLowerCase());
  if(!found){
    $('#result').classList.add('hidden');
    alert('აბონენტი ვერ მოიძებნა.');
    return;
  }
  current = found;
  fillResult(found);
});
$('#clearSearch').addEventListener('click', ()=>{
  $('#searchInput').value = '';
  $('#result').classList.add('hidden');
  current = null;
});

/* ---------- Result Card & Edit ---------- */
function fillResult(s){
  $('#result').classList.remove('hidden');
  setText('#rSubNo', s.subNo);
  setText('#rFullName', `${s.firstName} ${s.lastName}`);
  setText('#rPid', s.personalId);
  setText('#rPhone', s.phone);
  setText('#rAddress', s.address);
  setText('#rDamage', s.damage ? s.damage : 'არაფერია დაფიქსირებული');
  setBadge(s.powerOn);

  // preload edit form
  const ef = $('#editForm');
  ef.firstName.value = s.firstName;
  ef.lastName.value  = s.lastName;
  ef.personalId.value = s.personalId;
  ef.phone.value = s.phone;
  ef.address.value = s.address;
  $('#editForm').classList.add('hidden');
}

$('#togglePower').addEventListener('click', ()=>{
  if(!current) return;
  current.powerOn = !current.powerOn;
  current.updatedAt = Date.now();
  saveSubs(subs);
  fillResult(current);
  renderTable();
});

$('#editBtn').addEventListener('click', ()=>{
  $('#editForm').classList.toggle('hidden');
});

$('#cancelEdit').addEventListener('click', ()=>{
  $('#editForm').classList.add('hidden');
});

$('#editForm').addEventListener('submit', e=>{
  e.preventDefault();
  if(!current) return;
  const fd = new FormData(e.target);
  current.firstName = fd.get('firstName').trim();
  current.lastName  = fd.get('lastName').trim();
  current.personalId = fd.get('personalId').trim();
  current.phone = fd.get('phone').trim();
  current.address = fd.get('address').trim();
  current.updatedAt = Date.now();
  saveSubs(subs);
  fillResult(current);
  renderTable();
  $('#editForm').classList.add('hidden');
});

$('#clearDamage').addEventListener('click', ()=>{
  if(!current) return;
  current.damage = null;
  current.updatedAt = Date.now();
  saveSubs(subs);
  fillResult(current);
  renderTable();
});

$('#deleteBtn').addEventListener('click', ()=>{
  if(!current) return;
  if(confirm('დარწმუნებული ხართ რომ გსურთ აბონენტის წაშლა?')){
    subs = subs.filter(s => s.subNo !== current.subNo);
    saveSubs(subs);
    $('#result').classList.add('hidden');
    renderTable();
    current = null;
  }
});

/* ---------- Mass Damage by Address ---------- */
$('#damageForm').addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const addr = (fd.get('damageAddress') || '').trim().toLowerCase();
  const text = (fd.get('damageText') || '').trim() || 'დაზიანება დაფიქსირდა';
  if(!addr){ return; }

  let count = 0;
  subs.forEach(s=>{
    if(s.address.trim().toLowerCase().includes(addr)){
      s.damage = `${text} • (${new Date().toLocaleString()})`;
      s.updatedAt = Date.now();
      count++;
    }
  });
  saveSubs(subs);
  $('#damageResult').textContent = count
    ? `დაზიანება მიენიჭა ${count} აბონენტს.`
    : 'ამ მისამართით აბონენტი ვერ მოიძებნა.';
  if(current){
    // refresh current card if it matches
    const refreshed = subs.find(x=>x.subNo===current.subNo);
    if(refreshed){ current = refreshed; fillResult(current); }
  }
  renderTable();
});

/* ---------- Table ---------- */
function renderTable(){
  const tbody = $('#subsTable tbody');
  tbody.innerHTML = '';
  const filter = ($('#filterAddress').value || '').trim().toLowerCase();

  subs
    .filter(s => !filter || s.address.toLowerCase().includes(filter))
    .sort((a,b)=> b.updatedAt - a.updatedAt)
    .forEach(s=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="#" data-sub="${s.subNo}">${s.subNo}</a></td>
        <td>${s.firstName} ${s.lastName}</td>
        <td>${s.address}</td>
        <td><span class="status-dot ${s.powerOn?'':'off'}"></span>${s.powerOn?'ჩართულია':'გამორთულია'}</td>
        <td>${s.damage ? `<span class="damage-chip" title="${s.damage}">დაფიქსირებულია</span>` : '<span class="damage-chip">—</span>'}</td>
      `;
      tbody.appendChild(tr);
    });

// click handler to open card
$$('a[data-sub]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const subNo = a.getAttribute('data-sub'); // <- შესწორებული
    const found = subs.find(s => s.subNo === subNo);
    if(found){
      current = found;
      fillResult(found);
      $('#searchInput').value = subNo;
      window.scrollTo({top:0, behavior:'smooth'});
    }
  });
});
}