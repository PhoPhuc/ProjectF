const apps = {
  notes: {
    title: "Notes",
    content: `<textarea style="width:100%;height:120px;border:none;resize:none;background:#f8fafc;font-size:16px;padding:8px;border-radius:8px;" placeholder="Ghi chú tại đây..."></textarea>`
  },
  calculator: {
    title: "Calculator",
    content: `
      <div class="calc-display" id="calc-display">0</div>
      <div class="calculator-grid">
        <button class="calc-btn special" data-action="percent">%</button>
        <button class="calc-btn special" data-action="ce">CE</button>
        <button class="calc-btn special" data-action="c">C</button>
        <button class="calc-btn special" data-action="back">⌫</button>
        <button class="calc-btn special" data-action="inv">1/x</button>
        <button class="calc-btn special" data-action="sqr">x²</button>
        <button class="calc-btn special" data-action="sqrt">√x</button>
        <button class="calc-btn op" data-action="/">÷</button>
        <button class="calc-btn num" data-action="7">7</button>
        <button class="calc-btn num" data-action="8">8</button>
        <button class="calc-btn num" data-action="9">9</button>
        <button class="calc-btn op" data-action="*">×</button>
        <button class="calc-btn num" data-action="4">4</button>
        <button class="calc-btn num" data-action="5">5</button>
        <button class="calc-btn num" data-action="6">6</button>
        <button class="calc-btn op" data-action="-">-</button>
        <button class="calc-btn num" data-action="1">1</button>
        <button class="calc-btn num" data-action="2">2</button>
        <button class="calc-btn num" data-action="3">3</button>
        <button class="calc-btn op" data-action="+">+</button>
        <button class="calc-btn special" data-action="plusminus">+/-</button>
        <button class="calc-btn num" data-action="0">0</button>
        <button class="calc-btn num" data-action=".">.</button>
        <button class="calc-btn equal" data-action="=">=</button>
      </div>`
  },
  settings: {
    title: "Cài đặt",
    content: `<div style='text-align:center;padding:24px 0;'>
      <h3 style='font-size:20px;margin-bottom:12px;'>Cài đặt hệ thống</h3>
      <div style='margin-bottom:18px;'>
        <b>Chế độ giao diện:</b><br/>
        <button id='set-mobile-mode' style='margin:8px 8px 0 0;padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(90deg,#00BFFF,#8A2BE2);color:#fff;font-weight:600;cursor:pointer;'>Mobile</button>
        <button id='set-pc-mode' style='margin:8px 0 0 0;padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(90deg,#00BFFF,#8A2BE2);color:#fff;font-weight:600;cursor:pointer;'>PC</button>
      </div>
      <p style='color:#888;'>Tính năng đang phát triển...</p>
      <div class='credit'>HorizanOS &copy; 2024. Thiết kế bởi <b>bạnhaxy</b>.</div>
    </div>`
  },
  arcade: {
    title: "Arcade",
    content: `<div style='padding:12px;'>
      <h3 style='font-size:22px;font-weight:700;margin-bottom:18px;text-align:center;'>🎮 Arcade - Chọn trò chơi</h3>
      <div class='arcade-list'>
        <div class='arcade-game-card'>
          <div class='arcade-game-info'>
            <span class='arcade-game-title'>Cờ caro (Tic Tac Toe)</span>
            <span class='arcade-game-desc'>Chơi cờ caro với máy hoặc bạn bè.</span>
          </div>
          <button class='arcade-play-btn' data-game='tictactoe'>Chơi</button>
        </div>
        <div class='arcade-game-card'>
          <div class='arcade-game-info'>
            <span class='arcade-game-title'>Rắn săn mồi (Snake)</span>
            <span class='arcade-game-desc'>Điều khiển rắn ăn mồi, tránh va chạm.</span>
          </div>
          <button class='arcade-play-btn' data-game='snake'>Chơi</button>
        </div>
        <div class='arcade-game-card'>
          <div class='arcade-game-info'>
            <span class='arcade-game-title'>Xếp hình (Tetris)</span>
            <span class='arcade-game-desc'>Xếp các khối hình để ghi điểm cao nhất.</span>
          </div>
          <button class='arcade-play-btn' data-game='tetris'>Chơi</button>
        </div>
        <div class='arcade-game-card'>
          <div class='arcade-game-info'>
            <span class='arcade-game-title'>Flappy Bird</span>
            <span class='arcade-game-desc'>Vượt chướng ngại vật, ghi điểm cao.</span>
          </div>
          <button class='arcade-play-btn' data-game='flappy'>Chơi</button>
        </div>
      </div>
    </div>`
  }
};

document.querySelectorAll('.dock-icon').forEach(btn => {
  btn.addEventListener('click', () => {
    const app = btn.dataset.app;
    openAppWindow(app);
  });
});

