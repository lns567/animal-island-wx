/**
 * 包入口：只为 `require('animal-island-wx')` 场景提供版本号与图标清单。
 * 小程序组件本身通过 usingComponents 的文件路径引用，不经过这个入口。
 */
export { ICON_NAMES } from './common/icons';
export type { IconName } from './common/icons';

export const VERSION = '0.1.0';
