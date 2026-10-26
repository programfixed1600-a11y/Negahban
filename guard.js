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

// ورود نگهبان با شماره و کد ملی
async function loginGuard() {
  const phone = document.getElementById("phone-input").value.trim();
  const nid = document.getElementById("nid-input").value.trim();
  const msg = document.getElementById("login-msg");
  
  if (!phone || !nid) {
    msg.textContent = "لطفاً شماره موبایل و کد ملی را وارد کنید.";
    return;
  }

  msg.textContent = "در حال بررسی...";
  msg.style.color = "#3b82f6";

  try {
    const guards = await getTable("guards") || [];
    // پیدا کردن نگهبان با شماره موبایل و کد ملی
    const myGuard = guards.find(g => g.phone === phone && (g.national_id === nid || g.national_code === nid));

    if (!myGuard) {
      msg.textContent = "اطلاعات وارد شده صحیح نیست. با مدیر تماس بگیرید.";
      msg.style.color = "#ef4444";
      return;
    }

    localStorage.setItem("guard_id", myGuard.id);
    localStorage.setItem("guard_name", myGuard.full_name);

    showPanel();

  } catch (err) {
    msg.textContent = "خطا: " + err.message;
    msg.style.color = "#ef4444";
  }
}

function showPanel() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("main-panel").style.display = "flex";
  document.getElementById("logout-btn").style.display = "block";
  document.getElementById("guard-name").textContent = localStorage.getItem("guard_name");
  
  loadMyShifts();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("guard_id");
  localStorage.removeItem("guard_name");
  window.location.reload();
});

// بارگذاری شیفت‌ها (همه شیفت‌های پست)
async function loadMyShifts() {
  const container = document.getElementById("my-shifts");
  const myGuardId = localStorage.getItem("guard_id");
  
  try {
    const shifts = await getTable("at") || [];
    const posts = await getTable("posts") || [];
    const sites = await getTable("sites") || [];
    const guards = await getTable("guards") || [];

    // ۱. پیدا کردن پست‌هایی که این نگهبان در آن‌ها شیفت دارد
    const myShiftsOnly = shifts.filter(s => s.guard_id === myGuardId);
    const myPostIds = [...new Set(myShiftsOnly.map(s => s.post_id))];

    if (myPostIds.length === 0) {
      container.innerHTML = "<p style='color:#94a3b8'>هیچ شیفتی برای شما ثبت نشده است.</p>";
      return;
    }

    // ۲. گرفتن تمام شیفت‌های پست‌هایی که این نگهبان در آن‌هاست
    let postShifts = shifts.filter(s => myPostIds.includes(s.post_id));
    
    // ۳. مرتب‌سازی
    postShifts.sort((a, b) => a.check_in.localeCompare(b.check_in));

    container.innerHTML = "";
    
    postShifts.forEach(s => {
      const p = posts.find(x => x.id === s.post_id);
      const postName = p ? p.name : "نامشخص";
      
      const site = p ? sites.find(x => x.id === p.site_id) : null;
      const siteName = site ? site.name : "";
      
      const g = guards.find(x => x.id === s.guard_id);
      const guardName = g ? g.full_name : "نامشخص";

      const startDate = new Date(s.check_in);
      const endDate = new Date(s.check_out);
      
      const dateStr = startDate.toLocaleDateString('fa-IR');
      const startTime = startDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const endTime = endDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      // آیا این شیفت مربوط به خود من است؟
      const isMine = (s.guard_id === myGuardId);

      container.innerHTML += `
        <div class="shift-item" style="${isMine ? 'border-right-color: #10b981; background:#064e3b;' : ''}">
          <strong style="font-size:15px;">پست: ${postName} ${siteName ? '('+siteName+')' : ''}</strong><br>
          <span style="color:#94a3b8; font-size:13px;">نگهبان: <span class="guard-name">${guardName}</span> ${isMine ? '(شما)' : ''}</span><br>
          <small style="color:#94a3b8; display:block; margin-top:5px;">تاریخ: ${dateStr} | ساعت: از ${startTime} تا ${endTime}</small>
        </div>
      `;
    });

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444">خطا در دریافت شیفت‌ها: ${err.message}</p>`;
  }
}

window.onload = function() {
  if (localStorage.getItem("guard_id")) {
    showPanel();
  }
};