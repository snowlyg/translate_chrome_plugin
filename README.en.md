# Minimal Translation

<p align="center">
  <img src="./assets/logo.svg" alt="Minimal Translation logo" width="220">
</p>

Minimal Translation, branded in Chinese as `极简翻译`, is a Chrome extension built with Manifest V3 for fast in-page translation.

[中文版本](./README.md)

## Overview

This project is designed for focused reading on multilingual webpages.  
When a user selects a word or sentence, the extension inserts the translated result directly under the related reading block without forcing a tab switch or copy-paste workflow.

It is especially useful for:

- technical documentation
- engineering articles
- multilingual content
- English vocabulary lookup while reading

## Author

- Author: `rodin`
- Contact: `brendenaudrina6287@gmail.com`
- Repository: `https://github.com/snowlyg/translate_chrome_plugin`

## Version

- Current version: `0.1.0`
- Status: `Active development`

## Features

- Translate selected words and sentences directly under the related reading block on the page
- Aggregate results from multiple translation providers
- Built-in TTS playback with configurable voice style, rate, pitch, and volume
- English word phonetics, parts of speech, definitions, examples, and synonyms
- English grammar hints for sentence selections
- Right-click image OCR translation for text inside images
- Whitelist and blacklist controls by domain or URL pattern
- Primary free-endpoint fallback strategy with Baidu support for mainland-friendly access
- Optional Baidu fallback-only mode with a monthly free-character cap
- Commercial translation endpoint integration
- Custom public translation endpoint configuration
- Toolbar popup and advanced settings page

## Translation Providers

### Primary Free Endpoint

- Enabled by default
- No API key required
- Suitable for general word and sentence translation

### Baidu Translate Open Platform

- Recommended for users in mainland China
- Requires AppID / AppKey
- Recommended as a fallback provider when the primary free endpoint is unreachable
- Can be capped with a monthly free-character limit and auto-disabled after the cap is hit

### Secondary Public Endpoint

- Enabled by default
- No API key required
- Works as a fallback translation source

### Commercial Translation Endpoint

- Disabled by default
- Requires commercial translation resource configuration
- Supports free F0 tier setup

### Custom Public Translation Endpoint

- Disabled by default
- Can be enabled with a custom endpoint

### Dictionary API

- Used for English word lookup
- Provides phonetics, meanings, examples, and related word information

### Public OCR Endpoint

- Used for OCR on webpage images
- Currently wired to a public free endpoint

### Public Grammar Endpoint

- Used for English grammar hints
- Currently wired to a public free endpoint

## Project Structure

- `manifest.json`: Chrome extension manifest
- `background.js`: provider orchestration, storage, context menu logic
- `content.js`: selection listener, inline translation insertion, floating panel UI, TTS interaction
- `popup.*`: toolbar popup UI
- `options.*`: advanced settings UI
- `todo.md`: implemented and planned features
- `docs/azure-translator-f0-guide.md`: F0 setup guide for the commercial translation endpoint
- `docs/web-store-listing.md`: extension store listing draft
- `docs/privacy-policy.md`: privacy policy draft
- `docs/support-info.md`: support information template
- `assets/logo.svg`: primary project logo
- `assets/logo-alt-*.svg`: alternative logo concepts
- `assets/icons/`: Chrome extension icon assets

## Installation

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this project directory

## Usage

1. Open any webpage
2. Select a word or sentence
3. A translated block is inserted directly below the related reading block
4. If the selection is an English word, dictionary annotations and speech features remain available
5. Right-click an image and choose `翻译图片文字` to OCR and translate the text in the image
6. Use the advanced settings page for provider fallback rules, voice tuning, and other detailed controls

## Site Rules

- Default mode applies the extension on all webpages
- Blacklist rules always override whitelist rules
- Domain rules like `example.com` match the domain and its subdomains
- URL rules like `https://example.com/docs/*` are also supported

## Notes

- Some websites with aggressive scripts or CSP rules may affect the floating panel behavior
- Public/free translation endpoints do not provide SLA-level stability
- The commercial translation endpoint requires user-provided configuration
- Image translation currently depends on a public OCR endpoint, so quota and OCR quality may vary
- English grammar hints currently depend on a public grammar endpoint and should be treated as assistive suggestions

## Publishing Materials

- Extension store listing draft: `docs/web-store-listing.md`
- Privacy policy draft: `docs/privacy-policy.md`
- Support information template: `docs/support-info.md`
