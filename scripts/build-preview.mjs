/**
 * 生成 preview/index.html —— 单文件预览页
 *
 * 打包进去的内容：
 *   - miniprogram_dist/<组件>/index.js —— 真实编译产物（预览里真的会执行）
 *   - src/<组件>/index.wxml / index.wxss —— @import 已内联
 *   - examples/demo 的 page（wxml / wxss / js）与 app.wxss
 *   - preview/runtime.js —— WXML/WXSS 运行时
 *
 * 目的：不登录微信开发者工具也能看到真实的组件外观，同时顺带校验 WXML 是否是合法 XML、
 *       组件逻辑（observers / setData）是否能跑通。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(path, 'utf8');

// 从构建产物里自动发现组件，新增组件不用再改这里
const distDir = join(root, 'miniprogram_dist');
const COMPONENTS = existsSync(distDir)
    ? readdirSync(distDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name !== 'common')
          .map((entry) => entry.name)
          .sort((a, b) => a.localeCompare(b))
    : [];

/**
 * 浏览器不认识 rpx。小程序的 1rpx = 屏宽/750，这里换成 calc(var(--rpx) * N)，
 * 由 PREVIEW_CSS 里的 --rpx 提供真实比例，保证预览的间距和真机一致。
 */
const rpxToCss = (css) => css.replace(/(\d*\.?\d+)rpx/g, (_, value) => `calc(var(--rpx) * ${value})`);

/** 递归内联 WXSS 的 @import */
function inlineWxss(file, seen = new Set()) {
    const abs = resolve(file);
    if (!existsSync(abs)) return '';
    if (seen.has(abs)) return '';
    seen.add(abs);
    let css = read(abs);
    css = css.replace(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g, (match, spec) => {
        if (!spec.endsWith('.wxss') && !spec.endsWith('.less')) return match;
        const target = resolve(dirname(abs), spec);
        return inlineWxss(target, seen);
    });
    return css;
}

/* ---------- 组件 ---------- */
const components = {};
for (const name of COMPONENTS) {
    const tag = `ai-${name}`;
    const dir = join(root, 'src', name);
    const jsPath = join(root, 'miniprogram_dist', name, 'index.js');
    if (!existsSync(jsPath)) throw new Error(`缺少构建产物 ${relative(root, jsPath)}，请先 npm run build`);
    components[tag] = {
        wxml: read(join(dir, 'index.wxml')),
        wxss: rpxToCss(inlineWxss(join(dir, 'index.wxss'))),
        js: read(jsPath),
    };
}

/* ---------- 共享模块（组件里可能 require('../../common/icons') 之类） ---------- */
const sharedModules = {};
const commonDir = join(root, 'miniprogram_dist', 'common');
if (existsSync(commonDir)) {
    for (const file of readdirSync(commonDir)) {
        if (!file.endsWith('.js')) continue;
        sharedModules[`common/${basename(file, '.js')}`] = readFileSync(join(commonDir, file), 'utf8');
    }
}

/* ---------- 页面 ---------- */
const pageDir = join(root, 'examples', 'demo', 'pages', 'index');
const pageCode = read(join(pageDir, 'index.js'));
let pageDefinition = null;
// eslint-disable-next-line no-new-func
new Function('Page', 'wx', 'getApp', pageCode)((definition) => {
    pageDefinition = definition;
}, { showToast() {} }, () => ({}));
if (!pageDefinition) throw new Error('无法从 examples/demo/pages/index/index.js 解析出 Page()');

const page = {
    // /assets/xxx 在小程序里是包内绝对路径，预览时改写成相对 preview/index.html 的路径
    wxml: read(join(pageDir, 'index.wxml')).replace(/(src=")\/assets\//g, '$1../examples/demo/assets/'),
    wxss: rpxToCss(inlineWxss(join(pageDir, 'index.wxss'))),
    data: pageDefinition.data || {},
    methods: Object.fromEntries(Object.entries(pageDefinition).filter(([, value]) => typeof value === 'function')),
};

const appWxss = rpxToCss(inlineWxss(join(root, 'examples', 'demo', 'app.wxss')));

/* ---------- 组装 ---------- */
const runtime = read(join(root, 'preview', 'runtime.js'));

/** 预览专用：把小程序标签名映射成浏览器可渲染的盒子 */
const PREVIEW_CSS = `
:root { --rpx: calc(100vw / 750); }
html, body { margin: 0; padding: 0; }
body { background: #f0e8d8; -webkit-font-smoothing: antialiased; }
page { display: block; }
view { display: block; }
text { display: inline; }
image, img { display: block; }
button { cursor: pointer; }
input { outline: none; }
input::placeholder { color: #c4b89e; font-weight: 400; }
page.page-root { min-height: 100vh; }
`;

const payload = JSON.stringify({ components, modules: sharedModules, page })
    // 页面 data 里的包内绝对路径（/assets/...）也要改写
    .replace(/"\/assets\//g, '"../examples/demo/assets/')
    .replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>animal-island-wx · 小程序组件预览</title>
<style>
${PREVIEW_CSS}
${appWxss}
${page.wxss}
</style>
</head>
<body>
<div id="app"></div>
<script>window.__MP__ = ${payload};</script>
<script>${runtime}</script>
</body>
</html>
`;

writeFileSync(join(root, 'preview', 'index.html'), html, 'utf8');
console.log(`✓ preview/index.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
console.log(`  组件：${Object.keys(components).join(', ')}`);
