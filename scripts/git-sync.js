/**
 * Tự động thêm (add), ghi nhớ (commit) và đẩy (push) code lên GitHub
 * Hỗ trợ chạy:
 *   node scripts/git-sync.js
 *   node scripts/git-sync.js "Ghi chú commit tùy chọn"
 *   npm run push
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Tìm kiếm file thực thi git nếu chưa có trong PATH
function getGitCommand() {
  try {
    const res = spawnSync('git', ['--version'], { encoding: 'utf-8' });
    if (res.status === 0) return 'git';
  } catch (e) {}

  const candidatePaths = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe'),
    'C:\\Users\\Admin\\AppData\\Local\\Programs\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe'
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return `"${p}"`;
    }
  }

  return 'git';
}

const GIT = getGitCommand();

function runGit(args, options = {}) {
  const cmd = `${GIT} ${args}`;
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (err) {
    if (options.ignoreError) return null;
    throw err;
  }
}

function runGitOutput(args) {
  try {
    return execSync(`${GIT} ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return null;
  }
}

function main() {
  console.log('\n======================================================');
  console.log('🚀 TỰ ĐỘNG COMMIT & PUSH CODE LÊN GITHUB');
  console.log('======================================================\n');

  // 1. Kiểm tra Git
  const gitVersion = runGitOutput('--version');
  if (!gitVersion) {
    console.error('❌ Không tìm thấy Git trên hệ thống! Vui lòng kiểm tra đường dẫn cài đặt Git.');
    process.exit(1);
  }
  console.log(`✓ Sử dụng Git: ${gitVersion}`);

  // 2. Kiểm tra kho git local
  const isRepo = runGitOutput('rev-parse --is-inside-work-tree');
  if (isRepo !== 'true') {
    console.log('⚡ Đang khởi tạo kho Git local (git init)...');
    runGit('init -b main');
    runGit('config user.name "LiftPlan Developer"');
    runGit('config user.email "dev@liftplan.local"');
  }

  // 3. Lấy tên nhánh hiện tại
  let branch = runGitOutput('branch --show-current');
  if (!branch) {
    branch = 'main';
    runGit('branch -M main', { ignoreError: true });
  }
  console.log(`✓ Nhánh hiện tại: ${branch}`);

  // 4. Kiểm tra remote origin
  const remoteUrl = runGitOutput('remote get-url origin');
  if (!remoteUrl) {
    console.log('\n⚠️  CHƯA CẤU HÌNH REMOTE GITHUB (origin)!');
    console.log('------------------------------------------------------');
    console.log('Để đẩy code lên GitHub, bạn cần liên kết dự án với Repository trên GitHub:');
    console.log(' Chạy lệnh sau trong Terminal:');
    console.log(' git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git');
    console.log('------------------------------------------------------\n');
  } else {
    console.log(`✓ GitHub Remote: ${remoteUrl}`);
  }

  // 5. Kiểm tra thay đổi (changes)
  const status = runGitOutput('status --porcelain');
  const customMessage = process.argv.slice(2).join(' ').trim();
  let hasNewCommit = false;

  if (status) {
    console.log('\n📦 Đang thêm các file thay đổi (git add -A)...');
    runGit('add -A');

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const commitMsg = customMessage || `Auto-update: ${timestamp} - Cập nhật tính năng & mô hình 3D`;

    console.log(`📝 Đang ghi nhận commit: "${commitMsg}"...`);
    runGit(`commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    hasNewCommit = true;
  } else {
    console.log('✓ Không có file sửa đổi mới trong thư mục làm việc.');
  }

  // 6. Kiểm tra và Đẩy code lên GitHub
  if (remoteUrl) {
    const hasRemoteBranch = runGitOutput(`rev-parse --verify origin/${branch}`) !== null;
    let needPush = false;

    if (!hasRemoteBranch) {
      console.log(`⚡ Phát hiện kho GitHub chưa có nhánh [${branch}]. Tiến hành đẩy toàn bộ code lần đầu...`);
      needPush = true;
    } else {
      const unpushed = runGitOutput(`log origin/${branch}..HEAD --oneline`);
      if (unpushed || hasNewCommit) {
        console.log(`⚡ Đang đẩy các commit mới lên GitHub (${branch})...`);
        needPush = true;
      }
    }

    if (needPush) {
      console.log(`🚀 Đang kết nối và đẩy code lên: ${remoteUrl}`);
      try {
        runGit(`push -u origin ${branch}`);
        console.log('\n======================================================');
        console.log('🎉 CHÚC MỪNG: ĐÃ ĐẨY CODE LÊN GITHUB THÀNH CÔNG RỰC RỠ!');
        console.log(`🔗 Xem mã nguồn tại: ${remoteUrl.replace(/\.git$/, '')}`);
        console.log('======================================================\n');
      } catch (pushErr) {
        console.error('\n❌ Không thể đẩy code trực tiếp lên GitHub.');
        console.log('Gợi ý xử lý:');
        console.log('1. Đảm bảo bạn đã đăng nhập tài khoản GitHub khi cửa sổ đăng nhập hiện lên.');
        console.log('2. Nếu GitHub repo trên web đã có commit trước đó (như README/License), chạy:');
        console.log(`   git pull --rebase origin ${branch}`);
        console.log('   sau đó chạy lại file AUTO_PUSH_GITHUB.bat.');
        process.exit(1);
      }
    } else {
      console.log('✨ Mã nguồn trên máy tính đã hoàn toàn đồng bộ với GitHub (Up to date).');
    }
  } else {
    console.log('\n✅ Đã lưu commit cục bộ thành công trên máy tính!');
  }
}

main();
