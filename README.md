# OpenShots

**简体中文** | [English](README.en.md)

几秒钟内，把普通截图变成精美、便于分享的图片。免费、开源，完全离线运行。

OpenShots 是基于 Tauri（Rust + React）构建的跨平台桌面应用。你可以在同一个应用中完成截图、添加背景、图形与文字标注、敏感信息模糊处理和导出，无需将图片上传到任何服务。

**原项目由 [TraceKit](https://github.com/Tracekit-Dev) 团队开发**，该团队也是 TraceKit APM 的开发者。

## 功能

**截图**

- 支持全屏、区域和指定窗口截图
- 支持自定义全局快捷键
- 通过系统托盘快速操作
- 支持延时截图、Retina 缩放和十字准星辅助截图
- 引导设置 macOS 屏幕录制权限

**美化**

- 支持渐变、纯色和自定义图片背景
- 可选用 macOS 系统壁纸
- 可调整留白、圆角和阴影
- 自动匹配内边框
- 支持多图编辑与扇形排版
- 支持窗口外框和设备样机外框

**标注**

- 箭头、矩形、椭圆、文字和表情
- 对话气泡、聚光灯遮罩和数字标记
- 通过模糊或马赛克隐藏敏感区域
- 支持拖动、缩放和旋转元素
- 完整的撤销与重做历史

**导出**

- 支持 PNG、JPEG、WebP 格式及画质调整
- 支持 1 倍、2 倍和 3 倍尺寸导出
- 一键复制到剪贴板
- 集成系统分享菜单
- 保存和应用可复用的样式预设
- 以 JSON 格式导入、导出预设
- 自动保存项目，并可重新打开最近编辑的内容

**自动化**

- 提供 CLI，支持批量处理、标注、隐私处理和导出
- 通过可选的 `--preset` 参数应用美化预设
- 支持创建、复制、编辑和查看预设
- 详见下方的 [CLI 使用说明](#cli-使用说明)

## 安装

下方下载链接来自上游 [TraceKit 仓库的发行版](https://github.com/Tracekit-Dev/openshots/releases)，不包含本仓库新增的修改。如需使用本仓库的修改版，请[从源码构建](#从源码构建)。

| 平台 | 下载 |
|------|------|
| macOS（Apple Silicon） | [.dmg](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_aarch64.dmg) |
| macOS（Intel） | [.dmg](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_x64.dmg) |
| Windows | [.msi](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_x64_en-US.msi) |
| Linux（AppImage） | [.AppImage](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_amd64.AppImage) |
| Linux（deb） | [.deb](https://github.com/Tracekit-Dev/openshots/releases/latest/download/OpenShots_2.0.4_amd64.deb) |

上游 macOS 发行版使用 Apple Developer ID 证书进行代码签名和公证。

## 从源码构建

**环境要求：**

- [Rust](https://rustup.rs/) 稳定版
- [Node.js](https://nodejs.org/) 20.19 及以上的 20.x 版本，或 22.12 及以上版本
- npm

```bash
# 克隆本仓库
git clone https://github.com/shanjin666666/openshots.git
cd openshots

# 安装依赖
npm install

# 启动开发模式
npx tauri dev

# 构建正式版本
npx tauri build
```

### 各平台说明

**macOS：** 截图需要屏幕录制权限，首次使用时应用会提示授权。

**Linux（Wayland）：** Wayland 下无法使用全局快捷键，请通过系统托盘触发截图。

**Windows：** 无特殊要求。

## 技术栈

- **Tauri 2.x**：Rust 后端与桌面应用框架
- **React 19 + TypeScript**：界面组件
- **Konva.js**：画布渲染引擎
- **Zustand**：状态管理，支持撤销与重做
- **Tailwind CSS v4**：界面样式
- **xcap**：跨平台截图

## 批量美化

打开**批量美化**，添加多张 PNG、JPEG、WebP 或 BMP 图片，再选择样式和输出文件夹。每张原图会分别生成一张 PNG 或高画质 JPEG。导出前可以预览任意图片，预览与完整尺寸导出使用相同的渲染流程。

- 与单图编辑共用内置和已保存的预设。应用预设时使用其中的画布尺寸、背景、留白、圆角、阴影、边框和外框，也可以直接沿用编辑器当前样式。
- 可保留原图像素尺寸并增加留白，也可以让所有图片适配统一尺寸的画布。支持九种位置和图片大小调整，不拉伸、不裁剪原图。
- 「原图比例」按每张上传图片的宽高比生成画布，留白放在画布内。单图编辑的画布尺寸中也可一键使用选中图片的原始比例；未选中图片时使用第一张。
- 默认使用「高清（自动）」：画布尺寸决定构图，实际导出像素按每张原图匹配，避免高分辨率图片被缩成预设尺寸。预览顶部显示实际输出像素；需要所有成品严格同尺寸时，选择 1x、2x 或 3x。
- 文件名为 `原文件名-styled.png`（或 `.jpg`），重名时自动添加数字后缀，不覆盖原图或已有文件。
- 图片按顺序处理，以控制内存占用。可在图片处理间隙停止、查看单张图片的失败原因，并重试失败项；停止后会保留已经导出的图片。
- 每张输出图片最多为 3200 万像素，单边不超过 8192 像素。在当前应用会话中切换页面时，会保留批量设置和已选择的图片。

验证命令：`npx vitest run src/lib/batch` 和 `cargo test --manifest-path src-tauri/Cargo.toml --lib commands::batch::tests`。

## 界面语言

打开**设置 → 语言**，即可在**简体中文**和 **English** 之间切换。切换立即生效，重启后保留选择，默认语言为简体中文。语言切换不会改变截图内容、项目名称、预设名称或快捷键。

前端文案位于 `src/lib/i18n/messages.ts`。使用 `t()` 获取文案，在显示文案的组件中使用 `useLocale()`。英文原文同时作为回退键。静态工具列表应在渲染时翻译，状态应保存为状态码，而不是翻译后的字符串。原生应用菜单和托盘菜单通过 `src-tauri/src/i18n.rs` 同步语言。

运行 `npx vitest run src/lib/i18n/i18n.test.ts` 检查语言层，运行 `npm run build` 检查前端构建。修改原生菜单后，还需要通过 `npx tauri dev` 在桌面应用中验证。

## 快捷键

| 操作 | macOS | Windows / Linux |
|------|-------|-----------------|
| 全屏截图 | `Cmd+Shift+4` | `Ctrl+Shift+4` |
| 区域截图 | `Cmd+Shift+3` | `Ctrl+Shift+3` |
| 窗口截图 | `Cmd+Shift+5` | `Ctrl+Shift+5` |
| 撤销 | `Cmd+Z` | `Ctrl+Z` |
| 重做 | `Cmd+Shift+Z` | `Ctrl+Shift+Z` |
| 删除所选元素 | `Delete` / `Backspace` | `Delete` / `Backspace` |
| 重置缩放 | `Cmd+0` | `Ctrl+0` |
| 切换工具 | `V` `A` `R` `E` `T` `M` `B` `P` | 相同 |

## CLI 使用说明

OpenShots 提供命令行工具 `openshots-cli`，用于批量处理和自动化。

### 安装 CLI

下列命令下载的是上游 TraceKit 发行版中的 CLI，不包含本仓库的修改。如需构建本仓库的 CLI，请运行 `cargo build --release --bin openshots-cli --manifest-path src-tauri/Cargo.toml`，生成的程序位于 `src-tauri/target/release/`。

**macOS（Apple Silicon）：**

```bash
curl -L https://github.com/Tracekit-Dev/openshots/releases/latest/download/openshots-cli-darwin-arm64 -o /usr/local/bin/openshots-cli && chmod +x /usr/local/bin/openshots-cli
```

**macOS（Intel）：**

```bash
curl -L https://github.com/Tracekit-Dev/openshots/releases/latest/download/openshots-cli-darwin-x64 -o /usr/local/bin/openshots-cli && chmod +x /usr/local/bin/openshots-cli
```

**Linux：**

```bash
curl -L https://github.com/Tracekit-Dev/openshots/releases/latest/download/openshots-cli-linux-x64 -o /usr/local/bin/openshots-cli && chmod +x /usr/local/bin/openshots-cli
```

**Windows（PowerShell）：**

```powershell
Invoke-WebRequest -Uri https://github.com/Tracekit-Dev/openshots/releases/latest/download/openshots-cli-windows-x64.exe -OutFile "$env:LOCALAPPDATA\openshots-cli.exe"
```

这些链接指向上游最新发行版。如需固定版本，请改用带版本标签的下载地址，例如：

```
https://github.com/Tracekit-Dev/openshots/releases/download/v2.0.4/openshots-cli-darwin-arm64
```

验证安装：

```bash
openshots-cli --version
```

### 预设

CLI 预设定义背景、留白、圆角、阴影和内边框等美化样式。OpenShots CLI 提供 7 套内置预设，用户预设保存在 `~/.openshots/presets.json`。

```bash
# 列出所有可用预设
openshots-cli list-presets

# 查看预设的完整配置
openshots-cli show-preset ocean

# 复制内置预设进行自定义
openshots-cli copy-preset ocean --new-name my-ocean

# 从头创建一个新预设
openshots-cli create-preset my-brand

# 使用 $EDITOR 指定的编辑器打开预设文件
openshots-cli edit-presets
```

### 美化图片

为一张或多张截图应用预设，添加背景、留白、圆角、阴影和内边框。

```bash
# 处理单张图片
openshots-cli beautify --preset ocean --input screenshot.png --output ./out --format png

# 使用通配符批量处理
openshots-cli beautify --preset clean-dark --input "screenshots/*.png" --output ./out --format png

# 导出为 WebP
openshots-cli beautify --preset vibrant-sunset --input shot.png --output ./out --format webp --quality 85
```

### 添加标注

向图片添加文字标注。使用 `--preset` 可以同时应用美化样式。

```bash
# 在原图上添加文字
openshots-cli annotate --input shot.png --output annotated.png \
  --text "Draft" --text-x 50 --text-y 50 --font-size 48 --color "#ff0000"

# 添加文字并应用预设
openshots-cli annotate --input shot.png --output styled.png \
  --text "v2.0" --text-x 20 --text-y 20 --font-size 32 --color "#ffffff" \
  --preset ocean
```

### 隐私处理

通过马赛克隐藏敏感区域。坐标格式为 `x,y,width,height`，多个区域之间用 `;` 分隔。

```bash
# 对一个区域添加马赛克
openshots-cli privacy --input shot.png --output redacted.png \
  --regions "100,100,300,200" --intensity 20

# 处理多个区域并应用预设
openshots-cli privacy --input shot.png --output styled.png \
  --regions "100,100,300,200;500,50,150,100" --intensity 25 \
  --preset clean-dark
```

### 导出

转换图片格式、调整画质或缩放尺寸。使用 `--preset` 可以在导出时应用美化样式。

```bash
# 将 PNG 转为 WebP
openshots-cli export --input shot.png --output shot.webp --format webp --quality 80

# 以 2 倍尺寸导出
openshots-cli export --input shot.png --output shot@2x.png --format png --scale 2

# 转换格式并应用美化样式
openshots-cli export --input shot.png --output styled.webp --format webp --quality 85 --preset ocean
```

### 渲染项目

将 `.openshots` 项目文件渲染为图片。

```bash
openshots-cli render --input project.openshots --output final.png --format png --quality 90
```

## 社区

欢迎加入 [TraceKit Discord](https://discord.gg/huSuJ94k)，提问、反馈或参与讨论。

## 参与贡献

开发环境配置和贡献指南请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)

---

<p align="center">
  原项目由 <a href="https://github.com/Tracekit-Dev">TraceKit</a> 开发
</p>
