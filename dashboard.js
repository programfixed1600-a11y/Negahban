const db = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return (window.location.href = "index.html");
  document.getElementById("user-email").textContent = session.user.email;
  loadAllData();
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
  window.location.href = "index.html";
});

// تابعی برای بارگذاری همه داده‌ها با هم
async function loadAllData() {
  await loadCompaniesAndSites();
  await loadGuards();
  await loadPosts();
}

// --- بخش شرکت‌ها و سایت‌ها ---
async function loadCompaniesAndSites() {
  // شرکت‌ها
  const { data: companies } = await db.from("companies").select("*").order("created_at", { ascending: false });
  const cList = document.getElementById("company-list");
  const cSelect = document.getElementById("s-company");
  const pSiteSelect = document.getElementById("p-site");
  
  cList.innerHTML = ""; cSelect.innerHTML = "<option value=''>انتخاب شرکت...</option>";
  
  if (companies) {
    companies.forEach(c => {
      cList.innerHTML += `<div class="item"><strong>${c.name}</strong><br><small>${c.contact_phone || ''}</small></div>`;
      cSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  }

  // سایت‌ها
  const { data: sites } = await db.from("sites").select("*, companies(name)").order("created_at", { ascending: false });
  const sList = document.getElementById("site-list");
  
  sList.innerHTML = "";
  pSiteSelect.innerHTML = "<option value=''>انتخاب سایت...</option>"; // این خط اضافه شد تا لیست سایت‌ها هر بار خالی و پر شود
  
  if (sites) {
    sites.forEach(s => {
      sList.innerHTML += `<div class="item"><strong>${s.name}</strong><br><small>شرکت: ${s.companies?.name}</small></div>`;
      pSiteSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.companies?.name})</option>`;
    });
  }
}

document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await db.from("companies").insert([{ name: document.getElementById("c-name").value, contact_phone: document.getElementById("c-phone").value }]);
  document.getElementById("c-name").value = ""; document.getElementById("c-phone").value = "";
  loadAllData();
});

document.getElementById("site-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const company_id = document.getElementById("s-company").value;
  if (!company_id) return alert("ابتدا یک شرکت انتخاب کنید.");
  await db.from("sites").insert([{ company_id, name: document.getElementById("s-name").value, address: document.getElementById("s-address").value }]);
  document.getElementById("s-name").value = ""; document.getElementById("s-address").value = "";
  loadAllData();
});

// --- بخش نگهبان‌ها ---
async function loadGuards() {
  const { data: guards } = await db.from("guards").select("*").order("created_at", { ascending: false });
  const gList = document.getElementById("guard-list");
  gList.innerHTML = "";
  if (guards) {
    guards.forEach(g => {
      gList.innerHTML += `<div class="item"><strong>${g.full_name}</strong><br><small>${g.phone || 'بدون شماره'}</small></div>`;
    });
  }
}

document.getElementById("guard-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await db.from("guards").insert([{ full_name: document.getElementById("g-name").value, phone: document.getElementById("g-phone").value }]);
  document.getElementById("g-name").value = ""; document.getElementById("g-phone").value = "";
  loadAllData();
});

// --- بخش پست‌های نگهبانی ---
async function loadPosts() {
  const { data: posts } = await db.from("posts").select("*, sites(name)").order("created_at", { ascending: false });
  const pList = document.getElementById("post-list");
  pList.innerHTML = "";
  if (posts) {
    posts.forEach(p => {
      pList.innerHTML += `<div class="item"><strong>${p.name}</strong><br><small>سایت: ${p.sites?.name || 'نامشخص'}</small></div>`;
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
    await loadAllData(); // رفرش لیست‌ها
  }

  btn.textContent = "افزودن پست";
  btn.disabled = false;
});

checkAuth();