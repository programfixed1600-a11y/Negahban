// تنظیمات اتصال به فیکارو
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

const form = document.getElementById("login-form");
const msg = document.getElementById("msg");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");

function show(text, ok = false) {
  msg.textContent = text;
  msg.className = "msg " + (ok ? "ok" : "err");
}

// بررسی اینکه آیا کاربر از قبل لاگین کرده است
(async () => {
  const session = localStorage.getItem("fikaro_session");
  if (session) location.href = "dashboard.html";
})();

// ورود کاربر
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  show("در حال ورود...");
  
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: emailEl.value.trim(), password: passEl.value })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.message || data.error || "خطا در ورود");
    
    // ذخیره توکن و اطلاعات کاربر در مرورگر
    localStorage.setItem("fikaro_session", data.token || data.access_token);
    localStorage.setItem("user_email", data.user?.email || emailEl.value.trim());
    
    show("ورود موفق...", true);
    setTimeout(() => (location.href = "dashboard.html"), 500);
  } catch (err) {
    show("خطا: " + err.message);
  }
});

// ثبت‌نام کاربر
document.getElementById("signup-btn").addEventListener("click", async () => {
  if (!emailEl.value || passEl.value.length < 6)
    return show("ایمیل و رمز (حداقل ۶ کاراکتر) را وارد کن");
    
  show("در حال ثبت‌نام...");
  
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: emailEl.value.trim(), password: passEl.value })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.message || data.error || "خطا در ثبت‌نام");
    
    show("ثبت‌نام شد. حالا دکمه ورود را بزن.", true);
  } catch (err) {
    show("خطا: " + err.message);
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}