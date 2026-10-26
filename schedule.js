const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

// خواندن تاریخ بدون تغییر ساعت
function safeStringToDate(str) {
  if (!str) return new Date();
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    const [_, y, m, d, h, min] = match;
    return new Date(y, m - 1, d, h, min);
  }
  return new Date(str);
}

async function getTable(table) {
  const res = await fetch(`${BASE_URL}/${table}?limit=1000`, { headers });
  const data = await res.json();
  return data.data || data;
}

async function initFilters() {
  const posts = await getTable("posts") || [];
  const sites = await getTable("sites") || [];
  const filterSelect = document.getElementById("filter-post");
  
  filterSelect.innerHTML = "<option value=''>نمایش همه پست‌ها</option>";
  posts.forEach(p => {
    const site = sites.find(s => s.id === p.site_id);
    const siteName = site ? site.name : '';
    filterSelect.innerHTML += `<option value="${p.id}">${p.name} (${siteName})</option>`;
  });
}

async function loadSchedule() {
  const container = document.getElementById("table-container");
  const selectedPostId = document.getElementById("filter-post").value;
  
  try {
    let shifts = await getTable("at") || [];
    const guards = await getTable("guards") || [];
    const posts = await getTable("posts") || [];

    if (selectedPostId) {
      shifts = shifts.filter(s => s.post_id === selectedPostId);
    }

    if (shifts.length === 0) {
      container.innerHTML = "<p class='empty-msg'>هیچ شیفتی برای این پست ثبت نشده است.</p>";
      return;
    }

    // مرتب‌سازی دقیق
    shifts.sort((a, b) => a.check_in.localeCompare(b.check_in));

    const uniqueGuardIds = [...new Set(shifts.map(s => s.guard_id))];

    let html = `
      <table>
        <thead>
          <tr>
            <th>ردیف</th>
            <th>تاریخ شروع</th>
            <th>ساعت شروع</th>
            <th>ساعت پایان</th>
            <th>نام نگهبان</th>
            <th>پست نگهبانی</th>
          </tr>
        </thead>
        <tbody>
    `;

    shifts.forEach((s, index) => {
      const g = guards.find(x => x.id === s.guard_id);
      const p = posts.find(x => x.id === s.post_id);
      
      let dateStr = "-", startTime = "-", endTime = "-";

      if (s.check_in) {
        const startDate = safeStringToDate(s.check_in);
        dateStr = startDate.toLocaleDateString('fa-IR');
        startTime = startDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      }
      if (s.check_out) {
        const endDate = safeStringToDate(s.check_out);
        endTime = endDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      }

      const colorIndex = uniqueGuardIds.indexOf(s.guard_id) % 3;
      const colorClass = `guard-color-${colorIndex}`;

      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${dateStr}</td>
          <td>${startTime}</td>
          <td>${endTime}</td>
          <td class="${colorClass}">${g ? g.full_name : 'نامشخص'}</td>
          <td>${p ? p.name : 'نامشخص'}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444">خطا: ${err.message}</p>`;
  }
}

async function initPage() {
  await initFilters();
  await loadSchedule();
}

initPage();