const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

let myGuardId = null;
let myTodayShiftId = null;

async function getTable(table) {
  const res = await fetch(`${BASE_URL}/${table}?limit=1000`, { headers });
  const data = await res.json();
  return data.data || data;
}

async function insertTable(table, payload) {
  const res = await fetch(`${BASE_URL}/${table}`, {
    method: "POST", headers, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "خطا در ذخیره");
  return data;
}

async function updateTable(table, id, payload) {
  const res = await fetch(`${BASE_URL}/${table}/${id}`, {
    method: "PATCH", headers, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "خطا در بروزرسانی");
  return data;
}

async function loginGuard() {
  const phone = document.getElementById("phone-input").value.trim();
  const nid = document.getElementById("nid-input").value.trim();
  const msg = document.getElementById("login-msg");
  
  if (!phone || !nid) { msg.textContent = "لطفاً شماره و کد ملی را وارد کنید."; return; }

  msg.textContent = "در حال بررسی...";
  msg.style.color = "#3b82f6";

  try {
    const guards = await getTable("guards") || [];
    const myGuard = guards.find(g => g.phone === phone && g.national_id === nid);

    if (!myGuard) {
      msg.textContent = "اطلاعات صحیح نیست. با مدیر تماس بگیرید.";
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

async function loadMyShifts() {
  const container = document.getElementById("my-shifts");
  myGuardId = localStorage.getItem("guard_id");
  
  try {
    let shifts = await getTable("at") || [];
    const posts = await getTable("posts") || [];
    const now = new Date();

    // فیلتر کردن پیام‌ها از لیست شیفت‌ها
    shifts = shifts.filter(s => s.check_in !== "MESSAGE");

    let myShifts = shifts.filter(s => s.guard_id === myGuardId);
    myShifts.sort((a, b) => a.check_in.localeCompare(b.check_in));

    container.innerHTML = "";
    myTodayShiftId = null;

    if (myShifts.length === 0) {
      container.innerHTML = "<p style='color:#94a3b8'>هیچ شیفتی ثبت نشده است.</p>";
      return;
    }

    myShifts.forEach(s => {
      const p = posts.find(x => x.id === s.post_id);
      const postName = p ? p.name : "نامشخص";
      const startDate = new Date(s.check_in);
      const endDate = new Date(s.check_out);
      const dateStr = startDate.toLocaleDateString('fa-IR');
      const startTime = startDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const endTime = endDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      // پیدا کردن شیفت امروز
      const isToday = startDate.toDateString() === now.toDateString();
      if (isToday) myTodayShiftId = s.id;

      container.innerHTML += `
        <div class="shift-item" style="${isToday ? 'border-right-color: #10b981; background:#064e3b;' : ''}">
          <strong style="font-size:15px;">پست: ${postName}</strong><br>
          <small style="color:#94a3b8; display:block; margin-top:5px;">تاریخ: ${dateStr}</small>
          <small style="color:#94a3b8;">ساعت: از ${startTime} تا ${endTime}</small>
          ${isToday ? '<div style="margin-top:5px; color:#10b981; font-weight:bold;">(شیفت امروز شما)</div>' : ''}
        </div>
      `;
    });

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444">خطا: ${err.message}</p>`;
  }
}

// *** ثبت موقعیت GPS ***
async function recordLocation() {
  if (!myTodayShiftId) return alert("شما امروز شیفتی ندارید که بخواهید موقعیت ثبت کنید.");
  
  const statusEl = document.getElementById("action-status");
  statusEl.textContent = "در حال دریافت موقعیت...";

  if (!navigator.geolocation) return statusEl.textContent = "مرورگر شما از GPS پشتیبانی نمی‌کند.";

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const locationStr = `${lat},${lng}`;
    
    try {
      await updateTable("at", myTodayShiftId, { location: locationStr });
      statusEl.textContent = "✅ موقعیت GPS با موفقیت ثبت شد.";
    } catch (err) {
      statusEl.textContent = "❌ خطا در ثبت موقعیت: " + err.message;
    }
  }, (err) => {
    statusEl.textContent = "❌ خطا در دریافت موقعیت: " + err.message;
  });
}

// *** ثبت لینک عکس ***
async function submitPhoto() {
  if (!myTodayShiftId) return alert("شما امروز شیفتی ندارید.");
  
  const photoUrl = document.getElementById("photo-url-input").value.trim();
  if (!photoUrl) return alert("لطفاً لینک عکس را وارد کنید.");

  const statusEl = document.getElementById("action-status");
  statusEl.textContent = "در حال ثبت لینک...";

  try {
    await updateTable("at", myTodayShiftId, { checkin_photo: photoUrl });
    statusEl.textContent = "✅ لینک عکس با موفقیت ثبت شد.";
    document.getElementById("photo-url-input").value = "";
  } catch (err) {
    statusEl.textContent = "❌ خطا در ثبت لینک: " + err.message;
  }
}

// *** ارسال پیام ناشناس ***
async function sendAnonymousMsg() {
  const msgText = document.getElementById("anon-msg").value.trim();
  if (!msgText) return alert("لطفاً متن پیام را وارد کنید.");

  const statusEl = document.getElementById("msg-status");
  statusEl.textContent = "در حال ارسال...";

  try {
    await insertTable("at", {
      guard_id: myGuardId || "00000000-0000-0000-0000-000000000000",
      post_id: "MESSAGE",
      check_in: "MESSAGE",
      check_out: msgText
    });
    statusEl.textContent = "✅ پیام شما با موفقیت ارسال شد.";
    document.getElementById("anon-msg").value = "";
  } catch (err) {
    statusEl.textContent = "❌ خطا در ارسال پیام: " + err.message;
  }
}

window.onload = function() {
  if (localStorage.getItem("guard_id")) showPanel();
};