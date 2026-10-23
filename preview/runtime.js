/**
 * 极简 WXML / WXSS / 小程序组件运行时（仅供预览与视觉回归，不参与小程序打包）
 *
 * 它做四件事：
 *   1. 用真正的 <custom-element> + Shadow DOM 模拟小程序自定义组件的样式隔离；
 *   2. 执行 miniprogram_dist 下各组件的 index.js（真实编译产物），提供 Component / wx / setData / observers /
 *      lifetimes / createSelectorQuery 的最小实现，所以 cls 计算等逻辑是真跑的；
 *   3. 解释 WXML 子集：{{}}、wx:if / wx:elif / wx:else、wx:for、block、slot、bind* / catch*；
 *   4. 把 WXSS（含 @import）注入 shadow root：
 *      :host 天然对齐；view / text / image / button / input 这些标签名原样保留，选择器可直接复用。
 *
 * 已知近似（这些都不影响组件库本身，只影响预览观感）：
 *   - 没有 hover，hover-class 用 pointerdown/up 模拟按下态；
 *   - <input> 是原生 input，placeholder-class 用全局 ::placeholder 规则近似；
 *   - <image mode="aspectFill"> 映射为 <img style=object-fit:cover>；
 *   - 只支持 wx.getWindowInfo / createSelectorQuery 这两个 API。
 */
