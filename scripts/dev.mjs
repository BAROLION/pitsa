// `npm run dev`   — Backend, Mini App va Admin Panel'ni bitta terminalda ishga tushiradi.
// `npm start`     — yuqoridagilar + Cloudflare tunnel: HTTPS manzilni o'zi oladi va botga ulaydi.
// Ctrl + C bosilganda hammasi birga to'xtaydi.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const withTunnel = process.argv.includes('--tunnel');
const vite = (dir) => path.join(root, dir, 'node_modules', 'vite', 'bin', 'vite.js');

const children = [];
let stopping = false;

const color = (code, text) => `\x1b[${code}m${text}\x1b[0m`;

function pipe(stream, prefix, onLine) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      if (onLine?.(line) === false) continue;
      process.stdout.write(`${prefix} ${line}\n`);
    }
  });
}

function run(name, colorCode, command, args, { cwd = root, env = {}, onLine, onExit } = {}) {
  const prefix = color(colorCode, `[${name}]`);
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipe(child.stdout, prefix, onLine);
  pipe(child.stderr, prefix, onLine);
  child.on('error', (error) => process.stdout.write(`${prefix} ishga tushmadi: ${error.message}\n`));
  child.on('exit', (code) => {
    const index = children.indexOf(child);
    if (index !== -1) children.splice(index, 1);
    if (stopping || child.intentionalStop) return;
    process.stdout.write(`${prefix} to‘xtadi (kod: ${code})\n`);
    onExit?.(code);
  });
  children.push(child);
  return child;
}

