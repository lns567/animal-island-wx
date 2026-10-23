/**
 * ai-upload —— 文件上传
 *
 * 与 Web 版 Upload 的差异（详见 docs/migration-from-react.md）：
 * - **拖拽做不了**（小程序没有 drop 事件），`drag` 属性去掉，改成点击选择
 * - `accept` 改成小程序语义：`image` / `video` / `all` / `file`
 *   - image / video → `wx.chooseMedia`
 *   - all / file → `wx.chooseMessageFile`（从聊天记录选文件，这是小程序唯一的通用文件入口）
 * - `action` 用 `wx.uploadFile` 上传，进度来自 `UploadTask.onProgressUpdate`；
 *   `method` 只能是 POST（`wx.uploadFile` 限制），所以该属性去掉
 * - `beforeUpload` / `customRequest` 都是函数，WXML 传不进来，改成 `bind:beforeupload`
 *   事件 + `return false` 拦不住的现实：**默认都不拦**，需要拦截请在页面里删 fileList
 * - 上传进度条用自绘（复用 ai-progress 会多一层组件开销，进度条本身只有几行 CSS）
 * - 预览用 `wx.previewImage`（仅图片）
 */

interface UploadFileItem {
    uid: string;
    name: string;
    size: number;
    status: 'uploading' | 'done' | 'error';
    percent: number;
    url: string;
    thumbUrl: string;
    isImage: boolean;
    error: string;
}

interface UploadSelf {
    __tasks?: Array<{ abort: () => void }>;
    __seq?: number;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 上传地址；为空时只做本地选择（不真上传，直接标记 done） */
        action: {
            type: String,
            value: '',
        },
        /** 文件字段名 */
        name: {
            type: String,
            value: 'file',
        },
        /** 选择类型：image / video / all / file */
        accept: {
            type: String,
            value: 'image',
        },
        /** 是否多选 */
        multiple: {
            type: Boolean,
            value: false,
        },
        /** 最多文件数：1 表示替换，>1 表示超出丢弃，0/负数不限 */
        maxCount: {
            type: Number,
            value: 0,
        },
        /** 禁用 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 列表形态：text / picture / picture-card */
        listType: {
            type: String,
            value: 'text',
        },
        /** 是否展示文件列表 */
        showUploadList: {
            type: Boolean,
            value: true,
        },
        /** 触发区下方提示文字 */
        tip: {
            type: String,
            value: '',
        },
        /** 触发区文案 */
        text: {
            type: String,
            value: '点击上传',
        },
        /** 默认文件列表（非受控初始值） */
        defaultFileList: {
            type: Array,
            value: [] as UploadFileItem[],
        },
        /** 附加表单字段 */
        formData: {
            type: Object,
            value: {},
        },
        /** 请求头 */
        headers: {
            type: Object,
            value: {},
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        fileList: [] as UploadFileItem[],
    },

    observers: {
        defaultFileList(list: UploadFileItem[]) {
            if (this.data.fileList.length) return;
            if (Array.isArray(list) && list.length) this.setData({ fileList: list.slice() });
        },
    },

    lifetimes: {
        attached() {
            this.setData({ fileList: ((this.data.defaultFileList || []) as UploadFileItem[]).slice() });
        },
        detached() {
            const self = this as unknown as UploadSelf;
            (self.__tasks || []).forEach((task) => {
                try {
                    task.abort();
                } catch (error) {
                    // 任务可能已经结束，忽略
                }
            });
            self.__tasks = [];
        },
    },

