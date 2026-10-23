/**
 * 用 Chrome DevTools Protocol 给 preview/index.html 拍整页截图（无需 puppeteer）。
 * 用法：node scripts/screenshot.mjs [--width 390] [--out preview/preview.png]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const WIDTH = Number(argValue('width', 390));
const OUT = resolve(root, argValue('out', 'preview/preview.png'));
const PORT = Number(argValue('port', 9333));
const FILE_URL = `file:///${join(root, 'preview', 'index.html').replace(/\\/g, '/')}`;

const CANDIDATES = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chromePath = CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) throw new Error('找不到 Chrome / Edge');

mkdirSync(join(OUT, '..'), { recursive: true });

const chrome = spawn(
    chromePath,
    [
        '--headless=new',
        `--remote-debugging-port=${PORT}`,
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=2',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + join(root, '.preview-profile'),
        `--window-size=${WIDTH},900`,
        'about:blank',
    ],
    { stdio: 'ignore' }
);

async function getWsUrl() {
    for (let i = 0; i < 50; i += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const targets = await response.json();
            const target = targets.find((item) => item.type === 'page');
            if (target && target.webSocketDebuggerUrl) return target.webSocketDebuggerUrl;
        } catch (error) {
            /* 还没起来 */
        }
        await sleep(200);
    }
    throw new Error('无法连接 Chrome 调试端口');
}

const wsUrl = await getWsUrl();
const socket = new WebSocket(wsUrl);
await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', rejectPromise, { once: true });
});

let messageId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        const { resolve: resolvePromise, reject: rejectPromise } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rejectPromise(new Error(message.error.message));
        else resolvePromise(message.result);
    }
});

function send(method, params = {}) {
    messageId += 1;
    const id = messageId;
    return new Promise((resolvePromise, rejectPromise) => {
        pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
        socket.send(JSON.stringify({ id, method, params }));
    });
}

try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
        width: WIDTH,
        height: 900,
        deviceScaleFactor: 2,
        mobile: true,
    });
    await send('Page.navigate', { url: FILE_URL });

    // 等运行时渲染完成
    for (let i = 0; i < 100; i += 1) {
        await sleep(100);
        const result = await send('Runtime.evaluate', {
            expression: 'document.documentElement.getAttribute("data-preview-ready") === "1"',
            returnByValue: true,
        });
        if (result.result && result.result.value === true) break;
    }
    await sleep(400);

    const errors = await send('Runtime.evaluate', {
        expression: 'JSON.stringify(window.__MP_ERRORS__ || [])',
        returnByValue: true,
    });

    const metrics = await send('Page.getLayoutMetrics');
    const content = metrics.cssContentSize || metrics.contentSize;
    const height = Math.ceil(content.height);

    // 可选：只截某一段（--y 起点 --h 高度），方便放大看细节
    const clipY = Number(argValue('y', 0));
    const clipH = Number(argValue('h', height - clipY));

    const screenshot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: clipY, width: WIDTH, height: clipH, scale: 1 },
    });

    writeFileSync(OUT, Buffer.from(screenshot.data, 'base64'));
    console.log(`✓ 截图 ${OUT}  ${WIDTH}x${height} @2x`);
    if (errors.result && errors.result.value && errors.result.value !== '[]') {
        console.log('页面错误：', errors.result.value);
    }
} finally {
    socket.close();
    chrome.kill();
}
