const db = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);

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

// بارگذاری لیست شرکت‌ها
async function loadCompanies() {
  const { data, error } = await db.from("companies").select("*").order("created_at", { ascending: false });
  if (error) return console.error(error);
  
  const list = document.getElementById("company-list");
  list.innerHTML = "";
  
  if (data.length === 0) {
    list.innerHTML = "<p style='color:#94a3b8'>هنوز شرکتی ثبت نشده است.</p>";
    return;
  }

  data.forEach(company => {
    list.innerHTML += `
      <div class="item">
        <div>
          <strong>${company.name}</strong><br>
          <small style="color:#94a3b8">${company.contact_phone || 'بدون شماره'}</small>
        </div>
      </div>
    `;
  });
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

  if (error) {
    alert("خطا: " + error.message);
  } else {
    document.getElementById("c-name").value = "";
    document.getElementById("c-phone").value = "";
    loadCompanies(); // رفرش لیست
  }
  
  btn.textContent = "افزودن شرکت";
  btn.disabled = false;
});

checkAuth();