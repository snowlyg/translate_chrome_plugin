# 商业翻译接口免费 F0 教程

本文档说明如何在对应控制台中创建商业翻译资源，并使用免费 `F0` 定价层接入本项目。

适用时间：截至 `2026-04-03`，以下步骤基于微软官方文档与官方定价页整理。

## 1. 准备条件

你需要先有一个 Azure 账号和可用订阅：

- 如果没有 Azure 账号，先注册 Azure 免费账号
- 登录 Azure Portal：`https://portal.azure.com/`

## 2. 创建 Translator 资源

### 方式一：从 Azure Portal 直接创建

1. 登录 Azure Portal
2. 在顶部搜索框输入 `Translator`
3. 进入 `Azure AI Translator`
4. 点击 `Create`

### 方式二：从官方文档入口进入

可直接参考微软官方创建文档：

- `https://learn.microsoft.com/azure/ai-services/translator/create-translator-resource`

## 3. 填写资源基础信息

创建页面里按下面填写：

### Subscription

- 选择你的 Azure 订阅

### Resource group

- 可新建一个资源组，例如：`rg-selective-translate`

### Region

- 官方文档对文本翻译推荐优先使用 `Global`
- 如果你后续要使用某些特定功能，例如文档翻译的托管身份场景，才考虑具体地域

对于本项目当前的文本翻译插件，建议：

- `Region`: `Global`

### Name

- 填一个全局唯一名称
- 例如：`selective-translate-demo`

### Pricing tier

这里选择：

- `F0`

## 4. F0 免费层说明

根据微软官方定价页，截至 `2026-04-03`：

- `F0 - Free`
- 每个订阅只能有一个免费层资源
- 免费层与标准层在基础文本翻译能力上功能一致
- `F0` 包含每月 `2,000,000` 字符的标准翻译额度
- `Document translation` 不在免费层常规试用范围内，若要正式使用文档翻译通常需要付费层

官方定价页：

- `https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator`

## 5. 创建资源

1. 确认信息无误后，点击 `Review + create`
2. 通过校验后点击 `Create`
3. 等待部署完成
4. 点击 `Go to resource`

## 6. 获取 Key、Endpoint、Region

进入资源后：

1. 左侧找到 `Keys and Endpoint`
2. 复制以下信息

你通常会看到：

- `KEY 1` 或 `KEY 2`
- `Endpoint`
- `Location/Region`

本项目里需要重点填写的是：

- `API Key`
- `Endpoint`
- `Region`

### Endpoint 用哪个

微软官方创建文档说明：

- 常规文本翻译优先使用全局端点
- 全局端点通常是：`https://api.cognitive.microsofttranslator.com`

如果你的资源页展示的是该地址，直接使用它即可。

### Region 填什么

- 如果资源在 `Global`，很多场景下仍需要把资源页里的 `Location` 或文档要求的区域值填进请求头
- 最稳妥的做法是：以 Azure Portal `Keys and Endpoint` 页面显示内容为准

如果页面显示的是某个区域名，例如：

- `eastasia`
- `southeastasia`
- `global`

就把那个值填入本项目的 `Region` 输入框。

## 7. 在本插件中配置商业翻译接口

打开插件设置页后，填入以下三项：

### API Key

- 填 Azure `KEY 1` 或 `KEY 2`

### Region

- 填 Azure Portal `Keys and Endpoint` 页面显示的区域值

### Endpoint

- 优先填：`https://api.cognitive.microsofttranslator.com`
- 如果你的资源页给出了特定 endpoint，则以资源页展示为准

然后：

1. 勾选 `商业翻译接口`
2. 点击 `保存设置`

## 8. 如何验证是否配置成功

在插件中选中一段英文或中文文本后：

1. 打开翻译浮层
2. 点击对应的商业接口标签
3. 如果返回正常翻译结果，说明配置成功

如果失败，常见原因如下：

- `API Key` 填错
- `Region` 填错
- `Endpoint` 填错
- 你的订阅里已经存在另一个 `F0` Translator 资源，导致当前资源不是免费层或创建失败
- Azure 订阅状态不可用

## 9. 常见问题

### Q1：为什么我找不到 F0？

常见原因：

- 当前订阅下已经创建过一个免费层 Translator 资源
- 当前订阅不支持该免费层
- 你选错了服务类型，进入了别的 AI 服务资源页

优先检查：

- 是否创建的是 `Azure AI Translator`
- 当前订阅里是否已经有一个 `F0` Translator 资源

### Q2：F0 能不能长期使用？

根据微软官方创建文档，免费层不会自动过期，但：

- 每个订阅只能有一个免费层资源
- 额度和能力适合开发、学习、测试
- 生产环境应评估升级到 `S1`

### Q3：为什么插件里商业翻译接口还是报错？

本项目里的商业翻译接口接的是对应的官方翻译 API，不是网页抓取接口。报错时按下面顺序排查：

1. 资源是否真的创建成功
2. `Keys and Endpoint` 页面信息是否复制正确
3. 设置页是否启用了 `商业翻译接口`
4. 是否超过免费额度或订阅出现限制

## 10. 推荐配置

如果你只是给当前插件使用，建议直接采用：

- Resource type: `Translator`
- Region: `Global`
- Pricing tier: `F0`
- Endpoint: `https://api.cognitive.microsofttranslator.com`
- Provider: 启用 `商业翻译接口`

## 11. 官方参考链接

- 创建资源：
  `https://learn.microsoft.com/azure/ai-services/translator/create-translator-resource`
- REST Quickstart：
  `https://learn.microsoft.com/en-us/azure/ai-services/translator/quickstart-text-rest-api`
- 新版文本翻译 Quickstart：
  `https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/quickstart/rest-api`
- 官方定价页：
  `https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator`
