/**
 * 从 vendor/icons/*.svg 生成：
 *   - src/common/icons.wxss  （每个图标一条 background-image 规则，base64 内联）
 *   - src/common/icons.ts    （图标名列表，供运行时校验与文档使用）
 *
 * 图标来源：naive-icons v1.2.0（MIT），见根目录 LICENSE 的第三方声明。
 * 为什么内联 base64：小程序 WXSS 的 background-image 不支持本地路径，只允许网络地址 / base64。
 * 需要新增图标时，把 svg 丢进 vendor/icons/ 再执行 `npm run icons`。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const iconsDir = join(root, 'vendor', 'icons');

/** 生成一个"浅色描边"变体：原版图标描边是深色，放在深色底上需要反白 */
const LIGHT_STROKE_VARIANTS = {
    donut: 'donut-light',
};

const minify = (svg) =>
    svg
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

const toDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

const names = [];
const rules = [];

for (const file of readdirSync(iconsDir).filter((f) => f.endsWith('.svg')).sort()) {
    const name = file.replace(/\.svg$/, '');
    const raw = minify(readFileSync(join(iconsDir, file), 'utf8'));
    names.push(name);
    rules.push(`.ai-icon--${name} { background-image: url("${toDataUri(raw)}"); }`);
}

// 浅色（反白）变体
for (const [src, variant] of Object.entries(LIGHT_STROKE_VARIANTS)) {
    const file = join(iconsDir, `${src}.svg`);
    const raw = minify(readFileSync(file, 'utf8')).replace(/#2A2A2A/g, '#ffffff');
    names.push(variant);
    rules.push(`.ai-icon--${variant} { background-image: url("${toDataUri(raw)}"); }`);
}

const header = `/* 本文件由 scripts/gen-icons.mjs 自动生成，请勿手改。
 * 图标来源：naive-icons v1.2.0（MIT License, Copyright (c) 2026 Naive Icons）
 */\n`;

writeFileSync(join(root, 'src', 'common', 'icons.wxss'), `${header}\n${rules.join('\n')}\n`, 'utf8');

writeFileSync(
    join(root, 'src', 'common', 'icons.ts'),
    `/* 本文件由 scripts/gen-icons.mjs 自动生成，请勿手改。 */
export const ICON_NAMES = ${JSON.stringify(names)} as const;

export type IconName = (typeof ICON_NAMES)[number];
`,
    'utf8'
);

console.log(`✓ icons: ${names.length} 个 → src/common/icons.wxss / icons.ts`);
