// ============================================================
// FIREBASE INIT
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyBYSLZZ6ueCfFi4KGzVThLDHw3PVKpnb30",
    authDomain: "db001-e92b0.firebaseapp.com",
    databaseURL: "https://db001-e92b0-default-rtdb.firebaseio.com",
    projectId: "db001-e92b0"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================
// GLOBALS
// ============================================================
let currentUser = null;
let allStock = [];
let allTransfers = [];
let stockCache = null, stockCacheTime = 0;
let transfersCache = null, transfersCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;
let families = {};
let sites = [];
let currentCategoryFilter = null;

// ============================================================
// HELPERS
// ============================================================
function hasPermission(perm) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.permissions?.[perm] === true;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ============================================================
// SITES MANAGEMENT
// ============================================================
async function loadSites() {
    const snap = await db.ref('sites').once('value');
    const data = snap.val();
    if (data && Array.isArray(data)) {
        sites = data;
    } else if (data && typeof data === 'object') {
        sites = Object.values(data);
    } else {
        sites = [{ code: "Main Store", description: "Main Store" }];
        await db.ref('sites').set(sites);
    }
    populateSiteDropdowns();
}
function populateSiteDropdowns() {
    const dropdowns = ['siteFilter', 'siteStockSelect', 'adjSite', 'transferFromSite', 'transferToSite'];
    dropdowns.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        el.innerHTML = '<option value="All">All Sites</option>';
        sites.forEach(s => {
            el.innerHTML += `<option value="${s.code}">${s.code} - ${s.description}</option>`;
        });
        if (currentVal && currentVal !== 'All' && Array.from(el.options).some(opt => opt.value === currentVal))
            el.value = currentVal;
        else
            el.value = 'All';
    });
}
async function renderSitesManager() {
    if (!currentUser) return;
    const container = document.getElementById('sitesList');
    if (!container) return;
    const hasSitePerm = hasPermission('manage_sites') || currentUser.role === 'admin';
    if (!hasSitePerm) {
        container.innerHTML = '<div class="settings-panel"><p>You do not have permission to manage sites.</p></div>';
        document.getElementById('addSiteBtn').style.display = 'none';
        return;
    }
    document.getElementById('addSiteBtn').style.display = 'inline-flex';
    let html = '';
    sites.forEach(site => {
        html += `<div class="site-item">
            <div class="site-header">
                <span class="site-code">${escapeHtml(site.code)} - ${escapeHtml(site.description)}</span>
                <div>
                    <button class="secondary btn-icon edit-site" data-code="${site.code}"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button class="danger btn-icon delete-site" data-code="${site.code}"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('.edit-site').forEach(btn => btn.onclick = () => editSite(btn.dataset.code));
    document.querySelectorAll('.delete-site').forEach(btn => btn.onclick = () => deleteSite(btn.dataset.code));
}
let editingSiteCode = null;
async function editSite(code) {
    const site = sites.find(s => s.code === code);
    if (!site) return;
    editingSiteCode = code;
    document.getElementById('siteModalTitle').innerText = 'Edit Site';
    document.getElementById('siteCode').value = site.code;
    document.getElementById('siteName').value = site.description;
    document.getElementById('siteModal').classList.remove('hidden');
}
async function deleteSite(code) {
    if (code === "Main Store") { alert("Cannot delete Main Store."); return; }
    if (confirm(`Delete site ${code}?`)) {
        sites = sites.filter(s => s.code !== code);
        await db.ref('sites').set(sites);
        await loadSites();
        renderSitesManager();
        populateSiteDropdowns();
        renderStock();
    }
}
document.getElementById('addSiteBtn')?.addEventListener('click', () => {
    editingSiteCode = null;
    document.getElementById('siteModalTitle').innerText = 'Add Site';
    document.getElementById('siteCode').value = '';
    document.getElementById('siteName').value = '';
    document.getElementById('siteModal').classList.remove('hidden');
});
document.getElementById('saveSiteBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('siteCode').value.trim();
    const name = document.getElementById('siteName').value.trim();
    if (!code || !name) { alert('Please enter both Site Number and Site Name'); return; }
    if (!editingSiteCode && sites.find(s => s.code === code)) { alert('Site number already exists'); return; }
    if (editingSiteCode) {
        const index = sites.findIndex(s => s.code === editingSiteCode);
        if (index !== -1) {
            sites[index].code = code;
            sites[index].description = name;
        }
    } else {
        sites.push({ code, description: name });
    }
    await db.ref('sites').set(sites);
    await loadSites();
    renderSitesManager();
    populateSiteDropdowns();
    renderStock();
    document.getElementById('siteModal').classList.add('hidden');
});
document.querySelectorAll('.closeSiteModal').forEach(btn => {
    btn.onclick = () => document.getElementById('siteModal').classList.add('hidden');
});
document.getElementById('siteModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('siteModal')) document.getElementById('siteModal').classList.add('hidden');
});

// ============================================================
// FAMILIES MANAGEMENT
// ============================================================
async function loadFamilies() {
    const snap = await db.ref('families').once('value');
    const data = snap.val();
    if (data && Object.keys(data).length) {
        families = data;
    } else {
        families = {
            "1": { name: "Civil", relations: { "101": "Concrete", "102": "Rebar" } },
            "2": { name: "Architecture", relations: { "201": "Tiles", "202": "Paints" } },
            "3": { name: "Electrical", relations: { "301": "Cables" } },
            "4": { name: "Mechanical", relations: { "401": "HVAC" } },
            "9": { name: "Other", relations: { "901": "Misc" } }
        };
        await db.ref('families').set(families);
    }
    populateFamilySelects();
    renderCategoryTabs();
}
function populateFamilySelects() {
    const famSelect = document.getElementById('familySelect');
    if (!famSelect) return;
    famSelect.innerHTML = '<option disabled selected>Select Family</option>';
    for (const [code, fam] of Object.entries(families))
        famSelect.innerHTML += `<option value="${code}">${code} - ${fam.name}</option>`;
    famSelect.onchange = () => updateRelationDropdown();
    updateRelationDropdown();
}
function updateRelationDropdown() {
    const famSelect = document.getElementById('familySelect');
    const relSelect = document.getElementById('relationSelect');
    const selectedFam = famSelect.value;
    relSelect.innerHTML = '<option disabled selected>Select Relationship</option>';
    if (selectedFam && families[selectedFam]?.relations) {
        for (const [rc, rname] of Object.entries(families[selectedFam].relations))
            relSelect.innerHTML += `<option value="${rc}">${rc} - ${rname}</option>`;
    }
}
function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    let html = `<button class="${(!currentCategoryFilter || currentCategoryFilter === 'All') ? 'active' : ''}" onclick="filterStockByCategory('All')">All Families</button>`;
    for (const [code, fam] of Object.entries(families)) {
        const activeClass = currentCategoryFilter === code ? 'active' : '';
        html += `<button class="${activeClass}" onclick="filterStockByCategory('${code}')">${fam.name} [${code}]</button>`;
    }
    container.innerHTML = html;
}
window.filterStockByCategory = function(cat) {
    currentCategoryFilter = cat;
    renderCategoryTabs();
    renderStock();
};
async function renderFamiliesManager() {
    if (!currentUser) return;
    const container = document.getElementById('familiesList');
    if (!container) return;
    const hasFamilyPerm = hasPermission('manage_families') || currentUser.role === 'admin';
    if (!hasFamilyPerm) {
        container.innerHTML = '<div class="settings-panel"><p>You do not have permission to manage families.</p></div>';
        document.getElementById('addFamilyBtn').style.display = 'none';
        return;
    }
    document.getElementById('addFamilyBtn').style.display = 'inline-flex';
    let html = '';
    for (const [code, fam] of Object.entries(families)) {
        html += `<div class="family-card">
            <div class="family-header">
                <span class="family-code">${code} - ${fam.name}</span>
                <div>
                    <button class="secondary btn-icon edit-family" data-code="${code}"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button class="danger btn-icon delete-family" data-code="${code}"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
            <div class="relations-list">`;
        for (const [rc, rname] of Object.entries(fam.relations || {})) {
            html += `<div class="relation-item">
                        <span>${rc} - ${rname}</span>
                        <div>
                            <button class="secondary btn-icon edit-relation" data-code="${code}" data-rel="${rc}"><i class="fa-solid fa-edit"></i></button>
                            <button class="danger btn-icon delete-relation" data-code="${code}" data-rel="${rc}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>`;
        }
        html += `<button class="secondary add-relation-btn" data-code="${code}">+ Add Relation</button>
            </div>
        </div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll('.edit-family').forEach(btn => btn.onclick = () => editFamily(btn.dataset.code));
    document.querySelectorAll('.delete-family').forEach(btn => btn.onclick = () => deleteFamily(btn.dataset.code));
    document.querySelectorAll('.edit-relation').forEach(btn => btn.onclick = () => editRelation(btn.dataset.code, btn.dataset.rel));
    document.querySelectorAll('.delete-relation').forEach(btn => btn.onclick = () => deleteRelation(btn.dataset.code, btn.dataset.rel));
    document.querySelectorAll('.add-relation-btn').forEach(btn => btn.onclick = () => addRelation(btn.dataset.code));
}
async function editFamily(code) {
    const newName = prompt("Enter new family name:", families[code].name);
    if (!newName) return;
    families[code].name = newName;
    await db.ref(`families/${code}/name`).set(newName);
    await loadFamilies();
    renderFamiliesManager();
    populateFamilySelects();
    renderCategoryTabs();
}
async function deleteFamily(code) {
    if (['1','2','3','4','9'].includes(code)) { alert("Cannot delete default families (1,2,3,4,9)."); return; }
    if (confirm(`Delete family ${code}?`)) {
        delete families[code];
        await db.ref(`families/${code}`).remove();
        await loadFamilies();
        renderFamiliesManager();
        populateFamilySelects();
        renderCategoryTabs();
    }
}
async function addRelation(code) {
    const rc = prompt("Enter relation code (e.g., 105):");
    if (!rc) return;
    const rname = prompt("Enter relation name:");
    if (!rname) return;
    if (!families[code].relations) families[code].relations = {};
    families[code].relations[rc] = rname;
    await db.ref(`families/${code}/relations/${rc}`).set(rname);
    await loadFamilies();
    renderFamiliesManager();
    populateFamilySelects();
}
async function editRelation(code, rc) {
    const newName = prompt("Enter new relation name:", families[code].relations[rc]);
    if (!newName) return;
    families[code].relations[rc] = newName;
    await db.ref(`families/${code}/relations/${rc}`).set(newName);
    await loadFamilies();
    renderFamiliesManager();
    populateFamilySelects();
}
async function deleteRelation(code, rc) {
    if (confirm(`Delete relation ${rc}?`)) {
        delete families[code].relations[rc];
        await db.ref(`families/${code}/relations/${rc}`).remove();
        await loadFamilies();
        renderFamiliesManager();
        populateFamilySelects();
    }
}
document.getElementById('addFamilyBtn')?.addEventListener('click', async () => {
    const code = prompt("Enter family code (1-9 or any number):");
    if (!code) return;
    if (families[code]) { alert("Code already exists"); return; }
    const name = prompt("Enter family name:");
    if (!name) return;
    families[code] = { name, relations: {} };
    await db.ref(`families/${code}`).set({ name, relations: {} });
    await loadFamilies();
    renderFamiliesManager();
    populateFamilySelects();
    renderCategoryTabs();
});

// ============================================================
// LOGIN & SESSION MANAGEMENT
// ============================================================
async function restoreSession() {
    const session = localStorage.getItem('inventorySession');
    if (!session) return false;
    try {
        const userData = JSON.parse(session);
        const snap = await db.ref(`users/${userData.uid}`).once('value');
        if (!snap.exists()) {
            localStorage.removeItem('inventorySession');
            return false;
        }
        const dbUser = snap.val();
        currentUser = {
            uid: userData.uid,
            email: dbUser.email,
            displayName: dbUser.displayName || userData.displayName,
            role: dbUser.role,
            permissions: dbUser.permissions || {}
        };
        document.getElementById('sidebarUserName').innerText = currentUser.displayName || currentUser.email;
        document.getElementById('sidebarUserRole').innerText = currentUser.role === 'admin' ? 'Admin' : 'User';
        const hasAnyManagement = hasPermission('manage_users') || hasPermission('manage_families') || hasPermission('manage_sites') || currentUser.role === 'admin';
        document.getElementById('navSettings').style.display = hasAnyManagement ? 'flex' : 'none';
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        await loadSites();
        await loadFamilies();
        await loadStock();
        await loadTransfers();
        toggleSection('stock');
        return true;
    } catch (err) {
        console.error("Session restore failed", err);
        localStorage.removeItem('inventorySession');
        return false;
    }
}

window.handleLoginClick = async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    if (!email || !password) {
        errorDiv.innerText = "Enter email and password";
        errorDiv.classList.remove('hidden');
        return;
    }
    try {
        const usersSnap = await db.ref('users').once('value');
        let foundUser = null;
        usersSnap.forEach(child => {
            const user = child.val();
            if (user.email === email && user.password === password) foundUser = { uid: child.key, ...user };
        });
        if (!foundUser) { errorDiv.innerText = "Invalid credentials"; errorDiv.classList.remove('hidden'); return; }
        currentUser = foundUser;
        localStorage.setItem('inventorySession', JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: currentUser.role,
            permissions: currentUser.permissions
        }));
        document.getElementById('sidebarUserName').innerText = currentUser.displayName || currentUser.email;
        document.getElementById('sidebarUserRole').innerText = currentUser.role === 'admin' ? 'Admin' : 'User';
        const hasAnyManagement = hasPermission('manage_users') || hasPermission('manage_families') || hasPermission('manage_sites') || currentUser.role === 'admin';
        document.getElementById('navSettings').style.display = hasAnyManagement ? 'flex' : 'none';
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        await loadSites();
        await loadFamilies();
        await loadStock();
        await loadTransfers();
        toggleSection('stock');
    } catch (err) { errorDiv.innerText = err.message; errorDiv.classList.remove('hidden'); }
};
document.getElementById('loginBtn').onclick = () => window.handleLoginClick();

// Enter key login
const loginPassword = document.getElementById('loginPassword');
const loginEmail = document.getElementById('loginEmail');
if (loginPassword) loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.handleLoginClick(); } });
if (loginEmail) loginEmail.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.handleLoginClick(); } });

function logout() {
    currentUser = null;
    localStorage.removeItem('inventorySession');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}
document.getElementById('logoutBtn').onclick = logout;

// ============================================================
// STOCK CRUD
// ============================================================
async function loadStock(force = false) {
    const now = Date.now();
    if (!force && stockCache && (now - stockCacheTime) < CACHE_TTL) {
        allStock = stockCache;
        renderStock();
        return;
    }
    const snap = await db.ref('material_stock').once('value');
    allStock = [];
    if (snap.val()) Object.entries(snap.val()).forEach(([k, v]) => allStock.push({ key: k, ...v }));
    stockCache = [...allStock]; stockCacheTime = now;
    renderStock();
}
async function saveStock(item, key = null) {
    const ref = key ? db.ref(`material_stock/${key}`) : db.ref('material_stock').push();
    await ref.set(item);
    await loadStock(true);
}
async function deleteStock(key) {
    if (!hasPermission('delete')) { alert('No permission to delete'); return; }
    await db.ref(`material_stock/${key}`).remove();
    await loadStock(true);
}
async function adjustStock(key, site, delta) {
    const ref = db.ref(`material_stock/${key}`);
    const snap = await ref.once('value');
    let it = snap.val();
    if (!it) return;
    if (!it.sites) it.sites = {};
    let cur = parseFloat(it.sites[site] || 0);
    cur += delta;
    if (cur < 0) cur = 0;
    it.sites[site] = cur;
    let total = 0;
    Object.values(it.sites).forEach(v => total += parseFloat(v));
    it.stockQty = total;
    await ref.update({ sites: it.sites, stockQty: total });
    await loadStock(true);
}
function renderStock() {
    let filtered = allStock;
    const search = document.getElementById('stockSearch').value.toLowerCase();
    const siteF = document.getElementById('siteFilter').value;
    filtered = filtered.filter(i => (i.productID || '').toLowerCase().includes(search) || (i.productName || '').toLowerCase().includes(search));
    if (siteF !== 'All') filtered = filtered.filter(i => i.sites && parseFloat(i.sites[siteF] || 0) > 0);
    if (currentCategoryFilter && currentCategoryFilter !== 'All') filtered = filtered.filter(i => i.familyCode === currentCategoryFilter);
    const tbody = document.getElementById('stockTbody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7">No items<\/td></tr>'; return; }
    tbody.innerHTML = '';
    filtered.forEach(item => {
        let total = 0, breakdown = '';
        if (item.sites) {
            for (let [s, q] of Object.entries(item.sites)) {
                let qt = parseFloat(q);
                if (qt > 0 || siteF === s) {
                    total += qt;
                    const siteObj = sites.find(site => site.code === s);
                    const siteDisplay = siteObj ? `${s} - ${siteObj.description}` : s;
                    breakdown += `<tr><td style="padding-left:20px;">${escapeHtml(siteDisplay)}<\/td><td>${qt}<\/td></tr>`;
                }
            }
        }
        if (!breakdown) breakdown = '<tr><td style="padding-left:20px;">Unassigned<\/td><td>0<\/td></tr>';
        const rowId = `det-${item.key}`;
        tbody.innerHTML += `
            <tr class="ms-parent-row">
                <td><button class="expandBtn" data-row="${rowId}">+</button></td>
                <td><strong>${escapeHtml(item.productID)}</strong></td>
                <td>${escapeHtml(item.productName)}</td>
                <td>${escapeHtml(families[item.familyCode]?.name || item.family || '')}</td>
                <td>${escapeHtml(item.details || '')}</td>
                <td style="font-weight:800;">${total}</td>
                <td>
                    ${hasPermission('edit') ? `<button class="editStock" data-key="${item.key}"><i class="fa-solid fa-pen"></i></button>` : ''}
                    ${hasPermission('create') ? `<button class="addStock" data-key="${item.key}"><i class="fa-solid fa-plus"></i></button>` : ''}
                    ${hasPermission('delete') ? `<button class="deleteStock" data-key="${item.key}"><i class="fa-solid fa-trash"></i></button>` : ''}
                  </td>
              </tr>
            <tr id="${rowId}" class="stock-child-row hidden">
                <td colspan="7"><div style="padding:12px;"><h4>Stock by Site</h4><table class="stock-detail-table"><tbody>${breakdown}</tbody></table></div></td>
              </tr>
        `;
    });
    attachStockEvents();
}
function attachStockEvents() {
    document.querySelectorAll('.expandBtn').forEach(btn => btn.onclick = () => {
        const tr = document.getElementById(btn.dataset.row);
        if (tr) tr.classList.toggle('hidden');
        btn.textContent = tr.classList.contains('hidden') ? '+' : '-';
    });
    document.querySelectorAll('.editStock').forEach(btn => btn.onclick = () => openEditModal(btn.dataset.key));
    document.querySelectorAll('.addStock').forEach(btn => btn.onclick = () => openAdjustModal(btn.dataset.key));
    document.querySelectorAll('.deleteStock').forEach(btn => btn.onclick = async () => { if (confirm('Delete?')) await deleteStock(btn.dataset.key); });
}
function openEditModal(key) {
    const item = key ? allStock.find(i => i.key === key) : null;
    document.getElementById('editKey').value = key || '';
    document.getElementById('productName').value = item?.productName || '';
    document.getElementById('productIdDisplay').value = item?.productID || 'Auto';
    document.getElementById('modalTitle').innerText = key ? 'Edit / Add Stock' : 'Register Material';
    populateFamilySelects();
    if (item) {
        document.getElementById('familySelect').value = item.familyCode;
        updateRelationDropdown();
        document.getElementById('relationSelect').value = item.relationCode;
    }
    document.getElementById('itemModal').classList.remove('hidden');
}
function openAdjustModal(key) {
    const item = allStock.find(i => i.key === key);
    if (!item) return;
    document.getElementById('adjKey').value = key;
    document.getElementById('adjPid').value = item.productID || '';
    document.getElementById('adjName').value = item.productName || '';
    populateSiteDropdowns();
    document.getElementById('addStockModal').classList.remove('hidden');
}
async function saveItemModal() {
    const key = document.getElementById('editKey').value;
    const fam = document.getElementById('familySelect').value;
    const rel = document.getElementById('relationSelect').value;
    const name = document.getElementById('productName').value.trim();
    const site = document.getElementById('siteStockSelect').value;
    let qty = parseFloat(document.getElementById('stockQty').value) || 0;
    if (!fam || !rel || !name) { alert('Fill all required fields'); return; }
    let pid = document.getElementById('productIdDisplay').value;
    if (!key) {
        let max = 0;
        allStock.forEach(i => { let s = i.series; if (s && s > max) max = s; });
        let next = max + 1;
        pid = `${fam}.${rel}.${String(next).padStart(5, '0')}`;
    }
    const item = {
        productID: pid, productName: name,
        familyCode: fam, family: families[fam]?.name,
        relationCode: rel, details: families[fam]?.relations[rel] || '',
        stockQty: 0, sites: {}
    };
    if (key) {
        const old = allStock.find(i => i.key === key);
        item.sites = old.sites || {};
        item.stockQty = old.stockQty || 0;
        await saveStock(item, key);
        if (qty !== 0) await adjustStock(key, site, qty);
    } else {
        if (qty > 0) item.sites[site] = qty;
        item.stockQty = qty;
        await saveStock(item);
    }
    closeItemModal();
}
async function applyStockAdjust() {
    await adjustStock(document.getElementById('adjKey').value, document.getElementById('adjSite').value, parseFloat(document.getElementById('adjQty').value) || 0);
    closeAddStockModal();
}
document.getElementById('saveItemBtn').onclick = saveItemModal;
document.getElementById('applyStockBtn').onclick = applyStockAdjust;
document.getElementById('refreshStockBtn').onclick = () => loadStock(true);
document.getElementById('clearSearchBtn').onclick = () => { document.getElementById('stockSearch').value = ''; renderStock(); };
document.getElementById('siteFilter').onchange = renderStock;
document.getElementById('stockSearch').oninput = renderStock;

function updateStockUIPermissions() {
    const addNewBtn = document.getElementById('addNewBtn');
    if (addNewBtn) {
        if (hasPermission('register_material') || currentUser.role === 'admin')
            addNewBtn.style.display = 'inline-flex';
        else
            addNewBtn.style.display = 'none';
    }
}
document.getElementById('addNewBtn').onclick = () => {
    if (hasPermission('register_material') || currentUser.role === 'admin') openEditModal(null);
    else alert('No permission to register material');
};

// ============================================================
// TRANSFER & APPROVAL
// ============================================================
async function loadTransfers(force = false) {
    const now = Date.now();
    if (!force && transfersCache && (now - transfersCacheTime) < CACHE_TTL) {
        allTransfers = transfersCache;
        renderTasks();
        renderJobRecords();
        return;
    }
    const snap = await db.ref('transfer_entries').once('value');
    allTransfers = [];
    if (snap.val()) Object.entries(snap.val()).forEach(([k, v]) => allTransfers.push({ key: k, ...v }));
    transfersCache = [...allTransfers]; transfersCacheTime = now;
    renderTasks(); renderJobRecords();
}
async function saveTransfer(data) { await db.ref('transfer_entries').push().set(data); await loadTransfers(true); }
async function updateTransfer(key, updates) { await db.ref(`transfer_entries/${key}`).update(updates); await loadTransfers(true); }
function openTransferModal(type) {
    if (!hasPermission('create')) { alert('No permission to create transactions'); return; }
    document.getElementById('transferType').value = type;
    document.getElementById('transferModalTitle').innerText = `New ${type}`;
    document.getElementById('transferQty').value = '';
    const prodSel = document.getElementById('transferProductSelect');
    prodSel.innerHTML = '<option disabled selected>Select product</option>';
    allStock.forEach(i => prodSel.innerHTML += `<option value="${i.key}">${i.productID} - ${i.productName}</option>`);
    populateSiteDropdowns();
    document.getElementById('transferModal').classList.remove('hidden');
}
async function executeTransfer() {
    const type = document.getElementById('transferType').value;
    const prodKey = document.getElementById('transferProductSelect').value;
    const qty = parseFloat(document.getElementById('transferQty').value);
    const fromSite = document.getElementById('transferFromSite').value;
    const toSite = document.getElementById('transferToSite').value;
    const sourceContact = document.getElementById('transferSourceContact').value;
    const approver = document.getElementById('transferApprover').value;
    const receiver = document.getElementById('transferReceiver').value;
    const remarks = document.getElementById('transferRemarks').value;
    if (!prodKey || isNaN(qty) || qty <= 0) { alert('Product & quantity required'); return; }
    const product = allStock.find(i => i.key === prodKey);
    const controlNo = `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const entry = {
        controlNumber: controlNo, jobType: type, for: type,
        productID: product.productID, productName: product.productName,
        requiredQty: qty, orderedQty: qty,
        fromLocation: fromSite, toLocation: toSite,
        sourceContact, approver, receiver, remarks: 'Pending',
        status: 'Pending', timestamp: Date.now(), lastUpdated: Date.now(),
        enteredBy: currentUser.displayName
    };
    if (type === 'Transfer') entry.remarks = 'Pending Source';
    else if (type === 'Restock') entry.remarks = 'Pending Admin';
    else if (type === 'Usage') entry.remarks = 'Pending Admin';
    else if (type === 'Return') entry.remarks = 'Pending Admin';
    await saveTransfer(entry);
    alert('Request created! Check Active Tasks.');
    closeTransferModal();
}
function renderTasks() {
    if (!currentUser) return;
    let tasks = allTransfers.filter(t => t.remarks !== 'Completed' && t.remarks !== 'Rejected');
    const currentUserName = currentUser.displayName;
    tasks = tasks.filter(t => {
        if (t.remarks === 'Pending Source' && t.sourceContact === currentUserName) return true;
        if (t.remarks === 'Pending Admin' && (t.approver === currentUserName || currentUser.role === 'admin')) return true;
        if (t.remarks === 'In Transit' && t.receiver === currentUserName) return true;
        if (t.remarks === 'Pending Confirmation' && t.enteredBy === currentUserName) return true;
        return false;
    });
    document.getElementById('taskBadge').textContent = tasks.length;
    const container = document.getElementById('taskList');
    if (!tasks.length) { container.innerHTML = '<div class="task-card">✅ No pending tasks</div>'; return; }
    let html = '';
    tasks.forEach(t => {
        let actionBtn = `<button class="secondary actionTask" data-key="${t.key}">Process</button>`;
        if (t.remarks === 'Pending Source') actionBtn = `<button class="warning actionTask" data-key="${t.key}">Source Confirm</button>`;
        else if (t.remarks === 'Pending Admin') actionBtn = `<button class="success actionTask" data-key="${t.key}">Authorize</button>`;
        else if (t.remarks === 'In Transit') actionBtn = `<button class="success actionTask" data-key="${t.key}">Confirm Receipt</button>`;
        else if (t.remarks === 'Pending Confirmation') actionBtn = `<button class="success actionTask" data-key="${t.key}">Confirm Usage</button>`;
        html += `<div class="task-card">
            <div><strong>${escapeHtml(t.controlNumber)}</strong> | ${escapeHtml(t.jobType)} | ${escapeHtml(t.productName)} | Qty: ${t.orderedQty} | Status: ${escapeHtml(t.remarks)}</div>
            <div style="margin-top:10px;">${actionBtn} ${hasPermission('print') ? `<button class="secondary printWaybillBtn" data-key="${t.key}"><i class="fa-solid fa-print"></i> Waybill</button>` : ''}</div>
        </div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('.actionTask').forEach(btn => btn.onclick = () => openApprovalModal(btn.dataset.key));
    document.querySelectorAll('.printWaybillBtn').forEach(btn => btn.onclick = () => printWaybill(btn.dataset.key));
}
async function openApprovalModal(key) {
    if (!hasPermission('approve')) { alert('No permission to approve'); return; }
    const task = allTransfers.find(t => t.key === key);
    if (!task) return;
    document.getElementById('approvalKey').value = key;
    document.getElementById('approvalRef').value = task.controlNumber;
    document.getElementById('approvalQty').value = task.approvedQty || task.orderedQty;
    if (task.remarks === 'In Transit') document.getElementById('arrivalDateGroup').classList.remove('hidden');
    else document.getElementById('arrivalDateGroup').classList.add('hidden');
    document.getElementById('approvalModal').classList.remove('hidden');
}
async function handleApproval(approved) {
    const key = document.getElementById('approvalKey').value;
    const task = allTransfers.find(t => t.key === key);
    if (!task) return;
    const newQty = parseFloat(document.getElementById('approvalQty').value);
    const note = document.getElementById('approvalNote').value;
    const arrivalDate = document.getElementById('arrivalDate').value;
    let updates = {};
    if (approved === false) {
        updates.remarks = 'Rejected';
        updates.status = 'Rejected';
    } else {
        if (task.remarks === 'Pending Source') {
            updates.remarks = 'Pending Admin';
            updates.approvedQty = newQty;
        } else if (task.remarks === 'Pending Admin') {
            updates.remarks = 'In Transit';
            updates.approvedQty = newQty;
            updates.esn = `ESN-${Date.now()}`;
            if (task.jobType === 'Usage') await adjustStockByProduct(task.productID, task.fromLocation, newQty, 'deduct');
            else if (task.jobType === 'Transfer') await adjustStockByProduct(task.productID, task.fromLocation, newQty, 'deduct');
        } else if (task.remarks === 'In Transit') {
            updates.remarks = 'Completed';
            updates.receivedQty = newQty;
            updates.arrivalDate = arrivalDate;
            if (task.jobType === 'Transfer') await adjustStockByProduct(task.productID, task.toLocation, newQty, 'add');
            else if (task.jobType === 'Restock') await adjustStockByProduct(task.productID, task.toLocation, newQty, 'add');
            else if (task.jobType === 'Return') await adjustStockByProduct(task.productID, task.toLocation, newQty, 'add');
        } else if (task.remarks === 'Pending Confirmation') {
            updates.remarks = 'Completed';
            updates.receivedQty = newQty;
        }
    }
    await updateTransfer(key, updates);
    closeApprovalModal();
}
async function adjustStockByProduct(productID, site, qty, mode) {
    const item = allStock.find(i => i.productID === productID);
    if (!item) return;
    const delta = (mode === 'add') ? qty : -qty;
    await adjustStock(item.key, site, delta);
}
async function printWaybill(key) {
    if (!hasPermission('print')) { alert('No permission to print waybill'); return; }
    const task = allTransfers.find(t => t.key === key);
    if (!task) return;
    const isAuthorized = (task.remarks !== 'Pending Source' && task.remarks !== 'Pending Admin');
    const isCompleted = (task.remarks === 'Completed' || task.receivedQty);
    const badgeText = isAuthorized ? 'AUTHORIZED' : 'PENDING APPROVAL';
    const badgeColor = isAuthorized ? '#374785' : '#F76C6C';
    const displayQty = task.receivedQty || task.orderedQty;
    const esn = task.esn || (isAuthorized ? `ESN-${Date.now()}` : 'PENDING');
    const itemRows = `<tr>
        <td>1</td><td>${escapeHtml(task.productID || '')}</td>
        <td>${escapeHtml(task.productName)}</td><td>${escapeHtml(task.details || task.jobType)}</td>
        <td style="text-align:right">${displayQty}</td>
    </tr>`;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Waybill - ${task.controlNumber}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;margin:20px}.waybill-container{max-width:900px;margin:0 auto;border:2px solid #000;padding:15px}
        .brand{display:flex;justify-content:space-between;border-bottom:3px solid #24305E;padding-bottom:8px}
        .badge{border:2px solid ${badgeColor};padding:6px 18px;font-weight:800}
        .two-col{display:grid;grid-template-columns:1fr 1fr;border:2px solid #000;margin-bottom:15px}
        .col{padding:12px}.col:first-child{border-right:2px solid #000}
        .section-title{background:#24305E;color:white;display:inline-block;padding:2px 8px;font-size:11px}
        .details-row{display:grid;grid-template-columns:1fr 1fr;border:2px solid #000;margin-bottom:15px}
        .detail-box{padding:12px}.detail-box:first-child{border-right:2px solid #000}
        .approval-box{text-align:center;padding:12px}
        .item-table{width:100%;border-collapse:collapse;border:2px solid #000}
        .item-table th{background:#F8E9A1;color:#000;padding:8px;text-align:left}.item-table td{padding:8px;border:1px solid #000}
        .verification{display:flex;gap:20px;margin-top:20px}.verif-box{flex:1;border:2px dashed #000;padding:12px;text-align:center}
        .signature-line{border-top:1px solid #000;height:20px;margin-top:20px}
        .footer-note{font-size:9px;text-align:center;margin-top:20px}
    </style></head><body>
    <div class="waybill-container">
        <div class="brand"><div><h2>ISMAIL BIN ALI TRADING & CONT. CO. W.L.L</h2></div><div class="badge">${badgeText}</div></div>
        <div class="two-col"><div class="col"><div class="section-title">1. FROM</div><div><strong>${escapeHtml(task.fromLocation || 'Main Store')}</strong></div><div class="subtext">By: ${escapeHtml(task.sourceContact || task.enteredBy || 'System')}</div></div>
        <div class="col"><div class="section-title">2. TO</div><div><strong>${escapeHtml(task.toLocation || 'N/A')}</strong></div><div class="subtext">Contact: ${escapeHtml(task.receiver || task.approver || '-')}</div></div></div>
        <div class="details-row"><div class="detail-box"><div class="section-title">3. DETAILS</div><div><strong>Date:</strong> ${new Date(task.timestamp).toISOString().slice(0,10)}</div><div><strong>Control ID:</strong> ${escapeHtml(task.controlNumber)}</div></div>
        <div class="approval-box"><div class="section-title">4. APPROVAL</div><canvas id="barcodeApproval"></canvas><div>${esn}</div></div></div>
        <div class="section-title">5. ITEM DESCRIPTION</div>
        <table class="item-table"><thead><tr><th>SN</th><th>ID</th><th>Name</th><th>Details</th><th>Qty</th></table></thead><tbody>${itemRows}</tbody></table>
        <div class="verification"><div class="verif-box"><div class="verif-title">FINAL VERIFICATION / RECEIPT</div>
        ${isCompleted ? `<canvas id="barcodeReceiver"></canvas><div>${task.receiverEsn || esn}</div>` : '<div>(Barcode generated upon completion)</div>'}</div>
        <div><div class="signature-line"></div><div>Sender Signature</div><div class="signature-line"></div><div>Receiver Signature</div></div></div>
        <div class="footer-note">Printed: ${new Date().toLocaleString()}</div>
    </div>
    <script>
        JsBarcode("#barcodeApproval", "${esn}", { format: "CODE128", width: 1.5, height: 40, displayValue: false });
        ${isCompleted ? `JsBarcode("#barcodeReceiver", "${task.receiverEsn || esn}", { format: "CODE128", width: 1.5, height: 40, displayValue: false });` : ''}
        setTimeout(() => { window.print(); window.close(); }, 500);
    <\/script></body></html>`);
    win.document.close();
}
function renderJobRecords() {
    let records = [...allTransfers];
    const search = document.getElementById('recordSearch')?.value.toLowerCase() || '';
    if (search) records = records.filter(r => (r.controlNumber || '').toLowerCase().includes(search) || (r.productName || '').toLowerCase().includes(search) || (r.remarks || '').toLowerCase().includes(search));
    const container = document.getElementById('recordsList');
    if (!records.length) { container.innerHTML = '<div class="record-card">No records found.</div>'; return; }
    container.innerHTML = records.map(r => `<div class="record-card">
        <div><strong>${escapeHtml(r.controlNumber)}</strong> | ${escapeHtml(r.jobType)} | ${escapeHtml(r.productName)} | Qty: ${r.orderedQty}</div>
        <div>Status: <span style="color:${r.remarks === 'Completed' ? '#1e7e34' : (r.remarks === 'Rejected' ? '#F76C6C' : '#e67e22')};">${escapeHtml(r.remarks)}</span></div>
        <div>From: ${escapeHtml(r.fromLocation)} → To: ${escapeHtml(r.toLocation)}</div>
        <div>Created: ${new Date(r.timestamp).toLocaleString()}</div>
        <div>${hasPermission('print') ? `<button class="secondary printWaybillRecord" data-key="${r.key}">Print Waybill</button>` : ''}</div>
    </div>`).join('');
    document.querySelectorAll('.printWaybillRecord').forEach(btn => btn.onclick = () => printWaybill(btn.dataset.key));
}
document.getElementById('execTransferBtn').onclick = executeTransfer;
document.getElementById('approveBtn').onclick = () => handleApproval(true);
document.getElementById('rejectBtn').onclick = () => handleApproval(false);
document.getElementById('refreshTasksBtn').onclick = () => loadTransfers(true);
document.getElementById('clearRecordsBtn').onclick = () => { document.getElementById('recordSearch').value = ''; renderJobRecords(); };
document.getElementById('recordSearch').oninput = renderJobRecords;

// ============================================================
// USER MANAGEMENT
// ============================================================
async function loadUsersForSettings() {
    if (!currentUser) return;
    const container = document.getElementById('usersListSettings');
    if (!container) {
        console.error("usersListSettings container not found");
        return;
    }
    const hasUserPerm = hasPermission('manage_users') || currentUser.role === 'admin';
    if (!hasUserPerm) {
        container.innerHTML = '<div class="settings-panel"><p>You do not have permission to manage users.</p></div>';
        document.getElementById('addUserBtnSettings').style.display = 'none';
        return;
    }
    document.getElementById('addUserBtnSettings').style.display = 'inline-flex';
    const snap = await db.ref('users').once('value');
    const users = [];
    snap.forEach(child => users.push({ uid: child.key, ...child.val() }));
    if (users.length === 0) {
        container.innerHTML = '<div class="settings-panel"><p>No users found.</p></div>';
        return;
    }
    container.innerHTML = users.map(u => `
        <div style="padding:8px; border-bottom:1px solid #eee;">
            <strong>${escapeHtml(u.displayName || u.email)}</strong> (${escapeHtml(u.role)})
            <button class="secondary" onclick="window.editUser('${u.uid}')">Edit</button>
        </div>
    `).join('');
}
window.editUser = async (uid) => {
    const snap = await db.ref(`users/${uid}`).once('value');
    const u = snap.val();
    document.getElementById('editUserId').value = uid;
    document.getElementById('userEmail').value = u.email;
    document.getElementById('userDisplayName').value = u.displayName || '';
    document.getElementById('userRoleSelect').value = u.role || 'user';
    const perms = u.permissions || {};
    document.getElementById('perm_create').checked = perms.create || false;
    document.getElementById('perm_edit').checked = perms.edit || false;
    document.getElementById('perm_delete').checked = perms.delete || false;
    document.getElementById('perm_approve').checked = perms.approve || false;
    document.getElementById('perm_print').checked = perms.print || false;
    document.getElementById('perm_register_material').checked = perms.register_material || false;
    document.getElementById('perm_manage_families').checked = perms.manage_families || false;
    document.getElementById('perm_manage_sites').checked = perms.manage_sites || false;
    document.getElementById('perm_manage_users').checked = perms.manage_users || false;
    document.getElementById('userEditTitle').innerText = 'Edit User';
    document.getElementById('userEditModal').classList.remove('hidden');
};
document.getElementById('saveUserBtn').onclick = async () => {
    const uid = document.getElementById('editUserId').value;
    const email = document.getElementById('userEmail').value;
    const displayName = document.getElementById('userDisplayName').value;
    const role = document.getElementById('userRoleSelect').value;
    const perms = {
        create: document.getElementById('perm_create').checked,
        edit: document.getElementById('perm_edit').checked,
        delete: document.getElementById('perm_delete').checked,
        approve: document.getElementById('perm_approve').checked,
        print: document.getElementById('perm_print').checked,
        register_material: document.getElementById('perm_register_material').checked,
        manage_families: document.getElementById('perm_manage_families').checked,
        manage_sites: document.getElementById('perm_manage_sites').checked,
        manage_users: document.getElementById('perm_manage_users').checked
    };
    const pwd = document.getElementById('userPassword').value;
    const updates = { email, displayName, role, permissions: perms };
    if (pwd) updates.password = pwd;
    if (uid) {
        if (currentUser.role !== 'admin' && role === 'admin') {
            alert('Only an administrator can assign the admin role.');
            return;
        }
        await db.ref(`users/${uid}`).update(updates);
    } else {
        if (!pwd) { alert('Password required for new user'); return; }
        const newRef = db.ref('users').push();
        await newRef.set({ ...updates, uid: newRef.key });
    }
    document.getElementById('userEditModal').classList.add('hidden');
    if (currentUser.role === 'admin' || hasPermission('manage_users')) loadUsersForSettings();
};
document.getElementById('addUserBtnSettings')?.addEventListener('click', () => {
    document.getElementById('editUserId').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userDisplayName').value = '';
    document.getElementById('userRoleSelect').value = 'user';
    document.getElementById('perm_create').checked = false;
    document.getElementById('perm_edit').checked = false;
    document.getElementById('perm_delete').checked = false;
    document.getElementById('perm_approve').checked = false;
    document.getElementById('perm_print').checked = false;
    document.getElementById('perm_register_material').checked = false;
    document.getElementById('perm_manage_families').checked = false;
    document.getElementById('perm_manage_sites').checked = false;
    document.getElementById('perm_manage_users').checked = false;
    document.getElementById('userEditTitle').innerText = 'New User';
    document.getElementById('userEditModal').classList.remove('hidden');
});

// ============================================================
// REPORT & CSV
// ============================================================
function generateReport() {
    let html = '<table class="data-table"><thead><tr><th>ID</th><th>Item</th><th>Qty</th><th>Sites</th></tr></thead><tbody>';
    allStock.forEach(i => {
        let sitesStr = i.sites ? Object.entries(i.sites).map(([s, q]) => `${s}:${q}`).join(';') : '';
        html += `<tr><td>${escapeHtml(i.productID)}</td><td>${escapeHtml(i.productName)}</td><td>${i.stockQty}</td><td>${escapeHtml(sitesStr)}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('reportHtml').innerHTML = html;
    document.getElementById('reportModal').classList.remove('hidden');
}
function exportCSV() {
    const rows = [['ID', 'Item', 'Qty', 'Sites']];
    allStock.forEach(i => rows.push([i.productID, i.productName, i.stockQty, i.sites ? JSON.stringify(i.sites) : '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv]));
    a.download = 'stock.csv';
    a.click();
}
document.getElementById('reportBtn').onclick = generateReport;
document.getElementById('exportCsvBtn').onclick = exportCSV;

// ============================================================
// NAVIGATION & SETTINGS TOGGLE (with collapsible init)
// ============================================================
function initCollapsibleSettings() {
    document.querySelectorAll('.toggle-collapse-btn').forEach(btn => {
        if (btn._collapseHandler) return;
        const handler = (e) => {
            e.stopPropagation();
            const targetId = btn.getAttribute('data-target');
            const content = document.getElementById(targetId);
            if (content) {
                content.classList.toggle('collapsed');
                const icon = btn.querySelector('i');
                if (icon) {
                    if (content.classList.contains('collapsed')) {
                        icon.classList.remove('fa-chevron-up');
                        icon.classList.add('fa-chevron-down');
                    } else {
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                    }
                }
            }
        };
        btn._collapseHandler = handler;
        btn.addEventListener('click', handler);
    });
}

function toggleSection(section) {
    document.getElementById('stockSection').classList.toggle('hidden', section !== 'stock');
    document.getElementById('tasksSection').classList.toggle('hidden', section !== 'tasks');
    document.getElementById('recordsSection').classList.toggle('hidden', section !== 'records');
    document.getElementById('settingsSection').classList.toggle('hidden', section !== 'settings');
    document.querySelectorAll('.inv-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById(`nav${section.charAt(0).toUpperCase() + section.slice(1)}`).classList.add('active');
    if (section === 'settings') {
        if (hasPermission('manage_sites') || currentUser.role === 'admin') renderSitesManager();
        if (hasPermission('manage_families') || currentUser.role === 'admin') renderFamiliesManager();
        if (hasPermission('manage_users') || currentUser.role === 'admin') loadUsersForSettings();
        // Re-attach collapsible handlers after content updates
        setTimeout(() => initCollapsibleSettings(), 100);
    }
    if (section === 'stock') {
        updateStockUIPermissions();
    }
}
document.getElementById('navStock').onclick = () => toggleSection('stock');
document.getElementById('navTasks').onclick = () => { toggleSection('tasks'); loadTransfers(); };
document.getElementById('navRecords').onclick = () => { toggleSection('records'); renderJobRecords(); };
document.getElementById('navSettings').onclick = () => { toggleSection('settings'); };
document.getElementById('closeSettingsBtn').onclick = () => toggleSection('stock');

// Transaction buttons (if using the new HTML layout)
document.getElementById('transferBtnStock')?.addEventListener('click', () => openTransferModal('Transfer'));
document.getElementById('restockBtnStock')?.addEventListener('click', () => openTransferModal('Restock'));
document.getElementById('usageBtnStock')?.addEventListener('click', () => openTransferModal('Usage'));
document.getElementById('returnBtnStock')?.addEventListener('click', () => openTransferModal('Return'));

// Modal close helpers
function closeItemModal() { document.getElementById('itemModal').classList.add('hidden'); }
function closeAddStockModal() { document.getElementById('addStockModal').classList.add('hidden'); }
function closeTransferModal() { document.getElementById('transferModal').classList.add('hidden'); }
function closeApprovalModal() { document.getElementById('approvalModal').classList.add('hidden'); document.getElementById('arrivalDateGroup').classList.add('hidden'); }
function closeReportModal() { document.getElementById('reportModal').classList.add('hidden'); }
function closeUserMgmt() { document.getElementById('userMgmtModal').classList.add('hidden'); }
function closeUserEdit() { document.getElementById('userEditModal').classList.add('hidden'); }
document.querySelectorAll('.closeModalBtn, .closeAddModal, .closeTransfer, .closeApproval, .closeReport, .closeUserMgmt, .closeUserEdit').forEach(btn => {
    btn.onclick = () => btn.closest('.modal-overlay').classList.add('hidden');
});

// Initial load
restoreSession().then(() => {
    // If no session, login screen is already visible; we still call loadStock? No – only after login.
    // The restoreSession does everything needed if a session exists.
});
setInterval(() => { const dt = document.getElementById('datetime'); if (dt) dt.innerText = new Date().toLocaleString(); }, 1000);