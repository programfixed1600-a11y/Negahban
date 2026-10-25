const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

// بررسی لاگین بودن
function checkAuth() {
  const session = localStorage.getItem("fikaro_session");
  if (!session) return (window.location.href = "index.html");
  document.getElementById("user-email").textContent = localStorage.getItem("user_email") || "مدیر";
  loadAllData();
}

// خروج
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("fikaro_session");
  localStorage.removeItem("user_email");
  window.location.href = "index.html";
});

// توابع کمکی برای ارتباط با دیتابیس
async function getTable(table) {
  const res = await fetch(`${BASE_URL}/${table}`, { headers });
  const data = await res.json();
  return data.data || data; // بسته به ساختار خروجی فیکارو
}

async function insertTable(table, payload) {
  const res = await fetch(`${BASE_URL}/${table}`, {
    method: "POST", headers, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "خطا در ذخیره");
  return data;
}

async function deleteTable(table, id) {
  const res = await fetch(`${BASE_URL}/${table}/${id}`, { method: "DELETE", headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "خطا در حذف");
  return data;
}

// تغییر وضعیت دکمه‌ها
function setLoading(btn, isLoading, text = "در حال ذخیره...") {
  if (isLoading) {
    btn.dataset.oldText = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.textContent = btn.dataset.oldText || text;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

// بارگذاری همه داده‌ها
async function loadAllData() {
  try {
    await loadCompaniesAndSites();
    await loadGuards();
    await loadPosts();
  } catch (err) {
    console.error(err);
  }
}

// --- بخش شرکت‌ها و سایت‌ها ---
async function loadCompaniesAndSites() {
  const companies = await getTable("companies");
  const cList = document.getElementById("company-list");
  const cSelect = document.getElementById("s-company");
  
  cList.innerHTML = ""; cSelect.innerHTML = "<option value=''>انتخاب شرکت...</option>";
  
  if (companies && Array.isArray(companies)) {
    companies.forEach(c => {
      cList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${c.name}</strong><br><small>${c.contact_phone || ''}</small></div>
            <button onclick="deleteItem('companies', '${c.id}', this)" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
      cSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  }

  const sites = await getTable("sites");
  const sList = document.getElementById("site-list");
  const pSiteSelect = document.getElementById("p-site");
  
  sList.innerHTML = ""; pSiteSelect.innerHTML = "<option value=''>انتخاب سایت...</option>";
  
  if (sites && Array.isArray(sites)) {
    sites.forEach(s => {
      // پیدا کردن نام شرکت مربوطه
      const comp = companies.find(c => c.id === s.company_id);
      const compName = comp ? comp.name : '';
      
      sList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${s.name}</strong><br><small>${compName}</small></div>
            <button onclick="deleteItem('sites', '${s.id}', this)" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
      pSiteSelect.innerHTML += `<option value="${s.id}">${s.name} (${compName})</option>`;
    });
  }
}

document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("companies", { name: document.getElementById("c-name").value, contact_phone: document.getElementById("c-phone").value });
    document.getElementById("c-name").value = ""; document.getElementById("c-phone").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن شرکت");
});

document.getElementById("site-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const company_id = document.getElementById("s-company").value;
  if (!company_id) return alert("ابتدا یک شرکت انتخاب کنید.");
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("sites", { company_id, name: document.getElementById("s-name").value, address: document.getElementById("s-address").value });
    document.getElementById("s-name").value = ""; document.getElementById("s-address").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن سایت");
});

// --- بخش نگهبان‌ها ---
async function loadGuards() {
  const guards = await getTable("guards");
  const gList = document.getElementById("guard-list");
  gList.innerHTML = "";
  if (guards && Array.isArray(guards)) {
    guards.forEach(g => {
      gList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${g.full_name}</strong><br><small>${g.phone || 'بدون شماره'}</small></div>
            <button onclick="deleteItem('guards', '${g.id}', this)" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
    });
  }
}

document.getElementById("guard-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("guards", { full_name: document.getElementById("g-name").value, phone: document.getElementById("g-phone").value });
    document.getElementById("g-name").value = ""; document.getElementById("g-phone").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن نگهبان");
});

// --- بخش پست‌ها ---
async function loadPosts() {
  const posts = await getTable("posts");
  const pList = document.getElementById("post-list");
  pList.innerHTML = "";
  if (posts && Array.isArray(posts)) {
    posts.forEach(p => {
      pList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${p.name}</strong></div>
            <button onclick="deleteItem('posts', '${p.id}', this)" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
    });
  }
}

document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const site_id = document.getElementById("p-site").value;
  const p_name = document.getElementById("p-name").value;
  
  if (!site_id) return alert("لطفاً ابتدا یک سایت انتخاب کنید.");
  if (!p_name) return alert("لطفاً نام پست را وارد کنید.");

  const btn = e.target.querySelector("button");
  setLoading(btn, true);

  try {
    await insertTable("posts", { site_id, name: p_name });
    document.getElementById("p-name").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  
  setLoading(btn, false, "افزودن پست");
});

window.deleteItem = async function(table, id, btnElement) {
  if (!confirm("آیا از حذف این مورد مطمئن هستید؟")) return;
  const oldText = btnElement.textContent;
  btnElement.textContent = "...";
  btnElement.disabled = true;

  try {
    await deleteTable(table, id);
    await loadAllData();
  } catch(err) {
    alert(err.message);
    btnElement.textContent = oldText;
    btnElement.disabled = false;
  }
}

checkAuth();