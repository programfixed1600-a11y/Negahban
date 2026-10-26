const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

let myGuardId = null;

// بررسی لاگین بودن
function checkAuth() {
  const session = localStorage.getItem("fikaro_session");
  const userEmail = localStorage.getItem("user_email");
  
  if (!session) return (window.location.href = "index.html");
  
  // استخراج شماره موبایل از ایمیل فیک
  const phone = userEmail.split('@')[0];
  document.getElementById("user-phone").textContent = phone;
  
  loadMyShifts(phone);
}

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("fikaro_session");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_role");
  window.location.href = "index.html";
});

async function getTable(table) {
  const res = await fetch(`${BASE_URL}/${table}?limit=1000`, { headers });
  const data = await res.json();
  return data.data || data;
}

async function updateTable(table, id, payload) {
  const res = await fetch(`${BASE_URL}/${table}/${id}`, {
    method: "PATCH", headers, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "خطا در بروزرسانی");
  return data;
}

// بارگذاری شیفت‌های نگهبان
async function loadMyShifts(phone) {
  const container = document.getElementById("my-shifts");
  container.innerHTML = "در حال دریافت اطلاعات...";

  try {
    const guards = await getTable("guards") || [];
    // پیدا کردن نگهبان با شماره موبایل
    const myGuard = guards.find(g => g.phone === phone);
    
    if (!myGuard) {
      container.innerHTML = "<p style='color:#ef4444'>اطلاعات شما در لیست پرسنل پیدا نشد. با مدیر تماس بگیرید.</p>";
      return;
    }

    myGuardId = myGuard.id;
    
    let shifts = await getTable("at") || [];
    let posts = await getTable("posts") || [];

    // فقط شیفت‌های خودم را فیلتر می‌کنم
    shifts = shifts.filter(s => s.guard_id === myGuardId);
    
    // مرتب سازی بر اساس زمان
    shifts.sort((a, b) => a.check_in.localeCompare(b.check_in));

    container.innerHTML = "";
    
    if (shifts.length === 0) {
      container.innerHTML = "<p style='color:#94a3b8'>هیچ شیفتی برای شما ثبت نشده است.</p>";
      return;
    }

    // نمایش شیفت‌های امروز و آینده
    const now = new Date();
    
    shifts.forEach(s => {
      const p = posts.find(x => x.id === s.post_id);
      const postName = p ? p.name : "نامشخص";
      
      const startDate = new Date(s.check_in);
      const endDate = new Date(s.check_out);
      
      const dateStr = startDate.toLocaleDateString('fa-IR');
      const startTime = startDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const endTime = endDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      // آیا این شیفت امروز است؟
      const isToday = startDate.toDateString() === now.toDateString();
      
      // منطق دکمه‌ها
      let actionBtn = "";
      // (در این نسخه ساده، فرض می‌کنیم فیلد check_in همان زمان شروع است. برای ثبت واقعی حضور باید فیلد جدا داشته باشیم، اما فعلاً برای رفع نیاز شما دکمه می‌گذاریم)
      actionBtn = `<button class="btn-checkin" onclick="registerAttendance('${s.id}')">ثبت ورود (حضور در پست)</button>`;

      container.innerHTML += `
        <div class="shift-item" style="${isToday ? 'border-right-color: #10b981; background:#064e3b;' : ''}">
          <strong>پست: ${postName}</strong><br>
          <small style="color:#94a3b8">تاریخ: ${dateStr} | از ساعت ${startTime} تا ${endTime}</small>
          ${isToday ? '<div style="margin-top:5px; color:#10b981; font-weight:bold;">(شیفت امروز شما)</div>' : ''}
          ${isToday ? actionBtn : ''}
        </div>
      `;
    });

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444">خطا: ${err.message}</p>`;
  }
}

// ثبت حضور
window.registerAttendance = async function(shift_id) {
  if (!confirm("آیا از ثبت حضور خود در پست مطمئن هستید؟")) return;
  try {
    // ما در این نسخه، زمان دقیق فعلی را جایگزین زمان شروع می‌کنیم تا حضور ثبت شود
    const nowStr = new Date().toISOString().slice(0, 16);
    await updateTable("at", shift_id, { check_in: nowStr }); 
    alert("حضور شما با موفقیت ثبت شد.");
    loadMyShifts(localStorage.getItem("user_email").split('@')[0]);
  } catch (err) {
    alert("خطا در ثبت: " + err.message);
  }
}

checkAuth();