/**
 * 构建：src/*.ts → miniprogram_dist/*.js（tsc），再把 wxml/wxss/json 原样拷过去，
 * 最后同步一份到 examples/demo/miniprogram_npm/animal-island-wx，
 * 等价于「微信开发者工具 → 工具 → 构建 npm」，只是省去登录与发包。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'src');
const distDir = join(root, 'miniprogram_dist');
const demoNpmDir = join(root, 'examples', 'demo', 'miniprogram_npm', 'animal-island-wx');

const ASSET_EXTS = ['.wxml', '.wxss', '.json', '.wxs'];

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

/* ---------- 0. 清理 ---------- */
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

/* ---------- 1. TS → JS ---------- */
// 用 node 直接跑 typescript/bin/tsc，避免 Windows 下 spawn .cmd 的 EINVAL
const tscJs = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
execFileSync(process.execPath, [tscJs, '-p', join(root, 'tsconfig.json')], { stdio: 'inherit', cwd: root });

/* ---------- 2. 拷贝静态资源 ---------- */
const assets = walk(srcDir).filter((file) => ASSET_EXTS.some((ext) => file.endsWith(ext)));
for (const file of assets) {
    const target = join(distDir, relative(srcDir, file));
    mkdirSync(join(target, '..'), { recursive: true });
    cpSync(file, target);
}

/* ---------- 3. 同步到 demo 的 miniprogram_npm ---------- */
rmSync(demoNpmDir, { recursive: true, force: true });
mkdirSync(join(demoNpmDir, '..'), { recursive: true });
cpSync(distDir, demoNpmDir, { recursive: true });
writeFileSync(
    join(demoNpmDir, 'package.json'),
    `${JSON.stringify({ name: 'animal-island-wx', version: '0.1.0', main: 'index.js' }, null, 2)}\n`,
    'utf8'
);

/* ---------- 4. 报告 ---------- */
const files = walk(distDir);
const total = files.reduce((sum, file) => sum + statSync(file).size, 0);
const components = readdirSync(srcDir).filter((name) => !name.startsWith('.') && name !== 'common' && name !== 'index.ts');

console.log('');
console.log(`✓ 构建完成：${components.length} 个组件 / ${files.length} 个文件 / ${(total / 1024).toFixed(1)} KB`);
console.log(`  产物：${relative(root, distDir)}`);
console.log(`  demo：${relative(root, demoNpmDir)}`);
console.log(`  组件：${components.join(', ')}`);

if (!existsSync(join(distDir, 'button', 'index.js'))) {
    throw new Error('构建产物缺少 button/index.js，请检查 tsc 是否失败');
}