    methods: {
        nextUid(): string {
            const self = this as unknown as UploadSelf;
            self.__seq = (self.__seq || 0) + 1;
            return `upload-${Date.now()}-${self.__seq}`;
        },

        trackTask(task: { abort: () => void }) {
            const self = this as unknown as UploadSelf;
            self.__tasks = self.__tasks || [];
            self.__tasks.push(task);
        },

        handleChoose() {
            if (this.data.disabled) return;

            const accept = this.data.accept || 'image';
            if (accept === 'image' || accept === 'video') {
                wx.chooseMedia({
                    count: this.data.multiple ? 9 : 1,
                    mediaType: accept === 'video' ? ['video'] : ['image'],
                    sizeType: ['original', 'compressed'],
                    sourceType: ['album', 'camera'],
                    success: (res) => {
                        const files = (res.tempFiles || []).map((item: { tempFilePath: string; size?: number }) => ({
                            path: item.tempFilePath,
                            name: basename(item.tempFilePath),
                            size: item.size || 0,
                            isImage: accept === 'image',
                        }));
                        this.addFiles(files);
                    },
                });
                return;
            }

            wx.chooseMessageFile({
                count: this.data.multiple ? 9 : 1,
                type: 'all',
                success: (res) => {
                    const files = (res.tempFiles || []).map((item: { path: string; name: string; size: number }) => ({
                        path: item.path,
                        name: item.name || basename(item.path),
                        size: item.size || 0,
                        isImage: IMAGE_EXT.test(item.name || item.path),
                    }));
                    this.addFiles(files);
                },
            });
        },

        addFiles(files: Array<{ path: string; name: string; size: number; isImage: boolean }>) {
            if (!files.length) return;

            const maxCount = Number(this.data.maxCount) || 0;
            let list = this.data.fileList.slice();

            const added: UploadFileItem[] = files.map((file) => ({
                uid: this.nextUid(),
                name: file.name,
                size: file.size,
                status: 'uploading' as const,
                percent: 0,
                url: '',
                thumbUrl: file.path,
                isImage: file.isImage,
                error: '',
            }));

            const tasks: Array<{ path: string; item: UploadFileItem }> = [];

            if (maxCount === 1) {
                // 替换语义：只保留最后选中的那个
                list = [added[added.length - 1]];
                tasks.push({ path: files[files.length - 1].path, item: added[added.length - 1] });
            } else if (maxCount > 1) {
                const room = Math.max(0, maxCount - list.length);
                if (room === 0) {
                    this.triggerEvent('exceed', { files: added, fileList: list });
                    return;
                }
                added.slice(0, room).forEach((item, index) => {
                    list.push(item);
                    tasks.push({ path: files[index].path, item });
                });
            } else {
                added.forEach((item, index) => {
                    list.push(item);
                    tasks.push({ path: files[index].path, item });
                });
            }

            this.setData({ fileList: list });
            this.emitChange(tasks.length ? tasks[0].item : null);

            tasks.forEach((task) => this.startUpload(task.path, task.item.uid));
        },

        startUpload(path: string, uid: string) {
            const action = this.data.action;
            if (!action) {
                // 没配 action：只做本地选择，直接标记完成
                this.patch(uid, { status: 'done', percent: 100, url: path });
                return;
            }

            const task = wx.uploadFile({
                url: action,
                filePath: path,
                name: this.data.name || 'file',
                header: (this.data.headers || {}) as Record<string, string>,
                formData: (this.data.formData || {}) as Record<string, string>,
                success: (res) => {
                    const ok = res.statusCode >= 200 && res.statusCode < 300;
                    this.patch(uid, {
                        status: ok ? 'done' : 'error',
                        percent: 100,
                        url: ok ? path : '',
                        error: ok ? '' : `HTTP ${res.statusCode}`,
                    });
                },
                fail: (error) => {
                    this.patch(uid, { status: 'error', error: (error && error.errMsg) || '上传失败' });
                },
            });

            if (task && task.onProgressUpdate) {
                task.onProgressUpdate((res) => {
                    this.patch(uid, { percent: res.progress });
                });
            }
            if (task) this.trackTask(task);
        },

        patch(uid: string, patch: Partial<UploadFileItem>) {
            const list = this.data.fileList.map((item) => (item.uid === uid ? { ...item, ...patch } : item));
            this.setData({ fileList: list });
            this.emitChange(list.filter((item) => item.uid === uid)[0] || null);
        },

        emitChange(file: UploadFileItem | null) {
            this.triggerEvent('change', { file, fileList: this.data.fileList });
        },

        handleRemove(event: WechatMiniprogram.TouchEvent) {
            if (this.data.disabled) return;
            const uid = String(event.currentTarget.dataset.uid || '');
            const removed = this.data.fileList.filter((item) => item.uid === uid)[0] || null;
            const list = this.data.fileList.filter((item) => item.uid !== uid);
            this.setData({ fileList: list });
            this.triggerEvent('change', { file: removed, fileList: list });
            if (removed) this.triggerEvent('remove', { file: removed });
        },

        handlePreview(event: WechatMiniprogram.TouchEvent) {
            const uid = String(event.currentTarget.dataset.uid || '');
            const file = this.data.fileList.filter((item) => item.uid === uid)[0];
            if (!file) return;

            this.triggerEvent('preview', { file });
            if (file.isImage && file.thumbUrl) {
                wx.previewImage({ current: file.thumbUrl, urls: [file.thumbUrl] });
            }
        },

        /** 供页面读取当前列表 */
        getFileList(): UploadFileItem[] {
            return this.data.fileList;
        },
    },
});

function basename(path: string): string {
    const parts = String(path).split(/[\\/]/);
    return parts[parts.length - 1] || 'file';
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
