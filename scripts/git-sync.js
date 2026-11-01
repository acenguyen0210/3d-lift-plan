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
    console.error('❌ Không tìm thấy Git trên hệ thống! Vui lòng cài đặt Git.');
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
    console.log(' 1. Tạo repository mới trên https://github.com/new');
    console.log(' 2. Chạy lệnh sau trong Terminal:');
    console.log('    git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git');
    console.log(' hoặc chạy file AUTO_PUSH_GITHUB.bat để được nhập trực tiếp.');
    console.log('------------------------------------------------------\n');
  } else {
    console.log(`✓ GitHub Remote: ${remoteUrl}`);
  }

  // 5. Kiểm tra thay đổi (changes)
  const status = runGitOutput('status --porcelain');
  const customMessage = process.argv.slice(2).join(' ').trim();

  if (!status) {
    console.log('✓ Không có thay đổi mới cần commit.');
    
    // Kiểm tra xem có commit nào chưa push không
    if (remoteUrl) {
      const unpushed = runGitOutput(`log origin/${branch}..HEAD --oneline`);
      if (unpushed) {
        console.log(`⚡ Đang đẩy các commit chưa push lên GitHub (${branch})...`);
        runGit(`push -u origin ${branch}`);
        console.log('🎉 Push thành công!');
      } else {
        console.log('✨ Mã nguồn đã hoàn toàn đồng bộ với GitHub.');
      }
    }
    return;
  }

  console.log('\n📦 Đang thêm các file thay đổi (git add -A)...');
  runGit('add -A');

  // 6. Tạo Commit
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const commitMsg = customMessage || `Auto-update: ${timestamp} - Cập nhật tính năng & mô phỏng 3D`;

  console.log(`📝 Đang ghi nhận commit: "${commitMsg}"...`);
  runGit(`commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

  // 7. Push lên GitHub nếu có remote
  if (remoteUrl) {
    console.log(`\n🚀 Đang đẩy code lên GitHub (${remoteUrl} - nhánh ${branch})...`);
    try {
      runGit(`push -u origin ${branch}`);
      console.log('\n🎉 ĐÃ ĐỒNG BỘ THÀNH CÔNG LÊN GITHUB!');
    } catch (pushErr) {
      console.error('\n❌ Không thể push trực tiếp lên GitHub.');
      console.log('Gợi ý:');
      console.log('- Đảm bảo bạn đã đăng nhập tài khoản GitHub trên máy.');
      console.log('- Nếu remote có code mới chưa kéo về, chạy: git pull --rebase origin ' + branch);
      process.exit(1);
    }
  } else {
    console.log('\n✅ Đã commit cục bộ thành công!');
    console.log('Sau khi thêm remote GitHub, chạy lại lệnh này để tự động đẩy lên GitHub.');
  }
}

main();
