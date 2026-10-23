/**
 * 平台安全静态检查：把「Web 习惯」和「小程序不支持的东西」挡在提交之前。
 *
 *   node scripts/check.mjs
 *
 * 检查项：
 *   1. 每个组件都有 index.{json,wxml,wxss,ts}，index.json 里 "component": true
 *   2. WXML 标签闭合、标签名合法（不允许 svg/div/span/p 等 Web 标签）
 *   3. WXML 里 wx:for 同时写了 wx:key（小程序会警告，列表复用会错乱）
 *   4. WXSS 里没有 :hover / :focus / :active / ::placeholder / :root
 *   5. WXSS 里 background-image 只能 data: / http(s)，不能引用包内相对路径
 *   6. 每个组件 WXSS 都 @import 了基础重置（样式隔离下页面 reset 进不来）
 *   7. TS 里没有 document/window/localStorage/ResizeObserver 等浏览器 API
 *   8. 图标名都能在 ICON_NAMES 里找到（demo 与文档示例）
 *   9. demo 用到的 ai-* 组件都已注册
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const read = (path) => readFileSync(path, 'utf8');
const rel = (path) => relative(root, path).replace(/\\/g, '/');
/** 去掉注释再扫，避免「文档里提到了 :hover」这种误报 */
const stripComments = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').replace(/<!--[\s\S]*?-->/g, '');

/* ============================================================
 * 0. 收集组件与共享资源
 * ============================================================ */
const srcDir = join(root, 'src');
const components = readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(srcDir, name, 'index.json')));

