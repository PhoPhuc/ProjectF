const apps = {
  notepad: {
    title: 'Notepad',
    content: `<textarea style="width:100%;height:100px;resize:vertical;border:none;outline:none;font-size:15px;padding:8px;border-radius:8px;background:#f8fafc;">Ghi chú của bạn...</textarea>`
  },
  about: {
    title: 'About',
    content: `<div style="line-height:1.6"><b>Basic WebOS</b><br/>Một hệ điều hành web tối giản, thân thiện, tương thích di động & máy tính.<br/><br/>Tác giả: AI & Bạn<br/>2024</div>`
  },
  settings: {
    title: 'Cài đặt',
    content: `<div style="display:flex;flex-direction:column;gap:18px;">
      <div>
        <b>Giao diện</b><br/>
        <label style='display:flex;align-items:center;gap:8px;margin-top:8px;'>
          <input type='checkbox' id='theme-toggle' /> Chế độ tối
        </label>
      </div>
      <div>
        <b>Màu nền</b><br/>
        <input type='color' id='bg-color' value='#e0e7ef' style='width:40px;height:32px;border:none;background:none;'/>
      </div>
    </div>`
  },
  study: {
    title: 'Học tập',
    content: `<div style="display:flex;flex-direction:column;align-items:center;gap:18px;justify-content:center;height:100%">
      <div style='font-size:2.2rem'>🎓</div>
      <div style='font-size:1.1rem;text-align:center'>Khám phá kho học tập miễn phí!</div>
      <a href="https://www.khanacademy.org/" target="_blank" rel="noopener" style="margin-top:10px;display:inline-block;padding:10px 22px;background:linear-gradient(90deg,#6366f1,#06b6d4);color:#fff;border-radius:12px;font-weight:600;text-decoration:none;box-shadow:0 2px 8px #06b6d433;transition:background 0.2s;">Truy cập</a>
    </div>`
  }
};

let zIndex = 10;
const desktop = document.getElementById('desktop');
const taskbar = document.getElementById('taskbar-apps');

function createWindow(appKey) {
  if (document.querySelector(`.window[data-app='${appKey}']`)) {
    focusWindow(appKey);
    return;
  }
  const app = apps[appKey];
  const win = document.createElement('div');
  win.className = 'window';
  win.dataset.app = appKey;
  // Toàn màn hình trên mobile
  if (window.innerWidth <= 600) {
    win.style.left = '0';
    win.style.top = '0';
    win.style.width = '100vw';
    win.style.height = 'calc(100vh - 70px)';
  } else {
    win.style.left = Math.random() * 40 + 20 + 'vw';
    win.style.top = Math.random() * 20 + 10 + 'vh';
  }
  win.style.zIndex = ++zIndex;
  win.innerHTML = `
    <div class="window-header">
      <span class="window-title">${app.title}</span>
      <div class="window-actions">
        <button class="window-btn" title="Đóng">✖</button>
      </div>
    </div>
    <div class="window-content">${app.content}</div>
    <div class="window-resize"></div>
  `;
  document.body.appendChild(win);
  addTaskbarBtn(appKey, app.title, appKey);
  win.querySelector('.window-btn').onclick = () => closeWindow(appKey);
  win.onmousedown = () => focusWindow(appKey);
  makeDraggable(win, win.querySelector('.window-header'));
  focusWindow(appKey);
  // Xử lý Settings
  if (appKey === 'settings') {
    const themeToggle = win.querySelector('#theme-toggle');
    const bgColor = win.querySelector('#bg-color');
    // Set trạng thái ban đầu
    themeToggle.checked = document.body.classList.contains('dark');
    themeToggle.onchange = () => {
      document.body.classList.toggle('dark', themeToggle.checked);
    };
    bgColor.value = getComputedStyle(document.body).backgroundImage.includes('23272f') ? '#23272f' : '#e0e7ef';
    bgColor.oninput = () => {
      if (document.body.classList.contains('dark')) {
        document.body.style.background = `linear-gradient(135deg, ${bgColor.value} 0%, #2d323c 100%)`;
      } else {
        document.body.style.background = `linear-gradient(135deg, ${bgColor.value} 0%, #f8fafc 100%)`;
      }
    };
  }
  // Xử lý resize
  makeResizable(win);
}

function closeWindow(appKey) {
  const win = document.querySelector(`.window[data-app='${appKey}']`);
  if (win) {
    win.classList.add('closing');
    setTimeout(() => {
      win.remove();
      removeTaskbarBtn(appKey);
    }, 220);
  } else {
    removeTaskbarBtn(appKey);
  }
}

