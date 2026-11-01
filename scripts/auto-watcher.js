/**
 * Trình theo dõi tự động (File Watcher Auto-Sync)
 * Tự động phát hiện khi lưu file trong 'src/' và tự động commit + push sau 15 giây ổn định
 * Cách chạy:
 *   node scripts/auto-watcher.js
 *   npm run auto-sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const syncScript = path.join(__dirname, 'git-sync.js');

let debounceTimer = null;
const DEBOUNCE_DELAY_MS = 15000; // 15 giây sau khi ngừng chỉnh sửa

console.log('======================================================');
console.log('👀 TRÌNH THEO DÕI TỰ ĐỘNG LƯU VÀ ĐẨY CODE (AUTO-SYNC)');
console.log('======================================================');
console.log(`- Đang theo dõi thư mục: src/`);
console.log(`- Độ trễ commit an toàn: ${DEBOUNCE_DELAY_MS / 1000}s`);
console.log(`- Nhấn Ctrl + C để dừng theo dõi.\n`);

function triggerSync(changedFile) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  const relativePath = path.relative(rootDir, changedFile);
  console.log(`⚡ Phát hiện thay đổi tại [${relativePath}]. Đang đếm ngược 15s để gom commit...`);

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    console.log('\n⏳ Bắt đầu tiến trình tự động commit & push...');
    const child = fork(syncScript, [`Auto-sync: Cập nhật file ${path.basename(changedFile)} và các chỉnh sửa liên quan`]);
    child.on('close', (code) => {
      console.log(`\n👀 Tiếp tục theo dõi thay đổi...\n`);
    });
  }, DEBOUNCE_DELAY_MS);
}

const watchTarget = path.join(rootDir, 'src');
if (fs.existsSync(watchTarget)) {
  fs.watch(watchTarget, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    // Bỏ qua các file tạm thời hoặc ẩn
    if (filename.includes('.git') || filename.endsWith('~') || filename.startsWith('.')) return;
    triggerSync(path.join(watchTarget, filename));
  });
} else {
  console.error(`Không tìm thấy thư mục ${watchTarget}`);
}
