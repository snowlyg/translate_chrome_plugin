# 隐私政策与支持页公开部署说明

Last updated: `2026-04-20`

目标是把仓库中的隐私政策和支持信息发布成可公开访问的固定 URL，供 Chrome Web Store 填写。

## 推荐方案

优先使用 `GitHub Pages`，因为：

- 直接复用当前 GitHub 仓库
- URL 稳定
- 不需要额外购买域名
- 适合首发验证阶段

## 最小落地方式

### 方案 A：直接发布 `docs/` 到 GitHub Pages

1. 在 GitHub 仓库设置中启用 `Pages`
2. 选择从 `main` 分支部署
3. 选择 `/(root)` 或 `docs` 目录作为发布源
4. 确保以下页面可公开访问：
   - `privacy-policy.html`
   - `support.html`

建议最终公开 URL 形态：

- `https://<your-account>.github.io/translate_chrome_plugin/privacy-policy.html`
- `https://<your-account>.github.io/translate_chrome_plugin/support.html`

### 方案 B：单独建一个静态官网仓库

如果你后续要做正式品牌页，再把隐私政策、支持页和下载入口统一放到独立站点。

首发验证阶段不建议把这个作为前置条件。

## 发布要求

- 页面内容与仓库内文档保持一致
- URL 固定，不频繁更换
- 页面内明确写联系方式
- 隐私政策页面包含最后更新时间

## 商店填写建议

- Privacy policy URL：填公开的隐私政策页面
- Homepage URL：可暂时填 GitHub 仓库主页
- Support URL：优先填公开支持页，没有时可先填 GitHub Issues 页面