function focusWindow(appKey) {
  const win = document.querySelector(`.window[data-app='${appKey}']`);
  if (win) {
    zIndex++;
    win.style.zIndex = zIndex;
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active-window'));
    win.classList.add('active-window');
    document.querySelectorAll('.taskbar-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`.taskbar-btn[data-app='${appKey}']`);
    if (btn) btn.classList.add('active');
  }
}

function addTaskbarBtn(appKey, title, iconKey) {
  if (document.querySelector(`.taskbar-btn[data-app='${appKey}']`)) return;
  const btn = document.createElement('button');
  btn.className = 'taskbar-btn active';
  btn.dataset.app = appKey;
  // Hiển thị icon cho Settings
  if (appKey === 'settings') {
    btn.innerHTML = '⚙️';
  } else if (appKey === 'notepad') {
    btn.innerHTML = '📝';
  } else if (appKey === 'about') {
    btn.innerHTML = 'ℹ️';
  } else if (appKey === 'study') {
    btn.innerHTML = '🎓';
  } else {
    btn.textContent = title;
  }
  btn.onclick = () => focusWindow(appKey);
  taskbar.appendChild(btn);
  document.querySelectorAll('.taskbar-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function removeTaskbarBtn(appKey) {
  const btn = document.querySelector(`.taskbar-btn[data-app='${appKey}']`);
  if (btn) btn.remove();
}

desktop.querySelectorAll('.app-icon').forEach(icon => {
  icon.onclick = () => createWindow(icon.dataset.app);
});

// Kéo thả cửa sổ
function makeDraggable(win, header) {
  let isDown = false, offsetX = 0, offsetY = 0;
  header.onmousedown = function(e) {
    if (window.innerWidth <= 600) return; // Không cho kéo trên mobile
    isDown = true;
    const rect = win.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  };
  document.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    let x = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, e.clientX - offsetX));
    let y = Math.max(0, Math.min(window.innerHeight - win.offsetHeight - 70, e.clientY - offsetY));
    win.style.left = x + 'px';
    win.style.top = y + 'px';
  });
  document.addEventListener('mouseup', function() {
    isDown = false;
    document.body.style.userSelect = '';
  });
  // Touch support
  header.ontouchstart = function(e) {
    if (window.innerWidth <= 600) return; // Không cho kéo trên mobile
    isDown = true;
    const rect = win.getBoundingClientRect();
    offsetX = e.touches[0].clientX - rect.left;
    offsetY = e.touches[0].clientY - rect.top;
    document.body.style.userSelect = 'none';
  };
  document.addEventListener('touchmove', function(e) {
    if (!isDown) return;
    let x = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, e.touches[0].clientX - offsetX));
    let y = Math.max(0, Math.min(window.innerHeight - win.offsetHeight - 70, e.touches[0].clientY - offsetY));
    win.style.left = x + 'px';
    win.style.top = y + 'px';
  });
  document.addEventListener('touchend', function() {
    isDown = false;
    document.body.style.userSelect = '';
  });
}
// Thêm tính năng resize cửa sổ
function makeResizable(win) {
  const resizer = win.querySelector('.window-resize');
  if (!resizer) return;
  resizer.style.position = 'absolute';
  resizer.style.right = '0';
  resizer.style.bottom = '0';
  resizer.style.width = '28px';
  resizer.style.height = '28px';
  resizer.style.cursor = 'nwse-resize';
  resizer.style.zIndex = '10';
  resizer.style.background = 'none';
  resizer.innerHTML = `<svg width="22" height="22" style="opacity:0.5;" viewBox="0 0 22 22"><path d="M4 18h14M8 14h10M12 10h6" stroke="#888" stroke-width="2" stroke-linecap="round"/></svg>`;
  let isResizing = false, startX, startY, startW, startH;
  resizer.addEventListener('mousedown', function(e) {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = win.offsetWidth;
    startH = win.offsetHeight;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    let newW = Math.max(220, Math.min(window.innerWidth - win.offsetLeft, startW + (e.clientX - startX)));
    let newH = Math.max(120, Math.min(window.innerHeight - win.offsetTop - 70, startH + (e.clientY - startY)));
    win.style.width = newW + 'px';
    win.style.height = newH + 'px';
  });
  document.addEventListener('mouseup', function() {
    isResizing = false;
    document.body.style.userSelect = '';
  });
  // Touch support
  resizer.addEventListener('touchstart', function(e) {
    e.stopPropagation();
    isResizing = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startW = win.offsetWidth;
    startH = win.offsetHeight;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('touchmove', function(e) {
    if (!isResizing) return;
    let newW = Math.max(220, Math.min(window.innerWidth - win.offsetLeft, startW + (e.touches[0].clientX - startX)));
    let newH = Math.max(120, Math.min(window.innerHeight - win.offsetTop - 70, startH + (e.touches[0].clientY - startY)));
    win.style.width = newW + 'px';
    win.style.height = newH + 'px';
  });
  document.addEventListener('touchend', function() {
    isResizing = false;
    document.body.style.userSelect = '';
  });
} 