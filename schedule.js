const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${APP_CONFIG.API_KEY}`
};
const BASE_URL = APP_CONFIG.API_URL;

async function getTable(table) {
  const res = await fetch(`${BASE_URL}/${table}`, { headers });
  const data = await res.json();
  return data.data || data;
}

// بارگذاری اولیه منوی کشویی پست‌ها
async function initFilters() {
  const posts = await getTable("posts") || [];
  const filterSelect = document.getElementById("filter-post");
  
  posts.forEach(p => {
    filterSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

async function loadSchedule() {
  const container = document.getElementById("table-container");
  const selectedPostId = document.getElementById("filter-post").value;
  
  try {
    let shifts = await getTable("at") || [];
    const guards = await getTable("guards") || [];
    const posts = await getTable("posts") || [];

    // فیلتر کردن شیفت‌ها بر اساس پست انتخاب شده
    if (selectedPostId) {
      shifts = shifts.filter(s => s.post_id === selectedPostId);
    }

    if (shifts.length === 0) {
      container.innerHTML = "<p class='empty-msg'>هیچ شیفتی برای این پست ثبت نشده است.</p>";
      return;
    }

    // مرتب‌سازی بر اساس زمان شروع
    shifts.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

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
        const startDate = new Date(s.check_in);
        dateStr = startDate.toLocaleDateString('fa-IR');
        startTime = startDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      }
      if (s.check_out) {
        const endDate = new Date(s.check_out);
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

// اجرای اولیه
async function initPage() {
  await initFilters();
  await loadSchedule();
}

initPage();