const iconSource = read(join(srcDir, 'common', 'icons.ts'));
const iconNames = [...iconSource.matchAll(/["']([a-z0-9-]+)["']/g)].map((match) => match[1]);
const spriteNames = [...read(join(srcDir, 'common', 'icons.wxss')).matchAll(/\.ai-icon--([a-z0-9-]+)/g)].map(
    (match) => match[1]
);

const ALLOWED_TAGS = new Set([
    'view',
    'text',
    'image',
    'input',
    'textarea',
    'button',
    'block',
    'slot',
    'scroll-view',
    'swiper',
    'swiper-item',
    'icon',
    'label',
    'form',
    'navigator',
]);
const WEB_TAGS = new Set(['div', 'span', 'p', 'a', 'ul', 'li', 'h1', 'h2', 'h3', 'section', 'header', 'footer', 'svg', 'img', 'main', 'nav', 'article']);

/* ============================================================
 * 1. 组件四件套 + json
 * ============================================================ */
for (const name of components) {
    const dir = join(srcDir, name);
    for (const ext of ['index.json', 'index.wxml', 'index.wxss', 'index.ts']) {
        if (!existsSync(join(dir, ext))) fail(`${rel(dir)}/${ext} 缺失`);
    }
    const json = JSON.parse(read(join(dir, 'index.json')));
    if (json.component !== true) fail(`${rel(dir)}/index.json 缺少 "component": true`);
    if (json.usingComponents) {
        for (const [tag, path] of Object.entries(json.usingComponents)) {
            if (/^\/|\.\.\//.test(path) === false) {
                warn(`${rel(dir)}/index.json 的 ${tag} 用了相对路径 "${path}"，建议改成绝对路径避免层级变化后失效`);
            }
        }
    }
}

/* ============================================================
 * 2-3. WXML：标签闭合 / 合法标签名 / wx:key
 * ============================================================ */
function checkWxml(file) {
    const source = read(file).replace(/<!--[\s\S]*?-->/g, '');
    const name = rel(file);

    // 先把 {{ }} 里的比较符挡掉，避免 < > 干扰标签扫描
    const masked = source.replace(/\{\{[\s\S]*?\}\}/g, (block) => block.replace(/[<>]/g, ' '));

    const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
    const stack = [];
    let match;
    while ((match = tagPattern.exec(masked))) {
        const [, closing, tagName, attributes, selfClosing] = match;
        if (tagName === 'block' && closing) {
            /* 正常闭合 */
        }
        if (WEB_TAGS.has(tagName)) fail(`${name} 使用了 Web 标签 <${tagName}>，WXML 里请用 view/text/image`);
        else if (!ALLOWED_TAGS.has(tagName) && !tagName.startsWith('ai-')) {
            warn(`${name} 出现未列入白名单的标签 <${tagName}>（若是原生组件请补充 ALLOWED_TAGS）`);
        }

        if (closing) {
            const open = stack.pop();
            if (open !== tagName) fail(`${name} 标签未正确闭合：期望 </${open}>，实际 </${tagName}>`);
        } else if (!selfClosing) {
            stack.push(tagName);
        }

        if (!selfClosing && !closing) {
            // 同一标签内 wx:for 必须配 wx:key
            if (/\swx:for=/.test(attributes) && !/\swx:key=/.test(attributes)) {
                warn(`${name} 的 <${tagName}> 有 wx:for 但缺少 wx:key`);
            }
        }
    }
    if (stack.length) fail(`${name} 存在未闭合标签：${stack.join(' > ')}`);

    /* 同一标签里重复的属性：开发者工具会「后者覆盖」不出声，
     * 但 build-preview 走的 XML 解析会直接报 "Attribute xxx redefined" 白屏，所以必须挡掉 */
    const attrSource = masked.replace(/\{\{[\s\S]*?\}\}/g, "''");
    for (const tagMatch of attrSource.matchAll(/<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g)) {
        const [, tagName, rawAttrs] = tagMatch;
        const seen = new Set();
        for (const attrMatch of rawAttrs.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=/g)) {
            const attr = attrMatch[1];
            if (seen.has(attr)) fail(`${name} 的 <${tagName}> 重复声明了属性 ${attr}（预览会白屏）`);
            seen.add(attr);
        }
    }

    // 布尔属性在小程序里可以裸写，但别把 {{}} 拼出半个
    if ((source.match(/\{\{/g) || []).length !== (source.match(/\}\}/g) || []).length) {
        fail(`${name} 的 {{ }} 插值不成对`);
    }
}

/* ============================================================
 * 4-6. WXSS：Web 专属伪类 / 背景图路径 / 基础重置
 * ============================================================ */
const FORBIDDEN_CSS = [
    [/:hover\b/, ':hover（小程序的指针事件不可靠，请用 hover-class）'],
    [/:focus(-visible)?\b(?!\s*\()/, ':focus（小程序请用 focus-class 或 JS 状态）'],
    [/:active\b/, ':active（请用 hover-class）'],
    [/::placeholder\b/, '::placeholder（请用 placeholder-class）'],
    [/::selection\b/, '::selection'],
    [/:root\b/, ':root（请用 page）'],
    [/@media\s*\(\s*hover/, '@media (hover: hover)'],
];

function checkWxss(file, { isComponent }) {
    const source = stripComments(read(file));
    const name = rel(file);

    for (const [pattern, reason] of FORBIDDEN_CSS) {
        if (pattern.test(source)) fail(`${name} 包含 ${reason}`);
    }

    for (const match of source.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        const target = match[1].trim();
        if (!/^(data:|https?:)/.test(target) && !target.startsWith('#')) {
            fail(`${name} 的 url(${target}) 引用了本地文件，小程序 WXSS 只支持 data: / https`);
        }
    }

    if (isComponent && !/@import\s+['"]\.\.\/common\/style\/base\.wxss['"]/.test(source)) {
        fail(`${name} 缺少 @import '../common/style/base.wxss';（组件样式隔离，页面 reset 进不来）`);
    }
}

/* ============================================================
 * 7. TS：浏览器 API
 * ============================================================ */
const FORBIDDEN_JS = [
    [/\bdocument\./, 'document（小程序没有 DOM）'],
    [/\bwindow\./, 'window（小程序没有 window）'],
    [/\blocalStorage\b/, 'localStorage（请用 wx.setStorageSync）'],
    [/\bResizeObserver\b/, 'ResizeObserver（请用 wx.createSelectorQuery 或 onResize）'],
    [/\bIntersectionObserver\b/, 'IntersectionObserver'],
    [/\brequestAnimationFrame\b/, 'requestAnimationFrame（请用 wx.nextTick）'],
    [/\bgetComputedStyle\b/, 'getComputedStyle'],
    [/\bcreatePortal\b/, 'createPortal（小程序没有 portal）'],
    [/\baddEventListener\b/, 'addEventListener'],
];

function checkTs(file) {
    const source = stripComments(read(file));
    const name = rel(file);
    for (const [pattern, reason] of FORBIDDEN_JS) {
        if (pattern.test(source)) fail(`${name} 使用了 ${reason}`);
    }
    if (!/\bComponent\s*\(/.test(source)) fail(`${name} 没有调用 Component()`);
    if (!/^export\s/m.test(source)) fail(`${name} 没有 export（会被当成全局脚本，和其他组件撞名）`);
}

/* ============================================================
 * 8. 图标名
 * ============================================================ */
/** WXML 里静态写死的图标名（只看对应组件自己的属性，避免 <slot name> 误报） */
const ICON_ATTRS = [
    ['ai-icon', 'name'],
    ['ai-avatar', 'icon'],
    ['ai-input', 'prefix'],
    ['ai-input', 'suffix'],
    ['ai-divider', 'icon'],
    ['ai-button', 'icon'],
];

function checkIconNames(file) {
    const source = stripComments(read(file));
    const name = rel(file);

    for (const [tag, attr] of ICON_ATTRS) {
        const tagPattern = new RegExp(`<${tag}\\b((?:"[^"]*"|'[^']*'|[^>])*)>`, 'g');
        for (const tagMatch of source.matchAll(tagPattern)) {
            const attrMatch = new RegExp(`\\b${attr}=["']([\\w-]+)["']`).exec(tagMatch[1]);
            if (!attrMatch) continue;
            if (!iconNames.includes(attrMatch[1])) {
                fail(`${name} 的 <${tag} ${attr}="${attrMatch[1]}"> 用了不存在的图标`);
            }
        }
    }

    // JS 里以对象字面量形式传的图标名（wx.showToast 的 icon 取值不算）
    const TOAST_ICONS = new Set(['none', 'success', 'error', 'loading']);
    for (const match of source.matchAll(/\b(?:icon|prefix|suffix)\s*:\s*['"]([\w-]+)['"]/g)) {
        if (TOAST_ICONS.has(match[1])) continue;
        if (!iconNames.includes(match[1])) {
            fail(`${name} 里传递了不存在的图标 "${match[1]}"`);
        }
    }
}

/* ============================================================
 * 执行
 * ============================================================ */
for (const name of components) {
    const dir = join(srcDir, name);
    checkWxml(join(dir, 'index.wxml'));
    checkWxss(join(dir, 'index.wxss'), { isComponent: true });
    checkTs(join(dir, 'index.ts'));
    checkIconNames(join(dir, 'index.wxml'));
}

// 共享样式
checkWxss(join(srcDir, 'common', 'style', 'tokens.wxss'), { isComponent: false });
checkWxss(join(srcDir, 'common', 'style', 'base.wxss'), { isComponent: false });
checkWxss(join(srcDir, 'common', 'icons.wxss'), { isComponent: false });

// icons.ts 与 icons.wxss 必须一一对应
const missingInSprite = iconNames.filter((icon) => !spriteNames.includes(icon));
const missingInTs = spriteNames.filter((icon) => !iconNames.includes(icon));
if (missingInSprite.length) fail(`ICON_NAMES 里的 ${missingInSprite.join(', ')} 在 icons.wxss 中缺少样式`);
if (missingInTs.length) fail(`icons.wxss 里的 ${missingInTs.join(', ')} 没有写进 ICON_NAMES`);

/* ---------- demo ---------- */
const demoDir = join(root, 'examples', 'demo');
if (existsSync(demoDir)) {
    const pageDir = join(demoDir, 'pages', 'index');
    checkWxml(join(pageDir, 'index.wxml'));
    checkWxss(join(pageDir, 'index.wxss'), { isComponent: false });
    checkIconNames(join(pageDir, 'index.wxml'));
    checkIconNames(join(pageDir, 'index.js'));

    const pageJson = JSON.parse(read(join(pageDir, 'index.json')));
    const usingComponents = pageJson.usingComponents || {};
    const pageWxml = read(join(pageDir, 'index.wxml'));
    const usedTags = new Set([...pageWxml.matchAll(/<(ai-[\w-]+)/g)].map((match) => match[1]));
    for (const tag of usedTags) {
        if (!usingComponents[tag]) fail(`demo 页面使用了 <${tag}> 但没有在 index.json 的 usingComponents 中注册`);
    }
    for (const [tag, path] of Object.entries(usingComponents)) {
        // 两种写法都合法：npm 包名解析（构建 npm 后）或显式的 miniprogram_npm 路径
        const isPackagePath = path.startsWith('animal-island-wx/');
        const isNpmPath = path.startsWith('/miniprogram_npm/animal-island-wx/');
        if (!isPackagePath && !isNpmPath) {
            fail(`demo 的 ${tag} 路径 "${path}" 应该指向 npm 包（animal-island-wx/...）`);
        }
        if (!usedTags.has(tag)) warn(`demo 注册了 ${tag} 但页面没有用到`);
    }

    if (!/@import\s+['"]\.\/miniprogram_npm\/animal-island-wx\/common\/style\/tokens\.wxss['"]/.test(read(join(demoDir, 'app.wxss')))) {
        fail('demo/app.wxss 没有引入 tokens.wxss，CSS 变量不会生效');
    }
}

/* ---------- 产物 ---------- */
if (existsSync(join(root, 'miniprogram_dist'))) {
    for (const name of components) {
        for (const ext of ['index.js', 'index.json', 'index.wxml', 'index.wxss']) {
            if (!existsSync(join(root, 'miniprogram_dist', name, ext))) {
                fail(`产物 miniprogram_dist/${name}/${ext} 缺失，请先 npm run build`);
            }
        }
    }
}

/* ============================================================
 * 输出
 * ============================================================ */
console.log(`检查组件 ${components.length} 个：${components.join(', ')}`);
console.log(`图标 ${iconNames.length} 个`);

if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} 条提醒`);
    for (const message of warnings) console.log(`  - ${message}`);
}

if (errors.length) {
    console.error(`\n✗ ${errors.length} 个问题`);
    for (const message of errors) console.error(`  - ${message}`);
    process.exit(1);
}

console.log('\n✓ 全部检查通过');