/** Jarayonni (va uning bolalarini) to'xtatadi. */
function killChild(child) {
  if (!child || child.exitCode !== null) return;
  child.intentionalStop = true;
  if (process.platform === 'win32') {
    // Windows'da bola jarayonlar (node --watch ichidagi server) ham to'xtashi uchun
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

/**
 * Oldingi ishga tushirishdan qolib ketgan jarayonlarni tozalaydi (terminal yopilganda
 * ular ba'zan o'chmay qoladi va "port band" xatosiga sabab bo'ladi).
 * Faqat 3000/5173/5174 portlarini egallagan node.exe va shu loyihadagi cloudflared to'xtatiladi.
 */
function cleanupStale() {
  if (process.platform !== 'win32') return;
  const tools = path.join(root, 'tools').replace(/'/g, "''");
  const script = [
    "$ids = @(Get-NetTCPConnection -State Listen -LocalPort 3000,5173,5174 -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess })",
    "$ids = @($ids | Where-Object { (Get-Process -Id $_ -ErrorAction SilentlyContinue).Name -eq 'node' })",
    `$ids += @(Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${tools}\\*' } | ForEach-Object { $_.Id })`,
    '$ids = @($ids | Sort-Object -Unique)',
    '$ids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }',
    '$ids.Count',
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' });
  const count = Number.parseInt(result.stdout, 10);
  if (count > 0) console.log(color(33, `🧹 Eski ishga tushirishdan qolgan ${count} ta jarayon to‘xtatildi`));
}

/** Cloudflare quick tunnel ochadi va https://....trycloudflare.com manzilini qaytaradi. */
function startTunnel() {
  const exe = path.join(root, 'tools', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  if (!existsSync(exe)) {
    console.error(color(31, `❌ ${exe} topilmadi. README.md dagi "Tunnel" bo‘limiga qarang.`));
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    let found = false;
    const timer = setTimeout(() => {
      killChild(child);
      reject(new Error('Tunnel 60 soniyada ochilmadi. Internetni tekshiring.'));
    }, 60000);

    // http2 — ba'zi tarmoqlarda QUIC (UDP) bloklangan bo'ladi
    const child = run('TUNNEL', 35, exe, ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', 'http://localhost:5173'], {
      onLine: (line) => {
        const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !found) {
          found = true;
          clearTimeout(timer);
          resolve({ url: match[0], child });
        }
        // cloudflared juda ko'p texnik yozuv chiqaradi — faqat jiddiy xatolarni ko'rsatamiz
        return /\bERR\b|error/i.test(line) && !/trycloudflare|fetch features|feature selector|update check/i.test(line);
      },
      onExit: () => {
        if (!found) {
          clearTimeout(timer);
          reject(new Error('cloudflared to‘xtab qoldi'));
        } else {
          tunnelBroken('cloudflared to‘xtab qoldi');
        }
      },
    });
  });
}

/** Manzil ochilyaptimi? (DNS + Cloudflare + Vite) */
async function isReachable(url, timeoutMs = 10000) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** DNS tarqalishini kutadi — tunnel manzili haqiqatan ochilguncha. */
async function waitForUrl(url) {
  for (let i = 0; i < 30; i += 1) {
    if (await isReachable(url)) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// ── Tunnel + API boshqaruvi ────────────────────────────────────────────────
// Bepul Cloudflare tunneli internet uzilib qolganda o'chib ketishi mumkin. Shunda yangi tunnel
// ochiladi va API (bot) yangi manzil bilan qayta ishga tushadi — bot menyu tugmasi o'zi yangilanadi.
let tunnel = null; // { url, child }
let api = null;
let reconnecting = false;
let failures = 0;

function startApi(env) {
  // npm start: kuzatuvsiz (OneDrive fayllarga tegib, keraksiz qayta ishga tushirishlarga sabab bo'ladi).
  // npm run dev: faqat src/ kuzatiladi — kod o'zgarsa server o'zi qayta yuklanadi.
  const args = withTunnel ? ['src/index.js'] : ['--watch-path=src', 'src/index.js'];
  api = run('API  ', 31, process.execPath, args, {
    env,
    onExit: () => {
      if (!withTunnel) return;
      console.log(color(33, '↻ API 3 soniyadan keyin qayta ishga tushiriladi...'));
      setTimeout(() => {
        if (!stopping && !reconnecting) startApi(env);
      }, 3000);
    },
  });
}

async function openTunnel() {
  console.log(color(35, '🌐 Tunnel ochilmoqda...'));
  const result = await startTunnel();
  process.stdout.write(color(35, `🌐 Tunnel manzili: ${result.url} — tekshirilmoqda...\n`));
  const ok = await waitForUrl(result.url);
  console.log(color(35, ok ? '🌐 Tunnel tayyor ✅' : '⚠️  Tunnel sekin ochilmoqda, baribir davom etamiz'));
  tunnel = result;
  failures = 0;
}

async function tunnelBroken(reason) {
  if (reconnecting || stopping) return;
  reconnecting = true;
  console.log(color(33, `\n⚠️  Tunnel uzildi (${reason}). Yangi tunnel ochilmoqda...`));
  killChild(tunnel?.child);
  killChild(api);
  tunnel = null;

  while (!stopping) {
    try {
      await openTunnel();
      break;
    } catch (error) {
      console.log(color(31, `❌ ${error.message} 15 soniyadan keyin yana urinib ko‘riladi...`));
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  if (stopping) return;

  startApi({ MINI_APP_URL: tunnel.url });
  reconnecting = false;
  console.log(color(32, '✅ Yangi tunnel ulandi. Telegram\'da chat pastidagi «🍕 Menyu» tugmasini bosing.\n'));
}

/** Har 30 soniyada tunnelni tekshiradi; ketma-ket 3 marta ochilmasa — qayta ulaydi. */
function watchTunnel() {
  setInterval(async () => {
    if (!tunnel || reconnecting || stopping) return;
    if (await isReachable(tunnel.url)) {
      failures = 0;
      return;
    }
    failures += 1;
    if (failures >= 3) tunnelBroken('manzil ochilmayapti');
  }, 30000);
}

// Backend hali yuklanayotganda Vite chiqaradigan proxy xatolarini yashiradi
// (sahifaning o'zi "Server ishga tushmoqda" deb ko'rsatadi).
const hideProxyNoise = (line) =>
  !/http proxy error|ECONNREFUSED|ECONNRESET|^\s+at (internal|after|process|TCP|Socket)/.test(line);

// ── Faqat bitta nusxa ──────────────────────────────────────────────────────
// Ikki terminalda bir vaqtda ishga tushirilsa, ular bir-birining tunnelini va portlarini
// buzadi. Shuning uchun ikkinchi nusxa birinchisiga tegmasdan chiqib ketadi.
const LOCK_FILE = path.join(os.tmpdir(), 'pitsa-dostavka-dev.lock');

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function acquireLock() {
  try {
    const pid = Number.parseInt(readFileSync(LOCK_FILE, 'utf8'), 10);
    if (pid && pid !== process.pid && isAlive(pid)) {
      console.log('');
      console.log(color(33, '  ⚠️  Server allaqachon boshqa terminal oynasida ishlayapti.'));
      console.log('     Ikkinchisini ochish shart emas — Telegram\'da «🍕 Menyu» tugmasini bosing.');
      console.log(`     Qayta ishga tushirmoqchi bo‘lsangiz, avval o‘sha oynada Ctrl + C bosing (PID ${pid}).`);
      console.log('');
      process.exit(1);
    }
  } catch {
    /* lock yo'q — birinchi nusxa */
  }
  writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock() {
  try {
    if (Number.parseInt(readFileSync(LOCK_FILE, 'utf8'), 10) === process.pid) rmSync(LOCK_FILE);
  } catch {
    /* ignore */
  }
}

/** Vite (Mini App / Admin) kutilmaganda o'chsa — qayta yoqiladi. */
function startFrontend(name, colorCode, dir) {
  run(name, colorCode, process.execPath, [vite(dir)], {
    cwd: path.join(root, dir),
    onLine: hideProxyNoise,
    onExit: () => {
      console.log(color(33, `↻ ${name.trim()} 3 soniyadan keyin qayta ishga tushiriladi...`));
      setTimeout(() => {
        if (!stopping) startFrontend(name, colorCode, dir);
      }, 3000);
    },
  });
}

async function main() {
  acquireLock();
  cleanupStale();

  // Frontend'lar birinchi — tunnel ular orqali ishlaydi
  startFrontend('MINI ', 32, 'mini-app');
  startFrontend('ADMIN', 34, 'admin-panel');

  if (withTunnel) {
    await openTunnel();
    startApi({ MINI_APP_URL: tunnel.url });
    watchTunnel();
  } else {
    startApi({});
  }

  if (withTunnel) {
    setTimeout(() => {
      console.log('');
      console.log(color(32, '  ✅ HAMMASI TAYYOR!'));
      console.log('  📱 Telegram\'da botni oching → /start → «🍕 Buyurtma berish» tugmasini bosing');
      console.log('  🛠  Admin Panel: http://localhost:5174');
      console.log('  ⛔ To‘xtatish: Ctrl + C');
      console.log('');
    }, 6000);
  }
}

function stopAll() {
  if (stopping) return;
  stopping = true;
  for (const child of [...children]) killChild(child);
  releaseLock();
  process.exit(0);
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
process.on('SIGHUP', stopAll);

main().catch((error) => {
  console.error(color(31, `❌ ${error.message}`));
  stopAll();
});
