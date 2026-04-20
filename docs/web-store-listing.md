# Chrome Web Store 发布资料

本文档整理了当前插件发布到 Chrome Web Store 时可复用的作者信息、商店文案、权限说明和提审要点。

适用项目：极简翻译

## 作者信息

- Author name: `rodin`
- Project name: `极简翻译`
- Category suggestion: `Productivity`
- Support language: `简体中文`, `English`
- Contact email: `brendenaudrina6287@gmail.com`

如果你后续要用正式品牌名、官网或客服邮箱发布，可以直接替换本节内容。

## 产品定位

- 单一目的：`网页划词翻译与朗读`
- 目标用户：中文开发者、技术文档阅读者、跨语言网页阅读用户
- 核心卖点：在网页正文里直接看到译文，不需要复制粘贴或切换标签页

## 项目介绍

极简翻译是一个面向网页阅读场景的 Chrome 网页划词翻译与朗读扩展。

用户在任何网页上选中单词或句子后，即可在对应正文位置下直接看到翻译结果，而不需要复制文本、切换页面或打开独立翻译站点。插件支持多翻译源聚合、英文单词词典信息、以及 TTS 朗读能力，适合日常阅读英文文章、技术文档、资讯网站和跨语言内容。

## 核心卖点

- 划词即译，减少页面切换
- 网页内直接插入译文，不跳页
- 支持单词和整句翻译
- 聚合多个翻译源结果
- 英文单词支持音标、词性、释义、例句
- 支持 TTS 朗读与音色设置
- 支持词典、OCR 和可选商业翻译接口配置

## 商店简短描述

在网页中选中单词或句子，直接在当前页面内查看译文并朗读，无需跳转翻译网站。

## Short Description (English)

Select a word or sentence on any webpage and view the translation inline with voice playback and dictionary details.

## 商店详细描述

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

## Detailed Description (English)

Minimal Translation is a Chrome extension for in-page translation while reading.

When you select a word or sentence on a webpage, the extension inserts a compact translation block directly in the current page, helping you stay focused without copying text into a separate translation site.

Key features:

- Inline translation for selected words and sentences
- Multiple translation providers
- Dictionary details for English words
- Built-in TTS playback
- Optional OCR translation for webpage images
- Advanced settings for provider and voice preferences

## 隐私与权限说明草稿

- `storage`: 用于保存翻译设置、TTS 设置和翻译源配置
- `contextMenus`: 用于提供右键翻译入口
- `scripting`: 用于协调页面侧的扩展行为
- `host_permissions`: 用于网页划词翻译、页内插入译文、图片 OCR 和访问用户启用的翻译/词典接口

当前版本不包含账号系统，也不会要求用户登录。

当前版本不会：

- 收集账号资料
- 建立自有远程用户数据库
- 将用户数据出售给广告或数据经纪商
- 用于个性化广告投放

正式隐私政策草稿见：

- `docs/privacy-policy.md`

商店支持信息模板见：

- `docs/support-info.md`

## 发布前建议补充

- 使用 GitHub Pages 或独立站点发布隐私政策和支持页
- 增加商店宣传图和截图，优先展示“划词即译”“词典详情”“设置页”
- 准备审核测试说明，便于审核人员快速复现
- 提交审核时优先选择延迟发布
