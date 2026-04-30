# 极简翻译

<p align="center">
  <img src="./assets/logo.svg" alt="极简翻译 logo" width="220">
</p>

一个基于 Chrome Manifest V3 的网页划词翻译与朗读扩展。

[English Version](./README.en.md)

## 项目介绍

极简翻译是一个面向网页阅读场景的网页划词翻译与朗读扩展。用户在网页中选中单词或句子后，插件会优先在对应正文位置下直接插入译文，并支持 TTS 朗读和英文单词词典信息，适合阅读技术文档、资讯站点和跨语言内容。

## 作者信息

- Author: `rodin`
- Project: `极简翻译`
- Type: `Chrome Extension`
- Contact: `brendenaudrina6287@gmail.com`

## 版本信息

- Current version: `0.1.2`
- Status: `Active development`

## 主要能力

- 在任意网页中选中单词或句子后，默认在对应正文位置下方直接插入译文，并可直接播报原文
- 聚合多个翻译源，支持切换查看不同结果
- 支持 TTS 播报，并可在设置页选择推荐模式、手动音色、语速、音高
- 选中英文单词时可在页内详情中查看音标、词性、释义、例句和近义词
- 支持对英文句子给出语法检测提示
- 支持右键图片后识别图片中的文字并直接翻译
- 支持按域名或 URL 配置白名单 / 黑名单，控制插件在哪些网页生效
- 默认先尝试首选免费接口
- 如果首选免费接口在当前网络环境不可用，可回退到百度翻译与其他已启用翻译源
- 百度可配置为“仅回退”并设置月度免费字符上限，超出后当月自动停用
- 支持接入自定义商业翻译接口
- 支持配置自定义公共翻译端点

## 产品定位

- 单一目的：`网页划词翻译与朗读`
- 核心场景：阅读英文技术文档、博客、资讯和跨语言网页内容时，减少复制粘贴和标签页切换
- 辅助能力：词典、OCR、多翻译源和语法提示均服务于网页阅读中的翻译理解过程

## 目录

- `manifest.json`: Chrome 插件清单
- `background.js`: 翻译源调度、配置存储、右键菜单
- `content.js`: 页面选区监听、就地译文插入、浮层 UI 与 TTS 交互
- `popup.*`: 浏览器工具栏弹窗
- `options.*`: 高级设置页
- `todo.md`: 已实现与待实现功能清单
- `docs/azure-translator-f0-guide.md`: 商业翻译接口 F0 配置教程
- `docs/web-store-listing.md`: 扩展商店发布资料草稿
- `docs/privacy-policy.md`: 隐私政策草稿
- `docs/support-info.md`: 支持信息模板
- `assets/logo.svg`: 主 Logo / Banner
- `assets/icons/`: Chrome 扩展图标资源

## 加载方式

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击左上角的“加载未打包的扩展程序”
4. 在文件选择窗口中选中当前项目目录
5. 确认后，扩展列表中会出现“极简翻译”

如果你是第一次手动安装 Chrome 扩展，上面第 3 步对应的就是扩展管理页左上角那个“加载未打包的扩展程序”按钮。

## 已接入翻译源

### 首选免费翻译接口

- 默认启用
- 无需 API Key
- 适合常规单词和句子翻译

### 百度翻译开放平台

- 推荐中国大陆环境优先接入
- 需要配置 AppID / AppKey
- 默认建议仅作为首选免费接口失败后的回退源
- 可设置月度字符上限，达到后插件侧自动停用，避免继续消耗额度

### 公共备用翻译接口

- 默认启用
- 无需 API Key
- 可作为备用翻译结果源

### 商业翻译接口

- 默认关闭
- 需要配置商业翻译资源
- 支持免费 F0 定价层

### 自定义公共翻译端点

- 默认关闭
- 支持自定义 endpoint

### Dictionary API

- 用于英文单词查询
- 返回音标、释义、例句和相关词典信息

### 公共图像识别服务

- 用于图片文字识别
- 当前接入公共免费接口

### 公共语法服务

- 用于英文语法检测提示
- 当前接入公共免费接口

## 使用方式

1. 打开任意网页
2. 选中单词或句子
3. 选区所在正文块下方会直接插入译文
4. 如果选中的是英文单词，可通过页内“查看词典”入口展开词典详情，并继续使用语音能力
5. 对网页图片点击右键，选择“翻译图片文字”可触发 OCR 翻译
6. 如需更多翻译源、回退策略或语音参数，可在“高级设置”中配置

## 网站规则

- 默认策略为“全部网页生效”
- 黑名单优先级高于白名单
- 域名规则可写成 `example.com`，会匹配该域名及其子域名
- URL 规则可写成 `https://example.com/docs/*`

## 注意事项

- 某些网站的脚本或 CSP 可能影响浮层表现
- 公共/免密翻译接口不具备 SLA 级别稳定性
- 商业翻译接口需要用户自行配置对应资源
- 图片翻译当前使用公共图像识别接口，可能存在额度或识别稳定性波动
- 英文语法提示当前使用公共语法接口，适合提示，不保证专业校对准确率

## 发布资料

- 扩展商店资料：`docs/web-store-listing.md`
- 隐私政策草稿：`docs/privacy-policy.md`
- 支持信息模板：`docs/support-info.md`
- 审核测试说明：`docs/chrome-web-store-test-instructions.md`
- 商店提审填写稿：`docs/chrome-web-store-submission-copy.md`
- 发布检查清单：`docs/release-checklist.md`
- 60 天发布与经营计划：`docs/launch-operations-plan.md`
- 商店素材拍摄脚本：`docs/store-assets-brief.md`
- 公开页面部署说明：`docs/public-pages-deployment.md`
- GitHub Pages 首页：`docs/index.html`
- 隐私政策静态页：`docs/privacy-policy.html`
- 支持页静态页：`docs/support.html`

## 反馈与支持

- 支持邮箱：`brendenaudrina6287@gmail.com`
- GitHub Issues：`https://github.com/snowlyg/translate_chrome_plugin/issues`
- 建议反馈时附上 Chrome 版本、操作系统、问题网页地址和截图

## 打包发布

- 可运行 `scripts/package-release.ps1` 生成仅包含运行文件的 ZIP 发布包
- 默认会提示选择版本升级类型，直接回车等同于 `patch`
- 可用 `scripts/package-release.ps1 -Bump patch` 或 `scripts/package-release.ps1 -Version 0.1.1` 非交互升级版本
- 脚本会同步更新 `manifest.json`、`README.md`、`README.en.md` 中的版本号
- 默认输出路径为 `dist/minimal-translation-chrome-extension.zip`

## 维护说明

- 当前项目功能状态统一维护在 `todo.md`
- 新增能力或修复限制后，应同步更新相关文档
- 商业翻译接口免费 F0 教程见 `docs/azure-translator-f0-guide.md`