(function () {
    const MP = window.__MP__;
    if (!MP) return;

    window.__MP_ERRORS__ = [];
    window.addEventListener('error', (event) => {
        // 带上调用栈，预览页排查时才知道是哪个组件/哪一行炸的
        const stack = event.error && event.error.stack ? ` @ ${String(event.error.stack).split('\n')[1] || ''}` : '';
        window.__MP_ERRORS__.push(String(event.message || event.error) + stack);
    });
    window.addEventListener('unhandledrejection', (event) => {
        window.__MP_ERRORS__.push('unhandled: ' + String(event.reason && event.reason.message ? event.reason.message : event.reason));
    });

    /* ============================================================
     * 一、工具
     * ============================================================ */
    const COMPONENT_NAMES = Object.keys(MP.components);
    const COMPONENT_SET = new Set(COMPONENT_NAMES);

    const camelize = (name) => name.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());

    function evalExpr(expr, scope) {
        try {
            // eslint-disable-next-line no-new-func
            return new Function('__scope', `with (__scope) { return (${expr}); }`)(scope);
        } catch (error) {
            return undefined;
        }
    }

    function interpolate(text, scope) {
        if (!text || text.indexOf('{{') === -1) return text;
        return text.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
            const value = evalExpr(expr, scope);
            if (value === undefined || value === null) return '';
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
        });
    }

    function evalAttr(text, scope) {
        // 只有「整段就是一个 {{...}}」时保留原始类型（数组 / 布尔），否则按字符串插值
        const trimmed = text.trim();
        if (
            trimmed.startsWith('{{') &&
            trimmed.endsWith('}}') &&
            trimmed.indexOf('}}') === trimmed.length - 2
        ) {
            return evalExpr(trimmed.slice(2, -2), scope);
        }
        return interpolate(text, scope);
    }

    /** WXML 不是严格 XML：把 {{}} 里的 & < > 转义掉才能用 DOMParser */
    function escapeMustache(wxml) {
        const MUSTACHE = /\{\{[\s\S]*?\}\}/g;
        const VALUELESS = /(\s(?:wx:else|disabled|hidden|checked|selected|readonly|autofocus))(?=[\s/>])/g;
        const escapeBlock = (block) =>
            block
                .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

        // 无值属性（wx:else 等）只能在没有被 {{}} 包裹的地方补 =""，
        // 否则会把插值里的变量名（如 `|| disabled ?`）改成 disabled=""
        let out = '';
        let last = 0;
        let match = MUSTACHE.exec(wxml);
        while (match !== null) {
            out += wxml.slice(last, match.index).replace(VALUELESS, '$1=""');
            out += escapeBlock(match[0]);
            last = match.index + match[0].length;
            match = MUSTACHE.exec(wxml);
        }
        out += wxml.slice(last).replace(VALUELESS, '$1=""');
        return out;
    }

    const templateCache = new Map();
    function parseWxml(text) {
        if (templateCache.has(text)) return templateCache.get(text);
        // XML 解析器要求前缀已绑定命名空间，这里把 WXML 用到的前缀都声明上
        const doc = new DOMParser().parseFromString(
            `<root xmlns:wx="urn:wx" xmlns:bind="urn:bind" xmlns:catch="urn:catch">${escapeMustache(text)}</root>`,
            'application/xml'
        );
        const error = doc.querySelector('parsererror');
        if (error) throw new Error(`WXML 解析失败：${error.textContent}`);
        templateCache.set(text, doc.documentElement);
        return doc.documentElement;
    }

    /* ============================================================
     * 二、wx / Component 运行时垫片
     * ============================================================ */
    /*
     * 真机上 wx 是全局对象。组件代码通过 new Function 的参数拿到它，
     * 但页面方法是用 restoreMethod 在全局作用域还原的（见下），
     * 那里只能查全局，所以这里补一个 window.wx。
     */
    const wx = {
        getWindowInfo() {
            return { windowWidth: window.innerWidth, windowHeight: window.innerHeight, pixelRatio: window.devicePixelRatio || 1 };
        },
        getSystemInfoSync() {
            return this.getWindowInfo();
        },
        showToast() {},
        showModal(options) {
            // 预览里不弹原生弹窗，直接当成「用户点了确定」，方便冒烟
            if (options && typeof options.success === 'function') options.success({ confirm: true, cancel: false });
        },
        nextTick(fn) {
            Promise.resolve().then(fn);
        },
        setClipboardData(options) {
            if (options && typeof options.success === 'function') options.success();
            if (options && typeof options.complete === 'function') options.complete();
        },
        pageScrollTo(options) {
            window.scrollTo({ top: (options && options.scrollTop) || 0, behavior: 'smooth' });
            if (options && typeof options.success === 'function') options.success();
        },
        previewImage() {},
        vibrateShort() {},
        chooseMedia(options) {
            if (options && typeof options.fail === 'function') options.fail({ errMsg: 'preview: chooseMedia 不可用' });
        },
        chooseMessageFile(options) {
            if (options && typeof options.fail === 'function') options.fail({ errMsg: 'preview: chooseMessageFile 不可用' });
        },
        uploadFile(options) {
            if (options && typeof options.fail === 'function') options.fail({ errMsg: 'preview: uploadFile 不可用' });
            return { onProgressUpdate() {}, abort() {} };
        },
        getStorageSync() {
            return '';
        },
        setStorageSync() {},
    };

    // 真机上 wx 是全局对象，页面方法（在全局作用域还原）只能查全局
    window.wx = wx;

    /** 每个标签名对应一个定义（Component({...}) 捕获而来） */
    const registry = {};

    /** 共享模块（common/icons 等）的 CommonJS 缓存 */
    const moduleCache = {};

    function resolveModule(fromTag, spec) {
        // '../common/icons' / './util' → 归一化成 'common/icons'
        const base = spec.startsWith('.') ? fromTag.split('/').slice(0, -1) : [];
        const parts = base.concat(spec.split('/'));
        const stack = [];
        for (const part of parts) {
            if (part === '..') stack.pop();
            else if (part !== '.' && part !== '') stack.push(part);
        }
        return stack.join('/');
    }

    function loadModule(key) {
        if (moduleCache[key]) return moduleCache[key].exports;
        const code = (MP.modules || {})[key];
        const module = { exports: {} };
        moduleCache[key] = module;
        if (!code) return module.exports;
        // eslint-disable-next-line no-new-func
        new Function('module', 'exports', 'require', code)(module, module.exports, (spec) => loadModule(resolveModule(key, spec)));
        return module.exports;
    }

    function loadComponent(tag, jsCode) {
        let definition = null;
        const Component = (definition_) => {
            definition = definition_;
        };
        const module = { exports: {} };
        // eslint-disable-next-line no-new-func
        const fn = new Function(
            'Component',
            'wx',
            'module',
            'exports',
            'require',
            'getApp',
            'getCurrentPages',
            `${jsCode}\n`
        );
        fn(
            Component,
            wx,
            module,
            module.exports,
            (spec) => loadModule(resolveModule(tag, spec)),
            () => ({}),
            () => []
        );
        if (!definition) throw new Error(`${tag}: 未调用 Component()`);
        registry[tag] = definition;
    }

    /** 把属性值按小程序 properties 的类型声明转换 */
    function coerce(type, value) {
        if (value === undefined) return undefined;
        if (type === String) return value === null ? '' : String(value);
        if (type === Number) return Number(value);
        if (type === Boolean) return Boolean(value);
        if (type === Array) return Array.isArray(value) ? value : [];
        if (type === Object) return value && typeof value === 'object' ? value : {};
        return value;
    }

    /* ============================================================
     * 三、组件实例
     * ============================================================ */
    let uid = 0;

    class MPInstance {
        constructor(tag, definition, host) {
            this.id = ++uid;
            this.is = tag;
            this.__definition = definition;
            this.__host = host;
            this.__shadow = host.attachShadow({ mode: 'open' });
            this.__scope = null; // 页面/父组件实例（this.selectComponent 等暂不需要）
            this.__handlers = {};
            this.data = {};
            this.properties = {};

            const properties = definition.properties || {};
            for (const key of Object.keys(properties)) {
                const option = properties[key];
                const value = option && typeof option === 'object' && 'value' in option ? option.value : defaultFor(option && option.type);
                this.properties[key] = value;
                this.data[key] = value;
            }
            Object.assign(this.data, definition.data || {});
            // 方法挂到实例上，WXML 里的 bindtap="handleTap" 才能按名字找到
            const methods = definition.methods || {};
            for (const key of Object.keys(methods)) {
                this[key] = methods[key].bind(this);
                this.__handlers[key] = this[key];
            }
            // 顶层的方法（某些老写法）兼容
            for (const key of Object.keys(definition)) {
                if (typeof definition[key] === 'function') {
                    this[key] = definition[key].bind(this);
                    this.__handlers[key] = this[key];
                }
            }
        }

        setData(patch, callback) {
            for (const key of Object.keys(patch || {})) {
                this.data[key] = patch[key];
            }
            this.__scheduleRender();
            if (typeof callback === 'function') Promise.resolve().then(() => callback.call(this));
        }

        triggerEvent(name, detail = {}) {
            this.__host.dispatchEvent(
                new CustomEvent(name, { detail, bubbles: true, composed: true })
            );
        }

        createSelectorQuery() {
            const shadow = this.__shadow;
            let selector = '';
            return {
                in() {
                    return this;
                },
                select(sel) {
                    selector = sel;
                    return this;
                },
                selectAll(sel) {
                    selector = sel;
                    return this;
                },
                boundingClientRect(cb) {
                    this.__cb = cb;
                    return this;
                },
                exec(cb) {
                    const element = shadow.querySelector(selector);
                    const dom = element ? element.getBoundingClientRect() : null;
                    // 真机 API 的节点信息对象里有这些字段，这里补齐，让组件的取值逻辑能跑通
                    const result = dom
                        ? {
                              left: dom.left,
                              right: dom.right,
                              top: dom.top,
                              bottom: dom.bottom,
                              width: dom.width,
                              height: dom.height,
                          }
                        : null;
                    // boundingClientRect(cb) 的回调直接拿到节点信息；exec(cb) 的回调拿到数组
                    if (this.__cb) this.__cb(result);
                    if (cb) cb([result]);
                    return this;
                },
            };
        }

        __applyProps(incoming) {
            const properties = this.__definition.properties || {};
            const changed = {};
            for (const key of Object.keys(incoming)) {
                if (!(key in properties)) continue;
                const next = coerce(properties[key] && properties[key].type, incoming[key]);
                if (next === undefined) continue;
                if (this.data[key] !== next) changed[key] = next;
                this.data[key] = next;
                this.properties[key] = next;
            }
            this.__runObservers(changed);
            return changed;
        }

        __runObservers(changed) {
            const observers = this.__definition.observers || {};
            for (const key of Object.keys(observers)) {
                const keys = key.split(',').map((item) => item.trim());
                const hit = keys.some((item) => item in changed);
                if (!hit) continue;
                observers[key].apply(this, keys.map((item) => this.data[item]));
            }
        }

        __scheduleRender() {
            if (this.__renderQueued) return;
            this.__renderQueued = true;
            Promise.resolve().then(() => {
                this.__renderQueued = false;
                this.__render();
            });
        }

        __render() {
            const wxss = MP.components[this.is].wxss || '';
            const scope = Object.create(null);
            Object.assign(scope, this.data);
            scope.__component = this;

            const tree = parseWxml(MP.components[this.is].wxml);
            const fragment = document.createDocumentFragment();
            renderNodes(fragment, tree.childNodes, scope, { instance: this, host: this.__host });

            this.__shadow.innerHTML = '';
            const style = document.createElement('style');
            style.textContent = wxss;
            this.__shadow.appendChild(style);
            this.__shadow.appendChild(fragment);
        }

        __attached() {
            const lifetimes = this.__definition.lifetimes || {};
            if (lifetimes.attached) lifetimes.attached.call(this);
        }

        __ready() {
            const lifetimes = this.__definition.lifetimes || {};
            if (lifetimes.ready) lifetimes.ready.call(this);
        }

        __detached() {
            const definition = this.__definition || {};
            const detached = (definition.lifetimes && definition.lifetimes.detached) || definition.detached;
            if (typeof detached === 'function') detached.call(this);
        }
    }

    function defaultFor(type) {
        if (type === String) return '';
        if (type === Number) return 0;
        if (type === Boolean) return false;
        if (type === Array) return [];
        if (type === Object) return null;
        return null;
    }

    /* ============================================================
     * 四、渲染：WXML 子集解释器
     * ============================================================ */
    const EVENT_MAP = {
        tap: 'click',
        click: 'click',
        longpress: 'contextmenu',
        input: 'input',
        change: 'change',
        focus: 'focus',
        blur: 'blur',
        confirm: 'keydown',
        close: 'click',
        more: 'click',
        error: 'error',
    };

    function eventNameFromAttr(attrName) {
        const matched = /^(?:bind|catch):?([a-zA-Z-]+)$/.exec(attrName);
        if (!matched) return null;
        return { name: matched[1], catch: attrName.startsWith('catch') };
    }

    function bindEvents(element, el, scope, ctx, isNativeTag) {
        for (const attr of Array.from(el.attributes)) {
            const parsed = eventNameFromAttr(attr.name);
            if (!parsed) continue;
            const handlerName = interpolate(attr.value, scope);
            const domEvent = EVENT_MAP[parsed.name] || parsed.name;
            const isConfirm = parsed.name === 'confirm';

            const listener = (event) => {
                if (isConfirm && event.type === 'keydown' && event.key !== 'Enter') return;
                if (parsed.catch && event.stopPropagation) event.stopPropagation();
                const handler = ctx.instance.__handlers[handlerName];
                if (!handler) return;
                const detail = event.detail !== undefined ? event.detail : { value: event.target && event.target.value };
                handler({
                    type: parsed.name,
                    detail,
                    target: { dataset: { ...element.dataset } },
                    currentTarget: { dataset: { ...element.dataset } },
                    __event: event,
                });
            };

            // change 在原生 input 上取 blur，模拟小程序 input 的 change 语义
            if (isNativeTag && parsed.name === 'input') {
                element.addEventListener('input', listener);
            } else if (isNativeTag && parsed.name === 'change') {
                element.addEventListener('change', listener);
                element.addEventListener('blur', (event) => {
                    listener({ ...event, detail: { value: element.value }, type: 'change' });
                });
            } else {
                element.addEventListener(domEvent, listener, { passive: parsed.name !== 'confirm' });
            }
        }
    }

    function applyHover(element, el, scope) {
        const hoverClass = el.getAttribute('hover-class');
        if (!hoverClass) return;
        const resolved = interpolate(hoverClass, scope);
        if (!resolved || resolved === 'none' || resolved.indexOf('{{') !== -1) return;
        for (const name of resolved.split(/\s+/).filter(Boolean)) {
            element.addEventListener('pointerdown', () => element.classList.add(name));
            element.addEventListener('pointerup', () => element.classList.remove(name));
            element.addEventListener('pointercancel', () => element.classList.remove(name));
            element.addEventListener('pointerleave', () => element.classList.remove(name));
        }
    }

    function renderNodes(parent, nodes, scope, ctx) {
        let branchTaken = false;
        for (const node of Array.from(nodes)) {
            if (node.nodeType === 3) {
                parent.appendChild(document.createTextNode(interpolate(node.nodeValue, scope)));
                continue;
            }
            if (node.nodeType === 8) continue;
            if (node.nodeType !== 1) continue;

            const el = node;

            // wx:for
            if (el.hasAttribute('wx:for')) {
                const list = evalAttr(el.getAttribute('wx:for'), scope);
                const itemName = el.getAttribute('wx:for-item') || 'item';
                const indexName = el.getAttribute('wx:for-index') || 'index';
                const clone = el.cloneNode(true);
                clone.removeAttribute('wx:for');
                const array = Array.isArray(list) ? list : typeof list === 'number' ? Array.from({ length: list }, (_, i) => i) : [];
                array.forEach((item, index) => {
                    const childScope = Object.create(scope);
                    childScope[itemName] = item;
                    childScope[indexName] = index;
                    renderNode(clone, parent, childScope, ctx);
                });
                branchTaken = false;
                continue;
            }

            // wx:if / wx:elif / wx:else
            if (el.hasAttribute('wx:if')) {
                branchTaken = Boolean(evalAttr(el.getAttribute('wx:if'), scope));
                if (branchTaken) renderNode(el, parent, scope, ctx);
                continue;
            }
            if (el.hasAttribute('wx:elif')) {
                if (branchTaken) continue;
                branchTaken = Boolean(evalAttr(el.getAttribute('wx:elif'), scope));
                if (branchTaken) renderNode(el, parent, scope, ctx);
                continue;
            }
            if (el.hasAttribute('wx:else')) {
                if (!branchTaken) renderNode(el, parent, scope, ctx);
                branchTaken = false;
                continue;
            }

            branchTaken = false;
            renderNode(el, parent, scope, ctx);
        }
    }

    function renderNode(el, parent, scope, ctx) {
        const tag = el.tagName.toLowerCase();

        if (tag === 'block') {
            renderNodes(parent, el.childNodes, scope, ctx);
            return;
        }

        if (tag === 'slot') {
            const slot = document.createElement('slot');
            const name = el.getAttribute('name');
            if (name) slot.setAttribute('name', name);
            parent.appendChild(slot);
            return;
        }

        const isComponent = COMPONENT_SET.has(tag);
        const isInput = tag === 'input';
        const isImage = tag === 'image';
        let element;

        if (isInput) element = document.createElement('input');
        else if (isImage) element = document.createElement('img');
        else element = document.createElement(tag);

        if (isInput) element.setAttribute('type', 'text');

        // 属性
        const props = {};
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name;
            if (name === 'wx:if' || name === 'wx:elif' || name === 'wx:else' || name === 'wx:for' || name === 'wx:key') continue;
            if (name === 'wx:for-item' || name === 'wx:for-index') continue;
            if (name.startsWith('bind') || name.startsWith('catch')) continue;
            if (name === 'hover-class' || name === 'hover-start-time' || name === 'hover-stay-time') continue;

            const value = evalAttr(attr.value, scope);

            // data-* → dataset
            if (name.startsWith('data-')) {
                element.dataset[camelize(name.slice(5))] = value;
                continue;
            }

            if (isComponent) {
                const definition = registry[tag] || {};
                const propertyName = camelize(name);
                const declared = (definition.properties || {})[propertyName];
                if (declared) {
                    props[propertyName] = value;
                    continue;
                }
                if (name === 'class') {
                    element.setAttribute('class', value);
                    continue;
                }
                if (name === 'style') {
                    element.setAttribute('style', value);
                    continue;
                }
                if (value === true) element.setAttribute(name, '');
                else if (value !== false && value !== undefined) element.setAttribute(name, String(value));
                continue;
            }

            if (isInput) {
                if (name === 'value') element.value = value === undefined || value === null ? '' : value;
                else if (name === 'password') {
                    if (value) element.setAttribute('type', 'password');
                } else if (name === 'placeholder-class' || name === 'placeholder-style' || name === 'confirm-type') {
                    if (name === 'placeholder-style' && value) element.setAttribute('style', value);
                } else if (name === 'focus') {
                    /* 预览不抢焦点 */
                } else if (value === true) element.setAttribute(name, '');
                else if (value !== false && value !== undefined && value !== null) element.setAttribute(name, String(value));
                continue;
            }

            if (isImage) {
                if (name === 'src') element.setAttribute('src', value);
                else if (name === 'class') element.setAttribute('class', value);
                else if (name === 'mode') {
                    if (value === 'aspectFill') element.style.objectFit = 'cover';
                    if (value === 'aspectFit') element.style.objectFit = 'contain';
                    if (value === 'widthFix') element.style.height = 'auto';
                } else if (name === 'style') element.setAttribute('style', value);
                continue;
            }

            if (name === 'class') element.setAttribute('class', value);
            else if (name === 'style') element.setAttribute('style', value);
            else if (value === true) element.setAttribute(name, '');
            else if (value !== false && value !== undefined && value !== null) element.setAttribute(name, String(value));
        }

        // 事件
        bindEvents(element, el, scope, ctx, isInput || tag === 'button');
        applyHover(element, el, scope);

        // 子节点（自定义组件的子节点是 light DOM，会被 slot 投影）
        renderNodes(element, el.childNodes, scope, ctx);

        parent.appendChild(element);

        if (isComponent) mountComponent(tag, element, props);
    }

    /* ============================================================
     * 五、组件挂载
     * ============================================================ */
    /** 当前存活的自定义组件实例：重渲染前统一走 detached，否则定时器会越积越多 */
    const liveInstances = new Set();

    function mountComponent(tag, element, props) {
        const definition = registry[tag];
        if (!definition) return;
        const instance = new MPInstance(tag, definition, element);
        element.__instance = instance;
        liveInstances.add(instance);
        instance.__applyProps(props);
        instance.__attached();
        instance.__render();
        Promise.resolve().then(() => instance.__ready());
        instance.__scheduleRender();
    }

    /** 重渲染会清空页面 DOM，等价于真机上的组件销毁，必须补一次 detached */
    function teardownComponents() {
        for (const instance of liveInstances) {
            try {
                instance.__detached();
            } catch (error) {
                window.__MP_ERRORS__.push(`detached: ${error && error.message}`);
            }
        }
        liveInstances.clear();
    }

    /* ============================================================
     * 六、启动
     * ============================================================ */
    /**
     * 页面方法在 payload 里是源码字符串（JSON 传不了函数），这里还原成函数。
     * 方法简写 `onLoad() {}` 不是合法表达式，所以包一层对象字面量再取出来。
     */
    function restoreMethod(source, name) {
        if (typeof source === 'function') return source;
        try {
            return new Function(`return ({ ${source} })[${JSON.stringify(name)}];`)();
        } catch (error) {
            (window.__MP_ERRORS__ = window.__MP_ERRORS__ || []).push(`页面方法 ${name} 还原失败：${error.message}`);
            return function noop() {};
        }
    }

    function boot() {
        // 1. 逐个执行组件 JS（真实编译产物）
        for (const tag of COMPONENT_NAMES) {
            const item = MP.components[tag];
            loadComponent(tag, item.js);
        }

        // 2. 把 page 级 WXSS 注入 document
        const pageStyle = document.createElement('style');
        pageStyle.textContent = MP.page.wxss || '';
        document.head.appendChild(pageStyle);

        // 3. 渲染页面
        const page = document.createElement('page');
        page.className = 'page-root';
        document.body.appendChild(page);

        const pageInstance = {
            data: { ...(MP.page.data || {}) },
            setData(patch, callback) {
                Object.assign(this.data, patch);
                rerender();
                if (typeof callback === 'function') Promise.resolve().then(() => callback.call(this));
            },
            triggerEvent() {},
            __handlers: {},
        };
        for (const key of Object.keys(MP.page.methods || {})) {
            pageInstance.__handlers[key] = restoreMethod(MP.page.methods[key], key).bind(pageInstance);
        }

        function rerender() {
            // 先销毁上一轮实例再建新的：组件内部的定时器/监听会随 detached 一起清掉
            teardownComponents();
            const scope = Object.create(null);
            Object.assign(scope, pageInstance.data);
            const tree = parseWxml(MP.page.wxml);
            const fragment = document.createDocumentFragment();
            renderNodes(fragment, tree.childNodes, scope, { instance: pageInstance, host: page });
            page.innerHTML = '';
            page.appendChild(fragment);
        }

        rerender();

        /*
         * 页面生命周期：小程序里 onLoad 在首次渲染后、onShow 之前执行，
         * 且 onLoad 里 setData 是常见写法（比如按当前日期生成演示数据）。
         * 之前没调 onLoad，导致「页面数据里算出来的初始值」在预览里永远是空的。
         * 注意页面方法在运行时里挂在 __handlers 上，不是实例属性。
         */
        for (const name of ['onLoad', 'onShow']) {
            const handler = pageInstance.__handlers[name];
            if (typeof handler !== 'function') continue;
            try {
                handler(name === 'onLoad' ? {} : undefined);
            } catch (error) {
                (window.__MP_ERRORS__ = window.__MP_ERRORS__ || []).push(`${name}: ${error && error.message}`);
            }
        }
        rerender();

        window.__MP_READY__ = true;
        // 调试钩子：在控制台里可以直接看页面实例的 data / 方法
        window.__MP_PAGE__ = pageInstance;
        document.documentElement.setAttribute('data-preview-ready', '1');
    }

    boot();
})();
