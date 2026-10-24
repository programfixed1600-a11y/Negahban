const db = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
let currentCompanies = [];

// بررسی لاگین بودن کاربر
async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("user-email").textContent = session.user.email;
  loadCompanies();
}

// خروج از حساب
document.getElementById("logout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
  window.location.href = "index.html";
});

// بارگذاری لیست شرکت‌ها و پر کردن منوی کشویی
async function loadCompanies() {
  const { data, error } = await db.from("companies").select("*").order("created_at", { ascending: false });
  if (error) return console.error(error);
  
  currentCompanies = data;
  const list = document.getElementById("company-list");
  const select = document.getElementById("s-company");
  
  list.innerHTML = "";
  select.innerHTML = "<option value=''>یک شرکت را انتخاب کنید...</option>";
  
  if (data.length === 0) {
    list.innerHTML = "<p style='color:#94a3b8'>هنوز شرکتی ثبت نشده است.</p>";
  } else {
    data.forEach(company => {
      // اضافه کردن به لیست
      list.innerHTML += `
        <div class="item">
          <div>
            <strong>${company.name}</strong><br>
            <small style="color:#94a3b8">${company.contact_phone || 'بدون شماره'}</small>
          </div>
        </div>
      `;
      // اضافه کردن به منوی کشویی
      select.innerHTML += `<option value="${company.id}">${company.name}</option>`;
    });
  }
  loadSites(); // بارگذاری سایت‌ها
}

// ثبت شرکت جدید
document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("c-name").value;
  const phone = document.getElementById("c-phone").value;
  const btn = e.target.querySelector("button");
  
  btn.textContent = "در حال ذخیره...";
  btn.disabled = true;

  const { error } = await db.from("companies").insert([{ name, contact_phone: phone }]);

  if (error) alert("خطا: " + error.message);
  else {
    document.getElementById("c-name").value = "";
    document.getElementById("c-phone").value = "";
    loadCompanies();
  }
  btn.textContent = "افزودن شرکت";
  btn.disabled = false;
});

// بارگذاری لیست سایت‌ها
async function loadSites() {
  const { data, error } = await db.from("sites").select("*, companies(name)").order("created_at", { ascending: false });
  if (error) return console.error(error);
  
  const list = document.getElementById("site-list");
  list.innerHTML = "";
  
  if (data.length === 0) {
    list.innerHTML = "<p style='color:#94a3b8'>هنوز سایتی ثبت نشده است.</p>";
    return;
  }

  data.forEach(site => {
    list.innerHTML += `
      <div class="item">
        <div>
          <strong>${site.name}</strong><br>
          <small style="color:#94a3b8">شرکت: ${site.companies ? site.companies.name : 'نامشخص'}</small><br>
          <small style="color:#94a3b8">آدرس: ${site.address || 'ثبت نشده'}</small>
        </div>
      </div>
    `;
  });
}

// ثبت سایت جدید
document.getElementById("site-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const company_id = document.getElementById("s-company").value;
  const name = document.getElementById("s-name").value;
  const address = document.getElementById("s-address").value;
  const btn = e.target.querySelector("button");
  
  if (!company_id) return alert("لطفاً ابتدا یک شرکت انتخاب کنید.");

  btn.textContent = "در حال ذخیره...";
  btn.disabled = true;

  const { error } = await db.from("sites").insert([{ company_id, name, address }]);

  if (error) alert("خطا: " + error.message);
  else {
    document.getElementById("s-name").value = "";
    document.getElementById("s-address").value = "";
    loadSites();
  }
  btn.textContent = "افزودن سایت";
  btn.disabled = false;
});

checkAuth();