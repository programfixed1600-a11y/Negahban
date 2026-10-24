const db = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return (window.location.href = "index.html");
  document.getElementById("user-email").textContent = session.user.email;
  await loadAllData();
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
  window.location.href = "index.html";
});

async function loadAllData() {
  await loadCompaniesAndSites();
  await loadGuards();
  await loadPosts();
}

// --- بخش شرکت‌ها و سایت‌ها ---
async function loadCompaniesAndSites() {
  const { data: companies } = await db.from("companies").select("*").order("created_at", { ascending: false });
  const cList = document.getElementById("company-list");
  const cSelect = document.getElementById("s-company");
  const pSiteSelect = document.getElementById("p-site");
  
  cList.innerHTML = ""; cSelect.innerHTML = "<option value=''>انتخاب شرکت...</option>";
  
  if (companies) {
    companies.forEach(c => {
      cList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${c.name}</strong><br><small>${c.contact_phone || ''}</small></div>
            <button onclick="deleteItem('companies', '${c.id}')" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
      cSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  }

  const { data: sites } = await db.from("sites").select("*, companies(name)").order("created_at", { ascending: false });
  const sList = document.getElementById("site-list");
  
  sList.innerHTML = "";
  pSiteSelect.innerHTML = "<option value=''>انتخاب سایت...</option>";
  
  if (sites) {
    sites.forEach(s => {
      sList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${s.name}</strong><br><small>${s.companies?.name || ''}</small></div>
            <button onclick="deleteItem('sites', '${s.id}')" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
      pSiteSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.companies?.name || ''})</option>`;
    });
  }
}

document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await db.from("companies").insert([{ name: document.getElementById("c-name").value, contact_phone: document.getElementById("c-phone").value }]);
  document.getElementById("c-name").value = ""; document.getElementById("c-phone").value = "";
  await loadAllData();
});

document.getElementById("site-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const company_id = document.getElementById("s-company").value;
  if (!company_id) return alert("ابتدا یک شرکت انتخاب کنید.");
  await db.from("sites").insert([{ company_id, name: document.getElementById("s-name").value, address: document.getElementById("s-address").value }]);
  document.getElementById("s-name").value = ""; document.getElementById("s-address").value = "";
  await loadAllData();
});

// --- بخش نگهبان‌ها ---
async function loadGuards() {
  const { data: guards } = await db.from("guards").select("*").order("created_at", { ascending: false });
  const gList = document.getElementById("guard-list");
  gList.innerHTML = "";
  if (guards) {
    guards.forEach(g => {
      gList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${g.full_name}</strong><br><small>${g.phone || 'بدون شماره'}</small></div>
            <button onclick="deleteItem('guards', '${g.id}')" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
          </div>
        </div>`;
    });
  }
}

document.getElementById("guard-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await db.from("guards").insert([{ full_name: document.getElementById("g-name").value, phone: document.getElementById("g-phone").value }]);
  document.getElementById("g-name").value = ""; document.getElementById("g-phone").value = "";
  await loadAllData();
});

// --- بخش پست‌های نگهبانی ---
async function loadPosts() {
  const { data: posts } = await db.from("posts").select("*, sites(name)").order("created_at", { ascending: false });
  const pList = document.getElementById("post-list");
  pList.innerHTML = "";
  if (posts) {
    posts.forEach(p => {
      pList.innerHTML += `
        <div class="item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${p.name}</strong><br><small>سایت: ${p.sites?.name || 'نامشخص'}</small></div>
            <button onclick="deleteItem('posts', '${p.id}')" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;">حذف</button>
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
  btn.textContent = "در حال ذخیره...";
  btn.disabled = true;

  const { error } = await db.from("posts").insert([{ site_id, name: p_name }]);
  
  if (error) {
    alert("خطا در ثبت پست: " + error.message);
  } else {
    document.getElementById("p-name").value = "";
    await loadAllData();
  }

  btn.textContent = "افزودن پست";
  btn.disabled = false;
});

// تابع حذف عمومی
window.deleteItem = async function(table, id) {
  if (!confirm("آیا از حذف این مورد مطمئن هستید؟")) return;
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) alert("خطا در حذف: " + error.message);
  else await loadAllData();
}

checkAuth();