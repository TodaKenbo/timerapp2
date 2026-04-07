// ============================================
// Add Material Page
// ============================================

import { addMaterial } from '../store.js';
import { searchByISBN } from '../utils/googleBooks.js';
import { router } from '../router.js';

let quaggaLoaded = false;

export function renderAddMaterial(container) {
  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:var(--space-md);">
        <button class="btn btn-ghost btn-icon" id="btn-back" style="font-size:20px;">←</button>
        <div>
          <h1 class="page-title">教材を追加</h1>
          <p class="page-subtitle">バーコードスキャンまたは手動入力</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs mb-lg">
      <button class="tab-btn active" data-tab="scan" id="tab-scan">📷 スキャン</button>
      <button class="tab-btn" data-tab="manual" id="tab-manual">✏️ 手動入力</button>
    </div>

    <!-- Scan Tab -->
    <div id="tab-content-scan">
      <div class="card mb-lg">
        <div class="scanner-viewport" id="scanner-viewport">
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:var(--space-sm);">
            <span style="font-size:36px;">📷</span>
            <p style="font-size:var(--text-sm);">カメラを起動中...</p>
          </div>
        </div>
        <div class="scanner-overlay">
          <div class="scanner-frame">
            <div class="scanner-line"></div>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:var(--space-md);">
        <button class="btn btn-primary" id="btn-start-scan">📷 スキャン開始</button>
      </div>

      <div class="form-group mb-lg">
        <label class="form-label">ISBNを直接入力</label>
        <div style="display:flex;gap:var(--space-sm);">
          <input type="text" class="form-input" id="isbn-input" placeholder="978xxxxxxxxxx" />
          <button class="btn btn-secondary" id="btn-isbn-search">検索</button>
        </div>
      </div>

      <!-- Scan result preview -->
      <div id="scan-result" style="display:none;">
        <div class="card mb-lg">
          <div style="display:flex;gap:var(--space-md);">
            <div class="material-cover" style="width:72px;height:104px;" id="scan-cover"></div>
            <div style="flex:1;">
              <h3 style="font-size:var(--text-lg);font-weight:600;" id="scan-title"></h3>
              <p style="font-size:var(--text-sm);color:var(--text-secondary);" id="scan-author"></p>
              <p style="font-size:var(--text-sm);color:var(--text-secondary);" id="scan-pages"></p>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" id="btn-add-scanned">この教材を追加 ✓</button>
      </div>
    </div>

    <!-- Manual Tab -->
    <div id="tab-content-manual" style="display:none;">
      <div class="flex-col gap-lg">
        <div class="form-group">
          <label class="form-label">教材名 *</label>
          <input type="text" class="form-input" id="manual-title" placeholder="例: 高校数学IA" />
        </div>

        <div class="form-group">
          <label class="form-label">種類</label>
          <select class="form-select" id="manual-type">
            <option value="book">📖 書籍</option>
            <option value="video">🎬 動画</option>
            <option value="print">📄 プリント</option>
            <option value="other">📝 その他</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">著者・制作者</label>
          <input type="text" class="form-input" id="manual-author" placeholder="任意" />
        </div>

        <div id="manual-pages-group" class="form-group">
          <label class="form-label">総ページ数</label>
          <input type="number" class="form-input" id="manual-pages" placeholder="例: 300" min="0" />
        </div>

        <div id="manual-duration-group" class="form-group" style="display:none;">
          <label class="form-label">総時間（分）</label>
          <input type="number" class="form-input" id="manual-duration" placeholder="例: 120" min="0" />
        </div>

        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea class="form-textarea" id="manual-memo" placeholder="任意" rows="2"></textarea>
        </div>

        <button class="btn btn-primary btn-block btn-lg" id="btn-add-manual">教材を追加 ✓</button>
      </div>
    </div>
  `;

  // Navigation
  container.querySelector('#btn-back')?.addEventListener('click', () => {
    stopScanner();
    router.navigate('/materials');
  });

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tab-content-scan').style.display = tab === 'scan' ? 'block' : 'none';
      document.getElementById('tab-content-manual').style.display = tab === 'manual' ? 'block' : 'none';
      if (tab !== 'scan') stopScanner();
    });
  });

  // Type switching (show pages or duration)
  const typeSelect = container.querySelector('#manual-type');
  typeSelect?.addEventListener('change', () => {
    const isVideo = typeSelect.value === 'video';
    document.getElementById('manual-pages-group').style.display = isVideo ? 'none' : 'block';
    document.getElementById('manual-duration-group').style.display = isVideo ? 'block' : 'none';
  });

  // Barcode scan
  container.querySelector('#btn-start-scan')?.addEventListener('click', () => {
    startScanner(container);
  });

  // ISBN manual search
  container.querySelector('#btn-isbn-search')?.addEventListener('click', async () => {
    const isbn = container.querySelector('#isbn-input')?.value;
    if (!isbn) return;
    await lookupISBN(isbn, container);
  });

  // Add scanned book
  let scannedData = null;
  container.querySelector('#btn-add-scanned')?.addEventListener('click', () => {
    if (!scannedData) return;
    addMaterial({
      title: scannedData.title,
      type: 'book',
      author: scannedData.author,
      isbn: scannedData.isbn,
      coverUrl: scannedData.coverUrl,
      totalPages: scannedData.totalPages,
    });
    stopScanner();
    router.navigate('/materials');
  });

  // Manual add
  container.querySelector('#btn-add-manual')?.addEventListener('click', () => {
    const title = container.querySelector('#manual-title')?.value?.trim();
    if (!title) {
      container.querySelector('#manual-title')?.focus();
      return;
    }

    const type = container.querySelector('#manual-type')?.value || 'book';
    const totalPages = parseInt(container.querySelector('#manual-pages')?.value) || 0;
    const totalDuration = parseInt(container.querySelector('#manual-duration')?.value) || null;

    addMaterial({
      title,
      type,
      author: container.querySelector('#manual-author')?.value?.trim() || '',
      totalPages: type === 'video' ? 0 : totalPages,
      totalDuration: type === 'video' ? totalDuration : null,
      memo: container.querySelector('#manual-memo')?.value?.trim() || '',
    });
    router.navigate('/materials');
  });

  // Store scannedData in closure for the add button
  window.__setScannedData = (data) => {
    scannedData = data;
  };
}

async function lookupISBN(isbn, container) {
  const resultDiv = document.getElementById('scan-result');
  const btn = container.querySelector('#btn-isbn-search');
  if (btn) btn.textContent = '検索中...';

  const book = await searchByISBN(isbn);

  if (btn) btn.textContent = '検索';

  if (!book) {
    alert('書籍が見つかりませんでした。ISBNを確認してください。');
    return;
  }

  // Show result
  if (resultDiv) {
    resultDiv.style.display = 'block';
    document.getElementById('scan-title').textContent = book.title;
    document.getElementById('scan-author').textContent = book.author || '著者不明';
    document.getElementById('scan-pages').textContent = book.totalPages ? `${book.totalPages}ページ` : 'ページ数不明';

    const coverEl = document.getElementById('scan-cover');
    if (coverEl) {
      coverEl.innerHTML = book.coverUrl
        ? `<img src="${book.coverUrl}" alt="${book.title}" />`
        : '📖';
    }
  }

  window.__setScannedData?.(book);
}

async function startScanner(container) {
  const viewport = document.getElementById('scanner-viewport');
  if (!viewport) return;

  // Load Quagga2 dynamically
  if (!window.Quagga) {
    try {
      viewport.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:var(--space-sm);"><span style="font-size:36px;">📷</span><p style="font-size:var(--text-sm);">スキャナーを読み込み中...</p></div>`;

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (err) {
      viewport.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--danger);flex-direction:column;gap:var(--space-sm);"><span style="font-size:36px;">⚠️</span><p style="font-size:var(--text-sm);">スキャナーの読み込みに失敗しました</p></div>`;
      return;
    }
  }

  viewport.innerHTML = '';

  try {
    await new Promise((resolve, reject) => {
      Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: viewport,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
        decoder: {
          readers: ['ean_reader'],
        },
        locate: true,
        frequency: 10,
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    Quagga.start();

    Quagga.onDetected(async (result) => {
      const code = result?.codeResult?.code;
      if (!code) return;

      // Vibrate on detection
      if (navigator.vibrate) navigator.vibrate(100);

      Quagga.stop();
      viewport.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--success);flex-direction:column;gap:var(--space-sm);"><span style="font-size:36px;">✓</span><p style="font-size:var(--text-sm);">バーコード検出: ${code}</p></div>`;

      // Set ISBN input
      const isbnInput = document.getElementById('isbn-input');
      if (isbnInput) isbnInput.value = code;

      // Lookup
      await lookupISBN(code, container);
    });
  } catch (err) {
    console.error('Scanner error:', err);
    viewport.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--warning);flex-direction:column;gap:var(--space-sm);"><span style="font-size:36px;">📷</span><p style="font-size:var(--text-sm);">カメラへのアクセスが拒否されました<br>ISBNを手動で入力してください</p></div>`;
  }
}

function stopScanner() {
  try {
    if (window.Quagga) {
      Quagga.stop();
    }
  } catch {}
}
