const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

let selectedStartTime = null;

// راه‌اندازی تقویم شمسی
$(document).ready(function() {
  $("#sh-start").persianDatepicker({
    format: 'YYYY/MM/DD HH:mm',
    timePicker: { enabled: true },
    initialValue: false,
    autoClose: true,
    onSelect: function(unix) {
      selectedStartTime = new persianDate(unix).toDate();
    }
  });
});

function checkAuth() {
  const session = localStorage.getItem("fikaro_session");
  if (!session) return (window.location.href = "index.html");
  document.getElementById("user-email").textContent = localStorage.getItem("user_email") || "مدیر";
  loadAllData();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("fikaro_session");
  localStorage.removeItem("user_email");
  window.location.href = "index.html";
});

async function getTable(table) {
  const res = await fetch(`${BASE_URL}/${table}`, { headers });
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
    cList.innerHTML += `
      <div class="item">
        <div style="display:flex; justify-content:space-between;">
          <div><strong>${c.name}</strong><br><small>${c.contact_phone || ''}</small></div>
          <button onclick="deleteItem('companies', '${c.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        </div>
      </div>`;
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
    sList.innerHTML += `
      <div class="item">
        <div style="display:flex; justify-content:space-between;">
          <div><strong>${s.name}</strong><br><small>${compName}</small></div>
          <button onclick="deleteItem('sites', '${s.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        </div>
      </div>`;
    pSiteSelect.innerHTML += `<option value="${s.id}">${s.name} (${compName})</option>`;
  });
}

function renderGuards() {
  const gList = document.getElementById("guard-list");
  gList.innerHTML = "";
  globalGuards.forEach(g => {
    gList.innerHTML += `
      <div class="item">
        <div style="display:flex; justify-content:space-between;">
          <div><strong>${g.full_name}</strong><br><small>${g.phone || ''}</small></div>
          <button onclick="deleteItem('guards', '${g.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        </div>
      </div>`;
  });
}

function renderPosts() {
  const pList = document.getElementById("post-list");
  pList.innerHTML = "";
  globalPosts.forEach(p => {
    pList.innerHTML += `
      <div class="item">
        <div style="display:flex; justify-content:space-between;">
          <div><strong>${p.name}</strong></div>
          <button onclick="deleteItem('posts', '${p.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        </div>
      </div>`;
  });
}

function renderShiftSelectors() {
  const shiftGuard = document.getElementById("sh-guard");
  const shiftPost = document.getElementById("sh-post");
  shiftGuard.innerHTML = "<option value=''>انتخاب نگهبان...</option>";
  shiftPost.innerHTML = "<option value=''>انتخاب پست...</option>";

  globalGuards.forEach(g => shiftGuard.innerHTML += `<option value="${g.id}">${g.full_name}</option>`);
  globalPosts.forEach(p => shiftPost.innerHTML += `<option value="${p.id}">${p.name}</option>`);
}

document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("companies", { name: document.getElementById("c-name").value, contact_phone: document.getElementById("c-phone").value });
    document.getElementById("c-name").value = ""; document.getElementById("c-phone").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن شرکت");
});

document.getElementById("site-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const company_id = document.getElementById("s-company").value;
  if (!company_id) return alert("ابتدا یک شرکت انتخاب کنید.");
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("sites", { company_id, name: document.getElementById("s-name").value, address: document.getElementById("s-address").value });
    document.getElementById("s-name").value = ""; document.getElementById("s-address").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن سایت");
});

document.getElementById("guard-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("guards", { full_name: document.getElementById("g-name").value, phone: document.getElementById("g-phone").value });
    document.getElementById("g-name").value = ""; document.getElementById("g-phone").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن نگهبان");
});

document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const site_id = document.getElementById("p-site").value;
  if (!site_id) return alert("سایت را انتخاب کنید");
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  try {
    await insertTable("posts", { site_id, name: document.getElementById("p-name").value });
    document.getElementById("p-name").value = "";
    await loadAllData();
  } catch(err) { alert(err.message); }
  setLoading(btn, false, "افزودن پست");
});

// --- بخش شیفت‌ها (با استفاده از فیلدهای موجود در جدول at) ---
async function loadShifts() {
  const shifts = await getTable("at") || [];
  const shList = document.getElementById("shift-list");
  shList.innerHTML = "";
  
  shifts.forEach(s => {
    const g = globalGuards.find(x => x.id === s.guard_id);
    const p = globalPosts.find(x => x.id === s.post_id);
    
    // ما زمان شروع را در فیلد check_in ذخیره کردیم
    const start = s.check_in ? s.check_in.replace('T', ' ') : 'نامشخص';
    
    shList.innerHTML += `
      <div class="item" style="border-right: 4px solid #3b82f6;">
        <div style="display:flex; justify-content:space-between;">
          <div>
            <strong>${g ? g.full_name : 'نامشخص'}</strong> در ${p ? p.name : 'نامشخص'}<br>
            <small style="color:#94a3b8">زمان شروع: ${start}</small>
          </div>
          <button onclick="deleteItem('at', '${s.id}', this)" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        </div>
      </div>`;
  });
}

document.getElementById("shift-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const guard_id = document.getElementById("sh-guard").value;
  const post_id = document.getElementById("sh-post").value;
  const shift_type = document.getElementById("sh-type").value;
  const repeat_count = parseInt(document.getElementById("sh-repeat").value);

  if (!guard_id || !post_id || !selectedStartTime || !repeat_count) return alert("همه فیلدها را پر کنید");

  const btn = e.target.querySelector("button");
  setLoading(btn, true, "در حال تولید...");

  try {
    let workHours = 24, restHours = 48;
    if (shift_type === "12-24") { workHours = 12; restHours = 24; }
    else if (shift_type === "12-12") { workHours = 12; restHours = 12; }

    let currentStart = selectedStartTime;
    let successCount = 0;

    for (let i = 0; i < repeat_count; i++) {
      // زمان پایان را فقط برای محاسبه شیفت بعدی در جاوا اسکریپت استفاده می‌کنیم
      let currentEnd = new Date(currentStart.getTime() + (workHours * 60 * 60 * 1000));
      
      const startStr = currentStart.toISOString().slice(0, 16);
      const endStr = currentEnd.toISOString().slice(0, 16);

      // چون فیلد start_time نداریم، زمان شروع را در check_in و زمان پایان را در check_out می‌ریزیم
      await insertTable("at", { 
        guard_id, 
        post_id, 
        check_in: startStr,
        check_out: endStr
      });
      
      successCount++;
      currentStart = new Date(currentEnd.getTime() + (restHours * 60 * 60 * 1000));
    }

    alert(`تعداد ${successCount} شیفت با موفقیت ثبت شد.`);
    document.getElementById("sh-repeat").value = "1";
    selectedStartTime = null;
    $("#sh-start").val("");
    
    await loadShifts();
  } catch(err) { 
    alert("خطا در ثبت شیفت: " + err.message); 
  }
  
  setLoading(btn, false, "تولید خودکار شیفت‌ها");
});

window.deleteItem = async function(table, id, btnElement) {
  if (!confirm("مطمئن هستید؟")) return;
  btnElement.textContent = "...";
  btnElement.disabled = true;
  try {
    await deleteTable(table, id);
    await loadAllData();
  } catch(err) {
    alert(err.message);
    btnElement.textContent = "حذف";
    btnElement.disabled = false;
  }
}

checkAuth();