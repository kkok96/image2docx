# 图片转 Word

纯前端工具 — 上传图片，生成排版精美的 Word 文档 (.docx)。

## 功能

- 上传多张图片（点击选择或拖拽）
- 拖拽排序图片顺序
- 每张图片可添加标题
- 支持纵向/横向 A4 页面
- 可设置图片宽度和对齐方式
- 每张图片单独一页或连续排版
- 一键生成并下载 Word 文档

## 使用方法

1. 打开 [在线版](https://你的用户名.github.io/image-to-word/) 或直接打开 `index.html`
2. 点击上传区域选择图片，或直接拖拽图片进入
3. 拖拽卡片左上角手柄调整图片顺序
4. 可选：为每张图片添加标题
5. 根据需要调整页面设置
6. 点击"生成 Word 文档并下载"

## 技术栈

- [docx.js](https://docx.js.org/) — 浏览器端生成 .docx 文件
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) — 触发文件下载
- [SortableJS](https://sortablejs.github.io/Sortable/) — 拖拽排序
- 纯 CDN 引入，零构建工具

## 部署到 GitHub Pages

1. 将项目文件夹推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. Source 选择 `main` 分支，目录选 `/ (root)`
4. 保存，等待部署完成
5. 访问 `https://你的用户名.github.io/仓库名/`
