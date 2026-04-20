# Chrome Web Store 提审填写稿

Last updated: `2026-04-20`

本文件整理 Chrome Web Store 后台可直接复制的字段内容。正式提交前，把其中的 URL 占位符替换成你的真实公开链接。

## 基本信息

### Name

`极简翻译`

### Summary / Short Description

`在网页中选中单词或句子，直接在当前页面内查看译文并朗读，无需跳转翻译网站。`

### Category

`Productivity`

### Language

`简体中文`

## Store Description

极简翻译是一款专注于网页阅读场景的 Chrome 扩展。

当你在网页中选中单词或句子时，扩展会在当前页面中直接插入译文卡片，帮助你在阅读文章、技术文档、博客和资讯时保持上下文，而不是复制文本或切换到外部翻译站点。

核心功能：

- 划词后即时显示页内译文
- 支持多个翻译源结果切换
- 英文单词支持音标、词性、释义和例句
- 支持原文朗读和语音参数调节
- 支持图片 OCR 翻译和网站生效规则
- 支持按需配置商业翻译接口和自定义公共端点

适合人群：

- 经常阅读英文技术文档和工程文章的开发者
- 需要保持阅读上下文、不想频繁跳页的用户
- 需要在阅读时顺手查询单词和朗读的学习者

## Developer / Support

### Contact email

`brendenaudrina6287@gmail.com`

### Homepage URL

`https://github.com/snowlyg/translate_chrome_plugin`

### Support URL

`https://<your-account>.github.io/translate_chrome_plugin/support.html`

### Privacy Policy URL

`https://<your-account>.github.io/translate_chrome_plugin/privacy-policy.html`

## Single Purpose Statement

`极简翻译的单一目的，是在用户浏览网页时提供划词翻译与朗读能力，并在当前页面内直接展示译文，帮助用户在不中断阅读上下文的情况下理解网页内容。`

## Permissions Justification

### storage

`用于保存翻译设置、TTS 设置、网站规则和用户输入的第三方接口配置。`

### contextMenus

`用于提供网页图片右键翻译入口。`

### scripting

`用于协调页面侧的扩展行为，支持页内翻译体验。`

### host_permissions

`用于在用户浏览的网页上提供划词翻译、页面内插入译文、图片 OCR 右键翻译，以及访问用户启用的翻译或词典服务。`

## Test Instructions

1. 安装扩展后，点击工具栏图标可打开 popup。
2. 打开任意普通网页，例如新闻页、博客页或文档页。
3. 选中一段英文单词或句子。
4. 页面中会在对应正文位置下直接插入译文结果。
5. 如果选中的是英文单词，可继续打开词典详情查看音标、释义和例句。
6. 在译文卡片中可触发 TTS 播放原文。
7. 打开扩展 Options 页面，可查看和保存翻译源、语音参数、白名单和黑名单等设置。
8. 在任意网页图片上点击右键，选择 `翻译图片文字`，可触发图片 OCR 翻译。

## Reviewer Notes

- 默认情况下无需注册账号。
- 默认启用至少一个免登录翻译路径。
- 用户设置保存在浏览器本地 `chrome.storage`。
- 当用户主动使用翻译、词典、OCR 或语法提示功能时，选中的文本或必要请求参数会发送给对应的第三方服务提供商。
- 当前版本不包含账号系统，不出售用户数据，不做个性化广告投放。

## Media Checklist

- 图标：`assets/icons/icon-128.png`
- 截图 1：划词即译
- 截图 2：单词词典
- 截图 3：设置页
- 宣传图：主文案 `网页内直接翻译，不跳页`