let appWindowCount = 0;
function openAppWindow(appKey) {
  // Cho phép mở nhiều tab cùng lúc
  const app = apps[appKey];
  const win = document.createElement('div');
  win.className = 'app-window';
  win.id = 'window-' + appKey + '-' + (++appWindowCount);
  win.innerHTML = `
    <div class="app-titlebar">
      <span>${app.title}</span>
      <button class="app-close" title="Đóng"></button>
    </div>
    <div class="app-content">${app.content}</div>
  `;
  document.getElementById('desktop').appendChild(win);

  // Đặt vị trí cửa sổ xuất hiện
  const openWindows = document.querySelectorAll('.app-window');
  const baseLeft = (window.innerWidth - win.offsetWidth) / 2;
  const baseTop = (window.innerHeight - win.offsetHeight) / 2;
  let offset = 0;
  if (openWindows.length > 1) {
    offset = (openWindows.length - 1) * 40;
  }
  win.style.left = (baseLeft + offset) + 'px';
  win.style.top = (baseTop + offset) + 'px';

  // Đóng app chỉ đóng đúng tab đó
  win.querySelector('.app-close').onclick = () => win.remove();

  // Kéo cửa sổ
  let isDragging = false, offsetX, offsetY;
  const titlebar = win.querySelector('.app-titlebar');
  titlebar.onmousedown = function(e) {
    isDragging = true;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
    document.onmousemove = function(e) {
      if (isDragging) {
        win.style.left = (e.clientX - offsetX) + 'px';
        win.style.top = (e.clientY - offsetY) + 'px';
      }
    };
    document.onmouseup = function() {
      isDragging = false;
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };

  // Calculator logic binding
  if (appKey === 'calculator') {
    setupCalculator(win);
  }

  // Arcade game binding
  if (appKey === 'arcade') {
    setupArcade(win);
  }

  // Settings: bind chuyển đổi chế độ
  if (appKey === 'settings') {
    setTimeout(() => {
      const btnMobile = win.querySelector('#set-mobile-mode');
      const btnPC = win.querySelector('#set-pc-mode');
      if (btnMobile) btnMobile.onclick = function() {
        document.body.classList.add('mobile-mode');
        localStorage.setItem('horizanOS_mode', 'mobile');
      };
      if (btnPC) btnPC.onclick = function() {
        document.body.classList.remove('mobile-mode');
        localStorage.setItem('horizanOS_mode', 'pc');
      };
    }, 0);
  }
}

// Calculator logic giữ nguyên như trước
function setupCalculator(win) {
  const display = win.querySelector('#calc-display');
  let current = '0';
  let operator = null;
  let operand = null;
  let waitingForOperand = false;

  function updateDisplay() {
    display.textContent = current;
  }

  win.querySelectorAll('.calc-btn').forEach(btn => {
    btn.onclick = function() {
      const action = btn.getAttribute('data-action');
      if (!isNaN(action)) { // number
        if (waitingForOperand) {
          current = action;
          waitingForOperand = false;
        } else {
          current = current === '0' ? action : current + action;
        }
      } else if (action === '.') {
        if (!current.includes('.')) current += '.';
      } else if (['+', '-', '*', '/'].includes(action)) {
        if (operator && !waitingForOperand) {
          current = String(eval(operand + operator + current));
        }
        operator = action;
        operand = current;
        waitingForOperand = true;
      } else if (action === '=') {
        if (operator) {
          current = String(eval(operand + operator + current));
          operator = null;
          operand = null;
          waitingForOperand = false;
        }
      } else if (action === 'c' || action === 'ce') {
        current = '0';
        operator = null;
        operand = null;
        waitingForOperand = false;
      } else if (action === 'back') {
        current = current.length > 1 ? current.slice(0, -1) : '0';
      } else if (action === 'percent') {
        current = String(parseFloat(current) / 100);
      } else if (action === 'inv') {
        current = String(1 / parseFloat(current));
      } else if (action === 'sqr') {
        current = String(Math.pow(parseFloat(current), 2));
      } else if (action === 'sqrt') {
        current = String(Math.sqrt(parseFloat(current)));
      } else if (action === 'plusminus') {
        current = String(-parseFloat(current));
      }
      updateDisplay();
    };
  });
  updateDisplay();
}

// Arcade logic: mở game trong iframe nhỏ trong app window
function setupArcade(win) {
  win.querySelectorAll('.arcade-play-btn').forEach(btn => {
    btn.onclick = function() {
      const game = btn.getAttribute('data-game');
      let gameUrl = '';
      if (game === 'tictactoe') gameUrl = 'https://playtictactoe.org/';
      if (game === 'snake') gameUrl = 'https://playsnake.org/';
      if (game === 'tetris') gameUrl = 'https://tetris.com/play-tetris';
      if (game === 'flappy') gameUrl = 'https://flappybird.io/';
      const contentDiv = win.querySelector('.app-content');
      contentDiv.innerHTML = `<button style='margin-bottom:10px;' onclick='window.location.reload()'>Quay lại danh sách</button><iframe src='${gameUrl}' style='width:100%;height:400px;border-radius:12px;border:none;box-shadow:0 2px 8px #0002;'></iframe>`;
    };
  });
} 