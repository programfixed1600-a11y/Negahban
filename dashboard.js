const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

// تابعی برای تبدیل تاریخ شمسی به میلادی بدون نیاز به کتابخانه (محاسبه ریاضی)
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + (365 * jy) + (~~(jy / 33) * 8) + ~~(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * ~~(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * ~~(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * ~~(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += ~~((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    let v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

function checkAuth() {
  const session = localStorage.getItem("fikaro_session");
  if (!session) return (window.location.href = "index.html");
  document.getElementById("user-email").textContent = localStorage.getItem("user_email") || "مدیر";
  
  initDropdowns();
  loadAllData();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("fikaro_session");
  localStorage.removeItem("user_email");
  window.location.href = "index.html";
});

// --- پر کردن منوهای کشویی تاریخ و ساعت ---
function initDropdowns() {
  const yearSelect = document.getElementById("sh-year");
  const monthSelect = document.getElementById("sh-month");
  const daySelect = document.getElementById("sh-day");
  const hourSelect = document.getElementById("sh-hour");
  const minuteSelect = document.getElementById("sh-minute");

  yearSelect.innerHTML = "";
  for (let y = 1400; y <= 1410; y++) {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  }

  const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  monthSelect.innerHTML = "";
  months.forEach((m, i) => {
    monthSelect.innerHTML += `<option value="${i+1}">${m}</option>`;
  });

  daySelect.innerHTML = "";
  for (let d = 1; d <= 31; d++) {
    daySelect.innerHTML += `<option value="${d}">${d}</option>`;
  }

  hourSelect.innerHTML = "";
  for (let h = 0; h <= 23; h++) {
    const hh = String(h).padStart(2, '0');
    hourSelect.innerHTML += `<option value="${hh}">${hh}</option>`;
  }

  minuteSelect.innerHTML = `<option value="00">00</option><option value="30">30</option>`;
}

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
  if (!res.ok) throw new Error(data.detail || data.message || "خطا در ذخیره");
  return data;
}

async function deleteTable(table, id) {
  const res = await fetch(`${BASE_URL}/${table}/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("خطا در حذف");
  return true;
}

function setLoading(btn, isLoading, text = "در حال ذخیره...") {
  if (isLoading) {
    btn.dataset.oldText = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.oldText || text;
    btn.disabled = false;
  }
}

let globalCompanies = [], globalSites = [], globalGuards = [], globalPosts = [];

async function loadAllData() {
  try {
    globalCompanies = await getTable("companies") || [];
    globalSites = await getTable("sites") || [];
    globalGuards = await getTable("guards") || [];
    globalPosts = await getTable("posts") || [];

    renderCompanies();
    renderSites();
    renderGuards();
    renderPosts();
    renderShiftSelectors();
    await loadShifts();
  } catch (err) { console.error(err); }
}

function renderCompanies() {
  const cList = document.getElementById("company-list");
  const cSelect = document.getElementById("s-company");
  cList.innerHTML = ""; cSelect.innerHTML = "<option value=''>انتخاب شرکت...</option>";
  globalCompanies.forEach(c => {
    cList.innerHTML += `<div class="item"><div style="display:flex; justify-content:space-between;"><div><strong>${c.name}</strong><br><small>${c.contact_phone || ''}</small></div><button onclick="deleteItem('companies', '${c.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button></div></div>`;
    cSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function renderSites() {
  const sList = document.getElementById("site-list");
  const pSiteSelect = document.getElementById("p-site");
  sList.innerHTML = ""; pSiteSelect.innerHTML = "<option value=''>انتخاب سایت...</option>";
  globalSites.forEach(s => {
    const comp = globalCompanies.find(c => c.id === s.company_id);
    const compName = comp ? comp.name : '';
    sList.innerHTML += `<div class="item"><div style="display:flex; justify-content:space-between;"><div><strong>${s.name}</strong><br><small>${compName}</small></div><button onclick="deleteItem('sites', '${s.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button></div></div>`;
    pSiteSelect.innerHTML += `<option value="${s.id}">${s.name} (${compName})</option>`;
  });
}

function renderGuards() {
  const gList = document.getElementById("guard-list");
  gList.innerHTML = "";
  globalGuards.forEach(g => {
    gList.innerHTML += `<div class="item"><div style="display:flex; justify-content:space-between;"><div><strong>${g.full_name}</strong><br><small>${g.phone || ''}</small></div><button onclick="deleteItem('guards', '${g.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button></div></div>`;
  });
}

function renderPosts() {
  const pList = document.getElementById("post-list");
  pList.innerHTML = "";
  globalPosts.forEach(p => {
    const site = globalSites.find(s => s.id === p.site_id);
    const siteName = site ? site.name : '';
    pList.innerHTML += `<div class="item"><div style="display:flex; justify-content:space-between;"><div><strong>${p.name}</strong><br><small>سایت: ${siteName}</small></div><button onclick="deleteItem('posts', '${p.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button></div></div>`;
  });
}

function renderShiftSelectors() {
  const shiftPost = document.getElementById("sh-post");
  const filterPost = document.getElementById("filter-shift-post");
  const deletePost = document.getElementById("delete-post-select");
  const g1 = document.getElementById("sh-guard1");
  const g2 = document.getElementById("sh-guard2");
  const g3 = document.getElementById("sh-guard3");
  
  shiftPost.innerHTML = "<option value=''>انتخاب پست...</option>";
  filterPost.innerHTML = "<option value=''>همه پست‌ها</option>";
  deletePost.innerHTML = "<option value=''>انتخاب پست برای حذف...</option>";
  g1.innerHTML = "<option value=''>نگهبان ۱...</option>";
  g2.innerHTML = "<option value=''>نگهبان ۲...</option>";
  g3.innerHTML = "<option value=''>نگهبان ۳...</option>";

  globalPosts.forEach(p => {
    const site = globalSites.find(s => s.id === p.site_id);
    const siteName = site ? site.name : 'بدون سایت';
    const opt = `<option value="${p.id}">${p.name} - ${siteName}</option>`;
    shiftPost.innerHTML += opt;
    filterPost.innerHTML += opt;
    deletePost.innerHTML += opt;
  });
  
  globalGuards.forEach(g => {
    const opt = `<option value="${g.id}">${g.full_name}</option>`;
    g1.innerHTML += opt;
    g2.innerHTML += opt;
    g3.innerHTML += opt;
  });
}

document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const btn = e.target.querySelector("button"); setLoading(btn, true);
  try { await insertTable("companies", { name: document.getElementById("c-name").value, contact_phone: document.getElementById("c-phone").value }); document.getElementById("c-name").value = ""; document.getElementById("c-phone").value = ""; await loadAllData(); } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن شرکت");
});

document.getElementById("site-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const company_id = document.getElementById("s-company").value; if (!company_id) return alert("ابتدا یک شرکت انتخاب کنید."); const btn = e.target.querySelector("button"); setLoading(btn, true);
  try { await insertTable("sites", { company_id, name: document.getElementById("s-name").value, address: document.getElementById("s-address").value }); document.getElementById("s-name").value = ""; document.getElementById("s-address").value = ""; await loadAllData(); } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن سایت");
});

document.getElementById("guard-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const btn = e.target.querySelector("button"); setLoading(btn, true);
  try { 
    await insertTable("guards", { 
      full_name: document.getElementById("g-name").value, 
      phone: document.getElementById("g-phone").value,
      national_id: document.getElementById("g-national").value 
    }); 
    document.getElementById("g-name").value = ""; document.getElementById("g-phone").value = ""; document.getElementById("g-national").value = ""; await loadAllData(); 
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن نگهبان");
});

document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const site_id = document.getElementById("p-site").value; if (!site_id) return alert("سایت را انتخاب کنید"); const btn = e.target.querySelector("button"); setLoading(btn, true);
  try { await insertTable("posts", { site_id, name: document.getElementById("p-name").value }); document.getElementById("p-name").value = ""; await loadAllData(); } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن پست");
});

async function loadShifts() {
  let shifts = await getTable("at") || [];
  const shList = document.getElementById("shift-list");
  const filterVal = document.getElementById("filter-shift-post").value;
  
  if (filterVal) shifts = shifts.filter(s => s.post_id === filterVal);
  shList.innerHTML = "";
  if (shifts.length === 0) { shList.innerHTML = "<p style='color:#94a3b8; text-align:center;'>هیچ شیفتی ثبت نشده است.</p>"; return; }

  shifts.sort((a, b) => a.check_in.localeCompare(b.check_in));

  shifts.forEach(s => {
    const g = globalGuards.find(x => x.id === s.guard_id);
    const p = globalPosts.find(x => x.id === s.post_id);
    
    let start = 'نامشخص';
    if (s.check_in) {
      const parts = s.check_in.split('T');
      const dateParts = parts[0].split('-');
      const timeStr = parts[1] || "00:00";
      const gDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2]));
      
      // تبدیل تاریخ میلادی به شمسی برای نمایش (با استفاده از کد ریاضی)
      const d = gDate;
      let gy = d.getFullYear(), gm = d.getMonth() + 1, gd = d.getDate();
      let jy = gy - 621;
      let days = 0;
      const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      if (gy > 1600) { jy = gy - 621; }
      let gy2 = (gm > 2) ? (gy + 1) : gy;
      let days2 = 355666 + (365 * gy) + ~~((gy2 + 3) / 4) - ~~((gy2 + 99) / 100) + ~~((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
      jy = -1595 + (33 * ~~(days2 / 12053));
      days2 %= 12053;
      jy += 4 * ~~(days2 / 1461);
      days2 %= 1461;
      if (days2 > 365) {
        jy += ~~((days2 - 1) / 365);
        days2 = (days2 - 1) % 365;
      }
      if (days2 < 186) {
        jm = 1 + ~~(days2 / 31);
        jd = 1 + (days2 % 31);
      } else {
        jm = 7 + ~~((days2 - 186) / 30);
        jd = 1 + ((days2 - 186) % 30);
      }
      
      start = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')} - ${timeStr}`;
    }
    
    shList.innerHTML += `<div class="item" style="border-right: 4px solid #3b82f6;"><div style="display:flex; justify-content:space-between; align-items:center;"><div><strong>${g ? g.full_name : 'نامشخص'}</strong> در <strong>${p ? p.name : 'نامشخص'}</strong><br><small style="color:#94a3b8">زمان شروع: ${start}</small></div><button onclick="deleteItem('at', '${s.id}', this)" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">حذف</button></div></div>`;
  });
}

