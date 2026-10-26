const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

// تابع دریافت همه رکوردها
async function getTable(table) {
  let allData = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await fetch(`${BASE_URL}/${table}?limit=${limit}&offset=${offset}`, { headers });
    const data = await res.json();
    const items = data.data || data;
    if (!Array.isArray(items) || items.length === 0) break;
    allData = allData.concat(items);
    if (items.length < limit) break;
    offset += limit;
  }
  return allData;
}

// ورود نگهبان
async function loginGuard() {
  const phone = document.getElementById("phone-input").value.trim();
  const msg = document.getElementById("login-msg");
  
  if (!phone) {
    msg.textContent = "لطفاً شماره موبایل را وارد کنید.";
    return;
  }

  msg.textContent = "در حال بررسی...";
  msg.style.color = "#3b82f6";

  try {
    const guards = await getTable("guards") || [];
    // پیدا کردن نگهبان با شماره موبایل
    const myGuard = guards.find(g => g.phone === phone);

    if (!myGuard) {
      msg.textContent = "شماره موبایل شما در سیستم ثبت نشده است. با مدیر تماس بگیرید.";
      msg.style.color = "#ef4444";
      return;
    }

    // ذخیره اطلاعات در حافظه مرورگر
    localStorage.setItem("guard_phone", phone);
    localStorage.setItem("guard_id", myGuard.id);
    localStorage.setItem("guard_name", myGuard.full_name);

    // رفتن به پنل
    showPanel();

  } catch (err) {
    msg.textContent = "خطا در اتصال به دیتابیس: " + err.message;
    msg.style.color = "#ef4444";
  }
}

// نمایش پنل و مخفی کردن صفحه لاگین
function showPanel() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("main-panel").style.display = "flex";
  document.getElementById("logout-btn").style.display = "block";
  document.getElementById("guard-name").textContent = localStorage.getItem("guard_name");
  
  loadMyShifts();
}

// خروج از حساب
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("guard_phone");
  localStorage.removeItem("guard_id");
  localStorage.removeItem("guard_name");
  window.location.reload();
});

// بارگذاری شیفت‌های اختصاصی نگهبان
async function loadMyShifts() {
  const container = document.getElementById("my-shifts");
  const myGuardId = localStorage.getItem("guard_id");
  
  try {
    const shifts = await getTable("at") || [];
    const posts = await getTable("posts") || [];
    const sites = await getTable("sites") || [];

    // ۱. فقط شیفت‌هایی که مربوط به این نگهبان است
    let myShifts = shifts.filter(s => s.guard_id === myGuardId);
    
    // ۲. مرتب‌سازی بر اساس زمان
    myShifts.sort((a, b) => a.check_in.localeCompare(b.check_in));

    container.innerHTML = "";
    
    if (myShifts.length === 0) {
      container.innerHTML = "<p style='color:#94a3b8'>هیچ شیفتی برای شما ثبت نشده است.</p>";
      return;
    }

    // ۳. ساخت لیست
    myShifts.forEach(s => {
      const p = posts.find(x => x.id === s.post_id);
      const postName = p ? p.name : "نامشخص";
      
      const site = p ? sites.find(x => x.id === p.site_id) : null;
      const siteName = site ? site.name : "";
      
      const startDate = new Date(s.check_in);
      const endDate = new Date(s.check_out);
      
      const dateStr = startDate.toLocaleDateString('fa-IR');
      const startTime = startDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const endTime = endDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      // بررسی اینکه آیا امروز است
      const now = new Date();
      const isToday = startDate.toDateString() === now.toDateString();

      container.innerHTML += `
        <div class="shift-item" style="${isToday ? 'border-right-color: #10b981; background:#064e3b;' : ''}">
          <strong style="font-size:15px;">پست: ${postName} ${siteName ? '('+siteName+')' : ''}</strong><br>
          <small style="color:#94a3b8; display:block; margin-top:5px;">تاریخ: ${dateStr}</small>
          <small style="color:#94a3b8;">ساعت: از ${startTime} تا ${endTime}</small>
          ${isToday ? '<div style="margin-top:8px; color:#10b981; font-weight:bold;">(شیفت امروز شما)</div>' : ''}
        </div>
      `;
    });

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444">خطا در دریافت شیفت‌ها: ${err.message}</p>`;
  }
}

// بررسی اینکه آیا نگهبان قبلاً لاگین کرده است یا نه
window.onload = function() {
  if (localStorage.getItem("guard_id")) {
    showPanel();
  }
};