const db = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);

const form = document.getElementById("login-form");
const msg = document.getElementById("msg");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");

function show(text, ok = false) {
  msg.textContent = text;
  msg.className = "msg " + (ok ? "ok" : "err");
}

// اگر از قبل لاگین است، برو داشبورد
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) location.href = "dashboard.html";
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  show("در حال ورود...");
  const { error } = await db.auth.signInWithPassword({
    email: emailEl.value.trim(),
    password: passEl.value,
  });
  if (error) return show("خطا: " + error.message);
  show("ورود موفق...", true);
  setTimeout(() => (location.href = "dashboard.html"), 500);
});

document.getElementById("signup-btn").addEventListener("click", async () => {
  if (!emailEl.value || passEl.value.length < 6)
    return show("ایمیل و رمز (حداقل ۶ کاراکتر) را وارد کن");
  show("در حال ثبت‌نام...");
  const { error } = await db.auth.signUp({
    email: emailEl.value.trim(),
    password: passEl.value,
  });
  if (error) return show("خطا: " + error.message);
  show("ثبت‌نام شد. حالا دکمه ورود را بزن.", true);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}