document.getElementById("delete-post-btn").addEventListener("click", async () => {
  const post_id = document.getElementById("delete-post-select").value;
  if (!post_id) return alert("لطفاً ابتدا یک پست را انتخاب کنید.");
  const postName = globalPosts.find(p => p.id === post_id)?.name || "این پست";
  if (!confirm(`آیا از حذف تمام شیفت‌های ثبت شده برای «${postName}» مطمئن هستید؟`)) return;
  const btn = document.getElementById("delete-post-btn"); setLoading(btn, true, "در حال حذف...");
  try {
    const allShifts = await getTable("at") || [];
    const shiftsToDelete = allShifts.filter(s => s.post_id === post_id);
    if (shiftsToDelete.length === 0) { alert("هیچ شیفتی برای این پست پیدا نشد."); setLoading(btn, false, "حذف شیفت‌های این پست"); return; }
    for (let s of shiftsToDelete) { await deleteTable("at", s.id); await new Promise(r => setTimeout(r, 500)); }
    alert(`تعداد ${shiftsToDelete.length} شیفت مربوط به این پست حذف شد.`);
    await loadShifts();
  } catch (err) { alert("خطا در حذف: " + err.message); }
  setLoading(btn, false, "حذف شیفت‌های این پست");
});

// *** تولید شیفت با استفاده از محاسبه ریاضی تاریخ ***
document.getElementById("shift-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const post_id = document.getElementById("sh-post").value;
  const shift_type = document.getElementById("sh-type").value;
  const g1 = document.getElementById("sh-guard1").value;
  const g2 = document.getElementById("sh-guard2").value;
  const g3 = document.getElementById("sh-guard3").value;
  const totalDays = parseInt(document.getElementById("sh-days").value);
  
  const yy = parseInt(document.getElementById("sh-year").value);
  const mm = parseInt(document.getElementById("sh-month").value);
  const dd = parseInt(document.getElementById("sh-day").value);
  const hh = document.getElementById("sh-hour").value;
  const min = document.getElementById("sh-minute").value;

  if (!post_id || !g1 || !g2 || !g3 || !yy || !mm || !dd || !hh || !min || !totalDays) return alert("همه فیلدها را پر کنید");
  if (new Set([g1, g2, g3]).size !== 3) return alert("لطفاً ۳ نگهبان متفاوت انتخاب کنید.");

  // تبدیل تاریخ شمسی به میلادی با تابع ریاضی
  const [gy, gm, gd] = jalaliToGregorian(yy, mm, dd);
  
  // تنظیم زمان شروع دقیقاً با ساعت انتخابی
  const parsedStartDate = new Date(gy, gm - 1, gd, parseInt(hh), parseInt(min));

  const btn = e.target.querySelector("button");
  setLoading(btn, true, "در حال چینش (لطفاً صبر کنید)...");

  try {
    let workHours = 24;
    if (shift_type === "12-24" || shift_type === "12-12") { workHours = 12; }

    let guardsQueue = [g1, g2, g3];
    let currentStart = parsedStartDate;
    let successCount = 0;
    
    const endDate = new Date(parsedStartDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));

    while (currentStart < endDate) {
      const currentGuard = guardsQueue.shift(); 
      let currentEnd = new Date(currentStart.getTime() + (workHours * 60 * 60 * 1000));
      
      const y = currentStart.getFullYear();
      const m = String(currentStart.getMonth() + 1).padStart(2, '0');
      const d = String(currentStart.getDate()).padStart(2, '0');
      const h = String(currentStart.getHours()).padStart(2, '0');
      const mn = String(currentStart.getMinutes()).padStart(2, '0');
      const startStr = `${y}-${m}-${d}T${h}:${mn}`;

      const endY = currentEnd.getFullYear();
      const endM = String(currentEnd.getMonth() + 1).padStart(2, '0');
      const endD = String(currentEnd.getDate()).padStart(2, '0');
      const endH = String(currentEnd.getHours()).padStart(2, '0');
      const endMin = String(currentEnd.getMinutes()).padStart(2, '0');
      const endStr = `${endY}-${endM}-${endD}T${endH}:${endMin}`;

      await insertTable("at", { guard_id: currentGuard, post_id, check_in: startStr, check_out: endStr });
      successCount++;
      guardsQueue.push(currentGuard);
      
      currentStart = new Date(currentEnd.getTime());
      await new Promise(resolve => setTimeout(resolve, 1500)); 
    }

    alert(`تعداد ${successCount} شیفت جدید برای این پست چیده شد.`);
    
    document.getElementById("filter-shift-post").value = post_id;
    await loadShifts();
  } catch(err) { alert("خطا در ثبت شیفت: " + err.message); }
  setLoading(btn, false, "تولید خودکار جدول");
});

window.deleteItem = async function(table, id, btnElement) {
  if (!confirm("مطمئن هستید؟")) return;
  btnElement.textContent = "..."; btnElement.disabled = true;
  try { await deleteTable(table, id); await loadAllData(); } catch(err) { alert(err.message); btnElement.textContent = "حذف"; btnElement.disabled = false; }
}

checkAuth();