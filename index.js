/**
 * ====================================================================
 *                 PLASMA — STANDALONE BUNDLE
 * ====================================================================
 * Single-file proxy panel (VLESS / VMess / Trojan / Shadowsocks / XHTTP)
 * that runs on free hosts (Pterodactyl) using the one port you are given.
 * Deploy: upload index.js, package.json and the assets/ folder, then start.
 * ====================================================================
 */


// ===== Plasma settings file (for hosts with no environment-variable editor) =====
// Create a file named "plasma.env" next to index.js with KEY=VALUE lines, e.g.:
//   PLASMA_NODE_SECRET=mysecret
// Real environment variables, when set, take precedence over the file.
try {
  const _pfs = require('fs'), _pp = require('path');
  for (const _pf of [_pp.join(process.cwd(), 'plasma.env'), _pp.join(__dirname, 'plasma.env')]) {
    if (_pfs.existsSync(_pf)) {
      for (const _line of _pfs.readFileSync(_pf, 'utf8').split(/\r?\n/)) {
        const _m = _line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (_m && process.env[_m[1]] === undefined) process.env[_m[1]] = _m[2].replace(/^["']|["']$/g, '');
      }
      console.log('[i] Loaded settings from ' + _pf);
      break;
    }
  }
} catch (_) {}

// ========== PLASMA — EDIT ME ==========
const BK_CONFIG = {
  brand: "Plasma",
  product: "Plasma",
  nodePrefix: "Plasma - ",
  publicPort: parseInt(process.env.PORT || process.env.SERVER_PORT || '8080', 10) || 8080,
  panelPath: "plasma",
  dataDirHint: "/data",
  uuid: "",
  panelToken: process.env.PANEL_TOKEN || "",
  domain: process.env.DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN || "",
  forceHost: process.env.FORCE_HOST || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.SUB_BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? "https://" + process.env.RAILWAY_PUBLIC_DOMAIN : ""),
  subBase: process.env.SUB_BASE || "",
  forceHttps: process.env.FORCE_HTTPS === 'true' || !!process.env.RAILWAY_PUBLIC_DOMAIN || !!process.env.REPLIT_DEPLOYMENT,
  allowLocalHostLinks: false,
  sniHy2: "www.google.com",
  massProxyUrl: "https://www.gstatic.com",
  enable: {
    hysteria2: false,
    vlessWs: true,
    vlessWsTls: true,
    vlessHttpUpgrade: true,
    vmessHttpUpgrade: true,   // BK_PROTOCOLS_APPLIED
    trojanHttpUpgrade: true,
    vlessGrpc: true,          // h2c on the shared port (self-hosted only)
    vlessGrpcTls: true,       // TLS + ALPN h2 on the shared port (self-hosted only)
    trojanWs: true,
    trojanWsTls: true,
    trojanGrpcTls: false,     // shares ALPN h2 with VLESS-gRPC-TLS: only used when vlessGrpcTls is off
    vmessWsTls: true,
    vmessWs: true,
    vlessXhttp: true,         // needs Xray-core (downloaded automatically)
    ssWs: true,               // Shadowsocks over WebSocket (v2ray-plugin compatible, Xray-core)
    reality: false,
    shadowTlsVless: false,
    shadowsocks: false,
    wireguard: false,
    tuic: false,
    socks: false,
    httpProxy: false,
    argo: false
  },
  reality: {
    target: "www.microsoft.com",
    targetPort: 443,
    shortId: ""
  },
  shadowTls: {
    sni: "www.microsoft.com",
    password: ""
  },
  shadowsocks: {
    method: "aes-256-gcm",
    password: ""
  },
  wireguard: {
    port: 51820,
    serverIp: "10.66.66.1/24",
    clientIp: "10.66.66.2/32",
    mtu: 1420
  },
  tuic: {
    port: 8443,
    congestionController: "bbr"
  },
  argo: {
    domain: "",
    auth: "",
    localPort: 8001
  },
  singBoxVersion: "1.11.15",
  xrayVersion: "",
  cpuLimitPercent: null
};
// ===============================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const express = require('express');
const axios = require('axios');
const zlib = require('zlib'); // BK_XHTTP_APPLIED
const tls = require('tls');
const http2 = require('http2');

// --- Embedded Web Panel Assets ---
const EMBEDDED_ASSETS = {
  indexHtml: "<!DOCTYPE html>\n<html lang=\"fa\" dir=\"rtl\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes\">\n  <title>Plasma | پنل مدیریت</title>\n  <link rel=\"stylesheet\" href=\"/plasma-assets/app.css\">\n  <link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%238b7cf6' d='M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z'/%3E%3C/svg%3E\">\n  \n<link rel=\"preconnect\" href=\"https://cdn.jsdelivr.net\" crossorigin><link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css\"></head>\n<body>\n  <!-- Ambient background overlay -->\n  <div class=\"cinema-bg\">\n    <div class=\"ambient-glow\"></div>\n    <div class=\"ambient-vignette\"></div>\n  </div>\n\n  <div class=\"app-container\">\n    <!-- ================= 1. HEADER ================= -->\n    <header class=\"cinema-header\">\n      <div class=\"header-inner\">\n        <!-- Left: Red play logo + Plasma + tagline -->\n        <a href=\"#/home\" class=\"header-brand\">\n          <div class=\"brand-icon-box\"><svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z\"/></svg></div>\n          <div class=\"brand-info\">\n            <div class=\"brand-title\">\n              <span class=\"white-text\">Plasma</span>\n            </div>\n            <div class=\"brand-tagline\">پنل مدیریت اشتراک</div>\n          </div>\n        </a>\n\n        <!-- Center: Home, Sub, Node tabs -->\n        <nav class=\"header-nav\">\n          <a href=\"#/home\" class=\"nav-link active\" data-page=\"home\">\n            <svg class=\"nav-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/>\n            </svg>\n            <span>خانه</span>\n            <span class=\"active-indicator\"></span>\n          </a>\n          <a href=\"#/subs\" class=\"nav-link\" data-page=\"subs\">\n            <svg class=\"nav-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\"/>\n            </svg>\n            <span>اشتراک</span>\n            <span class=\"active-indicator\"></span>\n          </a>\n          <a href=\"#\" data-users-link class=\"nav-link\"><svg class=\"nav-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\"/></svg><span>مدیریت اشتراک‌ها</span><span class=\"active-indicator\"></span></a>\n          <a href=\"#/nodes\" class=\"nav-link\" data-page=\"nodes\">\n            <svg class=\"nav-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M4 6h16V4H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2z\"/>\n            </svg>\n            <span>نودها</span>\n            <span class=\"active-indicator\"></span>\n          </a>\n          <a href=\"#/usage\" class=\"nav-link\" data-page=\"usage\">\n            <svg class=\"nav-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z\"/>\n            </svg>\n            <span>مصرف</span>\n            <span class=\"active-indicator\"></span>\n          </a>\n        </nav>\n\n        <!-- Right: Theme Toggle + Mobile Hamburger -->\n        <div class=\"header-actions\">\n          <!-- Compact Modern Theme Toggle (min 40px touch area) -->\n          <button type=\"button\" class=\"theme-toggle-btn\" id=\"themeToggleBtn\" aria-label=\"Toggle Dark / Cozy Theme\" title=\"تغییر تم روشن / تیره\">\n            <span class=\"theme-toggle-icon\">\n              <svg class=\"theme-svg theme-icon-moon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                <path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"></path>\n              </svg>\n              <svg class=\"theme-svg theme-icon-sun\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                <circle cx=\"12\" cy=\"12\" r=\"5\"></circle>\n                <line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"></line>\n                <line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"></line>\n                <line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"></line>\n                <line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"></line>\n                <line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"></line>\n                <line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"></line>\n                <line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"></line>\n                <line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"></line>\n              </svg>\n            </span>\n            <span class=\"theme-toggle-label\" id=\"themeToggleLabel\">تیره</span>\n          </button>\n\n          \n          \n\n          \n\n          \n\n          <!-- Hamburger Button for mobile (min 40px touch area) -->\n          <button type=\"button\" class=\"hamburger-btn\" id=\"hamburgerBtn\" aria-label=\"باز کردن منو\" aria-expanded=\"false\" aria-controls=\"mobileDrawer\">\n            <span class=\"hamburger-bar\"></span>\n            <span class=\"hamburger-bar\"></span>\n            <span class=\"hamburger-bar\"></span>\n          </button>\n        </div>\n      </div>\n\n      <!-- Slide-down mobile drawer -->\n      <div class=\"mobile-drawer\" id=\"mobileDrawer\" aria-hidden=\"true\">\n        <nav class=\"drawer-nav\">\n          <a href=\"#/home\" class=\"drawer-nav-item active\" data-page=\"home\">\n            <svg class=\"drawer-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/></svg>\n            <span>خانه</span>\n          </a>\n          <a href=\"#/subs\" class=\"drawer-nav-item\" data-page=\"subs\">\n            <svg class=\"drawer-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\"/></svg>\n            <span>اشتراک‌ها</span>\n          </a>\n          <a href=\"#\" data-users-link class=\"drawer-nav-item\"><svg class=\"drawer-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\"/></svg><span>مدیریت اشتراک‌ها</span></a>\n          <a href=\"#/nodes\" class=\"drawer-nav-item\" data-page=\"nodes\">\n            <svg class=\"drawer-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M4 6h16V4H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2z\"/></svg>\n            <span>نودها و کانفیگ‌ها</span>\n          </a>\n          <a href=\"#/usage\" class=\"drawer-nav-item\" data-page=\"usage\">\n            <svg class=\"drawer-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z\"/></svg>\n            <span>مصرف ترافیک</span>\n          </a>\n        </nav>\n        </div>\n    </header>\n\n\n    <!-- ================= MAIN CONTENT AREA ================= -->\n    <main class=\"main-content\">\n\n      <!-- ================= VIEW 1: HOME ================= -->\n      <div id=\"viewHome\" class=\"view-page active\">\n        <!-- Hero row (Left: text + actions, Right: SINGLE featured card) -->\n        <section class=\"hero-section\">\n          <!-- Left Column -->\n          <div class=\"hero-left\">\n            <div class=\"hero-tag\">PLASMA • سریع و امن</div>\n            <h1 class=\"hero-title\">پنل <span class=\"accent-red\">Plasma</span></h1>\n            <p class=\"hero-desc\">\n              کانفیگ‌های سریع، امن و پایدار V2Ray و Sing-box.<br>\n              برای استریم، بازی و عبور از محدودیت‌ها — بدون دردسر.\n            </p>\n            <div class=\"hero-btn-row\">\n              <a href=\"#/subs\" class=\"btn-primary-red\" id=\"btnHeroGetSub\">\n                <svg class=\"btn-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n                  <path d=\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\"/>\n                </svg>\n                <span>دریافت اشتراک</span>\n              </a>\n              <a href=\"#/nodes\" class=\"btn-secondary-dark\">\n                <svg class=\"btn-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n                  <path d=\"M4 6h16V4H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2z\"/>\n                </svg>\n                <span>مشاهده نودها</span>\n              </a>\n            </div>\n          </div>\n\n          <!-- Right Column: brand visual -->\n          <div class=\"hero-right\">\n            <div class=\"single-hero-card\">\n              <div class=\"hero-card-glow\"></div>\n              <div class=\"hero-visual\"><svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z\"/></svg><span>Plasma</span></div>\n              <div class=\"hero-card-badge\">\n                <span class=\"pulse-dot\"></span>\n                <span>Plasma فعال است</span>\n              </div>\n            </div>\n          </div>\n        </section>\n\n        <!-- SINGLE Auto-Detected Location & Server Status Card -->\n        <section class=\"location-preview-section\">\n          <div class=\"location-card\">\n            <div class=\"location-card-left\">\n              <div class=\"location-pin-wrap\">\n                <svg class=\"pin-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                  <path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"></path>\n                  <circle cx=\"12\" cy=\"10\" r=\"3\"></circle>\n                </svg>\n              </div>\n              <div class=\"location-details\">\n                <div class=\"location-subtitle\">موقعیت سرور (تشخیص خودکار)</div>\n                <h3 class=\"location-name\" id=\"homeLocation\">در حال تشخیص موقعیت...</h3>\n                <div class=\"location-badges-row\">\n                  <span class=\"badge-status-online\">\n                    <span class=\"status-dot\"></span>\n                    <span>آنلاین و فعال</span>\n                  </span>\n                  <span class=\"badge-pill\">VLESS</span>\n                  <span class=\"badge-pill\">Trojan</span>\n                  <span class=\"badge-pill\">Shadowsocks</span>\n                  <span class=\"badge-pill\">Reality</span>\n                  <span class=\"badge-pill\">gRPC</span>\n                </div>\n              </div>\n            </div>\n\n            <div class=\"location-card-right\">\n              <div class=\"quick-stats-row\">\n                <div class=\"quick-stat\">\n                  <span class=\"qs-label\">پورت</span>\n                  <strong class=\"qs-value\" id=\"homePort\">--</strong>\n                </div>\n                <div class=\"quick-stat\">\n                  <span class=\"qs-label\">آپتایم</span>\n                  <strong class=\"qs-value\" id=\"homeUptime\">--</strong>\n                </div>\n              </div>\n              <a href=\"#/nodes\" class=\"btn-view-nodes\">\n                <span>مشاهده کانفیگ‌ها</span>\n                <span class=\"arrow\">&rarr;</span>\n              </a>\n            </div>\n          </div>\n        </section>\n\n        <!-- Features Bar at Bottom -->\n        <section class=\"features-bar-section\">\n          <div class=\"features-bar-card\">\n            <!-- Feature 1: سرعت بالا -->\n            <div class=\"feature-cell\">\n              <div class=\"feature-icon-wrap\">\n                <svg class=\"feat-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#E50914\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n                  <polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"></polygon>\n                </svg>\n              </div>\n              <div class=\"feature-text\">\n                <div class=\"feat-title\">سرعت بالا</div>\n                <div class=\"feat-sub\">بهینه برای استریم 4K</div>\n              </div>\n            </div>\n\n            <!-- Feature 2: Secure & Private -->\n            <div class=\"feature-cell\">\n              <div class=\"feature-icon-wrap\">\n                <svg class=\"feat-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#E50914\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n                  <path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"></path>\n                  <path d=\"M9 12l2 2 4-4\"></path>\n                </svg>\n              </div>\n              <div class=\"feature-text\">\n                <div class=\"feat-title\">امن و خصوصی</div>\n                <div class=\"feat-sub\">بدون لاگ، رمزنگاری کامل</div>\n              </div>\n            </div>\n\n            <!-- Feature 3: Single Port Mux -->\n            <div class=\"feature-cell\">\n              <div class=\"feature-icon-wrap\">\n                <svg class=\"feat-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#E50914\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n                  <circle cx=\"12\" cy=\"12\" r=\"10\"></circle>\n                  <line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line>\n                  <path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"></path>\n                </svg>\n              </div>\n              <div class=\"feature-text\">\n                <div class=\"feat-title\">تک‌پورت چندمنظوره</div>\n                <div class=\"feat-sub\">همه پروتکل‌ها روی یک پورت</div>\n              </div>\n            </div>\n\n            <!-- Feature 4: کامل و یکپارچه -->\n            <div class=\"feature-cell\">\n              <div class=\"feature-icon-wrap\">\n                <svg class=\"feat-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#E50914\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n                  <path d=\"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z\"></path>\n                </svg>\n              </div>\n              <div class=\"feature-text\">\n                <div class=\"feat-title\">کامل و یکپارچه</div>\n                <div class=\"feat-sub\">قدرت‌گرفته از Plasma</div>\n              </div>\n            </div>\n          </div>\n        </section>\n      </div>\n\n      <!-- ================= VIEW: USAGE (TRAFFIC METER) ================= -->\n      <div id=\"viewUsage\" class=\"view-page\">\n        <section class=\"subs-container-card bku\">\n          <div class=\"section-top-row\">\n            <div class=\"section-title-wrap\">\n              <span class=\"red-bar-indicator\"></span>\n              <h2 class=\"section-heading\">مصرف ترافیک</h2>\n            </div>\n            <div class=\"server-status-tag bku-live\" title=\"سرعت لحظه‌ای (همه کانفیگ‌ها)\">\n              <span class=\"status-dot\"></span>\n              <span>&uarr; <b id=\"bkuLiveUp\">0 B/s</b> &nbsp; &darr; <b id=\"bkuLiveDown\">0 B/s</b></span>\n            </div>\n          </div>\n          <p class=\"subs-caption\">\n            ترافیک عبوری از کانفیگ‌های شما (آپلود + دانلود). ماه در روز اول، ساعت ۰۰:۰۰ UTC ریست می‌شود.\n          </p>\n\n          <div class=\"bku-limit\" id=\"bkuLimit\" hidden>\n            <div class=\"bku-limit-top\">\n              <span id=\"bkuLimitText\">&ndash;</span>\n              <span id=\"bkuLimitPct\">&ndash;</span>\n            </div>\n            <div class=\"bku-bar\"><div class=\"bku-bar-fill\" id=\"bkuBar\"></div></div>\n            <div class=\"bku-limit-msg\" id=\"bkuLimitMsg\"></div>\n          </div>\n\n          <div class=\"bku-cards\">\n            <div class=\"bku-card\">\n              <div class=\"bku-card-label\">امروز <span class=\"bku-muted\">(UTC)</span></div>\n              <div class=\"bku-card-total\" id=\"bkuDayTotal\">&ndash;</div>\n              <div class=\"bku-card-split\"><span>&uarr; <b id=\"bkuDayUp\">&ndash;</b></span><span>&darr; <b id=\"bkuDayDown\">&ndash;</b></span></div>\n            </div>\n            <div class=\"bku-card\">\n              <div class=\"bku-card-label\">این ماه <span class=\"bku-muted\" id=\"bkuMonthKey\"></span></div>\n              <div class=\"bku-card-total\" id=\"bkuMonthTotal\">&ndash;</div>\n              <div class=\"bku-card-split\"><span>&uarr; <b id=\"bkuMonthUp\">&ndash;</b></span><span>&darr; <b id=\"bkuMonthDown\">&ndash;</b></span></div>\n            </div>\n            <div class=\"bku-card\">\n              <div class=\"bku-card-label\">همه زمان‌ها</div>\n              <div class=\"bku-card-total\" id=\"bkuAllTotal\">&ndash;</div>\n              <div class=\"bku-card-split\"><span>&uarr; <b id=\"bkuAllUp\">&ndash;</b></span><span>&darr; <b id=\"bkuAllDown\">&ndash;</b></span></div>\n            </div>\n          </div>\n\n          <div class=\"bku-table-wrap\">\n            <table class=\"bku-table\">\n              <thead>\n                <tr><th>کانفیگ</th><th>زنده</th><th>امروز</th><th>آپلود ماه</th><th>دانلود ماه</th><th>مجموع ماه</th><th>همه زمان‌ها</th></tr>\n              </thead>\n              <tbody id=\"bkuRows\"></tbody>\n              <tfoot id=\"bkuFoot\"></tfoot>\n            </table>\n          </div>\n\n          <div class=\"bku-note\">\n            <b>فقط تخمین است.</b> این شمارنده داخل خود پنل حساب می‌شود (ترافیک همه کانفیگ‌ها، هر دو جهت) و در پوشه داده ذخیره می‌شود؛ با ری‌استارت پاک نمی‌شود.\n          </div>\n\n          <div class=\"bku-actions\">\n            <div class=\"bku-sync\">\n              <span>همگام‌سازی مصرف این ماه با هاست:</span>\n              <input id=\"bkuSyncGb\" type=\"number\" min=\"0\" step=\"0.01\" inputmode=\"decimal\" placeholder=\"مصرف (GiB)\" aria-label=\"مصرف این ماه (GiB)\">\n              <button type=\"button\" id=\"bkuSyncBtn\" class=\"bku-btn\">ثبت</button>\n            </div>\n            <button type=\"button\" id=\"bkuResetBtn\" class=\"bku-btn bku-btn-soft\">ریست شمارنده</button>\n          </div>\n          <div class=\"bku-foot-meta\" id=\"bkuMeta\"></div>\n        </section>\n      </div>\n\n      <!-- ================= VIEW 2: SUB (SUBSCRIPTION LINKS) ================= -->\n      <div id=\"viewSubs\" class=\"view-page\">\n        <section class=\"subs-container-card\">\n          <div class=\"section-top-row\">\n            <div class=\"section-title-wrap\">\n              <span class=\"red-bar-indicator\"></span>\n              <h2 class=\"section-heading\">لینک‌های اشتراک</h2>\n              <p style=\"margin:6px 0 14px\"><a href=\"#\" data-users-link class=\"btn-primary-red\" style=\"display:inline-block;text-decoration:none\">مدیریت اشتراک‌های کاربران — ساخت اشتراک با حجم و زمان مشخص</a></p>\n            </div>\n            <div class=\"server-status-tag\">\n              <span class=\"status-dot\"></span>\n              <span id=\"statEngines\">sing-box</span>\n            </div>\n          </div>\n          <p class=\"subs-caption\">\n            همه نودهای سرور را در v2rayN، v2rayNG، Hiddify، Clash، Streisand یا Sing-box وارد کنید.\n          </p>\n\n          <!-- Protocol Mode Selector (v2rayN Windows HTTP vs HTTPS Proxy) -->\n          <div class=\"proto-selector-wrap\">\n            <span class=\"proto-label\">پروتکل لینک اشتراک:</span>\n            <div class=\"proto-toggle-group\">\n              <button type=\"button\" id=\"btnProtoHttp\" class=\"proto-btn active\" title=\"مناسب v2rayN ویندوز، Hiddify و IP:port خام\">\n                <span class=\"proto-dot\"></span>\n                HTTP (مناسب v2rayN ویندوز)\n              </button>\n              <button type=\"button\" id=\"btnProtoHttps\" class=\"proto-btn\" title=\"برای پروکسی معکوس SSL یا دامنه اختصاصی\">\n                <span class=\"proto-dot\"></span>\n                HTTPS (پروکسی SSL)\n              </button>\n            </div>\n          </div>\n\n          <!-- Client Compatibility Notice Banner -->\n          <div class=\"v2rayng-notice-banner\">\n            <div class=\"notice-icon\">\n              <svg viewBox=\"0 0 24 24\" fill=\"currentColor\">\n                <path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z\"/>\n              </svg>\n            </div>\n            <div class=\"notice-content\">\n              <strong>اندروید v2rayNG:</strong> اگر آپدیت با HTTP نشد از <strong>اشتراک HTTPS</strong> استفاده کنید (اندروید به‌صورت پیش‌فرض HTTP ساده را بلاک می‌کند). برای v2rayN ویندوز با IP:port خام، <strong>HTTP</strong> را انتخاب کنید.\n            </div>\n          </div>\n\n          <!-- Server Metrics Bar -->\n          <div class=\"server-metrics-strip\">\n            <div class=\"metric-box\">\n              <span class=\"metric-label\">موقعیت</span>\n              <strong class=\"metric-val\" id=\"statLocation\">در حال تشخیص...</strong>\n            </div>\n            <div class=\"metric-box\">\n              <span class=\"metric-label\">پورت</span>\n              <strong class=\"metric-val\" id=\"statPort\">--</strong>\n            </div>\n            <div class=\"metric-box\">\n              <span class=\"metric-label\">هاست / IP</span>\n              <strong class=\"metric-val\" id=\"statHost\">--</strong>\n            </div>\n            <div class=\"metric-box\">\n              <span class=\"metric-label\">آپتایم</span>\n              <strong class=\"metric-val\" id=\"statUptime\">--</strong>\n            </div>\n          </div>\n\n          <!-- Subscriptions List -->\n          <div class=\"sub-items-list\">\n            <!-- 1. Main Compat Sub -->\n            <div class=\"sub-row-card\">\n              <div class=\"sub-meta-header\">\n                <span class=\"badge-recommended\">پیشنهادی</span>\n                <strong class=\"sub-client-name\">v2rayN / v2rayNG / Hiddify / Streisand</strong>\n                <span class=\"sub-compat-badge\" id=\"compatBadge\">(آماده برای v2rayN ویندوز)</span>\n              </div>\n              <div class=\"sub-action-group\">\n                <input type=\"text\" id=\"urlSubCompat\" readonly>\n                <button type=\"button\" class=\"btn-copy\" data-action=\"copy-input\" data-target=\"urlSubCompat\">کپی اشتراک</button>\n                <button type=\"button\" class=\"btn-qr\" data-action=\"qr-input\" data-target=\"urlSubCompat\" title=\"QR Code\">QR</button>\n              </div>\n            </div>\n\n            <!-- 2. Clash Meta / Mihomo -->\n            <div class=\"sub-row-card\">\n              <div class=\"sub-meta-header\">\n                <span class=\"badge-clash\">Clash Meta / Mihomo</span>\n                <strong class=\"sub-client-name\">Clash Verge Rev / Flclash / Mihomo</strong>\n              </div>\n              <div class=\"sub-action-group\">\n                <input type=\"text\" id=\"urlClash\" readonly>\n                <button type=\"button\" class=\"btn-copy\" data-action=\"copy-input\" data-target=\"urlClash\">کپی Clash</button>\n                <button type=\"button\" class=\"btn-qr\" data-action=\"qr-input\" data-target=\"urlClash\" title=\"QR Code\">QR</button>\n              </div>\n            </div>\n\n            <!-- 3. Sing-box Client JSON Outbounds -->\n            <div class=\"sub-row-card\">\n              <div class=\"sub-meta-header\">\n                <span class=\"badge-singbox\">Sing-box Client</span>\n                <strong class=\"sub-client-name\">اوت‌باندهای JSON ‏Sing-box</strong>\n              </div>\n              <div class=\"sub-action-group\">\n                <input type=\"text\" id=\"urlSb\" readonly>\n                <button type=\"button\" class=\"btn-copy\" data-action=\"copy-input\" data-target=\"urlSb\">کپی لینک</button>\n              </div>\n            </div>\n\n            <!-- 4. Full / Advanced Sub -->\n            <div class=\"sub-row-card\">\n              <div class=\"sub-meta-header\">\n                <span class=\"badge-advanced\">اشتراک کامل</span>\n                <strong class=\"sub-client-name\">همه پروتکل‌ها (پیشرفته)</strong>\n              </div>\n              <div class=\"sub-action-group\">\n                <input type=\"text\" id=\"urlSubFull\" readonly>\n                <button type=\"button\" class=\"btn-copy\" data-action=\"copy-input\" data-target=\"urlSubFull\">کپی کامل</button>\n              </div>\n            </div>\n\n            <!-- 5. WireGuard Configuration -->\n            <div class=\"sub-row-card\" id=\"subRowWg\">\n              <div class=\"sub-meta-header\">\n                <span class=\"badge-wg\">WireGuard</span>\n                <strong class=\"sub-client-name\">پروفایل WireGuard ‏(.conf)</strong>\n              </div>\n              <div class=\"sub-action-group\">\n                <input type=\"text\" id=\"urlWgConf\" readonly>\n                <button type=\"button\" class=\"btn-copy\" data-action=\"copy-input\" data-target=\"urlWgConf\">کپی لینک</button>\n                <a href=\"/plasma/wg.conf\" id=\"btnDownloadWg\" download=\"wg0.conf\" class=\"btn-download\">دانلود</a>\n              </div>\n            </div>\n          </div>\n        </section>\n      </div>\n\n      <!-- ================= VIEW 3: NODE (INDIVIDUAL CONFIGS) ================= -->\n      <div id=\"viewNodes\" class=\"view-page\">\n        <section class=\"nodes-container-card\">\n          <div class=\"section-top-row\">\n            <div class=\"section-title-wrap\">\n              <span class=\"red-bar-indicator\"></span>\n              <h2 class=\"section-heading\">نودها و کانفیگ‌های موجود</h2>\n            </div>\n            <div class=\"server-status-tag\">\n              <svg class=\"location-mini-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                <path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"></path>\n                <circle cx=\"12\" cy=\"10\" r=\"3\"></circle>\n              </svg>\n              <span id=\"nodesLocation\">در حال تشخیص...</span>\n            </div>\n          </div>\n          <p class=\"subs-caption\">\n            لینک مستقیم کانفیگ‌ها را کپی کنید یا هرکدام را با QR در v2rayNG، v2rayN یا Hiddify اسکن کنید.\n          </p>\n\n          <!-- Dynamic Node Cards Grid -->\n          <div id=\"nodesContainer\" class=\"nodes-grid\">\n            <div class=\"nodes-loading\">\n              <span class=\"spinner\"></span>\n              <span>در حال بارگذاری نودها...</span>\n            </div>\n          </div>\n        </section>\n      </div>\n\n    </main>\n\n    <!-- Footer -->\n    <footer class=\"cinema-footer\">\n      <div class=\"footer-links-row\">\n        <span>Plasma &bull; </span>\n        \n        <span> &bull; </span>\n        \n        <span> &bull; </span>\n        \n      </div>\n      <div class=\"footer-subtext\">Stream Without Limits &bull; Running on هاست &bull; Plasma Net</div>\n    </footer>\n  </div>\n\n  <!-- Mobile Bottom Navigation Bar (Home + Sub + Node) -->\n  <nav class=\"mobile-nav-bar\" id=\"mobileNav\">\n    <a href=\"#/home\" class=\"mob-link active\" data-page=\"home\">\n      <svg class=\"mob-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n        <path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/>\n      </svg>\n      <span>خانه</span>\n    </a>\n    <a href=\"#/subs\" class=\"mob-link\" data-page=\"subs\">\n      <svg class=\"mob-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n        <path d=\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\"/>\n      </svg>\n      <span>اشتراک</span>\n    </a>\n    <a href=\"#/nodes\" class=\"mob-link\" data-page=\"nodes\">\n      <svg class=\"mob-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n        <path d=\"M4 6h16V4H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2z\"/>\n      </svg>\n      <span>نودها</span>\n    </a>\n    <a href=\"#/usage\" class=\"mob-link\" data-page=\"usage\">\n      <svg class=\"mob-icon\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n        <path d=\"M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z\"/>\n      </svg>\n      <span>مصرف</span>\n    </a>\n  </nav>\n\n  <!-- QR Code Modal -->\n  <div id=\"qrModal\" class=\"cinema-modal-backdrop\">\n    <div class=\"cinema-modal-box\">\n      <div class=\"modal-top\">\n        <h3 id=\"qrModalTitle\">اسکن کد QR</h3>\n        <button type=\"button\" class=\"btn-close-modal\" id=\"qrCloseBtn\">&times;</button>\n      </div>\n      <div class=\"modal-center\">\n        <div id=\"qrcodeWrapper\"></div>\n        <p class=\"qr-notice\">با v2rayN، v2rayNG، Hiddify یا Streisand اسکن کنید.</p>\n      </div>\n    </div>\n  </div>\n\n  <!-- Toast Notification -->\n  <div id=\"bkToast\" class=\"cinema-toast\"></div>\n\n  <script src=\"/plasma-assets/app.js\"></script>\n</body>\n</html>\n",
  appCss: "/* ====================================================================\n   PLASMA — Modern RTL UI (dark default, light alt theme)\n   ==================================================================== */\n*{box-sizing:border-box;margin:0;padding:0}\n:root{\n  --bg:#0a0e1c; --bg2:#101731; --surface:rgba(255,255,255,.045); --surface2:rgba(255,255,255,.075);\n  --card:#121830; --line:rgba(148,163,255,.16); --txt:#eef0ff; --sub:#b9c0e4; --mut:#8a92ba;\n  --vio:#8b7cf6; --blu:#5ea0ff; --acc:#7c6cf0; --acc2:#4f8cff; --ok:#3ecf8e; --warn:#f5b14c; --bad:#f2708a;\n  --grad:linear-gradient(120deg,#4f8cff,#7c5cff 55%,#c86dd7);\n  --shadow:0 18px 44px -18px rgba(0,0,0,.6);\n  --font:\"Vazirmatn\",Tahoma,\"Segoe UI\",system-ui,-apple-system,sans-serif;\n  --ease:cubic-bezier(.22,1,.36,1); --radius:18px;\n}\nbody.theme-cozy, body[data-theme=\"cozy\"]{\n  --bg:#eef1fb; --bg2:#e2e8fa; --surface:rgba(20,28,70,.05); --surface2:rgba(20,28,70,.09);\n  --card:#ffffff; --line:rgba(50,60,130,.16); --txt:#1b2140; --sub:#47507a; --mut:#6d76a0;\n  --shadow:0 18px 40px -20px rgba(50,60,140,.35);\n}\nhtml{scroll-behavior:smooth}\nbody{\n  min-height:100vh; color:var(--txt); font-family:var(--font); direction:rtl;\n  background:\n    radial-gradient(900px 520px at 12% -8%, rgba(94,160,255,.20), transparent 60%),\n    radial-gradient(820px 560px at 105% 0%, rgba(139,124,246,.22), transparent 55%),\n    radial-gradient(700px 500px at 50% 115%, rgba(200,109,215,.12), transparent 60%),\n    linear-gradient(160deg, var(--bg), var(--bg2));\n  background-attachment:fixed;\n  -webkit-font-smoothing:antialiased; overflow-x:hidden;\n}\na{color:inherit}\nbutton{font-family:inherit;cursor:pointer}\ninput{font-family:inherit}\n::selection{background:rgba(139,124,246,.4)}\n\n/* ---------- ambient ---------- */\n.cinema-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.ambient-glow{position:absolute;width:560px;height:560px;border-radius:50%;filter:blur(130px);opacity:.35;background:#4f6bff;top:-160px;inset-inline-start:-120px;animation:plasmaFloat 24s var(--ease) infinite alternate}\n.ambient-vignette{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(0,0,0,.28))}\n@keyframes plasmaFloat{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.15)}}\n\n.app-container{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:0 18px 90px}\n\n/* ---------- header ---------- */\n.cinema-header{position:sticky;top:0;z-index:60;margin:0 -18px;padding:0 18px;background:color-mix(in srgb, var(--bg) 78%, transparent);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}\n.header-inner{display:flex;align-items:center;gap:18px;min-height:68px;max-width:1180px;margin:0 auto}\n.header-brand{display:flex;align-items:center;gap:12px;text-decoration:none;flex:0 0 auto}\n.brand-icon-box{width:42px;height:42px;border-radius:13px;background:var(--grad);display:grid;place-items:center;color:#fff;box-shadow:0 10px 24px -8px rgba(124,108,240,.7)}\n.brand-icon-box svg{width:24px;height:24px}\n.brand-logo-img{display:none}\n.brand-info{display:flex;flex-direction:column;line-height:1.25}\n.brand-title{font-size:1.12rem;font-weight:800;letter-spacing:.01em}\n.brand-title .white-text, .brand-title .red-text{color:var(--txt)}\n.brand-tagline{font-size:.72rem;color:var(--mut)}\n.header-nav{display:flex;gap:4px;margin-inline-start:auto}\n.nav-link{position:relative;display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:999px;color:var(--sub);text-decoration:none;font-size:.9rem;font-weight:600;transition:background .25s,color .25s}\n.nav-link svg.nav-icon{width:17px;height:17px}\n.nav-link:hover{background:var(--surface2);color:var(--txt)}\n.nav-link.active{background:var(--grad);color:#fff;box-shadow:0 8px 20px -8px rgba(124,108,240,.8)}\n.active-indicator{display:none}\n.header-actions{display:flex;align-items:center;gap:10px;margin-inline-start:8px}\n.theme-toggle-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--sub);font-size:.82rem;font-weight:600;transition:background .25s,color .25s}\n.theme-toggle-btn:hover{background:var(--surface2);color:var(--txt)}\n.theme-svg{width:16px;height:16px}\n.theme-icon-sun{display:none}\nbody.theme-cozy .theme-icon-sun{display:block}\nbody.theme-cozy .theme-icon-moon{display:none}\n.hamburger-btn{display:none;width:42px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--surface);flex-direction:column;align-items:center;justify-content:center;gap:5px}\n.hamburger-bar{display:block;width:18px;height:2px;border-radius:2px;background:var(--txt);transition:transform .3s var(--ease),opacity .3s}\n.hamburger-btn.active .hamburger-bar:nth-child(1){transform:translateY(7px) rotate(45deg)}\n.hamburger-btn.active .hamburger-bar:nth-child(2){opacity:0}\n.hamburger-btn.active .hamburger-bar:nth-child(3){transform:translateY(-7px) rotate(-45deg)}\n\n/* mobile drawer */\n.mobile-drawer{max-height:0;overflow:hidden;transition:max-height .45s var(--ease)}\n.mobile-drawer.open{max-height:420px}\n.drawer-nav{display:flex;flex-direction:column;gap:4px;padding:12px 0 6px}\n.drawer-nav-item{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:13px;color:var(--sub);text-decoration:none;font-weight:600;font-size:.93rem}\n.drawer-nav-item svg.drawer-icon{width:19px;height:19px}\n.drawer-nav-item.active{background:var(--grad);color:#fff}\n.drawer-socials{display:none}\n\n/* mobile bottom nav */\n.mobile-nav-bar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:70;background:color-mix(in srgb, var(--bg) 88%, transparent);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:8px 10px calc(8px + env(safe-area-inset-bottom))}\n.mob-link{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:12px;color:var(--mut);text-decoration:none;font-size:.7rem;font-weight:600;position:relative}\n.mob-link svg.mob-icon{width:21px;height:21px}\n.mob-link.active{color:var(--txt);background:var(--surface2)}\n\n/* ---------- views ---------- */\n.main-content{padding-top:30px}\n.view-page{display:none;animation:plasmaFade .5s var(--ease)}\n.view-page.active{display:block}\n@keyframes plasmaFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}\n\n/* ---------- hero ---------- */\n.hero-section{display:grid;grid-template-columns:1.15fr .85fr;gap:26px;align-items:stretch;margin-bottom:26px}\n.hero-left{display:flex;flex-direction:column;justify-content:center;gap:16px;padding:14px 4px}\n.hero-tag{align-self:flex-start;padding:6px 14px;border-radius:999px;background:rgba(139,124,246,.14);border:1px solid rgba(139,124,246,.3);color:var(--sub);font-size:.72rem;font-weight:700;letter-spacing:.06em}\n.hero-title{font-size:2.6rem;font-weight:850;line-height:1.2}\n.hero-title .accent-red, .accent-red{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}\n.hero-desc{color:var(--sub);line-height:2;font-size:.98rem}\n.hero-btn-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}\n.btn-primary-red{display:inline-flex;align-items:center;gap:9px;padding:13px 26px;border-radius:999px;background:var(--grad);color:#fff;text-decoration:none;font-weight:700;font-size:.95rem;box-shadow:0 16px 32px -12px rgba(124,108,240,.75);transition:transform .3s var(--ease),box-shadow .3s}\n.btn-primary-red:hover{transform:translateY(-2px)}\n.btn-primary-red svg.btn-icon, .btn-secondary-dark svg.btn-icon{width:18px;height:18px}\n.btn-secondary-dark{display:inline-flex;align-items:center;gap:9px;padding:13px 24px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--txt);text-decoration:none;font-weight:600;font-size:.95rem;transition:background .25s}\n.btn-secondary-dark:hover{background:var(--surface2)}\n.hero-right{display:flex}\n.single-hero-card{position:relative;flex:1;border-radius:26px;border:1px solid var(--line);background:linear-gradient(150deg, rgba(94,160,255,.16), rgba(139,124,246,.14) 45%, rgba(200,109,215,.12)), var(--surface);display:flex;align-items:center;justify-content:center;min-height:260px;overflow:hidden}\n.hero-card-glow{position:absolute;width:340px;height:340px;border-radius:50%;background:#7c6cf0;filter:blur(110px);opacity:.35}\n.hero-visual{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff}\n.hero-visual svg{width:92px;height:92px;filter:drop-shadow(0 14px 28px rgba(0,0,0,.4))}\n.hero-visual span{font-size:1.5rem;font-weight:800;letter-spacing:.04em}\n.hero-card-img{display:none}\n.hero-card-badge{position:absolute;bottom:16px;inset-inline-start:16px;display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(10,14,28,.55);color:#e8ecff;font-size:.78rem;font-weight:600;backdrop-filter:blur(8px)}\n.pulse-dot, .status-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 rgba(62,207,142,.5);animation:plasmaPulse 2s infinite}\n@keyframes plasmaPulse{70%{box-shadow:0 0 0 8px rgba(62,207,142,0)}100%{box-shadow:0 0 0 0 rgba(62,207,142,0)}}\n\n/* ---------- location card ---------- */\n.location-preview-section{margin-bottom:26px}\n.location-card{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 24px;box-shadow:var(--shadow)}\n.location-card-left{display:flex;gap:16px;align-items:flex-start}\n.location-pin-wrap{width:50px;height:50px;border-radius:15px;background:var(--grad);display:grid;place-items:center;color:#fff;flex:0 0 auto}\n.location-pin-wrap svg.pin-svg{width:25px;height:25px}\n.location-subtitle{font-size:.7rem;font-weight:700;letter-spacing:.08em;color:var(--mut)}\n.location-name{font-size:1.25rem;font-weight:750;margin:5px 0 10px}\n.location-badges-row{display:flex;gap:7px;flex-wrap:wrap}\n.badge-status-online{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;background:rgba(62,207,142,.13);color:var(--ok);font-size:.76rem;font-weight:700}\n.badge-pill{padding:5px 11px;border-radius:999px;background:var(--surface2);color:var(--sub);font-size:.74rem;font-weight:600}\n.location-card-right{display:flex;flex-direction:column;gap:14px;align-items:flex-end}\n.quick-stats-row{display:flex;gap:12px}\n.quick-stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 18px;text-align:center;min-width:96px}\n.qs-label{display:block;font-size:.68rem;color:var(--mut);font-weight:700;letter-spacing:.05em}\n.qs-value{display:block;font-size:1.05rem;font-weight:800;margin-top:3px;direction:ltr}\n.btn-view-nodes{display:inline-flex;align-items:center;gap:8px;color:var(--blu);text-decoration:none;font-weight:700;font-size:.9rem}\n.btn-view-nodes .arrow{transition:transform .3s var(--ease)}\n.btn-view-nodes:hover .arrow{transform:translateX(-4px)}\n\n/* ---------- features bar ---------- */\n.features-bar-section{margin-bottom:10px}\n.features-bar-card{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}\n.feature-cell{display:flex;gap:13px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:17px 18px}\n.feature-icon-wrap{width:44px;height:44px;border-radius:13px;background:rgba(139,124,246,.14);display:grid;place-items:center;flex:0 0 auto}\n.feature-icon-wrap svg.feat-svg{width:22px;height:22px;stroke:var(--vio)}\n.feat-title{font-weight:750;font-size:.94rem}\n.feat-sub{color:var(--mut);font-size:.79rem;margin-top:2px}\n\n/* ---------- section cards ---------- */\n.subs-container-card, .nodes-container-card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px;box-shadow:var(--shadow)}\n.section-top-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:8px}\n.section-title-wrap{display:flex;align-items:center;gap:11px}\n.red-bar-indicator{width:5px;height:24px;border-radius:3px;background:var(--grad)}\n.section-heading{font-size:1.3rem;font-weight:800}\n.server-status-tag{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:.82rem;color:var(--sub)}\n.server-status-tag b{direction:ltr;color:var(--txt)}\n.subs-caption{color:var(--mut);line-height:2;font-size:.88rem;margin-bottom:18px}\n.server-metrics-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}\n.metric-box{background:var(--surface);border:1px solid var(--line);border-radius:15px;padding:14px 16px;text-align:center}\n.metric-label{display:block;font-size:.72rem;color:var(--mut);font-weight:700}\n.metric-val{display:block;font-size:1rem;font-weight:800;margin-top:5px;direction:ltr;word-break:break-all}\n\n/* protocol toggle */\n.proto-selector-wrap{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin:16px 0}\n.proto-label{font-weight:700;font-size:.9rem;color:var(--sub)}\n.proto-toggle-group{display:inline-flex;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:4px;gap:4px}\n.proto-btn{display:inline-flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--sub);padding:8px 18px;border-radius:999px;font-size:.86rem;font-weight:700;transition:background .25s,color .25s}\n.proto-btn .proto-dot{width:8px;height:8px;border-radius:50%;background:var(--mut)}\n.proto-btn.active{background:var(--grad);color:#fff}\n.proto-btn.active .proto-dot{background:#fff}\n.sub-compat-badge{font-size:.78rem;color:var(--mut)}\n\n/* notice */\n.v2rayng-notice-banner{display:flex;gap:12px;align-items:flex-start;background:rgba(94,160,255,.1);border:1px solid rgba(94,160,255,.28);border-radius:15px;padding:14px 17px;margin:16px 0;line-height:2;font-size:.86rem;color:var(--sub)}\n.v2rayng-notice-banner .notice-icon{flex:0 0 auto;color:var(--blu)}\n.v2rayng-notice-banner strong{color:var(--txt)}\n\n/* subscription rows */\n.sub-items-list{display:flex;flex-direction:column;gap:14px;margin-top:8px}\n.sub-row-card{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px}\n.sub-meta-header{display:flex;flex-direction:column;gap:5px;min-width:200px}\n.sub-client-name{font-weight:800;font-size:1rem;display:flex;align-items:center;gap:9px;flex-wrap:wrap}\n.sub-row-card .sub-caption, .sub-meta-header span{color:var(--mut);font-size:.8rem}\n.badge-recommended, .badge-clash, .badge-singbox, .badge-advanced, .badge-wg{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.68rem;font-weight:800;background:rgba(139,124,246,.18);color:var(--vio);border:1px solid rgba(139,124,246,.3)}\n.badge-clash{background:rgba(94,160,255,.15);color:var(--blu);border-color:rgba(94,160,255,.3)}\n.badge-singbox{background:rgba(62,207,142,.13);color:var(--ok);border-color:rgba(62,207,142,.3)}\n.sub-row-url{flex:1;min-width:240px}\n.sub-row-url input, .node-uri-input{width:100%;background:var(--bg);border:1px solid var(--line);color:var(--sub);border-radius:11px;padding:10px 13px;font-size:.78rem;direction:ltr;text-align:left;outline:none}\n.sub-row-url input:focus, .node-uri-input:focus{border-color:var(--vio)}\n.sub-action-group{display:flex;gap:8px}\n.btn-copy, .btn-qr, .btn-download{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:999px;border:1px solid var(--line);background:var(--grad);color:#fff;font-weight:700;font-size:.85rem;text-decoration:none;transition:transform .25s var(--ease),opacity .25s}\n.btn-qr, .btn-download{background:var(--surface2);color:var(--txt)}\n.btn-copy:hover, .btn-qr:hover, .btn-download:hover{transform:translateY(-1px);opacity:.92}\n.btn-copy svg, .btn-qr svg, .btn-download svg, .btn-action-svg{width:16px;height:16px}\n\n/* ---------- nodes ---------- */\n.nodes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:15px;margin-top:16px}\n.nodes-loading, .no-nodes-msg{grid-column:1/-1;text-align:center;color:var(--mut);padding:34px 10px;line-height:2}\n.spinner{width:34px;height:34px;margin:0 auto 12px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--vio);animation:plasmaSpin 1s linear infinite}\n@keyframes plasmaSpin{to{transform:rotate(360deg)}}\n.node-item-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px;display:flex;flex-direction:column;gap:13px}\n.node-card-header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}\n.node-card-title-group{display:flex;align-items:center;gap:9px;min-width:0}\n.proto-badge{padding:4px 11px;border-radius:999px;font-size:.68rem;font-weight:800;background:rgba(94,160,255,.16);color:var(--blu);direction:ltr}\n.badge-proto-vmess{background:rgba(139,124,246,.18);color:var(--vio)}\n.badge-proto-trojan{background:rgba(242,112,138,.15);color:var(--bad)}\n.badge-proto-ss{background:rgba(245,177,76,.15);color:var(--warn)}\n.badge-proto-wg{background:rgba(62,207,142,.14);color:var(--ok)}\n.badge-proto-tuic{background:rgba(200,109,215,.16);color:#c86dd7}\n.node-remark-title{font-size:.92rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;text-align:end}\n.node-badges-group{display:flex;gap:5px;flex-wrap:wrap}\n.node-badge-tag{padding:3px 9px;border-radius:999px;background:var(--surface2);color:var(--mut);font-size:.66rem;font-weight:700;direction:ltr}\n.badge-reality{color:var(--warn)} .badge-tls{color:var(--ok)}\n.node-card-meta{display:flex;gap:8px;flex-wrap:wrap}\n.node-location-tag{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-size:.8rem}\n.node-location-tag svg.loc-icon{width:14px;height:14px}\n.node-uri-box input{width:100%}\n.node-actions-row{display:flex;gap:8px}\n.btn-node-copy{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px;border:0;border-radius:11px;background:var(--grad);color:#fff;font-weight:700;font-size:.84rem}\n.btn-node-qr, .btn-node-dl{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 15px;border-radius:11px;border:1px solid var(--line);background:var(--surface2);color:var(--txt);font-weight:700;font-size:.84rem;text-decoration:none}\n\n/* ---------- usage (bku) ---------- */\n.bku-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin:16px 0}\n.bku-card{background:var(--surface);border:1px solid var(--line);border-radius:15px;padding:16px 18px}\n.bku-card-label{font-size:.78rem;color:var(--mut);font-weight:700}\n.bku-card-total{font-size:1.45rem;font-weight:850;margin:7px 0 4px;direction:ltr;text-align:end}\n.bku-card-split{display:flex;gap:14px;color:var(--sub);font-size:.8rem;direction:ltr}\n.bku-muted{color:var(--mut);font-size:.74rem}\n.bku-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:15px}\n.bku-table{width:100%;border-collapse:collapse;font-size:.85rem;min-width:640px}\n.bku-table th, .bku-table td{padding:11px 14px;border-bottom:1px solid var(--line);text-align:start;white-space:nowrap}\n.bku-table th{color:var(--mut);font-size:.74rem;background:var(--surface)}\n.bku-table td{direction:ltr;text-align:end}\n.bku-table td:first-child{direction:rtl;text-align:start}\n.bku-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-inline-end:8px}\n.bku-pill{display:inline-block;min-width:24px;text-align:center;padding:2px 8px;border-radius:999px;background:var(--surface2);color:var(--mut);font-weight:700}\n.bku-pill.on{background:rgba(62,207,142,.16);color:var(--ok)}\n.bku-nav-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warn);margin-inline-start:6px}\n.bku-nav-dot.over{background:var(--bad)}\ntfoot td, .bku-table tfoot td{font-weight:800}\n.bku-limit{border:1px solid rgba(245,177,76,.35);background:rgba(245,177,76,.08);border-radius:15px;padding:16px 18px;margin:16px 0}\n.bku-limit.is-over{border-color:rgba(242,112,138,.45);background:rgba(242,112,138,.08)}\n.bku-limit-top{display:flex;justify-content:space-between;font-weight:700;font-size:.9rem;direction:ltr}\n.bku-bar{height:9px;border-radius:99px;background:var(--surface2);overflow:hidden;margin:11px 0;direction:ltr}\n.bku-bar-fill{height:100%;border-radius:99px;background:var(--grad);transition:width .6s var(--ease)}\n.bku-limit.is-warn .bku-bar-fill{background:linear-gradient(90deg,#f5b14c,#f28c4c)}\n.bku-limit.is-over .bku-bar-fill{background:linear-gradient(90deg,#f2708a,#e5486c)}\n.bku-limit-msg{color:var(--sub);font-size:.84rem}\n.bku-note{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 17px;color:var(--sub);line-height:2.1;font-size:.85rem;margin:16px 0}\n.bku-fa{direction:rtl}\n.bku-actions{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;margin-top:14px}\n.bku-sync{display:flex;align-items:center;gap:9px;flex-wrap:wrap;color:var(--sub);font-size:.86rem}\n.bku-sync input{width:130px;background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:9px 12px;direction:ltr;outline:none}\n.bku-btn{padding:10px 20px;border:0;border-radius:999px;background:var(--grad);color:#fff;font-weight:700;font-size:.86rem}\n.bku-btn-soft{background:var(--surface2);color:var(--txt);border:1px solid var(--line)}\n.bku-btn[disabled]{opacity:.55;cursor:wait}\n.bku-foot-meta{margin-top:13px;color:var(--mut);font-size:.76rem;direction:ltr;text-align:end}\n\n/* ---------- footer ---------- */\n.cinema-footer{margin-top:34px;text-align:center;color:var(--mut);font-size:.83rem;line-height:2}\n.footer-links-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}\n.footer-links-row a{color:var(--sub);text-decoration:none}\n.footer-subtext{color:var(--mut)}\n\n/* ---------- modal & toast ---------- */\n.cinema-modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(4,6,16,.72);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:18px}\n.cinema-modal-backdrop.active{display:flex}\n.cinema-modal-box{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px;max-width:360px;width:100%;text-align:center;box-shadow:var(--shadow)}\n.modal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}\n.modal-top h3, #qrModalTitle{font-size:1.05rem;font-weight:800}\n.btn-close-modal{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--txt);font-size:1.05rem;line-height:1}\n#qrcodeWrapper{display:grid;place-items:center;background:#fff;border-radius:16px;padding:16px;margin-bottom:14px}\n#qrcodeWrapper img{display:block;max-width:100%}\n.qr-notice, .modal-center{color:var(--mut);font-size:.83rem;line-height:1.9}\n.cinema-toast{position:fixed;bottom:26px;left:50%;transform:translate(-50%,20px);z-index:120;background:var(--card);border:1px solid var(--line);color:var(--txt);padding:12px 24px;border-radius:999px;font-size:.88rem;font-weight:700;opacity:0;pointer-events:none;transition:opacity .35s var(--ease),transform .35s var(--ease);box-shadow:var(--shadow)}\n.cinema-toast.show{opacity:1;transform:translate(-50%,0)}\n\n/* hidden legacy blocks (socials removed from markup; keep classes harmless) */\n.header-sponsor-link, .header-tg-link, .header-yt-btn, .footer-sponsor-link, .sponsor-tag, .sponsor-title, .sponsor-pill, .tg-svg, .yt-svg{display:none}\n\n/* ---------- responsive ---------- */\n@media (max-width:1024px){\n  .features-bar-card{grid-template-columns:repeat(2,1fr)}\n  .bku-cards{grid-template-columns:1fr}\n  .server-metrics-strip{grid-template-columns:repeat(2,1fr)}\n}\n@media (max-width:860px){\n  .header-nav{display:none}\n  .hamburger-btn{display:flex}\n  .hero-section{grid-template-columns:1fr}\n  .hero-title{font-size:2rem}\n  .location-card-right{align-items:flex-start}\n  .app-container{padding-bottom:110px}\n  .mobile-nav-bar{display:flex}\n  .theme-toggle-label{display:none}\n}\n@media (max-width:520px){\n  .features-bar-card{grid-template-columns:1fr}\n  .subs-container-card, .nodes-container-card{padding:19px}\n  .sub-row-card{flex-direction:column;align-items:stretch}\n  .quick-stats-row{flex-wrap:wrap}\n}\n@media (prefers-reduced-motion:reduce){\n  *,*:before,*:after{animation:none!important;transition:none!important}\n}\n\n\n/* ====================================================================\n   PLASMA v3 — premium TitanDesk-inspired overrides (dark theme)\n   ==================================================================== */\n:root{\n  --bg:#060913; --bg2:#0b1122;\n  --surface:rgba(255,255,255,.05); --surface2:rgba(255,255,255,.09);\n  --card:#0d1430; --line:rgba(150,140,255,.20);\n  --vio:#8b7cff; --blu:#5ea0ff; --acc:#7c5cff; --acc2:#4f8cff;\n  --grad:linear-gradient(120deg,#4f8cff,#7c5cff 52%,#c86dd7);\n  --shadow:0 24px 54px -20px rgba(2,4,16,.75);\n  --radius:20px;\n}\nbody:not(.theme-cozy):not([data-theme=\"cozy\"]){\n  background:\n    radial-gradient(1000px 560px at 8% -10%, rgba(94,160,255,.16), transparent 60%),\n    radial-gradient(900px 620px at 108% -4%, rgba(124,92,255,.26), transparent 55%),\n    radial-gradient(760px 520px at 50% 118%, rgba(45,212,191,.10), transparent 60%),\n    linear-gradient(165deg, var(--bg), var(--bg2));\n  background-attachment:fixed;\n}\n.node-item-card,.subs-container-card,.nodes-container-card,.location-card,.cinema-modal-box{border-radius:22px;box-shadow:var(--shadow)}\n.feature-cell{border-radius:20px;transition:transform .3s var(--ease),border-color .3s}\n.feature-cell:hover{transform:translateY(-3px);border-color:rgba(150,140,255,.4)}\n.node-item-card{transition:transform .3s var(--ease),border-color .3s}\n.node-item-card:hover{transform:translateY(-3px);border-color:rgba(150,140,255,.4)}\n.btn-primary-red:hover{transform:translateY(-2px)}\n.nav-link{border-radius:12px;transition:background .25s,color .25s}\n::selection{background:rgba(124,92,255,.45);color:#fff}\n::-webkit-scrollbar{width:10px;height:10px}\n::-webkit-scrollbar-track{background:transparent}\n::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7c5cff,#4f8cff);border-radius:99px;border:2px solid var(--bg)}\n\n/* plasma-fonts */\n@font-face{font-family:'Morabba';src:url('/f/morabba.woff2') format('woff2');font-weight:700;font-style:normal;font-display:swap}\n@font-face{font-family:'IRANSansX';src:url('/f/iransansx.ttf') format('truetype');font-weight:100 1000;font-style:normal;font-display:swap}\n\n:root{--font:\"IRANSansX\",\"Vazirmatn\",Tahoma,\"Segoe UI\",system-ui,-apple-system,sans-serif}\n.hero-title,.section-heading,.brand-title{font-family:'Morabba',\"IRANSansX\",sans-serif}\n\n\n/* ====================================================================\n   PLASMA v3.1 — professional right sidebar layout (desktop only)\n   ==================================================================== */\n@media (min-width:1100px){\n  .app-container{max-width:1460px;padding-right:296px}\n  .cinema-header{position:fixed;top:0;right:0;bottom:0;width:272px;margin:0;padding:0;border-bottom:0;border-left:1px solid var(--line);background:color-mix(in srgb, var(--bg) 84%, transparent);backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);z-index:90}\n  .header-inner{flex-direction:column;align-items:stretch;gap:6px;height:100%;min-height:0;max-width:none;margin:0;padding:22px 16px 16px;overflow-y:auto}\n  .header-brand{padding:2px 8px 16px;border-bottom:1px solid var(--line);margin-bottom:8px}\n  .header-nav{display:flex;flex-direction:column;align-items:stretch;gap:5px;margin:0}\n  .header-nav::before{content:'منوی اصلی';font-size:.68rem;font-weight:700;letter-spacing:.04em;color:var(--mut);padding:2px 10px 6px}\n  .nav-link{justify-content:flex-start;width:100%;padding:11px 13px;border-radius:13px;font-size:.92rem}\n  .nav-link .active-indicator{display:none}\n  .header-actions{margin:0;border-top:1px solid var(--line);padding-top:13px;justify-content:flex-start}\n  .mobile-drawer{display:none!important}\n}\n",
  appJs: "// Plasma — Client Application\n\nlet gateData = null;\n\n// Direct link to per-user subscription management (/users page)\ndocument.addEventListener('DOMContentLoaded', () => {\n  const seg = window.location.pathname.split('/').filter(Boolean)[0] || 'plasma';\n  document.querySelectorAll('a[data-users-link]').forEach(a => { a.href = '/' + seg + '/users'; });\n});\n\n// --- Toast Feedback ---\nfunction showToast(text) {\n  const toast = document.getElementById('bkToast');\n  if (!toast) return;\n  toast.innerText = text;\n  toast.classList.add('show');\n  setTimeout(() => {\n    toast.classList.remove('show');\n  }, 2200);\n}\n\n// --- Clipboard Copy ---\nfunction copyTextToClipboard(text) {\n  if (!text) return;\n  const successMsg = 'کپی شد!';\n\n  if (navigator.clipboard && window.isSecureContext) {\n    navigator.clipboard.writeText(text).then(() => {\n      showToast(successMsg);\n    }).catch(() => {\n      fallbackCopy(text, successMsg);\n    });\n  } else {\n    fallbackCopy(text, successMsg);\n  }\n}\n\nfunction fallbackCopy(text, msg) {\n  const textArea = document.createElement('textarea');\n  textArea.value = text;\n  textArea.style.position = 'fixed';\n  textArea.style.opacity = '0';\n  document.body.appendChild(textArea);\n  textArea.focus();\n  textArea.select();\n  try {\n    document.execCommand('copy');\n    showToast(msg);\n  } catch (err) {\n    showToast('کپی نشد');\n  }\n  document.body.removeChild(textArea);\n}\n\n// --- QR Code Modal ---\nfunction openQr(text, title) {\n  if (!text) return;\n  const modal = document.getElementById('qrModal');\n  const wrapper = document.getElementById('qrcodeWrapper');\n  const titleEl = document.getElementById('qrModalTitle');\n  if (!modal || !wrapper) return;\n\n  if (titleEl && title) {\n    titleEl.innerText = title;\n  } else if (titleEl) {\n    titleEl.innerText = 'اسکن کد QR';\n  }\n\n  wrapper.innerHTML = '';\n  const img = document.createElement('img');\n  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(text)}`;\n  img.alt = 'کد QR';\n  img.width = 240;\n  img.height = 240;\n  wrapper.appendChild(img);\n\n  modal.classList.add('active');\n}\n\nfunction closeQr() {\n  document.getElementById('qrModal')?.classList.remove('active');\n}\n\ndocument.getElementById('qrCloseBtn')?.addEventListener('click', closeQr);\ndocument.getElementById('qrModal')?.addEventListener('click', (e) => {\n  if (e.target.id === 'qrModal') closeQr();\n});\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Escape') closeQr();\n});\n\n// --- Theme Switcher (Dark Cinema / Cozy Warm) ---\nfunction applyTheme(theme) {\n  const isCozy = (theme === 'cozy');\n  const targetTheme = isCozy ? 'cozy' : 'dark';\n\n  document.documentElement.setAttribute('data-theme', targetTheme);\n  document.body.setAttribute('data-theme', targetTheme);\n\n  if (isCozy) {\n    document.body.classList.add('theme-cozy');\n  } else {\n    document.body.classList.remove('theme-cozy');\n  }\n\n  const toggleBtn = document.getElementById('themeToggleBtn');\n  const toggleLabel = document.getElementById('themeToggleLabel');\n  if (toggleBtn) {\n    toggleBtn.setAttribute('data-theme', targetTheme);\n    toggleBtn.setAttribute('aria-pressed', isCozy ? 'true' : 'false');\n    toggleBtn.classList.toggle('is-cozy', isCozy);\n  }\n  if (toggleLabel) {\n    toggleLabel.textContent = isCozy ? 'روشن' : 'تیره';\n  }\n}\n\nfunction initTheme() {\n  const savedTheme = localStorage.getItem('bk-theme') || localStorage.getItem('bk_gate_theme') || 'dark';\n  applyTheme(savedTheme);\n}\n\nfunction toggleTheme() {\n  const current = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-cozy') ? 'cozy' : 'dark');\n  const nextTheme = (current === 'cozy') ? 'dark' : 'cozy';\n  applyTheme(nextTheme);\n  try {\n    localStorage.setItem('bk-theme', nextTheme);\n    localStorage.setItem('bk_gate_theme', nextTheme);\n  } catch {}\n  showToast(nextTheme === 'cozy' ? 'تم روشن فعال شد' : 'تم تیره فعال شد');\n}\n\ndocument.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);\ninitTheme();\n\n// --- Event Delegation for Copy & QR Buttons ---\ndocument.addEventListener('click', (e) => {\n  const btn = e.target.closest('button, a');\n  if (!btn) return;\n\n  const action = btn.getAttribute('data-action');\n  if (!action) return;\n\n  if (action === 'copy-input') {\n    const targetId = btn.getAttribute('data-target');\n    const input = document.getElementById(targetId);\n    if (input) copyTextToClipboard(input.value);\n  } else if (action === 'qr-input') {\n    const targetId = btn.getAttribute('data-target');\n    const input = document.getElementById(targetId);\n    if (input) openQr(input.value, 'QR اشتراک');\n  } else if (action === 'copy-text') {\n    const raw = btn.getAttribute('data-text');\n    if (raw) copyTextToClipboard(decodeURIComponent(raw));\n  } else if (action === 'qr-text') {\n    const raw = btn.getAttribute('data-text');\n    const title = btn.getAttribute('data-title') || 'اسکن کد QR';\n    if (raw) openQr(decodeURIComponent(raw), title);\n  }\n});\n\n// --- SPA Hash Router (Home, Sub, Node) ---\nfunction handleRouting() {\n  let hash = window.location.hash || '#/home';\n  if (hash === '#' || hash === '') hash = '#/home';\n  const page = hash.replace(/^#\\/?/, '').split('?')[0].toLowerCase() || 'home';\n\n  let validPage = 'home';\n  if (page === 'subs' || page === 'sub') {\n    validPage = 'subs';\n  } else if (page === 'nodes' || page === 'node') {\n    validPage = 'nodes';\n  } else if (page === 'usage' || page === 'traffic') {\n    validPage = 'usage';\n  }\n\n  // Toggle active view\n  document.querySelectorAll('.view-page').forEach(el => {\n    el.classList.remove('active');\n  });\n\n  let targetViewId = 'viewHome';\n  if (validPage === 'subs') targetViewId = 'viewSubs';\n  else if (validPage === 'nodes') targetViewId = 'viewNodes';\n  else if (validPage === 'usage') targetViewId = 'viewUsage';\n\n  const targetView = document.getElementById(targetViewId);\n  if (targetView) targetView.classList.add('active');\n\n  // Toggle header, mobile bar, and drawer nav links\n  document.querySelectorAll('.nav-link, .mob-link, .drawer-nav-item').forEach(el => {\n    if (el.getAttribute('data-page') === validPage) {\n      el.classList.add('active');\n    } else {\n      el.classList.remove('active');\n    }\n  });\n\n  toggleDrawer(false);\n  window.scrollTo({ top: 0, behavior: 'smooth' });\n}\n\nwindow.addEventListener('hashchange', handleRouting);\n\n// --- Mobile Drawer Controls ---\nconst hamburgerBtn = document.getElementById('hamburgerBtn');\nconst mobileDrawer = document.getElementById('mobileDrawer');\n\nfunction toggleDrawer(open) {\n  if (!hamburgerBtn || !mobileDrawer) return;\n  const isOpen = (typeof open === 'boolean') ? open : !mobileDrawer.classList.contains('open');\n  mobileDrawer.classList.toggle('open', isOpen);\n  hamburgerBtn.classList.toggle('active', isOpen);\n  hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');\n  mobileDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');\n}\n\nhamburgerBtn?.addEventListener('click', (e) => {\n  e.stopPropagation();\n  toggleDrawer();\n});\n\n// Close drawer on clicking any link inside it\nmobileDrawer?.querySelectorAll('a').forEach(link => {\n  link.addEventListener('click', () => toggleDrawer(false));\n});\n\n// Close drawer on click outside\ndocument.addEventListener('click', (e) => {\n  if (mobileDrawer?.classList.contains('open')) {\n    if (!mobileDrawer.contains(e.target) && !hamburgerBtn?.contains(e.target)) {\n      toggleDrawer(false);\n    }\n  }\n});\n\n// Close drawer on Escape key\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Escape' && mobileDrawer?.classList.contains('open')) {\n    toggleDrawer(false);\n  }\n});\n\n// Helper to escape HTML characters\nfunction escapeHtml(str) {\n  if (!str) return '';\n  return String(str)\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/\"/g, '&quot;')\n    .replace(/'/g, '&#039;');\n}\n\n// Render dynamic node cards\nfunction renderNodes(nodes, locationStr) {\n  const container = document.getElementById('nodesContainer');\n  if (!container) return;\n\n  // Filter out any invalid or hysteria nodes\n  const activeNodes = (nodes || []).filter(n => {\n    if (!n || !n.uri) return false;\n    const lowerType = (n.type || '').toLowerCase();\n    return !lowerType.includes('hy2') && !lowerType.includes('hysteria');\n  });\n\n  if (activeNodes.length === 0) {\n    container.innerHTML = `\n      <div class=\"no-nodes-msg\">\n        <p>نود فعالی پیدا نشد. وضعیت موتورها را بررسی کنید.</p>\n      </div>\n    `;\n    return;\n  }\n\n  let html = '';\n  activeNodes.forEach((node, index) => {\n    const rawUri = node.uri;\n    const name = node.name || `Plasma - Node ${index + 1}`;\n    const lowerType = (node.type || '').toLowerCase();\n\n    // Determine protocol badge\n    let protoLabel = 'VLESS';\n    let protoClass = 'badge-proto-vless';\n    if (lowerType.includes('vmess')) {\n      protoLabel = 'VMess';\n      protoClass = 'badge-proto-vmess';\n    } else if (lowerType.includes('trojan')) {\n      protoLabel = 'Trojan';\n      protoClass = 'badge-proto-trojan';\n    } else if (lowerType.includes('shadowsocks') || lowerType.startsWith('ss')) {\n      protoLabel = 'Shadowsocks';\n      protoClass = 'badge-proto-ss';\n    } else if (lowerType.includes('wireguard') || lowerType.includes('wg')) {\n      protoLabel = 'WireGuard';\n      protoClass = 'badge-proto-wg';\n    } else if (lowerType.includes('tuic')) {\n      protoLabel = 'TUIC';\n      protoClass = 'badge-proto-tuic';\n    }\n\n    // Determine transport / security badges\n    let transportBadge = '';\n    if (lowerType.includes('ws')) {\n      transportBadge = '<span class=\"node-badge-tag\">WS</span>';\n    } else if (lowerType.includes('httpupgrade')) {\n      transportBadge = '<span class=\"node-badge-tag\">HTTPUpgrade</span>';\n    } else if (lowerType.includes('grpc')) {\n      transportBadge = '<span class=\"node-badge-tag\">gRPC</span>';\n    } else if (lowerType.includes('xhttp')) {\n      transportBadge = '<span class=\"node-badge-tag\">XHTTP</span>';\n    }\n\n    let secBadge = '';\n    if (lowerType.includes('reality')) {\n      secBadge = '<span class=\"node-badge-tag badge-reality\">Reality</span>';\n    } else if (lowerType.includes('tls') || lowerType.includes('shadowtls')) {\n      secBadge = '<span class=\"node-badge-tag badge-tls\">TLS</span>';\n    }\n\n    const encodedUri = encodeURIComponent(rawUri);\n    const encodedTitle = encodeURIComponent(name);\n\n    html += `\n      <div class=\"node-item-card\">\n        <div class=\"node-card-header\">\n          <div class=\"node-card-title-group\">\n            <span class=\"proto-badge ${protoClass}\">${protoLabel}</span>\n            <h4 class=\"node-remark-title\" title=\"${escapeHtml(name)}\">${escapeHtml(name)}</h4>\n          </div>\n          <div class=\"node-badges-group\">\n            ${transportBadge}\n            ${secBadge}\n          </div>\n        </div>\n\n        <div class=\"node-card-meta\">\n          <div class=\"node-location-tag\">\n            <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"loc-icon\">\n              <path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"></path>\n              <circle cx=\"12\" cy=\"10\" r=\"3\"></circle>\n            </svg>\n            <span>${escapeHtml(locationStr || 'سرور جهانی')}</span>\n          </div>\n          ${node.note ? `<div class=\"node-location-tag\" style=\"opacity:.85;font-size:.78rem\">${escapeHtml(node.note)}</div>` : ''}\n        </div>\n\n        <div class=\"node-uri-box\">\n          <input type=\"text\" class=\"node-uri-input\" readonly value=\"${escapeHtml(rawUri)}\" onclick=\"this.select();\">\n        </div>\n\n        <div class=\"node-actions-row\">\n          <button type=\"button\" class=\"btn-node-copy\" data-action=\"copy-text\" data-text=\"${encodedUri}\">\n            <svg class=\"btn-action-svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\"/>\n            </svg>\n            <span>کپی لینک</span>\n          </button>\n          <button type=\"button\" class=\"btn-node-qr\" data-action=\"qr-text\" data-text=\"${encodedUri}\" data-title=\"${encodedTitle}\" title=\"نمایش کد QR\">\n            <svg class=\"btn-action-svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h3v2h-3v-2zm2 2h2v2h-2v-2zm-2 2h3v2h-3v-2zm5 0h2v4h-4v-2h2v-2zm-3 2h2v2h-2v-2z\"/>\n            </svg>\n            <span>QR</span>\n          </button>\n          ${node.wgConf ? `\n            <a href=\"/plasma/wg.conf\" download=\"wg0.conf\" class=\"btn-node-dl\" title=\"دانلود پروفایل WireGuard\">\n              <span>.conf</span>\n            </a>\n          ` : ''}\n        </div>\n      </div>\n    `;\n  });\n\n  container.innerHTML = html;\n}\n\n// --- Load Gate Data from Server ---\nasync function loadGateData() {\n  try {\n    const pathSegments = window.location.pathname.split('/').filter(Boolean);\n    const pathPrefix = pathSegments[0] || 'plasma';\n\n    // Fetch server status\n    const res = await fetch('/health');\n    const data = await res.json();\n    gateData = data;\n\n    // Determine host and port\n    const pubPort = data.publicPort || window.location.port || '2705';\n    const serverHost = data.domain || data.host || window.location.hostname;\n    const locationStr = data.location || 'سرور جهانی';\n\n    // Format Uptime\n    let uptimeStr = '--';\n    if (data.uptime !== undefined) {\n      const mins = Math.floor(data.uptime / 60);\n      const secs = Math.floor(data.uptime % 60);\n      uptimeStr = `${mins} دقیقه ${secs} ثانیه`;\n    }\n\n    // Update Home Section Stats\n    const homeLocation = document.getElementById('homeLocation');\n    if (homeLocation) homeLocation.innerText = locationStr;\n\n    const homePort = document.getElementById('homePort');\n    if (homePort) homePort.innerText = pubPort;\n\n    const homeUptime = document.getElementById('homeUptime');\n    if (homeUptime) homeUptime.innerText = uptimeStr;\n\n    // Update Sub Section Metrics\n    const statLocation = document.getElementById('statLocation');\n    if (statLocation) statLocation.innerText = locationStr;\n\n    const statPort = document.getElementById('statPort');\n    if (statPort) statPort.innerText = pubPort;\n\n    const statHost = document.getElementById('statHost');\n    if (statHost) statHost.innerText = serverHost;\n\n    const statUptime = document.getElementById('statUptime');\n    if (statUptime) statUptime.innerText = uptimeStr;\n\n    // Update Node Section Header\n    const nodesLocation = document.getElementById('nodesLocation');\n    if (nodesLocation) nodesLocation.innerText = locationStr;\n\n    // Update Engines\n    const engines = [];\n    if (data.engines?.singbox) engines.push('sing-box');\n    if (data.engines?.xray) engines.push('xray');\n    if (data.engines?.argo) engines.push('argo');\n    const statEngines = document.getElementById('statEngines');\n    if (statEngines) statEngines.innerText = engines.join(' + ') || 'sing-box فعال';\n\n    // Subscription URLs protocol determination:\n    // Default to HTTP for raw IP/ports so Windows clients (v2rayN) connect without SSL handshake errors.\n    // If the panel was loaded over HTTPS or has forceHttps/publicBaseUrl, default to HTTPS.\n    let activeProto = (data.forceHttps || window.location.protocol === 'https:') ? 'https:' : 'http:';\n\n    const updateSubscriptionUrls = (proto) => {\n      let origin;\n      if (data.publicBaseUrl && typeof data.publicBaseUrl === 'string' && data.publicBaseUrl.trim()) {\n        origin = data.publicBaseUrl.trim().replace(/\\/+$/, '');\n      } else if (data.subBase && typeof data.subBase === 'string' && data.subBase.trim()) {\n        origin = data.subBase.trim().replace(/\\/+$/, '');\n      } else {\n        const hostPort = window.location.port ? `${window.location.hostname}:${window.location.port}` : window.location.hostname;\n        if (proto === 'https:') {\n          if (data.domain) {\n            origin = data.domain.startsWith('http') ? data.domain : `https://${data.domain}`;\n          } else if (window.location.protocol === 'https:') {\n            origin = window.location.origin;\n          } else {\n            origin = `https://${hostPort}`;\n          }\n        } else {\n          origin = `http://${hostPort}`;\n        }\n      }\n\n      const bkTok = (data && data.subToken) ? encodeURIComponent(data.subToken) : ''; const bkQ = (u) => bkTok ? u + (u.indexOf('?') >= 0 ? '&' : '?') + 'token=' + bkTok : u; const compatSubUrl = bkQ(`${origin}/${pathPrefix}/base64`);\n      const fullSubUrl = bkQ(`${origin}/${pathPrefix}/base64?compat=full`);\n      const clashUrl = bkQ(`${origin}/${pathPrefix}/clash`);\n      const sbUrl = bkQ(`${origin}/${pathPrefix}/sb/raw`);\n      const wgConfUrl = bkQ(`${origin}/${pathPrefix}/wg.conf`);\n\n      const elCompat = document.getElementById('urlSubCompat');\n      if (elCompat) elCompat.value = compatSubUrl;\n\n      const elFull = document.getElementById('urlSubFull');\n      if (elFull) elFull.value = fullSubUrl;\n\n      const elClash = document.getElementById('urlClash');\n      if (elClash) elClash.value = clashUrl;\n\n      const elSb = document.getElementById('urlSb');\n      if (elSb) elSb.value = sbUrl;\n\n      const elWg = document.getElementById('urlWgConf');\n      if (elWg) elWg.value = wgConfUrl;\n\n      const btnDlWg = document.getElementById('btnDownloadWg');\n      if (btnDlWg) btnDlWg.href = `${origin}/${pathPrefix}/wg.conf`;\n\n      const compatBadge = document.getElementById('compatBadge');\n      if (compatBadge) {\n        compatBadge.innerText = (proto === 'https:') ? '(اشتراک HTTPS)' : '(آماده برای v2rayN ویندوز)';\n      }\n    };\n\n    updateSubscriptionUrls(activeProto);\n\n    // Setup interactive protocol toggle buttons\n    const btnProtoHttp = document.getElementById('btnProtoHttp');\n    const btnProtoHttps = document.getElementById('btnProtoHttps');\n    if (btnProtoHttp && btnProtoHttps) {\n      btnProtoHttp.classList.toggle('active', activeProto === 'http:');\n      btnProtoHttps.classList.toggle('active', activeProto === 'https:');\n\n      btnProtoHttp.onclick = () => {\n        activeProto = 'http:';\n        btnProtoHttp.classList.add('active');\n        btnProtoHttps.classList.remove('active');\n        updateSubscriptionUrls('http:');\n        showToast('به HTTP تغییر کرد (سازگار با v2rayN ویندوز)');\n      };\n\n      btnProtoHttps.onclick = () => {\n        activeProto = 'https:';\n        btnProtoHttps.classList.add('active');\n        btnProtoHttp.classList.remove('active');\n        updateSubscriptionUrls('https:');\n        showToast('به HTTPS تغییر کرد (نیازمند پروکسی SSL)');\n      };\n    }\n\n    // Render node list\n    renderNodes(data.nodes, locationStr);\n\n  } catch (err) {\n    console.error('Failed to load gate status:', err);\n    const container = document.getElementById('nodesContainer');\n    if (container) {\n      container.innerHTML = `\n        <div class=\"no-nodes-msg\">\n          <p>اتصال به سرور برقرار نشد. صفحه را تازه کنید یا اتصال را بررسی کنید.</p>\n        </div>\n      `;\n    }\n  }\n}\n\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  handleRouting();\n  loadGateData();\n});\n\n// --- Traffic usage view (BK_TRAFFIC_APPLIED) ---\n(function () {\n  const $ = (id) => document.getElementById(id);\n  if (!$('viewUsage')) return;\n  const prefix = '/' + (window.location.pathname.split('/').filter(Boolean)[0] || 'plasma');\n  const API = prefix + '/api/traffic';\n  const NAMES = { 'VLESS-WS': 'VLESS WS', 'VMess-WS': 'VMess WS', 'Trojan-WS': 'Trojan WS', 'VLESS-XHTTP': 'VLESS XHTTP', 'VLESS-HTTPUpgrade': 'VLESS HTTPUpgrade', 'VMess-HTTPUpgrade': 'VMess HTTPUpgrade', 'Trojan-HTTPUpgrade': 'Trojan HTTPUpgrade', 'VLESS-gRPC': 'VLESS gRPC', 'Shadowsocks-WS': 'Shadowsocks WS', 'Other': 'سایر' };\n  const COLORS = { 'VLESS-WS': '#60a5fa', 'VMess-WS': '#a78bfa', 'Trojan-WS': '#f9a8d4', 'VLESS-XHTTP': '#5eead4', 'VLESS-HTTPUpgrade': '#fcd34d', 'VMess-HTTPUpgrade': '#c4b5fd', 'Trojan-HTTPUpgrade': '#fda4af', 'VLESS-gRPC': '#86efac', 'Shadowsocks-WS': '#fdba74', 'Other': '#94a3b8' };\n  const fmt = (b) => {\n    b = Number(b) || 0; const neg = b < 0; b = Math.abs(b);\n    const u = ['B', 'KiB', 'MiB', 'GiB', 'TiB']; let i = 0;\n    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }\n    return (neg ? '-' : '') + (i === 0 ? b.toFixed(0) : b.toFixed(b >= 100 ? 0 : b >= 10 ? 1 : 2)) + ' ' + u[i];\n  };\n  const set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };\n  const tot = (e) => e ? (e.up || 0) + (e.down || 0) : 0;\n  let timer = null; let last = null;\n\n  function navDots(level) {\n    document.querySelectorAll('[data-page=\"usage\"]').forEach((a) => {\n      let d = a.querySelector('.bku-nav-dot');\n      if (level === 'warn' || level === 'over') {\n        if (!d) { d = document.createElement('span'); d.className = 'bku-nav-dot'; const s = a.querySelector('span'); (s || a).appendChild(d); }\n        d.classList.toggle('over', level === 'over');\n      } else if (d) d.remove();\n    });\n  }\n\n  function render(d) {\n    if (!d || !d.ok) return;\n    last = d;\n    set('bkuLiveUp', fmt(d.live.upBps) + '/s'); set('bkuLiveDown', fmt(d.live.downBps) + '/s');\n    set('bkuDayTotal', fmt(d.day.total)); set('bkuDayUp', fmt(d.day.up)); set('bkuDayDown', fmt(d.day.down));\n    set('bkuMonthTotal', fmt(d.month.used)); set('bkuMonthUp', fmt(d.month.up)); set('bkuMonthDown', fmt(d.month.down));\n    set('bkuMonthKey', '(' + d.month.key + ')');\n    set('bkuAllTotal', fmt(d.allTime.total)); set('bkuAllUp', fmt(d.allTime.up)); set('bkuAllDown', fmt(d.allTime.down));\n    const rows = d.keys.filter((k) => k === 'VLESS-WS' || k === 'VMess-WS' || k === 'Trojan-WS' || k === 'VLESS-XHTTP' || tot(d.allTime.per[k]) > 0 || (d.active[k] || 0) > 0);\n    let html = '';\n    rows.forEach((k) => {\n      const m = d.month.per[k] || {}; const a = d.active[k] || 0;\n      html += '<tr><td><span class=\"bku-dot\" style=\"background:' + COLORS[k] + ';box-shadow:0 0 10px ' + COLORS[k] + '\"></span>' + NAMES[k] + '</td>' +\n        '<td><span class=\"bku-pill' + (a ? ' on' : '') + '\">' + a + '</span></td>' +\n        '<td>' + fmt(tot(d.day.per[k])) + '</td><td>' + fmt(m.up) + '</td><td>' + fmt(m.down) + '</td><td>' + fmt(tot(m)) + '</td><td>' + fmt(tot(d.allTime.per[k])) + '</td></tr>';\n    });\n    const rb = $('bkuRows'); if (rb && rb.innerHTML !== html) rb.innerHTML = html;\n    let foot = '<tr><td>مجموع</td><td></td><td>' + fmt(d.day.total) + '</td><td>' + fmt(d.month.up) + '</td><td>' + fmt(d.month.down) + '</td><td>' + fmt(d.month.total) + '</td><td>' + fmt(d.allTime.total) + '</td></tr>';\n    if (d.month.baseBytes) foot += '<tr><td colspan=\"5\">Synced with هاست (adjustment)</td><td>' + fmt(d.month.baseBytes) + '</td><td></td></tr>';\n    const fb = $('bkuFoot'); if (fb && fb.innerHTML !== foot) fb.innerHTML = foot;\n\n    const box = $('bkuLimit');\n    if (d.limit) {\n      box.hidden = false;\n      const pct = Math.max(0, d.limit.pct);\n      box.classList.toggle('is-warn', d.limit.level === 'warn');\n      box.classList.toggle('is-over', d.limit.level === 'over');\n      set('bkuLimitText', fmt(d.limit.used) + ' of ' + fmt(d.limit.bytes) + ' از این ماه مصرف شده');\n      set('bkuLimitPct', pct.toFixed(1) + '%');\n      $('bkuBar').style.width = Math.min(100, pct).toFixed(2) + '%';\n      set('bkuLimitMsg', d.limit.level === 'over' ? 'Limit reached (estimate). Check هاست → Account → Usage before more traffic is billed.'\n        : d.limit.level === 'warn' ? 'بیش از ۸۰٪ مصرف شده — ' + fmt(d.limit.remaining) + ' از این ماه مانده.'\n        : fmt(d.limit.remaining) + ' از این ماه مانده.');\n      navDots(d.limit.level);\n    } else { box.hidden = true; navDots('ok'); }\n    const resets = new Date(d.month.resetsAt);\n    set('bkuMeta', 'شمارش از ' + new Date(d.since).toLocaleString() + ' · ریست ماه: ' + resets.toUTCString().replace(':00 GMT', ' UTC').replace(' GMT', ' UTC') + (d.persisted ? ' · ذخیره در ' + d.file : ' · ذخیره نشده (پوشه داده قابل نوشتن نیست)'));\n  }\n\n  async function load() {\n    try {\n      const r = await fetch(API, { cache: 'no-store', credentials: 'same-origin' });\n      if (r.ok) render(await r.json());\n    } catch (_) {}\n  }\n  async function post(path, body) {\n    const r = await fetch(API + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-BK-Req': '1' }, body: JSON.stringify(body || {}) });\n    if (!r.ok) throw new Error('HTTP ' + r.status);\n    render(await r.json());\n  }\n  const isActive = () => $('viewUsage').classList.contains('active') && document.visibilityState === 'visible';\n  function schedule() { clearTimeout(timer); timer = setTimeout(async () => { await load(); schedule(); }, isActive() ? 2000 : 60000); }\n  window.addEventListener('hashchange', () => { if (/usage|traffic/.test(window.location.hash)) load(); schedule(); });\n  document.addEventListener('visibilitychange', () => { if (isActive()) load(); schedule(); });\n\n  const resetBtn = $('bkuResetBtn');\n  resetBtn.addEventListener('click', async () => {\n    if (!window.confirm('همه شمارنده‌های ترافیک (امروز، ماه و کل) ریست شوند؟')) return;\n    resetBtn.disabled = true;\n    try { await post('/reset'); if (typeof showToast === 'function') showToast('شمارنده ترافیک ریست شد'); } catch (_) { if (typeof showToast === 'function') showToast('ریست ناموفق بود'); }\n    resetBtn.disabled = false;\n  });\n  $('bkuSyncBtn').addEventListener('click', async () => {\n    const v = parseFloat($('bkuSyncGb').value);\n    if (!isFinite(v) || v < 0) { if (typeof showToast === 'function') showToast('مقدار مصرف (GiB) نمایش‌داده‌شده در هاست را وارد کنید'); return; }\n    try { await post('/baseline', { gb: v }); $('bkuSyncGb').value = ''; if (typeof showToast === 'function') showToast('مصرف ماه با هاست همگام شد'); } catch (_) { if (typeof showToast === 'function') showToast('همگام‌سازی ناموفق بود'); }\n  });\n  load(); schedule();\n})();\n",
  bgJpg: "",
  cozybgJpg: "",
  homeJpg: "",
  logo: ""
};

class AssetManager {
  static getIndexHtml() { return EMBEDDED_ASSETS.indexHtml; }
  static getAppCss() { return EMBEDDED_ASSETS.appCss; }
  static getAppJs() { return EMBEDDED_ASSETS.appJs; }

  static _assetCandidates(filename) {
    const dirs = [
      path.join(process.cwd(), 'assets'),
      path.join(process.cwd()),
      path.join(__dirname, 'assets'),
      path.join(__dirname),
      path.join(__dirname, '..', 'assets')
    ];
    const list = [];
    const baseNoExt = filename.replace(/\.[^.]+$/, '');
    const ext = path.extname(filename);
    const variations = [
      filename,
      filename.toLowerCase(),
      filename.toUpperCase(),
      baseNoExt.toLowerCase() + ext.toLowerCase(),
      baseNoExt.toLowerCase() + ext.toUpperCase()
    ];
    for (const d of dirs) {
      for (const v of variations) {
        const full = path.join(d, v);
        if (!list.includes(full)) list.push(full);
      }
    }
    return list;
  }

  static _readFileCandidate(filenames) {
    const names = Array.isArray(filenames) ? filenames : [filenames];
    for (const name of names) {
      for (const p of this._assetCandidates(name)) {
        try {
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            if (buf && buf.length > 0) return buf;
          }
        } catch (_) {}
      }
    }
    return null;
  }

  static getBgJpg() {
    const buf = this._readFileCandidate(['bg.jpg', 'bg.JPG']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.bgJpg) {
      return Buffer.from(EMBEDDED_ASSETS.bgJpg, 'base64');
    }
    return null;
  }

  static getCozyBgJpg() {
    const buf = this._readFileCandidate(['cozybg.jpg', 'cozybg.JPG', 'cozy-bg.jpg']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.cozybgJpg) {
      return Buffer.from(EMBEDDED_ASSETS.cozybgJpg, 'base64');
    }
    return null;
  }

  static getHomeJpg() {
    const buf = this._readFileCandidate(['home.jpg', 'home.JPG']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.homeJpg) {
      return Buffer.from(EMBEDDED_ASSETS.homeJpg, 'base64');
    }
    return null;
  }

  static getLogo() {
    const buf = this._readFileCandidate(['logo.png', 'logo.jpg', 'logo-64.png', 'logo-original.png']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.logo) {
      return Buffer.from(EMBEDDED_ASSETS.logo, 'base64');
    }
    return null;
  }

  // Compatibility aliases
  static getBgPng() { return this.getBgJpg(); }
  static getCozyBgPng() { return this.getCozyBgJpg(); }
  static getHomePng() { return this.getHomeJpg(); }
  static getLogoPng() { return this.getLogo(); }
}

// --- Module: lib/tls-sni.js ---
/**
 * Extracts Server Name Indication (SNI) and ALPN from TLS ClientHello record buffer
 * RFC 5246 / RFC 8446 / RFC 7301 compliant binary parser
 */
function parseClientHello(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 42) {
    return { sni: null, alpn: [] };
  }

  try {
    if (buf[0] !== 0x16 || buf[1] !== 0x03) {
      return { sni: null, alpn: [] };
    }

    let offset = 5;
    if (buf[offset] !== 0x01) {
      return { sni: null, alpn: [] };
    }

    offset += 1 + 3 + 2 + 32;
    if (offset >= buf.length) return { sni: null, alpn: [] };

    const sessionIdLen = buf[offset];
    offset += 1 + sessionIdLen;
    if (offset + 2 > buf.length) return { sni: null, alpn: [] };

    const cipherSuitesLen = buf.readUInt16BE(offset);
    offset += 2 + cipherSuitesLen;
    if (offset + 1 > buf.length) return { sni: null, alpn: [] };

    const compMethodsLen = buf[offset];
    offset += 1 + compMethodsLen;
    if (offset + 2 > buf.length) return { sni: null, alpn: [] };

    const extTotalLen = buf.readUInt16BE(offset);
    offset += 2;
    const extLimit = Math.min(offset + extTotalLen, buf.length);

    let sni = null;
    const alpn = [];

    while (offset + 4 <= extLimit) {
      const extType = buf.readUInt16BE(offset);
      const extLen = buf.readUInt16BE(offset + 2);
      offset += 4;

      if (extType === 0x0000 && !sni) {
        // server_name
        if (offset + 2 <= extLimit) {
          const sniListLen = buf.readUInt16BE(offset);
          let sniOffset = offset + 2;
          const sniLimit = Math.min(sniOffset + sniListLen, extLimit);

          while (sniOffset + 3 <= sniLimit) {
            const nameType = buf[sniOffset];
            const nameLen = buf.readUInt16BE(sniOffset + 1);
            sniOffset += 3;

            if (nameType === 0x00 && sniOffset + nameLen <= buf.length) {
              sni = buf.toString('utf8', sniOffset, sniOffset + nameLen);
              break;
            }
            sniOffset += nameLen;
          }
        }
      } else if (extType === 0x0010) {
        // ALPN (Application-Layer Protocol Negotiation)
        if (offset + 2 <= extLimit) {
          const alpnListLen = buf.readUInt16BE(offset);
          let aOffset = offset + 2;
          const aLimit = Math.min(aOffset + alpnListLen, extLimit);
          while (aOffset + 1 <= aLimit) {
            const pLen = buf[aOffset];
            aOffset++;
            if (aOffset + pLen <= aLimit) {
              alpn.push(buf.toString('utf8', aOffset, aOffset + pLen));
            }
            aOffset += pLen;
          }
        }
      }

      offset += extLen;
    }

    return { sni, alpn };
  } catch {
    return { sni: null, alpn: [] };
  }
}

function parseClientHelloSni(buf) {
  return parseClientHello(buf).sni;
}

function parseClientHelloAlpn(buf) {
  return parseClientHello(buf).alpn;
}

// --- Module: lib/logger.js ---
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  electric: '\x1b[38;5;39m',
  navy: '\x1b[38;5;25m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

class Logger {
  static quiet = false;

  static banner() {
    if (this.quiet) return;
    console.log(`${ANSI.cyan}================================================================${ANSI.reset}`);
    console.log(`${ANSI.bold}${ANSI.electric}  PLASMA ${ANSI.white}• Running on ${bkPlatformName()}${ANSI.reset}`);
    console.log(`${ANSI.cyan}================================================================${ANSI.reset}
`);
  }

  static renewNotice() {}

  static info(msg) {
    if (!this.quiet) console.log(`${ANSI.cyan}[i] ${msg}${ANSI.reset}`);
  }

  static success(msg) {
    if (!this.quiet) console.log(`${ANSI.green}[OK] ${msg}${ANSI.reset}`);
  }

  static warn(msg) {
    if (!this.quiet) console.log(`${ANSI.yellow}[!] ${msg}${ANSI.reset}`);
  }

  static error(msg) {
    console.error(`${ANSI.red}[X] ${msg}${ANSI.reset}`);
  }

  static step(msg) {
    if (!this.quiet) console.log(`${ANSI.electric}==> ${msg}${ANSI.reset}`);
  }

  static item(label, val) {
    if (!this.quiet) {
      console.log(`  ${ANSI.cyan}${label.padEnd(18)}:${ANSI.reset} ${ANSI.white}${val}${ANSI.reset}`);
    }
  }

  static section(title) {
    if (!this.quiet) {
      console.log(`\n${ANSI.bold}${ANSI.electric}--- ${title} ---${ANSI.reset}`);
    }
  }
}

// --- Module: lib/config.js ---
// BK_FIX3_APPLIED
// BK_REPLIT_APPLIED
function bkOnReplit() {
  return !!(process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID || process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN);
}
function bkOnRailway() {
  return !!(process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_PUBLIC_DOMAIN);
}
/** Replit / Railway: public edge terminates TLS on 443 and forwards plain HTTP to PORT. */
function bkOnEdgeHost() { return bkOnReplit() || bkOnRailway(); }
function bkPlatformName() { return bkOnReplit() ? 'Replit' : (bkOnRailway() ? 'Railway' : 'Self-hosted'); }
/** Published Replit app domain from REPLIT_DOMAINS (custom domain first, then *.replit.app; never the private *.replit.dev). */
function bkReplitDomain() {
  if (!process.env.REPLIT_DEPLOYMENT) return '';
  const list = String(process.env.REPLIT_DOMAINS || '').split(',').map((d) => normalizeHost(d)).filter(Boolean);
  return list.find((d) => !d.endsWith('.replit.app') && !d.endsWith('.replit.dev')) || list.find((d) => d.endsWith('.replit.app')) || '';
}
/** Platform default hostnames: a relay / custom domain the visitor used beats these. */
function bkIsPlatformHost(h) { return /(^|\.)(up\.railway\.app|replit\.app|replit\.dev)$/.test(String(h || '')); }
/** Normalize "https://Name.example.com:443/path" -> "name.example.com" (IPv6 literals kept). */
function normalizeHost(v) {
  let h = String(v || '').trim();
  if (!h) return '';
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0].split('?')[0].split('#')[0];
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  if ((h.match(/:/g) || []).length === 1) h = h.split(':')[0];
  return h.toLowerCase();
}
function isIpLiteral(h) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h.startsWith('[');
}
// BK_PROTOCOLS_APPLIED: every path / gRPC service routed on the single public port
const BK_P = '/@Plasma--@Plasma--@Plasma--@Plasma--';
const BK_PATHS = {
  vlessWs: BK_P + 'ws',
  vmessWs: BK_P + 'vmess',
  trojanWs: BK_P + 'trojan',
  vlessHu: BK_P + 'httpupgrade',
  vmessHu: BK_P + 'vmess-hu',
  trojanHu: BK_P + 'trojan-hu',
  xhttp: BK_P + 'xhttp',
  ssWs: BK_P + 'ss',
  grpcService: BK_P.slice(1) + 'grpc'
};
const BK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Short, non-secret form of a credential for logs. */
function bkMask(v) { v = String(v || ''); return v ? v.slice(0, 4) + '…' + '(' + v.length + ' chars)' : '(empty)'; }
/** Shadowsocks 2022 methods need a base64 key of an exact length. */
function bkSs2022KeyLen(method) { return /^2022-blake3-aes-128-gcm$/i.test(method) ? 16 : (/^2022-blake3-/i.test(method) ? 32 : 0); }

/**
 * Default configuration template for Plasma
 */
const DEFAULT_CONFIG = {
  brand: 'Plasma',
  product: 'Plasma',
  tagline: 'Plasma — پنل مدیریت اشتراک',
  publicPort: parseInt(process.env.PORT || process.env.SERVER_PORT || '8080', 10) || 8080,
  panelPath: 'plasma',
  dataDirHint: '/data',
  uuid: '',
  domain: '',
  forceHost: '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.SUB_BASE_URL || '',
  subBase: process.env.SUB_BASE || '',
  forceHttps: process.env.FORCE_HTTPS === 'true' || false,
  allowLocalHostLinks: false,
  nodePrefix: 'Plasma - ',
  sniHy2: 'www.google.com',
  massProxyUrl: 'https://www.gstatic.com',
  enable: {
    hysteria2: false,
    vlessWs: true,
    vlessWsTls: true,
    vlessHttpUpgrade: true,
    vmessHttpUpgrade: true,
    trojanHttpUpgrade: true,
    vlessXhttp: false,
    vlessGrpc: true,
    vlessGrpcTls: true,
    trojanWs: true,
    trojanWsTls: true,
    ssWs: false,
    trojanGrpcTls: true,
    vmessWsTls: true,
    vmessWs: true,
    reality: true,
    shadowTlsVless: false,
    shadowsocks: true,
    wireguard: true,
    tuic: false,
    socks: false,
    httpProxy: false,
    argo: false
  },
  argo: {
    domain: '',
    auth: '',
    localPort: 8001
  },
  reality: {
    target: 'www.microsoft.com',
    targetPort: 443,
    shortId: ''
  },
  shadowTls: {
    sni: 'www.microsoft.com',
    password: ''
  },
  shadowsocks: {
    method: 'aes-256-gcm',
    password: ''
  },
  wireguard: {
    port: 51820,
    serverIp: '10.66.66.1/24',
    clientIp: '10.66.66.2/32',
    mtu: 1420
  },
  tuic: {
    port: 8443,
    congestionController: 'bbr'
  },
  socks: {
    user: '',
    pass: ''
  },
  httpProxy: {
    user: '',
    pass: ''
  },
  singBoxVersion: '1.11.15',
  xrayVersion: '',
  panelToken: '',
  cpuLimitPercent: null,
  quietConsoleAfterMs: 180000,
};

/**
 * Determine suitable writable data directory for Railway (volume) or local
 */
function resolveDataDir(hint = '/data') { // BK_ZEROCONF_APPLIED
  const tryDir = (dir) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      const probe = path.join(dir, '.bk-write-test');
      fs.writeFileSync(probe, 'ok'); fs.unlinkSync(probe);
      return true;
    } catch { return false; }
  };
  const candidates = [
    [process.env.BK_DATA_DIR || process.env.FILE_PATH, 'BK_DATA_DIR'],
    [process.env.RAILWAY_VOLUME_MOUNT_PATH, 'Railway volume (RAILWAY_VOLUME_MOUNT_PATH)'],
    [hint, 'default ' + hint],
    [path.join(process.cwd(), 'bk-data'), './bk-data fallback'],
    [path.join(__dirname, 'bk-data'), 'app-dir bk-data fallback'],
    [path.join(os.tmpdir(), 'bk-data'), 'temp-dir fallback']
  ];
  for (const [dir, source] of candidates) {
    if (dir && tryDir(dir)) { resolveDataDir.info = { dir, source }; return dir; }
  }
  const dir = path.join(os.tmpdir(), 'bk-data');
  resolveDataDir.info = { dir, source: 'temp-dir fallback (not writable?)' };
  return dir;
}

/**
 * Merge user runtime config with environment variables and defaults
 */
function buildConfig(userOverrides = {}) {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Merge direct overrides
  if (userOverrides && typeof userOverrides === 'object') {
    for (const [key, val] of Object.entries(userOverrides)) {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val) && cfg[key] && typeof cfg[key] === 'object') {
          cfg[key] = { ...cfg[key], ...val };
        } else {
          cfg[key] = val;
        }
      }
    }
  }

  // Environment variables overrides
  const env = process.env;
  const parseBool = (v, defaultVal) => (v !== undefined ? v === '1' || v === 'true' : defaultVal);

  if (env.PORT || env.SERVER_PORT || env.SB_PORT) {
    const parsedPort = parseInt(env.PORT || env.SERVER_PORT || env.SB_PORT, 10);
    if (!isNaN(parsedPort) && parsedPort > 0) {
      cfg.publicPort = parsedPort;
    }
  }
  if (env.UUID || env.SB_UUID) cfg.uuid = env.UUID || env.SB_UUID;
  if (env.DOMAIN || env.SB_DOMAIN) cfg.domain = env.DOMAIN || env.SB_DOMAIN;
  if (env.FORCE_HOST || env.CFIP) cfg.forceHost = env.FORCE_HOST || env.CFIP;
  if (env.ALLOW_LOCALHOST_LINKS !== undefined) cfg.allowLocalHostLinks = parseBool(env.ALLOW_LOCALHOST_LINKS, false);
  if (env.PANEL_PATH || env.SUB_PATH) cfg.panelPath = (env.PANEL_PATH || env.SUB_PATH).replace(/^\//, '');
  if (env.NODE_PREFIX) cfg.nodePrefix = env.NODE_PREFIX;
  if (env.PANEL_TOKEN) cfg.panelToken = env.PANEL_TOKEN;
  if (env.SNI_HY2 || env.SB_SNI) cfg.sniHy2 = env.SNI_HY2 || env.SB_SNI;
  if (env.MASS_PROXY_URL || env.SB_MASS_PROXY) cfg.massProxyUrl = env.MASS_PROXY_URL || env.SB_MASS_PROXY;

  // Protocol enable switches via env
  if (env.ENABLE_HYSTERIA2 !== undefined) cfg.enable.hysteria2 = parseBool(env.ENABLE_HYSTERIA2, cfg.enable.hysteria2);
  if (env.ENABLE_VLESS_WS !== undefined) cfg.enable.vlessWs = parseBool(env.ENABLE_VLESS_WS, cfg.enable.vlessWs);
  if (env.ENABLE_HTTPUPGRADE !== undefined) cfg.enable.vlessHttpUpgrade = parseBool(env.ENABLE_HTTPUPGRADE, cfg.enable.vlessHttpUpgrade);
  if (env.ENABLE_XHTTP !== undefined) cfg.enable.vlessXhttp = parseBool(env.ENABLE_XHTTP, cfg.enable.vlessXhttp);
  else if (bkOnEdgeHost()) cfg.enable.vlessXhttp = true;
  if (env.XRAY_VERSION) cfg.xrayVersion = String(env.XRAY_VERSION).trim().replace(/^v/i, '');
  if (env.ENABLE_REALITY !== undefined) cfg.enable.reality = parseBool(env.ENABLE_REALITY, cfg.enable.reality);
  if (env.ENABLE_VLESS_GRPC !== undefined) cfg.enable.vlessGrpc = parseBool(env.ENABLE_VLESS_GRPC, cfg.enable.vlessGrpc);
  // BK_PROTOCOLS_APPLIED: per-type switches (all share the one public PORT)
  const bkSw = { ENABLE_VLESS_WS_TLS: 'vlessWsTls', ENABLE_VMESS_WS: 'vmessWs', ENABLE_VMESS_WS_TLS: 'vmessWsTls',
    ENABLE_VLESS_GRPC_TLS: 'vlessGrpcTls', ENABLE_TROJAN_GRPC_TLS: 'trojanGrpcTls', ENABLE_TROJAN_WS_TLS: 'trojanWsTls',
    ENABLE_VMESS_HTTPUPGRADE: 'vmessHttpUpgrade', ENABLE_TROJAN_HTTPUPGRADE: 'trojanHttpUpgrade', ENABLE_SS_WS: 'ssWs' };
  for (const [k, f] of Object.entries(bkSw)) if (env[k] !== undefined) cfg.enable[f] = parseBool(env[k], cfg.enable[f]);
  if (env.ENABLE_TROJAN_WS !== undefined || env.ENABLE_TROJAN !== undefined) {
    cfg.enable.trojanWs = parseBool(env.ENABLE_TROJAN_WS !== undefined ? env.ENABLE_TROJAN_WS : env.ENABLE_TROJAN, cfg.enable.trojanWs);
  }
  if (env.ENABLE_SHADOWTLS_VLESS !== undefined) cfg.enable.shadowTlsVless = parseBool(env.ENABLE_SHADOWTLS_VLESS, cfg.enable.shadowTlsVless);
  if (env.ENABLE_SS !== undefined) cfg.enable.shadowsocks = parseBool(env.ENABLE_SS, cfg.enable.shadowsocks);
  if (env.ENABLE_WIREGUARD !== undefined || env.ENABLE_WG !== undefined) {
    cfg.enable.wireguard = parseBool(env.ENABLE_WIREGUARD !== undefined ? env.ENABLE_WIREGUARD : env.ENABLE_WG, cfg.enable.wireguard);
  }
  if (env.ENABLE_TUIC !== undefined) cfg.enable.tuic = parseBool(env.ENABLE_TUIC, cfg.enable.tuic);
  if (env.ENABLE_SOCKS !== undefined) cfg.enable.socks = parseBool(env.ENABLE_SOCKS, cfg.enable.socks);
  if (env.ENABLE_HTTP_PROXY !== undefined) cfg.enable.httpProxy = parseBool(env.ENABLE_HTTP_PROXY, cfg.enable.httpProxy);
  if (env.ENABLE_ARGO !== undefined) cfg.enable.argo = parseBool(env.ENABLE_ARGO, cfg.enable.argo);

  if (env.WG_PORT) cfg.wireguard.port = parseInt(env.WG_PORT, 10);
  if (env.WG_SERVER_IP) cfg.wireguard.serverIp = env.WG_SERVER_IP;
  if (env.WG_CLIENT_IP) cfg.wireguard.clientIp = env.WG_CLIENT_IP;

  if (env.TUIC_PORT) cfg.tuic.port = parseInt(env.TUIC_PORT, 10);
  if (env.TUIC_CC) cfg.tuic.congestionController = env.TUIC_CC;

  if (env.ARGO_DOMAIN) cfg.argo.domain = env.ARGO_DOMAIN;
  if (env.ARGO_AUTH) cfg.argo.auth = env.ARGO_AUTH;
  if (env.ARGO_PORT) cfg.argo.localPort = parseInt(env.ARGO_PORT, 10);

  if (env.REALITY_TARGET) cfg.reality.target = env.REALITY_TARGET;
  if (env.REALITY_TARGET_PORT) cfg.reality.targetPort = parseInt(env.REALITY_TARGET_PORT, 10);
  if (env.REALITY_SHORT_ID) cfg.reality.shortId = env.REALITY_SHORT_ID;

  if (env.SHADOWTLS_SNI) cfg.shadowTls.sni = env.SHADOWTLS_SNI;
  if (env.SHADOWTLS_PASSWORD) cfg.shadowTls.password = env.SHADOWTLS_PASSWORD;

  if (env.SS_METHOD) cfg.shadowsocks.method = env.SS_METHOD;
  if (env.SS_PASSWORD) cfg.shadowsocks.password = env.SS_PASSWORD;

  if (env.CPU_LIMIT_PERCENT) cfg.cpuLimitPercent = parseInt(env.CPU_LIMIT_PERCENT, 10);

  // Public hostname: DOMAIN / FORCE_HOST win, then Railway's generated domain. Never fall back to an
  // egress IP on Railway (the edge routes by hostname only; an IP link can never connect).
  // Replit: REPLIT_DOMAINS (published app only). Railway: RAILWAY_PUBLIC_DOMAIN.
  cfg.domain = normalizeHost(cfg.domain) || bkReplitDomain() || normalizeHost(env.RAILWAY_PUBLIC_DOMAIN) || normalizeHost(env.RAILWAY_STATIC_URL) || '';
  cfg.forceHost = normalizeHost(cfg.forceHost) || '';

  // Data paths
  const dataDir = resolveDataDir(cfg.dataDirHint);
  const paths = {
    dataDir,
    stateFile: path.join(dataDir, 'state.json'),
    binDir: path.join(dataDir, 'bin'),
    certDir: path.join(dataDir, 'cert'),
    certPath: path.join(dataDir, 'cert', 'cert.pem'),
    keyPath: path.join(dataDir, 'cert', 'key.pem'),
    singboxBin: path.join(dataDir, 'bin', os.platform() === 'win32' ? 'sing-box.exe' : 'sing-box'),
    singboxConfig: path.join(dataDir, 'sing-box.json'),
    singboxLog: path.join(dataDir, 'sing-box.log'),
    xrayBin: path.join(dataDir, 'bin', os.platform() === 'win32' ? 'xray.exe' : 'xray'),
    xrayConfig: path.join(dataDir, 'xray.json'),
    xrayLog: path.join(dataDir, 'xray.log'),
    xrayAccessLog: path.join(dataDir, 'xray-access.log'),
    cloudflaredBin: path.join(dataDir, 'bin', os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared'),
    cloudflaredLog: path.join(dataDir, 'cloudflared.log')
  };

  return {
    ...cfg,
    paths
  };
}

// --- Module: lib/ports.js ---
/**
 * Finds an available TCP port on localhost (127.0.0.1)
 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : null;
      srv.close((err) => {
        if (err) return reject(err);
        if (!port) return reject(new Error('Failed to resolve ephemeral port'));
        resolve(port);
      });
    });
  });
}

/**
 * Allocates multiple distinct free local ports
 */
async function allocatePorts(count = 1) {
  const ports = [];
  for (let i = 0; i < count; i++) {
    // Small delay ensures OS port reclamation doesn't return same port
    const p = await findFreePort();
    ports.push(p);
  }
  return count === 1 ? ports[0] : ports;
}

// --- Module: lib/state.js ---
function deriveX25519PublicKey(privBase64) {
  try {
    if (!privBase64 || typeof privBase64 !== 'string') return null;
    const privBuf = Buffer.from(privBase64.trim(), 'base64');
    if (privBuf.length !== 32) return null;
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), privBuf]);
    const keyObj = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
    return crypto.createPublicKey(keyObj).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
  } catch {
    return null;
  }
}

class StateManager {
  constructor(paths, initialConfig) {
    this.paths = paths;
    this.config = initialConfig;
    this.state = {
      uuid: '',
      hy2Password: '',
      hy2ObfsPassword: '',
      realityPrivateKey: '',
      realityPublicKey: '',
      realityShortId: '',
      shadowTlsPassword: '',
      shadowsocksPassword: '',
      wireguardPrivateKey: '',
      wireguardPublicKey: '',
      wireguardClientPrivateKey: '',
      wireguardClientPublicKey: '',
      publicIp: '',
      links: [],
      clashYaml: '',
      singboxJson: '',
      xrayJson: '',
      base64Sub: '',
      updatedAt: null
    };
  }

  loadOrCreate() {
    try {
      fs.mkdirSync(this.paths.dataDir, { recursive: true });
      if (fs.existsSync(this.paths.stateFile)) {
        const raw = fs.readFileSync(this.paths.stateFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      }
    } catch (err) {
      Logger.warn(`Failed to read existing state.json: ${err.message}. Generating fresh state.`);
    }

    // UUID: Config (env UUID) -> Persisted state -> Generate
    if (this.config.uuid) {
      const raw = String(this.config.uuid).trim();
      if (BK_UUID_RE.test(raw)) {
        this.state.uuid = raw.toLowerCase();
      } else {
        // sing-box rejects non-UUID ids (the whole config would fail): derive a stable UUID from the value instead.
        const h = crypto.createHash('sha256').update(raw).digest();
        h[6] = (h[6] & 0x0f) | 0x40; h[8] = (h[8] & 0x3f) | 0x80;
        const x = h.subarray(0, 16).toString('hex');
        this.state.uuid = `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
        Logger.warn('UUID env value is not a valid UUID (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx); using a stable UUID derived from it.');
      }
    } else if (!this.state.uuid || !BK_UUID_RE.test(this.state.uuid)) {
      this.state.uuid = crypto.randomUUID();
    }

    // Hysteria2 credentials
    this.state.hy2Password = this.state.uuid;
    if (!this.state.hy2ObfsPassword) {
      this.state.hy2ObfsPassword = crypto.randomBytes(8).toString('hex');
    }

    // ShadowTLS credentials
    if (this.config.shadowTls.password) {
      this.state.shadowTlsPassword = this.config.shadowTls.password;
    } else if (!this.state.shadowTlsPassword) {
      this.state.shadowTlsPassword = crypto.randomBytes(12).toString('hex');
    }

    // Shadowsocks credentials
    if (this.config.shadowsocks.password) {
      this.state.shadowsocksPassword = this.config.shadowsocks.password;
    } else if (!this.state.shadowsocksPassword) {
      this.state.shadowsocksPassword = crypto.randomBytes(16).toString('base64url');
    }
    // Shadowsocks 2022 needs a base64 key of exactly 16/32 bytes
    const ssKeyLen = bkSs2022KeyLen(this.config.shadowsocks.method || '');
    if (ssKeyLen) {
      let ok = false;
      try { ok = /^[A-Za-z0-9+/]+={0,2}$/.test(this.state.shadowsocksPassword) && Buffer.from(this.state.shadowsocksPassword, 'base64').length === ssKeyLen; } catch (_) {}
      if (!ok) {
        if (this.config.shadowsocks.password) Logger.warn(`SS_PASSWORD is not a base64 ${ssKeyLen}-byte key (required by ${this.config.shadowsocks.method}); using a generated key.`);
        this.state.ssKey2022 = (this.state.ssKey2022 && Buffer.from(this.state.ssKey2022, 'base64').length === ssKeyLen) ? this.state.ssKey2022 : crypto.randomBytes(ssKeyLen).toString('base64');
        this.state.shadowsocksPassword = this.state.ssKey2022;
      }
    }

    // Reality shortId (only if enabled)
    if (!(this.config.enable && this.config.enable.reality)) {
      this.state.realityShortId = '';
    } else if (this.config.reality.shortId) {
      this.state.realityShortId = this.config.reality.shortId;
    } else if (!this.state.realityShortId) {
      this.state.realityShortId = crypto.randomBytes(4).toString('hex');
    }

    if (this.config.enable && this.config.enable.wireguard) {
    // WireGuard keypairs (Server & Client)
    const isValidKey = (k) => typeof k === 'string' && k.trim().length >= 40;
    let srvPriv = this.state.wireguardPrivateKey;
    let srvPub = this.state.wireguardPublicKey;
    let cliPriv = this.state.wireguardClientPrivateKey;
    let cliPub = this.state.wireguardClientPublicKey;

    if (!isValidKey(srvPriv) || !isValidKey(srvPub)) {
      try {
        const srv = crypto.generateKeyPairSync('x25519');
        srvPriv = srv.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        srvPub = srv.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (err) {
        Logger.warn(`Failed to generate WireGuard server keypair: ${err.message}`);
      }
    } else {
      const derived = deriveX25519PublicKey(srvPriv);
      if (derived) srvPub = derived;
    }

    if (!isValidKey(cliPriv) || !isValidKey(cliPub)) {
      try {
        const cli = crypto.generateKeyPairSync('x25519');
        cliPriv = cli.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        cliPub = cli.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (err) {
        Logger.warn(`Failed to generate WireGuard client keypair: ${err.message}`);
      }
    } else {
      const derived = deriveX25519PublicKey(cliPriv);
      if (derived) cliPub = derived;
    }

    this.state.wireguardPrivateKey = srvPriv;
    this.state.wireguardPublicKey = srvPub;
    this.state.wireguardClientPrivateKey = cliPriv;
    this.state.wireguardClientPublicKey = cliPub;
    } else {
      this.state.wireguardPrivateKey = '';
      this.state.wireguardPublicKey = '';
      this.state.wireguardClientPrivateKey = '';
      this.state.wireguardClientPublicKey = '';
    }

    this.save();
    return this.state;
  }

  setRealityKeys(privateKey, publicKey) {
    this.state.realityPrivateKey = privateKey;
    this.state.realityPublicKey = publicKey;
    this.save();
  }

  setWireGuardKeys(serverPriv, serverPub, clientPriv, clientPub) {
    this.state.wireguardPrivateKey = serverPriv;
    this.state.wireguardPublicKey = serverPub;
    this.state.wireguardClientPrivateKey = clientPriv;
    this.state.wireguardClientPublicKey = clientPub;
    this.save();
  }

  setLinks(links, clashYaml = '', singboxJson = '', xrayJson = '') {
    this.state.links = links;
    this.state.clashYaml = clashYaml;
    this.state.singboxJson = singboxJson;
    this.state.xrayJson = xrayJson;
    this.state.base64Sub = Buffer.from(links.join('\n')).toString('base64');
    this.save();
  }

  setPublicIp(ip) {
    this.state.publicIp = ip;
    this.save();
  }

  save() {
    try {
      this.state.updatedAt = new Date().toISOString();
      fs.mkdirSync(this.paths.dataDir, { recursive: true });
      fs.writeFileSync(this.paths.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      Logger.warn(`Could not save state.json: ${err.message}`);
    }
  }
}

StateManager.deriveX25519PublicKey = deriveX25519PublicKey;

// --- Module: lib/binaries.js ---
/**
 * Normalizes system architecture to sing-box and xray standard
 */
function getNormalizedArch() {
  const arch = os.arch();
  if (arch === 'arm64' || arch === 'aarch64') {
    return { sb: 'arm64', xray: 'arm64-v8a', cf: 'arm64' };
  }
  return { sb: 'amd64', xray: '64', cf: 'amd64' };
}

/**
 * Checks free disk space in megabytes using df -m if on Linux
 */
function checkDiskSpaceMb(dir) {
  if (os.platform() !== 'linux') return 1024; // assume OK on dev machines
  try {
    const res = spawnSync('df', ['-m', dir], { encoding: 'utf8', timeout: 3000 });
    if (res.status === 0 && res.stdout) {
      const lines = res.stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        const avail = parseInt(parts[3], 10);
        if (!isNaN(avail)) return avail;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Download a file with timeout and streaming
 */
async function downloadToFile(url, destPath) {
  const tempPath = `${destPath}.tmp_${Date.now()}`;
  const writer = fs.createWriteStream(tempPath);

  try {
    const resp = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Plasma/1.0'
      }
    });

    await new Promise((resolve, reject) => {
      resp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    fs.renameSync(tempPath, destPath);
    if (os.platform() !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    return true;
  } catch (err) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    throw err;
  }
}

/** Extract a single file (by base name) from a .zip without external tools (Railway images may lack unzip). */
function extractFromZip(zipPath, wantNames) {
  const buf = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: end of central directory not found');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('zip: bad central directory');
    const method = buf.readUInt16LE(off + 10);
    const crc = buf.readUInt32LE(off + 16) >>> 0;
    const csize = buf.readUInt32LE(off + 20);
    const usize = buf.readUInt32LE(off + 24);
    const nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nlen);
    off += 46 + nlen + elen + clen;
    const base = name.split('/').pop();
    if (!wantNames.includes(base)) continue;
    if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error('zip: bad local header');
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.subarray(start, start + csize);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error('zip: unsupported compression method ' + method);
    if (data.length !== usize) throw new Error('zip: size mismatch for ' + base);
    if (typeof zlib.crc32 === 'function' && (zlib.crc32(data) >>> 0) !== crc) throw new Error('zip: CRC mismatch for ' + base);
    return { name: base, data };
  }
  return null;
}

/** Fetch "<url>.dgst" (Xray release format) and return the SHA-256 hex, or null if unavailable. */
async function fetchSha256Digest(url) {
  try {
    const r = await axios.get(url + '.dgst', { timeout: 20000, responseType: 'text', headers: { 'User-Agent': 'Plasma/1.0' } });
    const m = /SHA2?-?256[^=]*=\s*([0-9a-f]{64})/i.exec(String(r.data || ''));
    return m ? m[1].toLowerCase() : null;
  } catch (_) {
    return null;
  }
}

class BinaryManager {
  constructor(config) {
    this.config = config;
    this.paths = config.paths;
    this.arch = getNormalizedArch();
  }

  ensureDirectories() {
    fs.mkdirSync(this.paths.dataDir, { recursive: true });
    fs.mkdirSync(this.paths.binDir, { recursive: true });
    fs.mkdirSync(this.paths.certDir, { recursive: true });
  }

  async ensureSingBox() {
    this.ensureDirectories();
    const bin = this.paths.singboxBin;

    // Check if valid executable already exists
    if (fs.existsSync(bin)) {
      try {
        const stat = fs.statSync(bin);
        if (stat.size > 1024 * 1024) {
          if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755);
          return true;
        }
      } catch {}
    }

    const freeMb = checkDiskSpaceMb(this.paths.binDir);
    if (freeMb !== null && freeMb < 40) {
      Logger.warn(`Low disk space (~${freeMb}MB free). sing-box download might fail with ENOSPC.`);
    }

    const ver = this.config.singBoxVersion || '1.11.15';
    const osType = os.platform() === 'win32' ? 'windows' : 'linux';
    const ext = osType === 'windows' ? 'zip' : 'tar.gz';
    const tarName = `sing-box-${ver}-${osType}-${this.arch.sb}.${ext}`;
    const url = process.env.SB_URL || `https://github.com/SagerNet/sing-box/releases/download/v${ver}/${tarName}`;
    const archivePath = path.join(this.paths.binDir, tarName);

    Logger.step(`Downloading sing-box v${ver} (${osType}-${this.arch.sb})...`);

    try {
      await downloadToFile(url, archivePath);

      if (osType === 'linux') {
        const extDir = path.join(this.paths.binDir, `sb_extract_${Date.now()}`);
        fs.mkdirSync(extDir, { recursive: true });
        const tarRes = spawnSync('tar', ['-xzf', archivePath, '-C', extDir]);
        if (tarRes.status !== 0) throw new Error(`tar extraction failed: ${tarRes.stderr}`);

        // Locate sing-box inside extracted directory
        const files = fs.readdirSync(extDir);
        let foundBin = null;
        for (const f of files) {
          const sub = path.join(extDir, f);
          if (fs.statSync(sub).isDirectory()) {
            const candidate = path.join(sub, 'sing-box');
            if (fs.existsSync(candidate)) {
              foundBin = candidate;
              break;
            }
          }
        }

        if (!foundBin && fs.existsSync(path.join(extDir, 'sing-box'))) {
          foundBin = path.join(extDir, 'sing-box');
        }

        if (!foundBin) throw new Error('sing-box binary not found in archive');

        fs.copyFileSync(foundBin, bin);
        fs.chmodSync(bin, 0o755);

        // Cleanup
        try {
          fs.unlinkSync(archivePath);
          fs.rmSync(extDir, { recursive: true, force: true });
        } catch {}
      }

      Logger.success('sing-box engine installed successfully.');
      return true;
    } catch (err) {
      Logger.error(`sing-box installation error: ${err.message}`);
      return false;
    }
  }

  async ensureXray() {
    this.ensureDirectories();
    const bin = this.paths.xrayBin;
    const want = String(process.env.XRAY_VERSION || this.config.xrayVersion || '').trim().replace(/^v/i, '');
    const probe = () => {
      try {
        const r = spawnSync(bin, ['version'], { encoding: 'utf8', timeout: 15000 });
        const m = /Xray\s+v?(\d+\.\d+\.\d+)/.exec(r.stdout || '');
        return r.status === 0 && m ? m[1] : null;
      } catch (_) { return null; }
    };

    if (fs.existsSync(bin)) {
      if (os.platform() !== 'win32') { try { fs.chmodSync(bin, 0o755); } catch (_) {} }
      const have = probe();
      if (have && (!want || want === have)) {
        Logger.success(`Xray-core ${have} ready (cached in ${this.paths.binDir}).`);
        return true;
      }
      if (have) Logger.info(`Xray-core ${have} cached but XRAY_VERSION=${want} requested - downloading.`);
      else Logger.warn('Cached Xray-core binary is not runnable - re-downloading.');
    }

    const freeMb = checkDiskSpaceMb(this.paths.binDir);
    if (freeMb !== null && freeMb < 60) {
      Logger.warn(`Low disk space (~${freeMb}MB free). Xray-core download might fail.`);
    }

    const osType = os.platform() === 'win32' ? 'windows' : 'linux';
    const zipName = `Xray-${osType}-${this.arch.xray}.zip`;
    const url = process.env.XRAY_URL || (want
      ? `https://github.com/XTLS/Xray-core/releases/download/v${want}/${zipName}`
      : `https://github.com/XTLS/Xray-core/releases/latest/download/${zipName}`);
    const exeName = osType === 'windows' ? 'xray.exe' : 'xray';
    Logger.step(`Downloading Xray-core ${want ? 'v' + want : '(latest stable)'} (${osType}-${this.arch.xray})...`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const archivePath = path.join(this.paths.binDir, `${zipName}.${Date.now()}`);
      const tmpBin = bin + '.new';
      try {
        await downloadToFile(url, archivePath);
        if (!process.env.XRAY_URL) {
          const expected = await fetchSha256Digest(url);
          const actual = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
          if (expected && expected !== actual) throw new Error('SHA-256 mismatch (download corrupted)');
          if (expected) Logger.info('Xray-core archive SHA-256 verified.');
          else Logger.warn('Xray-core .dgst not available; skipped SHA-256 check.');
        }
        const entry = extractFromZip(archivePath, [exeName]);
        if (!entry) throw new Error(exeName + ' not found in archive');
        fs.writeFileSync(tmpBin, entry.data);
        if (os.platform() !== 'win32') fs.chmodSync(tmpBin, 0o755);
        fs.renameSync(tmpBin, bin);
        const ver = probe();
        if (!ver) throw new Error('downloaded binary does not run');
        Logger.success(`Xray-core ${ver} installed (${osType}-${this.arch.xray}).`);
        return true;
      } catch (err) {
        Logger.warn(`Xray-core download attempt ${attempt}/3 failed: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } finally {
        try { fs.unlinkSync(archivePath); } catch (_) {}
        try { if (fs.existsSync(tmpBin)) fs.unlinkSync(tmpBin); } catch (_) {}
      }
    }
    Logger.error('Xray-core unavailable - VLESS-XHTTP disabled for this run.');
    return false;
  }

  async ensureCloudflared() {
    this.ensureDirectories();
    const bin = this.paths.cloudflaredBin;

    if (fs.existsSync(bin)) {
      try {
        if (fs.statSync(bin).size > 1024 * 1024) {
          if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755);
          return true;
        }
      } catch {}
    }

    const url = os.platform() === 'win32'
      ? `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${this.arch.cf === 'arm64' ? 'arm64' : 'amd64'}.exe`
      : `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${this.arch.cf}`;

    Logger.step('Downloading optional Cloudflare Argo tunnel agent (cloudflared)...');

    try {
      await downloadToFile(url, bin);
      if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755);
      Logger.success('cloudflared installed successfully.');
      return true;
    } catch (err) {
      Logger.warn(`Optional cloudflared download skipped: ${err.message}. Argo tunnel will be inactive.`);
      return false;
    }
  }
}

// --- Module: lib/cert.js ---
function asn1(tag, ...children) {
  const content = Buffer.concat(children);
  let len;
  if (content.length < 128) {
    len = Buffer.from([content.length]);
  } else if (content.length < 256) {
    len = Buffer.from([0x81, content.length]);
  } else if (content.length < 65536) {
    len = Buffer.from([0x82, (content.length >> 8) & 0xff, content.length & 0xff]);
  } else {
    len = Buffer.from([0x83, (content.length >> 16) & 0xff, (content.length >> 8) & 0xff, content.length & 0xff]);
  }
  return Buffer.concat([Buffer.from([tag]), len, content]);
}

function seq(...ch) { return asn1(0x30, ...ch); }
function int(val) { return asn1(0x02, Buffer.isBuffer(val) ? val : Buffer.from([val])); }
function oid(bytes) { return asn1(0x06, Buffer.from(bytes)); }
function utf8(str) { return asn1(0x0c, Buffer.from(str, 'utf8')); }
function utcTime(d) {
  const pad = n => String(n).padStart(2, '0');
  const s = String(d.getUTCFullYear()).slice(2) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  return asn1(0x17, Buffer.from(s, 'ascii'));
}

function generateSelfSignedCert(commonName = 'localhost') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });

  // sha256WithRSAEncryption: 1.2.840.113549.1.1.11
  const sigAlg = seq(oid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]), Buffer.from([0x05, 0x00]));
  const name = seq(asn1(0x31, seq(oid([0x55, 0x04, 0x03]), utf8(commonName))));
  const now = new Date();
  const notAfter = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  const validity = seq(utcTime(now), utcTime(notAfter));
  const serial = crypto.randomBytes(8);
  serial[0] &= 0x7f; // Ensure positive integer

  const tbs = seq(
    asn1(0xa0, int(2)), // v3
    int(serial),
    sigAlg,
    name,
    validity,
    name,
    spkiDer
  );

  const sig = crypto.sign('sha256', tbs, privateKey);
  const bitSig = Buffer.concat([Buffer.from([0x00]), sig]);
  const certDer = seq(tbs, sigAlg, asn1(0x03, bitSig));
  const certPem = '-----BEGIN CERTIFICATE-----\n' + certDer.toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
  const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

  return { certPem, keyPem };
}

function ensureTlsCertificates(certPath, keyPath, sni = 'localhost') {
  try {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const c = fs.readFileSync(certPath, 'utf8');
      const k = fs.readFileSync(keyPath, 'utf8');
      if (c.includes('BEGIN CERTIFICATE') && k.includes('PRIVATE KEY')) {
        // BK_PROTOCOLS_APPLIED: renew the self-signed cert shortly before it expires (it is valid for 365 days)
        let expiring = false;
        try { expiring = new Date(new crypto.X509Certificate(c).validTo).getTime() - Date.now() < 3 * 86400000; } catch (_) {}
        if (!expiring) return { cert: c, key: k };
        Logger.warn('Self-signed TLS certificate expired / expiring: generating a new one (TLS links get a new pcs fingerprint).');
      }
    }
  } catch (_) {}

  const certDir = path.dirname(certPath);
  try {
    fs.mkdirSync(certDir, { recursive: true });
  } catch (_) {}

  // 1. Try openssl if available
  try {
    const res = spawnSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-subj', `/CN=${sni}`,
      '-keyout', keyPath,
      '-out', certPath,
      '-days', '365'
    ], { timeout: 15000 });
    if (res.status === 0 && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        cert: fs.readFileSync(certPath, 'utf8'),
        key: fs.readFileSync(keyPath, 'utf8')
      };
    }
  } catch (_) {}

  // 2. Pure JS fallback
  try {
    const { certPem, keyPem } = generateSelfSignedCert(sni);
    fs.writeFileSync(keyPath, keyPem, 'utf8');
    fs.writeFileSync(certPath, certPem, 'utf8');
    return { cert: certPem, key: keyPem };
  } catch (err) {
    Logger.error(`Failed to generate TLS cert: ${err.message}`);
    return null;
  }
}

/** SHA-256 of the served certificate (DER, hex) for Xray's pinnedPeerCertSha256 / share-link "pcs" and Clash "fingerprint". */
function bkCertSha256(certPath) {
  try {
    const st = fs.statSync(certPath);
    if (bkCertSha256._c && bkCertSha256._c.m === st.mtimeMs && bkCertSha256._c.p === certPath) return bkCertSha256._c.v;
    const v = new crypto.X509Certificate(fs.readFileSync(certPath)).fingerprint256.replace(/:/g, '').toLowerCase();
    bkCertSha256._c = { p: certPath, m: st.mtimeMs, v };
    return v;
  } catch (_) { return ''; }
}

// --- Module: lib/engines/singbox.js ---
class SingBoxEngine {
  constructor(config, stateManager, allocatedPorts) {
    this.config = config;
    this.paths = config.paths;
    this.stateManager = stateManager;
    this.ports = allocatedPorts;
    this.process = null;
  }

  /** BK_USERS: UUIDs allowed in inbounds — the default user + every active subscription user. */
  bkUserUuids() {
    try { const a = BkUsers.activeUuids(); if (a && a.length) return a; } catch (_) {}
    return [this.stateManager.state.uuid];
  }

  /** BK_ACTIVITY: like bkUserUuids, but each entry carries the log identity
   *  (subscription tag, or 'owner') so engine access logs can be attributed. */
  bkUserEntries() {
    try { const a = BkUsers.activeEntries(); if (a && a.length) return a; } catch (_) {}
    return [{ uuid: this.stateManager.state.uuid, tag: 'owner' }];
  }

  generateRealityKeys() {
    if (!(this.config.enable && this.config.enable.reality)) return;
    const state = this.stateManager.state;
    if (state.realityPrivateKey && state.realityPublicKey) {
      return;
    }

    if (fs.existsSync(this.paths.singboxBin)) {
      try {
        const res = spawnSync(this.paths.singboxBin, ['generate', 'reality-keypair'], {
          encoding: 'utf8',
          timeout: 10000
        });
        const privMatch = /PrivateKey:\s*(\S+)/i.exec(res.stdout || '');
        const pubMatch = /PublicKey:\s*(\S+)/i.exec(res.stdout || '');

        if (privMatch && pubMatch) {
          this.stateManager.setRealityKeys(privMatch[1], pubMatch[1]);
          Logger.success('Generated fresh REALITY keypair.');
          return;
        }
      } catch (_) {}
    }

    // Fallback: Node crypto x25519 keypair
    try {
      const kp = crypto.generateKeyPairSync('x25519');
      const priv = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64url');
      const pub = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64url');
      this.stateManager.setRealityKeys(priv, pub);
      Logger.success('Generated fresh REALITY keypair via crypto.');
    } catch (err) {
      Logger.warn(`Reality keygen error: ${err.message}.`);
    }
  }

  buildJsonConfig() {
    const state = this.stateManager.state;
    const enable = this.config.enable;
    const wsPath = '/@Plasma--@Plasma--@Plasma--@Plasma--ws';
    const vmessPath = '/@Plasma--@Plasma--@Plasma--@Plasma--vmess';
    const huPath = '/@Plasma--@Plasma--@Plasma--@Plasma--httpupgrade';

    const inbounds = [];

    // 1. VMess + WebSocket (TCP) local inbound
    if ((enable.vmessWs || enable.vmessWsTls) && this.ports.vmessWs) {
      inbounds.push({
        type: 'vmess',
        tag: 'vmess-ws-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vmessWs,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, alterId: 0 }))
        ],
        transport: {
          type: 'ws',
          path: vmessPath,
          max_early_data: 2560,
          early_data_header_name: 'Sec-WebSocket-Protocol'
        }
      });
    }

    // 2. VLESS + WebSocket (TCP) local inbound
    if (enable.vlessWs && this.ports.vlessWs) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-ws-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessWs,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, flow: '' }))
        ],
        tls: { enabled: false },
        transport: {
          type: 'ws',
          path: wsPath,
          max_early_data: 2560,
          early_data_header_name: 'Sec-WebSocket-Protocol'
        }
      });
    }

    // 2b. VLESS + WebSocket + TLS local inbound
    if (enable.vlessWsTls && this.ports.vlessWsTls) {
      ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.domain || 'www.google.com');
      inbounds.push({
        type: 'vless',
        tag: 'vless-ws-tls-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessWsTls,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, flow: '' }))
        ],
        tls: {
          enabled: true,
          server_name: this.config.domain || 'www.google.com',
          alpn: ['http/1.1'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        },
        transport: {
          type: 'ws',
          path: wsPath,
          max_early_data: 2560,
          early_data_header_name: 'Sec-WebSocket-Protocol'
        }
      });
    }

    // 3. VLESS + HTTPUpgrade (TCP) local inbound
    if (enable.vlessHttpUpgrade && this.ports.vlessHu) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-hu-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessHu,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, flow: '' }))
        ],
        tls: { enabled: false },
        transport: {
          type: 'httpupgrade',
          path: huPath
        }
      });
    }

    // 3b. VMess + HTTPUpgrade local inbound (BK_PROTOCOLS_APPLIED)
    if (enable.vmessHttpUpgrade && this.ports.vmessHu) {
      inbounds.push({
        type: 'vmess', tag: 'vmess-hu-in', listen: '127.0.0.1', listen_port: this.ports.vmessHu,
        users: this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, alterId: 0 })),
        transport: { type: 'httpupgrade', path: BK_PATHS.vmessHu }
      });
    }

    // 3c. Trojan + HTTPUpgrade local inbound
    if (enable.trojanHttpUpgrade && this.ports.trojanHu) {
      inbounds.push({
        type: 'trojan', tag: 'trojan-hu-in', listen: '127.0.0.1', listen_port: this.ports.trojanHu,
        users: this.bkUserEntries().map(e => ({ name: e.tag, password: e.uuid })),
        transport: { type: 'httpupgrade', path: BK_PATHS.trojanHu }
      });
    }

    // 4. VLESS + REALITY (TCP) local inbound
    if (enable.reality && this.ports.reality && state.realityPrivateKey) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-reality-in',
        listen: '127.0.0.1',
        listen_port: this.ports.reality,
        users: [
          { uuid: state.uuid, flow: 'xtls-rprx-vision' }
        ],
        tls: {
          enabled: true,
          server_name: this.config.reality.target || 'www.microsoft.com',
          alpn: ['http/1.1'],
          reality: {
            enabled: true,
            handshake: {
              server: this.config.reality.target || 'www.microsoft.com',
              server_port: this.config.reality.targetPort || 443
            },
            private_key: state.realityPrivateKey,
            short_id: [state.realityShortId]
          }
        }
      });
    }

    // 5. ShadowTLS v3 + VLESS detour
    if (enable.shadowTlsVless && this.ports.shadowTls) {
      inbounds.push(
        {
          type: 'shadowtls',
          tag: 'shadowtls-in',
          listen: '127.0.0.1',
          listen_port: this.ports.shadowTls,
          version: 3,
          users: [
            { name: 'bk-user', password: state.shadowTlsPassword }
          ],
          handshake: {
            server: this.config.shadowTls.sni || 'www.microsoft.com',
            server_port: 443
          },
          strict_mode: true,
          detour: 'vless-shadowtls-detour'
        },
        {
          type: 'vless',
          tag: 'vless-shadowtls-detour',
          listen: '127.0.0.1',
          listen_port: 0,
          users: [
            ...this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, flow: '' }))
          ]
        }
      );
    }

    // 6. Shadowsocks (TCP) local inbound
    if (enable.shadowsocks && this.ports.shadowsocks) {
      inbounds.push({
        type: 'shadowsocks',
        tag: 'ss-in',
        listen: '127.0.0.1',
        listen_port: this.ports.shadowsocks,
        method: this.config.shadowsocks.method || 'aes-256-gcm',
        password: state.shadowsocksPassword
      });
    }

    // 7. SOCKS5 (TCP) local inbound
    if (enable.socks && this.ports.socks) {
      inbounds.push({
        type: 'socks',
        tag: 'socks-in',
        listen: '127.0.0.1',
        listen_port: this.ports.socks,
        users: this.config.socks.user
          ? [{ username: this.config.socks.user, password: this.config.socks.pass }]
          : []
      });
    }

    // 8. Plain HTTP Proxy local inbound
    if (enable.httpProxy && this.ports.httpProxy) {
      inbounds.push({
        type: 'http',
        tag: 'http-in',
        listen: '127.0.0.1',
        listen_port: this.ports.httpProxy,
        users: this.config.httpProxy.user
          ? [{ username: this.config.httpProxy.user, password: this.config.httpProxy.pass }]
          : []
      });
    }

    // 9. Trojan + WebSocket (TCP) local inbound
    if (enable.trojanWs && this.ports.trojanWs) {
      inbounds.push({
        type: 'trojan',
        tag: 'trojan-ws-in',
        listen: '127.0.0.1',
        listen_port: this.ports.trojanWs,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, password: e.uuid }))
        ],
        transport: {
          type: 'ws',
          path: '/@Plasma--@Plasma--@Plasma--@Plasma--trojan'
        }
      });
    }

    // 9b. Trojan + gRPC + TLS local inbound
    if (enable.trojanGrpcTls && this.ports.trojanGrpcTls) {
      ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.domain || 'www.google.com');
      inbounds.push({
        type: 'trojan',
        tag: 'trojan-grpc-tls-in',
        listen: '127.0.0.1',
        listen_port: this.ports.trojanGrpcTls,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, password: e.uuid }))
        ],
        tls: {
          enabled: true,
          server_name: this.config.domain || 'www.google.com',
          alpn: ['h2'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        },
        transport: {
          type: 'grpc',
          service_name: '@Plasma--@Plasma--@Plasma--@Plasma--grpc'
        }
      });
    }

    // 10. VLESS + gRPC (TCP) local inbound (also the backend for gRPC-TLS decrypted by the gate's h2 router)
    if ((enable.vlessGrpc || enable.vlessGrpcTls) && this.ports.vlessGrpc) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-grpc-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessGrpc,
        users: [
          ...this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, flow: '' }))
        ],
        tls: { enabled: false },
        transport: {
          type: 'grpc',
          service_name: '@Plasma--@Plasma--@Plasma--@Plasma--grpc'
        }
      });
    }

    // 10b. VLESS + gRPC + TLS local inbound (the mux sends TLS ClientHellos offering only ALPN h2 here)
    if (enable.vlessGrpcTls && this.ports.vlessGrpcTls) {
      ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.domain || 'www.google.com');
      inbounds.push({
        type: 'vless', tag: 'vless-grpc-tls-in', listen: '127.0.0.1', listen_port: this.ports.vlessGrpcTls,
        users: this.bkUserEntries().map(e => ({ name: e.tag, uuid: e.uuid, flow: '' })),
        tls: {
          enabled: true,
          server_name: this.config.domain || 'www.google.com',
          alpn: ['h2'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        },
        transport: { type: 'grpc', service_name: BK_PATHS.grpcService }
      });
    }

    // 11. TUIC v5 inbound (UDP)
    if (enable.tuic && this.config.tuic) {
      inbounds.push({
        type: 'tuic',
        tag: 'tuic-in',
        listen: '::',
        listen_port: this.config.tuic.port || 8443,
        users: [
          { uuid: state.uuid, password: state.uuid }
        ],
        congestion_controller: this.config.tuic.congestionController || 'bbr',
        tls: {
          enabled: true,
          server_name: this.config.sniHy2 || 'www.google.com',
          alpn: ['h3'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        }
      });
    }

    const cfg = {
      log: {
        level: 'info',
        timestamp: true
      },
      inbounds,
      outbounds: [
        { type: 'direct', tag: 'direct' },
        { type: 'block', tag: 'block' }
      ],
      route: {
        final: 'direct'
      }
    };

    // WireGuard under endpoints (NOT inbounds)
    if (enable.wireguard && this.config.wireguard && state.wireguardPrivateKey && state.wireguardClientPublicKey) {
      const wgPort = (this.config.wireguard && this.config.wireguard.port) || 51820;
      cfg.endpoints = [
        {
          type: 'wireguard',
          tag: 'wg-in',
          system: false,
          name: 'bk-wg0',
          mtu: this.config.wireguard.mtu || 1420,
          address: [this.config.wireguard.serverIp || '10.66.66.1/24'],
          private_key: state.wireguardPrivateKey,
          listen_port: wgPort,
          peers: [
            {
              public_key: state.wireguardClientPublicKey,
              allowed_ips: [this.config.wireguard.clientIp || '10.66.66.2/32']
            }
          ]
        }
      ];
    }

    return cfg;
  }

  testConfigSync(cfgObj) {
    const tmpFile = path.join(this.paths.dataDir, `test-check-${Date.now()}.json`);
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(cfgObj, null, 2), 'utf8');
      const res = spawnSync(this.paths.singboxBin, ['check', '-c', tmpFile], {
        encoding: 'utf8',
        timeout: 8000
      });
      try { fs.unlinkSync(tmpFile); } catch {}
      return {
        ok: res.status === 0,
        error: (res.stderr || res.stdout || '').trim()
      };
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      return { ok: false, error: err.message };
    }
  }

  validateAndSanitize(configData) {
    // 1. Initial test
    let check = this.testConfigSync(configData);
    if (check.ok) return configData;

    Logger.warn(`sing-box initial check reported: ${check.error}. Running resilience auto-fix...`);

    // 2. Remove endpoints if failing
    if (configData.endpoints && configData.endpoints.length > 0) {
      delete configData.endpoints;
      check = this.testConfigSync(configData);
      if (check.ok) {
        Logger.warn('sing-box validated after omitting endpoints. Core engines running.');
        return configData;
      }
    }

    // 3. Try removing optional inbounds sequentially
    const optionalTags = ['tuic-in', 'vless-grpc-tls-in', 'trojan-grpc-tls-in', 'vless-grpc-in', 'trojan-hu-in', 'vmess-hu-in', 'trojan-ws-in', 'socks-in', 'http-in', 'shadowtls-in', 'vless-shadowtls-detour'];
    for (const tag of optionalTags) {
      const idx = configData.inbounds.findIndex(ib => ib.tag === tag);
      if (idx !== -1) {
        configData.inbounds.splice(idx, 1);
        check = this.testConfigSync(configData);
        if (check.ok) {
          Logger.warn(`sing-box validated after stripping ${tag}. Continuing with stable inbounds.`);
          return configData;
        }
      }
    }

    // 4. Ultimate fallback to basic core inbounds
    const coreTags = ['hy2-in', 'vless-ws-in', 'vmess-ws-in', 'vless-hu-in', 'vless-reality-in', 'ss-in'];
    configData.inbounds = configData.inbounds.filter(ib => coreTags.includes(ib.tag));
    check = this.testConfigSync(configData);
    if (check.ok) {
      Logger.warn('sing-box validated with minimum core inbounds (VLESS-WS, VMess-WS, VLESS-HTTPUpgrade).');
      return configData;
    }

    return null;
  }

  start() {
    if (!fs.existsSync(this.paths.singboxBin)) {
      Logger.warn('sing-box executable missing. Core engine skipped.');
      return false;
    }

    // Setup certs
    ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.sniHy2);
    this.generateRealityKeys();

    let configData = this.buildJsonConfig();
    configData = this.validateAndSanitize(configData);

    if (!configData) {
      Logger.error('sing-box validation failed completely even after auto-fix attempts.');
      return false;
    }

    fs.writeFileSync(this.paths.singboxConfig, JSON.stringify(configData, null, 2), 'utf8');
    Logger.success('sing-box configuration validated.');

    this._spawn();
    this._probeInbounds(configData);
    return true;
  }

  _spawn() {
    try {
      if (fs.existsSync(this.paths.singboxLog) && fs.statSync(this.paths.singboxLog).size > 5 * 1024 * 1024) {
        fs.truncateSync(this.paths.singboxLog, 0);
      }
    } catch (_) {}
    const logFd = fs.openSync(this.paths.singboxLog, 'a');
    this.process = spawn(this.paths.singboxBin, ['run', '-c', this.paths.singboxConfig], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    Logger.info(`sing-box started (pid ${this.process.pid})`);
    // Mirror sing-box output to its log file and surface warnings/errors (rate-limited) in the container log.
    let windowStart = Date.now();
    let printed = 0;
    const onData = (buf) => {
      try { fs.writeSync(logFd, buf); } catch (_) {}
      const text = buf.toString('utf8').replace(/\x1b\[[0-9;]*m/g, '');
      // BK_ACTIVITY: distill per-user destination events from connection logs:
      // "inbound/vless[vless-ws-in]: [utag] inbound connection to host:port".
      if (text.indexOf(' connection to ') >= 0) {
        for (const line of text.split('\n')) {
          if (line.indexOf(' connection to ') < 0) continue;
          const m = line.match(/inbound\/\w+\[([^\]]+)\]: \[([^\]]+)\] inbound (?:packet )?connection to ([^:\s]+):(\d+)/);
          if (!m) continue;
          try {
            const uid = BkUsers.idForName(m[2]);
            if (uid) BkActivity.record({ t: Date.now(), u: uid, h: m[3], p: parseInt(m[4], 10) || 0, n: m[1].replace(/-in$/, '') });
          } catch (_) {}
        }
      }
      for (const line of text.split('\n')) {
        if (!/FATAL|ERROR|WARN|panic/i.test(line)) continue;
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); printed = 0; }
        if (++printed <= 15) console.log('[sing-box] ' + line.trim().slice(0, 300));
      }
    };
    this.process.stdout.on('data', onData);
    this.process.stderr.on('data', onData);

    this.process.on('error', (err) => {
      Logger.error(`sing-box process error: ${err.message}`);
    });

    this.process.on('exit', (code, sig) => {
      try { fs.closeSync(logFd); } catch {}
      if (this._stopping) return;
      Logger.warn(`sing-box exited with code ${code} (${sig || 'none'})`);
      this._restarts = (this._restarts || 0) + 1;
      if (this._restarts <= 20) {
        const delay = Math.min(30000, 1000 * this._restarts);
        Logger.warn(`Restarting sing-box in ${delay / 1000}s (attempt ${this._restarts})...`);
        setTimeout(() => { if (!this._stopping) this._spawn(); }, delay);
      } else {
        Logger.error('sing-box keeps crashing; giving up. Check sing-box.log in the data directory.');
      }
    });
  }

  _probeInbounds(configData) {
    const list = (configData.inbounds || []).filter(ib => ib.listen_port && ib.listen === '127.0.0.1');
    setTimeout(() => {
      for (const ib of list) {
        const sock = net.connect(ib.listen_port, '127.0.0.1');
        sock.setTimeout(3000);
        sock.once('connect', () => { Logger.success(`sing-box inbound ${ib.tag} listening on 127.0.0.1:${ib.listen_port}`); sock.destroy(); });
        sock.once('error', (e) => { Logger.error(`sing-box inbound ${ib.tag} NOT listening on :${ib.listen_port} (${e.message})`); });
        sock.once('timeout', () => { Logger.error(`sing-box inbound ${ib.tag} probe timeout on :${ib.listen_port}`); sock.destroy(); });
      }
    }, 2500);
  }

  stop() {
    this._stopping = true;
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
      } catch {}
    }
  }
}

// --- Module: lib/engines/xray.js ---
// BK_PROTOCOLS_APPLIED: Xray-core hosts VLESS-XHTTP and Shadowsocks-over-WebSocket (sing-box has no server-side
// transport for Shadowsocks). Both listen on 127.0.0.1 only; the Node mux on PORT routes to them by path.
class XrayEngine {
  constructor(config, stateManager, ports) {
    this.config = config;
    this.paths = config.paths;
    this.stateManager = stateManager;
    this.ports = (ports && typeof ports === 'object') ? ports : { xhttp: ports };
    this.port = this.ports.xhttp || null;
    this.process = null;
  }

  /** BK_USERS: UUIDs allowed in inbounds — the default user + every active subscription user. */
  bkUserUuids() {
    try { const a = BkUsers.activeUuids(); if (a && a.length) return a; } catch (_) {}
    return [this.stateManager.state.uuid];
  }

  /** BK_ACTIVITY: like bkUserUuids, but each entry carries the log identity
   *  (subscription tag, or 'owner') so the Xray access log can be attributed. */
  bkUserEntries() {
    try { const a = BkUsers.activeEntries(); if (a && a.length) return a; } catch (_) {}
    return [{ uuid: this.stateManager.state.uuid, tag: 'owner' }];
  }

  static xhttpPath() {
    return BK_PATHS.xhttp;
  }

  buildConfig() {
    const state = this.stateManager.state;
    const inbounds = [];
    if (this.ports.xhttp) {
      inbounds.push({
        tag: 'vless-xhttp-in',
        listen: '127.0.0.1',
        port: this.ports.xhttp,
        protocol: 'vless',
        settings: { clients: this.bkUserEntries().map(e => ({ id: e.uuid, email: e.tag, level: 0 })), decryption: 'none' },
        streamSettings: {
          network: 'xhttp',
          security: 'none', // TLS (if any) is terminated in front of Xray
          xhttpSettings: { path: XrayEngine.xhttpPath(), mode: 'auto' }
        }
      });
    }
    if (this.ports.ssWs) {
      inbounds.push({
        tag: 'ss-ws-in',
        listen: '127.0.0.1',
        port: this.ports.ssWs,
        protocol: 'shadowsocks',
        settings: { method: this.config.shadowsocks.method || 'aes-256-gcm', password: state.shadowsocksPassword, network: 'tcp' },
        streamSettings: { network: 'ws', security: 'none', wsSettings: { path: BK_PATHS.ssWs } }
      });
    }
    return {
      log: { access: this.paths.xrayAccessLog, loglevel: 'warning' },
      inbounds,
      outbounds: [
        { protocol: 'freedom', tag: 'direct' },
        { protocol: 'blackhole', tag: 'block' }
      ]
    };
  }

  start() {
    if (!fs.existsSync(this.paths.xrayBin)) return false;
    if (!this.ports.xhttp && !this.ports.ssWs) return false;
    fs.writeFileSync(this.paths.xrayConfig, JSON.stringify(this.buildConfig(), null, 2), 'utf8');
    try {
      const t = spawnSync(this.paths.xrayBin, ['run', '-test', '-c', this.paths.xrayConfig], { encoding: 'utf8', timeout: 20000 });
      if (t.status !== 0) {
        Logger.error('Xray config test failed: ' + String(t.stdout || t.stderr || '').replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-3).join(' | '));
        return false;
      }
    } catch (err) {
      Logger.warn('Xray config test could not run: ' + err.message);
    }
    this._spawn();
    this._probe();
    return true;
  }

  _spawn() {
    try {
      if (fs.existsSync(this.paths.xrayLog) && fs.statSync(this.paths.xrayLog).size > 5 * 1024 * 1024) fs.truncateSync(this.paths.xrayLog, 0);
    } catch (_) {}
    const logFd = fs.openSync(this.paths.xrayLog, 'a');
    this.process = spawn(this.paths.xrayBin, ['run', '-c', this.paths.xrayConfig], { stdio: ['ignore', 'pipe', 'pipe'], detached: false });
    Logger.info(`Xray-core started (pid ${this.process.pid})${this.ports.xhttp ? ', VLESS-XHTTP on 127.0.0.1:' + this.ports.xhttp : ''}${this.ports.ssWs ? ', Shadowsocks-WS on 127.0.0.1:' + this.ports.ssWs : ''}`);
    let windowStart = Date.now();
    let printed = 0;
    const onData = (buf) => {
      try { fs.writeSync(logFd, buf); } catch (_) {}
      const text = buf.toString('utf8').replace(/\x1b\[[0-9;]*m/g, '');
      for (const line of text.split('\n')) {
        if (!/\[(Warning|Error)\]|panic|failed to/i.test(line)) continue;
        if (/is deprecated|Please migrate/i.test(line)) continue;
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); printed = 0; }
        if (++printed <= 15) console.log('[xray] ' + line.trim().slice(0, 300));
      }
    };
    this.process.stdout.on('data', onData);
    this.process.stderr.on('data', onData);
    this._startAccessTail();
    this.process.on('error', (err) => Logger.error(`Xray process error: ${err.message}`));
    this.process.on('exit', (code, sig) => {
      try { fs.closeSync(logFd); } catch (_) {}
      if (this._stopping) return;
      Logger.warn(`Xray-core exited with code ${code} (${sig || 'none'})`);
      this._restarts = (this._restarts || 0) + 1;
      if (this._restarts <= 20) {
        const delay = Math.min(30000, 1000 * this._restarts);
        Logger.warn(`Restarting Xray-core in ${delay / 1000}s (attempt ${this._restarts})...`);
        setTimeout(() => { if (!this._stopping) this._spawn(); }, delay);
      } else {
        Logger.error('Xray-core keeps crashing; giving up. See xray.log in the data directory.');
      }
    });
  }

  /** BK_ACTIVITY: tail the Xray access log and distill per-user destination
   *  events ("... accepted tcp:host:port [vless-xhttp-in >> direct] email: utag").
   *  The file is truncated in place past ~4 MB so it can never fill the disk.
   *  The tailer survives engine respawns (Xray appends to the same file). */
  _startAccessTail() {
    if (this._accessTail) return;
    const file = this.paths.xrayAccessLog;
    let offset = 0;
    let partial = '';
    try { offset = fs.statSync(file).size; } catch (_) {}
    const tick = () => {
      let st = null;
      try { st = fs.statSync(file); } catch (_) { return; }
      if (st.size < offset) { offset = 0; partial = ''; }
      if (st.size === offset) return;
      let chunk = '';
      try {
        const fd = fs.openSync(file, 'r');
        try {
          const len = st.size - offset;
          const b = Buffer.alloc(len);
          fs.readSync(fd, b, 0, len, offset);
          chunk = b.toString('utf8');
          offset = st.size;
        } finally { fs.closeSync(fd); }
      } catch (_) { return; }
      const lines = (partial + chunk).split('\n');
      partial = lines.pop() || '';
      for (const line of lines) {
        if (line.indexOf('accepted ') < 0 || line.indexOf('email: ') < 0) continue;
        const m = line.match(/accepted (?:tcp|udp):([^:\s]+):(\d+) \[[^\]]+\] email: (\S+)/);
        if (!m) continue;
        try {
          const uid = BkUsers.idForName(m[3]);
          if (uid) BkActivity.record({ t: Date.now(), u: uid, h: m[1], p: parseInt(m[2], 10) || 0, n: 'vless-xhttp' });
        } catch (_) {}
      }
      if (st.size > 4 * 1024 * 1024) {
        try { fs.truncateSync(file, 0); offset = 0; partial = ''; } catch (_) {}
      }
    };
    const timer = setInterval(tick, 1500);
    if (timer.unref) timer.unref();
    this._accessTail = timer;
  }

  _probe() {
    setTimeout(() => {
      for (const [tag, port] of [['vless-xhttp-in', this.ports.xhttp], ['ss-ws-in', this.ports.ssWs]]) {
        if (!port) continue;
        const sock = net.connect(port, '127.0.0.1');
        sock.setTimeout(3000);
        sock.once('connect', () => { Logger.success(`xray inbound ${tag} listening on 127.0.0.1:${port}`); sock.destroy(); });
        sock.once('error', (e) => Logger.error(`xray inbound ${tag} NOT listening on :${port} (${e.message})`));
        sock.once('timeout', () => { Logger.error(`xray inbound ${tag} probe timeout on :${port}`); sock.destroy(); });
      }
    }, 2500);
  }

  stop() {
    this._stopping = true;
    if (this.process && !this.process.killed) {
      try { this.process.kill('SIGTERM'); } catch (_) {}
    }
  }
}

// --- Module: lib/engines/argo.js ---
class ArgoTunnel {
  constructor(config, targetPort) {
    this.config = config;
    this.paths = config.paths;
    this.targetPort = targetPort;
    this.process = null;
    this.tunnelDomain = '';
  }

  async discoverDomain(timeoutMs = 45000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      // 1. Try quick tunnel metrics endpoints
      for (const p of [2000, 2001, 2002]) {
        try {
          const resp = await axios.get(`http://127.0.0.1:${p}/quicktunnel`, { timeout: 1500 });
          if (resp.data && resp.data.hostname) {
            return resp.data.hostname.replace(/^https?:\/\//, '').trim().toLowerCase();
          }
        } catch {}
      }

      // 2. Read log file
      if (fs.existsSync(this.paths.cloudflaredLog)) {
        try {
          const logContent = fs.readFileSync(this.paths.cloudflaredLog, 'utf8');
          const match = logContent.match(/https?:\/\/([a-z0-9-]+\.trycloudflare\.com)/i);
          if (match) {
            return match[1].toLowerCase();
          }
        } catch {}
      }

      await new Promise(r => setTimeout(r, 2000));
    }
    return null;
  }

  async start() {
    if (!this.config.enable.argo || !fs.existsSync(this.paths.cloudflaredBin)) {
      return null;
    }

    // Named tunnel
    if (this.config.argo.auth && this.config.argo.domain) {
      this.tunnelDomain = this.config.argo.domain;
      Logger.success(`Cloudflare named tunnel active: ${this.tunnelDomain}`);
      return this.tunnelDomain;
    }

    // Quick tunnel
    Logger.step('Launching Cloudflare Argo Quick Tunnel...');
    const logFd = fs.openSync(this.paths.cloudflaredLog, 'a');

    this.process = spawn(this.paths.cloudflaredBin, [
      'tunnel', '--no-autoupdate', '--metrics', '127.0.0.1:2000',
      '--url', `http://127.0.0.1:${this.targetPort}`
    ], {
      stdio: ['ignore', logFd, logFd],
      detached: false
    });

    this.process.on('exit', () => {
      try { fs.closeSync(logFd); } catch {}
    });

    this.tunnelDomain = await this.discoverDomain();
    if (this.tunnelDomain) {
      Logger.success(`Argo Quick Tunnel ready: ${this.tunnelDomain}`);
    } else {
      Logger.warn('Argo tunnel domain could not be resolved within timeout.');
    }

    return this.tunnelDomain;
  }

  stop() {
    if (this.process && !this.process.killed) {
      try { this.process.kill('SIGTERM'); } catch {}
    }
  }
}

// --- Module: lib/panel/validator.js ---
/**
 * URI and Node validation for client compatibility (v2rayN, v2rayNG, Hiddify, sing-box)
 */

function isLocalAddress(host) {
  if (!host) return true;
  const clean = host.toLowerCase().trim();
  return (
    clean === '127.0.0.1' ||
    clean === 'localhost' ||
    clean === '::1' ||
    clean === '0.0.0.0' ||
    clean.startsWith('127.')
  );
}

/**
 * Validates a node share URI
 * @param {object} node Node object containing uri, type, name
 * @param {object} options { allowLocalHostLinks, compatMode }
 * @returns {boolean}
 */
function isValidNode(node, options = {}) {
  if (!node || !node.uri || typeof node.uri !== 'string') return false;

  const { allowLocalHostLinks = false, compatMode = 'v2ray' } = options;
  const uri = node.uri.trim();

  try {
    // Check scheme
    const scheme = uri.split('://')[0].toLowerCase();

    // Special handling for vmess:// (base64 JSON)
    if (scheme === 'vmess') {
      try {
        const rawJson = Buffer.from(uri.replace(/^vmess:\/\//i, ''), 'base64').toString('utf8');
        const vConf = JSON.parse(rawJson);
        if (!vConf.add || !vConf.port || !vConf.id) return false;
        if (!allowLocalHostLinks && isLocalAddress(vConf.add)) return false;
        return true;
      } catch {
        return false;
      }
    }

    const parsed = new URL(uri);

    // Check host
    if (!allowLocalHostLinks && isLocalAddress(parsed.hostname)) {
      return false;
    }

    // Compat mode filter
    if (compatMode === 'v2ray') {
      const allowedSchemes = ['vless', 'vmess', 'trojan', 'ss'];
      if (!allowedSchemes.includes(scheme)) {
        return false;
      }
    }

    // Protocol-specific checks
    if (scheme === 'vless') {
      const uuid = parsed.username;
      if (!uuid || uuid.length < 8) return false;

      const security = parsed.searchParams.get('security');
      if (security === 'reality') {
        const pbk = parsed.searchParams.get('pbk');
        const sid = parsed.searchParams.get('sid');
        const sni = parsed.searchParams.get('sni');
        // Valid REALITY requires pbk, sid, and sni
        if (!pbk || !sid || !sni) return false;
      }

      const type = parsed.searchParams.get('type');
      if (type === 'ws') {
        const pathVal = parsed.searchParams.get('path');
        if (!pathVal) return false;
      }

      if (type === 'grpc') {
        const serviceName = parsed.searchParams.get('serviceName');
        if (!serviceName) return false;
      }

      // In v2ray-compat mode, avoid experimental/incompatible transports
      // BK_PROTOCOLS_APPLIED: httpupgrade / xhttp are supported by current v2rayN / v2rayNG (Xray-core), keep them.
    }

    if (scheme === 'trojan') {
      if (!parsed.username) return false;
    }

    if (scheme === 'ss') {
      if (!parsed.username && !parsed.hostname) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// --- Module: lib/panel/links.js ---
/**
 * Link and subscription configuration generator for Plasma
 */



function urlSafeEncode(str) {
  return encodeURIComponent(str);
}

function yamlSafeQuote(str) {
  return `"${String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function deriveX25519PublicKey(privBase64) {
  try {
    if (!privBase64 || typeof privBase64 !== 'string') return null;
    const privBuf = Buffer.from(privBase64.trim(), 'base64');
    if (privBuf.length !== 32) return null;
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), privBuf]);
    const keyObj = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
    return crypto.createPublicKey(keyObj).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
  } catch {
    return null;
  }
}

class LinkGenerator {
  constructor(config, state, resolvedHost) {
    this.config = config;
    this.state = state;
    this.host = config.forceHost || resolvedHost || config.domain || '127.0.0.1';
    // BK_FIX2_APPLIED
    const bkOnRailway = bkOnEdgeHost(); // Replit or Railway: only HTTPS on 443 is public
    this.port = parseInt(process.env.LINK_PORT || '', 10) || (bkOnRailway ? 443 : config.publicPort);
    // Railway's edge only accepts HTTPS on 443 and forwards plain HTTP to $PORT, so on Railway every
    // WS/HTTPUpgrade link is TLS (edge-side) and plain "security=none" links are not generated.
    // LINK_TLS=true|false overrides the detection.
    this.edgeTls = process.env.LINK_TLS !== undefined
      ? (process.env.LINK_TLS === 'true' || process.env.LINK_TLS === '1')
      : (bkOnRailway && this.port === 443);
    // Railway's edge serves a valid public certificate: never ask clients to skip verification there
    // (Xray-core >= 26.x removed allowInsecure; links carrying it can fail to load in new clients).
    this.insecure = !this.edgeTls;
    this.tlsOpt = LinkGenerator.tlsOptions((config.forceHost && config.domain) ? config.domain : this.host);
    this.prefix = config.nodePrefix || 'Plasma - ';
    this.wsPath = BK_PATHS.vlessWs;
    this.vmessPath = BK_PATHS.vmessWs;
    this.huPath = BK_PATHS.vlessHu;
    this.vmHuPath = BK_PATHS.vmessHu;
    this.trHuPath = BK_PATHS.trojanHu;
    this.xhPath = BK_PATHS.xhttp;
    this.trPath = BK_PATHS.trojanWs;
    this.ssWsPath = BK_PATHS.ssWs;
    this.grpcService = BK_PATHS.grpcService;
    // BK_PROTOCOLS_APPLIED: self-signed certificate -> pin it. Xray-core >= 26.2 refuses "allowInsecure" and needs
    // pinnedPeerCertSha256 (share-link "pcs"); LINK_ALLOW_INSECURE=false drops allowInsecure for new clients only.
    this.pcs = (this.insecure && config.paths && config.paths.certPath) ? bkCertSha256(config.paths.certPath) : '';
    this.keepAllowInsecure = this.insecure && !/^(0|false|no|off)$/i.test(String(process.env.LINK_ALLOW_INSECURE || ''));
    this.name = (t) => (config.nodePrefix || 'Plasma - ') + t;
  }

  /** Readable host for Host headers: the TLS/WS host override if set, else the link host. */
  get plainHost() { return normalizeHost(process.env.LINK_HOST) || this.host; }

  /**
   * TLS client options for share links / subscriptions (env driven):
   *   LINK_FP      uTLS fingerprint, default chrome (chrome|firefox|safari|edge|ios|android|random|randomized|360|qq; "none" = omit)
   *   LINK_ALPN    comma list, default http/1.1 ("none" = omit). WebSocket needs http/1.1.
   *   TLS_CIPHERS  comma list of cipher suite names -> only sing-box subscription tls.cipher_suites
   *   LINK_SNI     override SNI (default: DOMAIN / Railway domain)
   *   LINK_HOST    override WS/HTTPUpgrade Host header (default: SNI)
   */
  static tlsOptions(defaultSni) {
    const env = process.env;
    const warnOnce = (k, m) => { LinkGenerator._warned = LinkGenerator._warned || {}; if (!LinkGenerator._warned[k]) { LinkGenerator._warned[k] = 1; Logger.warn(m); } };
    const FP = ['chrome', 'firefox', 'safari', 'edge', 'ios', 'android', 'random', 'randomized', '360', 'qq'];
    let fp = env.LINK_FP === undefined ? 'chrome' : String(env.LINK_FP).trim().toLowerCase();
    if (fp === 'none' || fp === 'off' || fp === 'false') fp = '';
    if (fp && !FP.includes(fp)) { warnOnce('fp', 'LINK_FP="' + fp + '" is not supported; using chrome. Allowed: ' + FP.join(', ') + ', none'); fp = 'chrome'; }
    const alpnRaw = env.LINK_ALPN === undefined ? 'http/1.1' : String(env.LINK_ALPN).trim();
    const alpn = /^(none|off|false)?$/i.test(alpnRaw) ? [] : alpnRaw.split(',').map(x => x.trim()).filter(Boolean);
    if (alpn.includes('h2') || alpn.includes('h3')) warnOnce('alpn', 'LINK_ALPN contains h2/h3: WebSocket links only work over http/1.1.');
    const CIPHERS = [
      'TLS_AES_128_GCM_SHA256', 'TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256', 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384', 'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
      'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256', 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384', 'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
      'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA', 'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA', 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA', 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
      'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256', 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256',
      'TLS_RSA_WITH_AES_128_GCM_SHA256', 'TLS_RSA_WITH_AES_256_GCM_SHA384', 'TLS_RSA_WITH_AES_128_CBC_SHA', 'TLS_RSA_WITH_AES_256_CBC_SHA'
    ];
    const ciphers = [];
    for (const c of String(env.TLS_CIPHERS || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean)) {
      if (CIPHERS.includes(c)) { if (!ciphers.includes(c)) ciphers.push(c); } else warnOnce('c_' + c, 'TLS_CIPHERS: unknown cipher suite "' + c + '" ignored.');
    }
    const sni = normalizeHost(env.LINK_SNI) || defaultSni;
    const wsHost = normalizeHost(env.LINK_HOST) || sni;
    return { fp, alpn, ciphers, sni, wsHost };
  }

  /** "&sni=..&fp=..&alpn=.." for vless:// and trojan:// links (no non-standard cipher field). */
  _uriTls() {
    const o = this.tlsOpt;
    let q = '&sni=' + encodeURIComponent(o.sni);
    if (o.fp) q += '&fp=' + encodeURIComponent(o.fp);
    if (o.alpn.length) q += '&alpn=' + encodeURIComponent(o.alpn.join(','));
    q += this._uriInsecure();
    return q;
  }

  /** "&allowInsecure=1&pcs=<sha256>" for the self-signed certificate (nothing when the edge has a real cert). */
  _uriInsecure() {
    let q = '';
    if (this.keepAllowInsecure) q += '&allowInsecure=1';
    if (this.pcs) q += '&pcs=' + this.pcs;
    return q;
  }

  _sbTls() {
    const o = this.tlsOpt;
    const t = { enabled: true, server_name: o.sni, insecure: this.insecure };
    if (o.alpn.length) t.alpn = o.alpn.slice();
    if (o.fp) t.utls = { enabled: true, fingerprint: o.fp };
    if (o.ciphers.length) t.cipher_suites = o.ciphers.slice();
    return t;
  }

  _clashTls(obj, sniKey = 'servername') {
    const o = this.tlsOpt;
    obj.tls = true;
    obj[sniKey] = o.sni;
    obj['skip-cert-verify'] = this.insecure;
    if (this.pcs) obj.fingerprint = this.pcs; // mihomo: pin the self-signed certificate
    if (o.fp) obj['client-fingerprint'] = o.fp === 'randomized' ? 'random' : o.fp;
    if (o.alpn.length) obj.alpn = o.alpn.slice();
    return obj;
  }

  generateHysteria2() {
    return null; // Hysteria removed as requested
  }

  generateVlessWs() {
    if (!this.config.enable.vlessWs) return null;
    if (this.edgeTls) return null; // covered by VLESS-WS-TLS (same inbound)
    const name = 'Plasma - WS';
    const clashProxy = {
      name,
      type: 'vless',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      network: 'ws',
      tls: false,
      'ws-opts': {
        path: this.wsPath,
        headers: { Host: this.host }
      }
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      transport: {
        type: 'ws',
        path: this.wsPath,
        headers: { Host: this.host }
      }
    };
    return {
      name,
      type: 'VLESS-WS',
      label: 'WebSocket Direct / CDN',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=none&type=ws&host=${this.host}&path=${urlSafeEncode(this.wsPath)}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVlessWsTls() {
    if (!this.config.enable.vlessWsTls) return null;
    const name = 'Plasma - WS-TLS';
    const o = this.tlsOpt;
    const clashProxy = this._clashTls({
      name, type: 'vless', server: this.host, port: this.port, uuid: this.state.uuid, network: 'ws',
      'ws-opts': { path: this.wsPath, headers: { Host: o.wsHost } }
    });
    const sbOutbound = {
      type: 'vless', tag: name, server: this.host, server_port: this.port, uuid: this.state.uuid,
      tls: this._sbTls(),
      transport: { type: 'ws', path: this.wsPath, headers: { Host: o.wsHost } }
    };
    return {
      name,
      type: 'VLESS-WS-TLS',
      label: 'CDN Cloudflare Compatible',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=tls${this._uriTls()}&type=ws&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.wsPath)}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVmessWsTls() {
    if (!this.config.enable.vmessWsTls) return null;
    const name = 'Plasma - VMess-WS-TLS';
    const o = this.tlsOpt;
    const vmessConfig = {
      v: '2', ps: name, add: this.host, port: String(this.port), id: this.state.uuid, aid: '0', scy: 'auto',
      net: 'ws', type: 'none', host: o.wsHost, path: this.vmessPath, tls: 'tls', sni: o.sni
    };
    if (o.alpn.length) vmessConfig.alpn = o.alpn.join(',');
    if (o.fp) vmessConfig.fp = o.fp;
    if (this.keepAllowInsecure) vmessConfig.allowInsecure = true;
    if (this.pcs) vmessConfig.pcs = this.pcs;
    const uri = 'vmess://' + Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
    const clashProxy = this._clashTls({
      name, type: 'vmess', server: this.host, port: this.port, uuid: this.state.uuid, alterId: 0, cipher: 'auto', network: 'ws',
      'ws-opts': { path: this.vmessPath, headers: { Host: o.wsHost } }
    });
    const sbOutbound = {
      type: 'vmess', tag: name, server: this.host, server_port: this.port, uuid: this.state.uuid, alter_id: 0, security: 'auto',
      tls: this._sbTls(),
      transport: { type: 'ws', path: this.vmessPath, headers: { Host: o.wsHost } }
    };
    return {
      name,
      type: 'VMess-WS-TLS',
      label: 'Classic Universal Client',
      compat: true,
      uri,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVmessWs() {
    if (!this.config.enable.vmessWs) return null;
    if (this.edgeTls) return null; // covered by VMess-WS-TLS (same inbound)
    const name = 'Plasma - VMess-WS';
    const vmessConfig = {
      v: '2',
      ps: name,
      add: this.host,
      port: String(this.port),
      id: this.state.uuid,
      aid: '0',
      scy: 'auto',
      net: 'ws',
      type: 'none',
      host: this.host,
      path: this.vmessPath,
      tls: 'none'
    };
    const uri = 'vmess://' + Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
    const clashProxy = {
      name,
      type: 'vmess',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      alterId: 0,
      cipher: 'auto',
      network: 'ws',
      tls: false,
      'ws-opts': {
        path: this.vmessPath,
        headers: { Host: this.host }
      }
    };
    const sbOutbound = {
      type: 'vmess',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      alter_id: 0,
      security: 'auto',
      transport: {
        type: 'ws',
        path: this.vmessPath,
        headers: { Host: this.host }
      }
    };
    return {
      name,
      type: 'VMess-WS',
      label: 'VMess WebSocket Direct',
      compat: true,
      uri,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  // ===== BK_PROTOCOLS_APPLIED: HTTPUpgrade for VLESS / VMess / Trojan (one generic builder) =====
  _httpUpgradeNode(proto, enabled, pathVal, type) {
    if (!enabled) return null;
    const tls = this.edgeTls; // Replit/Railway edge: TLS on 443; self-hosted: plain on PORT
    const o = this.tlsOpt;
    const hostHdr = tls ? o.wsHost : this.plainHost;
    const name = this.name(type + (tls ? '-TLS' : ''));
    const u = this.state.uuid;
    const base = { server: this.host, port: this.port };
    let uri; let clash; let sb;
    const clashWs = { network: 'ws', 'ws-opts': { path: pathVal, headers: { Host: hostHdr }, 'v2ray-http-upgrade': true } };
    const sbTransport = { type: 'httpupgrade', path: pathVal, host: hostHdr };
    if (proto === 'vless') {
      uri = `vless://${u}@${this.host}:${this.port}?encryption=none&security=${tls ? 'tls' + this._uriTls() : 'none'}&type=httpupgrade&host=${encodeURIComponent(hostHdr)}&path=${urlSafeEncode(pathVal)}#${urlSafeEncode(name)}`;
      clash = { name, type: 'vless', ...base, uuid: u, ...clashWs };
      sb = { type: 'vless', tag: name, server: this.host, server_port: this.port, uuid: u, transport: sbTransport };
    } else if (proto === 'vmess') {
      const v = { v: '2', ps: name, add: this.host, port: String(this.port), id: u, aid: '0', scy: 'auto', net: 'httpupgrade', type: 'none', host: hostHdr, path: pathVal, tls: tls ? 'tls' : '' };
      if (tls) { v.sni = o.sni; if (o.alpn.length) v.alpn = o.alpn.join(','); if (o.fp) v.fp = o.fp; }
      uri = 'vmess://' + Buffer.from(JSON.stringify(v)).toString('base64');
      clash = { name, type: 'vmess', ...base, uuid: u, alterId: 0, cipher: 'auto', ...clashWs };
      sb = { type: 'vmess', tag: name, server: this.host, server_port: this.port, uuid: u, alter_id: 0, security: 'auto', transport: sbTransport };
    } else {
      uri = `trojan://${u}@${this.host}:${this.port}?security=${tls ? 'tls' + this._uriTls() : 'none'}&type=httpupgrade&host=${encodeURIComponent(hostHdr)}&path=${urlSafeEncode(pathVal)}#${urlSafeEncode(name)}`;
      clash = { name, type: 'trojan', ...base, password: u, ...clashWs };
      sb = { type: 'trojan', tag: name, server: this.host, server_port: this.port, password: u, transport: sbTransport };
    }
    if (tls) { this._clashTls(clash, proto === 'trojan' ? 'sni' : 'servername'); sb.tls = this._sbTls(); } else { clash.tls = false; }
    if (proto === 'trojan' && !tls) clash = null; // Clash Meta (mihomo) always wraps Trojan in TLS: no plain-Trojan entry
    return {
      name, type: type + (tls ? '-TLS' : ''), label: type.replace('-', ' '), compat: true, uri, clash,
      singboxOutbound: [sb], singboxJson: JSON.stringify([sb], null, 2)
    };
  }

  generateVlessHttpUpgrade() { return this._httpUpgradeNode('vless', this.config.enable.vlessHttpUpgrade, this.huPath, 'VLESS-HTTPUpgrade'); }
  generateVmessHttpUpgrade() { return this._httpUpgradeNode('vmess', this.config.enable.vmessHttpUpgrade, this.vmHuPath, 'VMess-HTTPUpgrade'); }
  generateTrojanHttpUpgrade() { return this._httpUpgradeNode('trojan', this.config.enable.trojanHttpUpgrade, this.trHuPath, 'Trojan-HTTPUpgrade'); }

  /** Trojan-WS-TLS on a self-hosted port: TLS is terminated by the gate's internal HTTPS server (self-signed cert). */
  generateTrojanWsTls() {
    if (!this.config.enable.trojanWsTls || !this.config.enable.trojanWs) return null; // served by the Trojan-WS inbound
    if (this.edgeTls) return null; // generateTrojanWs() already emits Trojan-WS-TLS behind an edge
    const name = this.name('Trojan-WS-TLS');
    const o = this.tlsOpt;
    const sbOutbound = {
      type: 'trojan', tag: name, server: this.host, server_port: this.port, password: this.state.uuid,
      tls: this._sbTls(),
      transport: { type: 'ws', path: this.trPath, headers: { Host: o.wsHost } }
    };
    return {
      name, type: 'Trojan-WS-TLS', label: 'Trojan WebSocket TLS', compat: true,
      uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=tls${this._uriTls()}&type=ws&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.trPath)}#${urlSafeEncode(name)}`,
      clash: this._clashTls({
        name, type: 'trojan', server: this.host, port: this.port, password: this.state.uuid, network: 'ws',
        'ws-opts': { path: this.trPath, headers: { Host: o.wsHost } }
      }, 'sni'),
      singboxOutbound: [sbOutbound], singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  /** VLESS + gRPC + TLS (ALPN h2 only) on the shared port. Not possible behind Replit/Railway (edge speaks HTTP/1.1 to the app). */
  generateVlessGrpcTls() {
    if (!this.config.enable.vlessGrpcTls || this.edgeTls) return null;
    const name = this.name('VLESS-gRPC-TLS');
    const o = this.tlsOpt;
    const svc = this.grpcService;
    let q = '&sni=' + encodeURIComponent(o.sni) + (o.fp ? '&fp=' + encodeURIComponent(o.fp) : '') + '&alpn=h2' + this._uriInsecure();
    const sbTls = { enabled: true, server_name: o.sni, insecure: this.insecure, alpn: ['h2'] };
    if (o.fp) sbTls.utls = { enabled: true, fingerprint: o.fp };
    const sbOutbound = { type: 'vless', tag: name, server: this.host, server_port: this.port, uuid: this.state.uuid, tls: sbTls, transport: { type: 'grpc', service_name: svc } };
    const clash = { name, type: 'vless', server: this.host, port: this.port, uuid: this.state.uuid, network: 'grpc', tls: true, servername: o.sni, 'skip-cert-verify': this.insecure, alpn: ['h2'], 'grpc-opts': { 'grpc-service-name': svc } };
    if (this.pcs) clash.fingerprint = this.pcs;
    if (o.fp) clash['client-fingerprint'] = o.fp === 'randomized' ? 'random' : o.fp;
    return {
      name, type: 'VLESS-gRPC-TLS', label: 'gRPC TLS', compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=tls${q}&type=grpc&serviceName=${urlSafeEncode(svc)}&mode=gun#${urlSafeEncode(name)}`,
      clash, singboxOutbound: [sbOutbound], singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  /** Shadowsocks over WebSocket (SIP002 + v2ray-plugin "websocket" mode, mux off) served by Xray-core. */
  generateShadowsocksWs() {
    if (!this.config.enable.ssWs || !this.config.ssWsPort || !this.state.shadowsocksPassword) return null;
    if (this.edgeTls) return null; // kept to self-hosted ports (plain WS); behind an edge use the VLESS/VMess/Trojan TLS links
    const name = this.name('Shadowsocks-WS');
    const method = this.config.shadowsocks.method || 'aes-256-gcm';
    const pass = this.state.shadowsocksPassword;
    const hostHdr = this.plainHost;
    const userinfo = /^2022-/i.test(method)
      ? encodeURIComponent(method) + ':' + encodeURIComponent(pass)
      : Buffer.from(`${method}:${pass}`).toString('base64url');
    const pluginOpts = `mode=websocket;host=${hostHdr};path=${this.ssWsPath};mux=0`;
    const sbOutbound = { type: 'shadowsocks', tag: name, server: this.host, server_port: this.port, method, password: pass, plugin: 'v2ray-plugin', plugin_opts: pluginOpts };
    return {
      name, type: 'Shadowsocks-WS', label: 'Shadowsocks + v2ray-plugin (WebSocket)', compat: true,
      uri: `ss://${userinfo}@${this.host}:${this.port}/?plugin=${encodeURIComponent('v2ray-plugin;' + pluginOpts)}#${urlSafeEncode(name)}`,
      clash: { name, type: 'ss', server: this.host, port: this.port, cipher: method, password: pass, plugin: 'v2ray-plugin', 'plugin-opts': { mode: 'websocket', host: hostHdr, path: this.ssWsPath, tls: false, mux: false } },
      singboxOutbound: [sbOutbound], singboxJson: JSON.stringify([sbOutbound], null, 2),
      note: 'Shadowsocks + v2ray-plugin (websocket, mux=0): v2rayN / v2rayNG / Hiddify / sing-box / Clash Meta'
    };
  }

  generateReality() {
    if (!this.config.enable.reality) return null;
    if (!this.state.realityPublicKey || !this.state.realityPrivateKey || this.state.realityPublicKey.length < 10) {
      try {
        const kp = crypto.generateKeyPairSync('x25519');
        this.state.realityPrivateKey = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64url');
        this.state.realityPublicKey = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64url');
        this.state.realityShortId = this.state.realityShortId || crypto.randomBytes(4).toString('hex');
      } catch (_) {
        return null;
      }
    }
    const name = 'Plasma - Reality';
    const target = String(this.config.reality.target || 'www.microsoft.com').replace(/[\[\]]/g, '').trim();
    const shortId = this.state.realityShortId || '12345678';
    const clashProxy = {
      name,
      type: 'vless',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      flow: 'xtls-rprx-vision',
      tls: true,
      'reality-opts': {
        'public-key': this.state.realityPublicKey,
        'short-id': shortId
      },
      'client-fingerprint': 'chrome',
      servername: target
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      flow: 'xtls-rprx-vision',
      tls: {
        enabled: true,
        server_name: target,
        reality: {
          enabled: true,
          public_key: this.state.realityPublicKey,
          short_id: shortId
        },
        utls: { enabled: true, fingerprint: 'chrome' }
      }
    };
    return {
      name,
      type: 'VLESS-REALITY',
      label: 'Anti-blocking / Web traffic',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=reality&sni=${target}&fp=chrome&pbk=${this.state.realityPublicKey}&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateShadowTls() {
    if (!this.config.enable.shadowTlsVless || !this.state.shadowTlsPassword) return null;
    const name = 'Plasma - ShadowTLS';
    const sni = String(this.config.shadowTls.sni || 'www.microsoft.com').replace(/[\[\]]/g, '').trim();
    const clashProxy = {
      name,
      type: 'shadow-tls',
      server: this.host,
      port: this.port,
      password: this.state.shadowTlsPassword,
      version: 3,
      sni
    };
    const sbOutbounds = [
      {
        type: 'shadowtls',
        tag: name,
        server: this.host,
        server_port: this.port,
        version: 3,
        password: this.state.shadowTlsPassword,
        tls: {
          enabled: true,
          server_name: sni
        },
        detour: `${name}-detour`
      },
      {
        type: 'vless',
        tag: `${name}-detour`,
        server: this.host,
        server_port: this.port,
        uuid: this.state.uuid
      }
    ];
    return {
      name,
      type: 'ShadowTLS-VLESS',
      compat: false, // shadowtls:// is not recognized by v2rayN/v2rayNG
      uri: `shadowtls://${this.state.shadowTlsPassword}@${this.host}:${this.port}?sni=${sni}&version=3#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: sbOutbounds,
      singboxJson: JSON.stringify(sbOutbounds, null, 2),
      note: 'Use Hiddify, sing-box, or Clash Meta'
    };
  }

  generateShadowsocks() {
    if (!this.config.enable.shadowsocks || !this.state.shadowsocksPassword) return null;
    const name = 'Plasma - Shadowsocks';
    const method = this.config.shadowsocks.method || 'aes-256-gcm';
    const auth = Buffer.from(`${method}:${this.state.shadowsocksPassword}`).toString('base64');
    const clashProxy = {
      name,
      type: 'ss',
      server: this.host,
      port: this.port,
      cipher: method,
      password: this.state.shadowsocksPassword
    };
    const sbOutbound = {
      type: 'shadowsocks',
      tag: name,
      server: this.host,
      server_port: this.port,
      method,
      password: this.state.shadowsocksPassword
    };
    return {
      name,
      type: 'Shadowsocks',
      compat: true,
      uri: `ss://${auth}@${this.host}:${this.port}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  _getOrGenerateWgKeys() {
    let clientPriv = this.state && this.state.wireguardClientPrivateKey;
    let clientPub = this.state && this.state.wireguardClientPublicKey;
    let serverPriv = this.state && this.state.wireguardPrivateKey;
    let serverPub = this.state && this.state.wireguardPublicKey;

    const isValidBase64Key = (k) => typeof k === 'string' && k.trim().length >= 40;

    if (!isValidBase64Key(clientPriv)) {
      try {
        const kp = crypto.generateKeyPairSync('x25519');
        clientPriv = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        clientPub = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (_) {
        const raw = crypto.randomBytes(32);
        raw[0] &= 248; raw[31] &= 127; raw[31] |= 64;
        clientPriv = raw.toString('base64');
        clientPub = deriveX25519PublicKey(clientPriv) || crypto.randomBytes(32).toString('base64');
      }
    } else {
      const derived = deriveX25519PublicKey(clientPriv);
      if (derived) clientPub = derived;
    }

    if (!isValidBase64Key(serverPriv)) {
      try {
        const kp = crypto.generateKeyPairSync('x25519');
        serverPriv = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        serverPub = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (_) {
        const raw = crypto.randomBytes(32);
        raw[0] &= 248; raw[31] &= 127; raw[31] |= 64;
        serverPriv = raw.toString('base64');
        serverPub = deriveX25519PublicKey(serverPriv) || crypto.randomBytes(32).toString('base64');
      }
    } else {
      const derived = deriveX25519PublicKey(serverPriv);
      if (derived) serverPub = derived;
    }

    if (this.state) {
      this.state.wireguardClientPrivateKey = clientPriv;
      this.state.wireguardClientPublicKey = clientPub;
      this.state.wireguardPrivateKey = serverPriv;
      this.state.wireguardPublicKey = serverPub;
    }

    return { clientPriv, clientPub, serverPub };
  }

  generateWireGuard() {
    try {
      if (!this.config || !this.config.enable || !this.config.enable.wireguard) return null;

      const keys = this._getOrGenerateWgKeys();
      const clientPrivateKey = keys.clientPriv;
      const serverPublicKey = keys.serverPub;

      if (!clientPrivateKey || !serverPublicKey) return null;

      const name = 'Plasma - WireGuard';
      const port = (this.config.wireguard && this.config.wireguard.port) || this.port || 51820;
      const clientIp = (this.config.wireguard && this.config.wireguard.clientIp) || '10.66.66.2/32';
      const ifaceAddress = clientIp.endsWith('/32') ? clientIp.replace('/32', '/24') : clientIp;
      const mtu = (this.config.wireguard && this.config.wireguard.mtu) || 1420;

      const wgConf = [
        '[Interface]',
        `PrivateKey = ${clientPrivateKey}`,
        `Address = ${ifaceAddress}`,
        'DNS = 1.1.1.1, 8.8.8.8',
        `MTU = ${mtu}`,
        '',
        '[Peer]',
        `PublicKey = ${serverPublicKey}`,
        `Endpoint = ${this.host}:${port}`,
        'AllowedIPs = 0.0.0.0/0, ::/0',
        'PersistentKeepalive = 25'
      ].join('\n') + '\n';

      const clashProxy = {
        name,
        type: 'wireguard',
        server: this.host,
        port,
        ip: clientIp.replace(/\/.*$/, ''),
        'public-key': serverPublicKey,
        'private-key': clientPrivateKey,
        udp: true,
        'remote-dns-resolve': true,
        dns: ['1.1.1.1', '8.8.8.8'],
        mtu
      };

      const sbOutbound = {
        type: 'wireguard',
        tag: name,
        server: this.host,
        server_port: port,
        local_address: [clientIp],
        private_key: clientPrivateKey,
        peer_public_key: serverPublicKey,
        mtu
      };

      const rawUri = `wireguard://${encodeURIComponent(clientPrivateKey)}@${this.host}:${port}?publickey=${encodeURIComponent(serverPublicKey)}&address=${encodeURIComponent(clientIp)}&mtu=${mtu}#${urlSafeEncode(name)}`;

      return {
        name,
        type: 'WireGuard',
        compat: false,
        uri: rawUri,
        wgConf,
        clash: clashProxy,
        singboxOutbound: [sbOutbound],
        singboxJson: JSON.stringify([sbOutbound], null, 2),
        note: 'WireGuard .conf / Clash Meta / Sing-box'
      };
    } catch (err) {
      console.warn(`[WARN] WireGuard generation failed: ${err.message}. Skipping.`);
      return null;
    }
  }

  generateTuic() {
    if (!this.config.enable.tuic) return null;
    const name = 'Plasma - TUIC';
    const port = this.config.tuic.port || 8443;
    const sni = this.config.sniHy2 || 'www.google.com';
    const cc = this.config.tuic.congestionController || 'bbr';

    const clashProxy = {
      name,
      type: 'tuic',
      server: this.host,
      port,
      uuid: this.state.uuid,
      password: this.state.uuid,
      alpn: ['h3'],
      sni,
      'skip-cert-verify': true,
      'congestion-controller': cc,
      udp: true
    };

    const sbOutbound = {
      type: 'tuic',
      tag: name,
      server: this.host,
      server_port: port,
      uuid: this.state.uuid,
      password: this.state.uuid,
      congestion_controller: cc,
      tls: {
        enabled: true,
        server_name: sni,
        alpn: ['h3'],
        insecure: true
      }
    };

    return {
      name,
      type: 'TUIC',
      compat: false,
      uri: `tuic://${this.state.uuid}:${this.state.uuid}@${this.host}:${port}?congestion_control=${cc}&alpn=h3&sni=${sni}&allow_insecure=1#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  /** XHTTP link options: XHTTP_MODE (default packet-up), XHTTP_ALPN (default h2 - Railway edge negotiates h2; Xray's xhttp client must match the edge ALPN). */
  static xhttpOptions() {
    const MODES = ['auto', 'packet-up', 'stream-up', 'stream-one'];
    let mode = String(process.env.XHTTP_MODE || 'packet-up').trim().toLowerCase();
    if (!MODES.includes(mode)) mode = 'packet-up';
    const raw = process.env.XHTTP_ALPN === undefined ? 'h2' : String(process.env.XHTTP_ALPN).trim();
    const alpn = /^(none|off|false)?$/i.test(raw) ? [] : raw.split(',').map(x => x.trim()).filter(Boolean);
    return { mode, alpn };
  }

  generateXhttp() {
    if (!this.config.enable.vlessXhttp) return null;
    if (this.config.xhttpPort === null) return null; // Xray-core failed to start
    if (this.edgeTls) {
      const name = 'Plasma - XHTTP-TLS';
      const o = this.tlsOpt;
      const x = LinkGenerator.xhttpOptions();
      let q = '&sni=' + encodeURIComponent(o.sni);
      if (o.fp) q += '&fp=' + encodeURIComponent(o.fp);
      if (x.alpn.length) q += '&alpn=' + encodeURIComponent(x.alpn.join(','));
      return {
        name,
        type: 'VLESS-XHTTP-TLS',
        label: 'VLESS-XHTTP-TLS',
        note: 'VLESS-XHTTP-TLS (Xray clients: v2rayNG, v2rayN, Hiddify w/ xray core)',
        compat: true, // v2ray subscription only; no Clash / sing-box outbound (unsupported there)
        uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=tls${q}&type=xhttp&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.xhPath)}&mode=${x.mode}#${urlSafeEncode(name)}`,
        clash: null
      };
    }
    const name = this.name('VLESS-XHTTP');
    return {
      name,
      type: 'VLESS-XHTTP',
      label: 'VLESS XHTTP',
      note: 'VLESS-XHTTP (Xray-core clients: v2rayN, v2rayNG, Hiddify w/ xray core)',
      compat: true, // BK_PROTOCOLS_APPLIED: listed in the normal subscription too (Xray clients support xhttp)
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=none&type=xhttp&host=${encodeURIComponent(this.plainHost)}&path=${urlSafeEncode(this.xhPath)}&mode=packet-up#${urlSafeEncode(name)}`,
      clash: null
    };
  }

  generateArgo(argoDomain) {
    if (!this.config.enable.argo || !argoDomain) return null;
    const name = 'Plasma - Argo';
    const clashProxy = {
      name,
      type: 'vless',
      server: argoDomain,
      port: 443,
      uuid: this.state.uuid,
      network: 'ws',
      tls: true,
      servername: argoDomain,
      'ws-opts': {
        path: this.wsPath,
        headers: { Host: argoDomain }
      }
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: argoDomain,
      server_port: 443,
      uuid: this.state.uuid,
      tls: {
        enabled: true,
        server_name: argoDomain
      },
      transport: {
        type: 'ws',
        path: this.wsPath,
        headers: { Host: argoDomain }
      }
    };
    return {
      name,
      type: 'VLESS-Argo',
      compat: true,
      uri: `vless://${this.state.uuid}@${argoDomain}:443?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=${urlSafeEncode(this.wsPath)}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateTrojanWs() {
    if (!this.config.enable.trojanWs) return null;
    if (this.edgeTls) {
      const name = 'Plasma - Trojan-WS-TLS';
      const o = this.tlsOpt;
      const sbOutbound = {
        type: 'trojan', tag: name, server: this.host, server_port: this.port, password: this.state.uuid,
        tls: this._sbTls(),
        transport: { type: 'ws', path: this.trPath, headers: { Host: o.wsHost } }
      };
      return {
        name,
        type: 'Trojan-WS-TLS',
        label: 'Trojan WebSocket TLS',
        compat: true,
        uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=tls${this._uriTls()}&type=ws&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.trPath)}#${urlSafeEncode(name)}`,
        clash: this._clashTls({
          name, type: 'trojan', server: this.host, port: this.port, password: this.state.uuid, network: 'ws',
          'ws-opts': { path: this.trPath, headers: { Host: o.wsHost } }
        }, 'sni'),
        singboxOutbound: [sbOutbound],
        singboxJson: JSON.stringify([sbOutbound], null, 2)
      };
    }
    const name = 'Plasma - Trojan-WS';
    const trPath = this.trPath;
    const clashProxy = {
      name,
      type: 'trojan',
      server: this.host,
      port: this.port,
      password: this.state.uuid,
      network: 'ws',
      tls: false,
      'ws-opts': {
        path: trPath,
        headers: { Host: this.host }
      }
    };
    const sbOutbound = {
      type: 'trojan',
      tag: name,
      server: this.host,
      server_port: this.port,
      password: this.state.uuid,
      transport: {
        type: 'ws',
        path: trPath,
        headers: { Host: this.host }
      }
    };
    return {
      name,
      type: 'Trojan-WS',
      label: 'Trojan WebSocket Direct',
      compat: true,
      uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=none&type=ws&host=${this.host}&path=${urlSafeEncode(trPath)}#${urlSafeEncode(name)}`,
      clash: null, // BK_PROTOCOLS_APPLIED: mihomo always uses TLS for Trojan (the entry could never connect); use Trojan-WS-TLS there
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateTrojanGrpcTls() {
    if (!this.config.enable.trojanGrpcTls) return null;
    const name = 'Plasma - gRPC';
    const sni = this.config.domain || this.host;
    const serviceName = this.grpcService;
    const clashProxy = {
      name,
      type: 'trojan',
      server: this.host,
      port: this.port,
      password: this.state.uuid,
      network: 'grpc',
      tls: true,
      sni: sni,
      'skip-cert-verify': true,
      alpn: ['h2'],
      'grpc-opts': {
        'grpc-service-name': serviceName
      }
    };
    const sbOutbound = {
      type: 'trojan',
      tag: name,
      server: this.host,
      server_port: this.port,
      password: this.state.uuid,
      tls: {
        enabled: true,
        server_name: sni,
        alpn: ['h2'],
        insecure: true
      },
      transport: {
        type: 'grpc',
        service_name: serviceName
      }
    };
    return {
      name,
      type: 'Trojan-gRPC-TLS',
      label: 'CDN gRPC Alternative',
      compat: true,
      uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=tls&sni=${sni}&alpn=h2&type=grpc&serviceName=${urlSafeEncode(serviceName)}&fp=chrome${this._uriInsecure()}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVlessGrpc() {
    if (!this.config.enable.vlessGrpc) return null;
    if (this.edgeTls) return null; // BK_PROTOCOLS_APPLIED: an HTTP/1.1 edge (Replit/Railway) cannot carry h2c gRPC
    const name = this.name('VLESS-gRPC');
    const serviceName = this.grpcService;
    const clashProxy = {
      name,
      type: 'vless',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      network: 'grpc',
      tls: false,
      'grpc-opts': {
        'grpc-service-name': serviceName
      }
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      transport: {
        type: 'grpc',
        service_name: serviceName
      }
    };
    return {
      name,
      type: 'VLESS-gRPC',
      label: 'gRPC Direct',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=none&type=grpc&serviceName=${urlSafeEncode(serviceName)}&mode=gun#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  getAllNodes(options = {}) {
    let argoDomain = null;
    let compat = 'v2ray';
    let allowLocalHost = this.config.allowLocalHostLinks || false;

    if (typeof options === 'string') {
      argoDomain = options;
    } else if (options && typeof options === 'object') {
      argoDomain = options.argoDomain || null;
      if (options.compat) compat = options.compat;
      if (options.allowLocalHostLinks !== undefined) allowLocalHost = options.allowLocalHostLinks;
    }

    let wgNode = null;
    try {
      wgNode = this.generateWireGuard();
    } catch (err) {
      console.warn(`[WARN] WireGuard skipped in getAllNodes: ${err.message}`);
    }

    const all = [
      this.generateReality(),
      this.generateVlessWsTls(),
      this.generateTrojanGrpcTls(),
      this.generateVmessWsTls(),
      this.generateVlessWs(),
      this.generateVmessWs(),
      this.generateTrojanWs(),
      this.generateTrojanWsTls(),
      this.generateVlessHttpUpgrade(),
      this.generateVmessHttpUpgrade(),
      this.generateTrojanHttpUpgrade(),
      this.generateVlessGrpc(),
      this.generateVlessGrpcTls(),
      this.generateXhttp(),
      this.generateShadowsocksWs(),
      this.generateShadowsocks(),
      wgNode,
      this.generateShadowTls(),
      this.generateTuic(),
      this.generateArgo(argoDomain)
    ].filter(Boolean);

    return all.filter(node => isValidNode(node, { allowLocalHostLinks: allowLocalHost, compatMode: compat }));
  }

  buildClashMetaYaml(nodes) {
    const proxyLines = [];
    const proxyNames = [];

    for (const node of nodes) {
      if (!node.clash) continue;
      proxyNames.push(node.clash.name);
      proxyLines.push(`  - name: ${yamlSafeQuote(node.clash.name)}`);
      proxyLines.push(`    type: ${node.clash.type}`);
      proxyLines.push(`    server: ${yamlSafeQuote(node.clash.server)}`);
      proxyLines.push(`    port: ${node.clash.port}`);
      if (node.clash.fingerprint) proxyLines.push(`    fingerprint: ${yamlSafeQuote(node.clash.fingerprint)}`);
      if (node.clash.plugin) {
        proxyLines.push(`    plugin: ${node.clash.plugin}`);
        const po = node.clash['plugin-opts'] || {};
        proxyLines.push(`    plugin-opts:`);
        for (const [k, v] of Object.entries(po)) proxyLines.push(`      ${k}: ${typeof v === 'string' ? yamlSafeQuote(v) : v}`);
      }

      if (node.clash.password) proxyLines.push(`    password: ${yamlSafeQuote(node.clash.password)}`);
      if (node.clash.uuid) proxyLines.push(`    uuid: ${yamlSafeQuote(node.clash.uuid)}`);
      if (node.clash.alterId !== undefined) proxyLines.push(`    alterId: ${node.clash.alterId}`);
      if (node.clash.sni) proxyLines.push(`    sni: ${yamlSafeQuote(node.clash.sni)}`);
      if (node.clash.servername) proxyLines.push(`    servername: ${yamlSafeQuote(node.clash.servername)}`);
      if (node.clash['skip-cert-verify'] !== undefined) proxyLines.push(`    skip-cert-verify: ${node.clash['skip-cert-verify']}`);
      if (node.clash.obfs) proxyLines.push(`    obfs: ${node.clash.obfs}`);
      if (node.clash['obfs-password']) proxyLines.push(`    obfs-password: ${yamlSafeQuote(node.clash['obfs-password'])}`);
      if (node.clash.alpn) proxyLines.push(`    alpn: [${node.clash.alpn.map(yamlSafeQuote).join(', ')}]`);
      if (node.clash.network) proxyLines.push(`    network: ${node.clash.network}`);
      if (node.clash.tls !== undefined) proxyLines.push(`    tls: ${node.clash.tls}`);
      if (node.clash.flow) proxyLines.push(`    flow: ${node.clash.flow}`);
      if (node.clash['client-fingerprint']) proxyLines.push(`    client-fingerprint: ${node.clash['client-fingerprint']}`);

      if (node.clash.ip) proxyLines.push(`    ip: ${yamlSafeQuote(node.clash.ip)}`);
      if (node.clash['public-key']) proxyLines.push(`    public-key: ${yamlSafeQuote(node.clash['public-key'])}`);
      if (node.clash['private-key']) proxyLines.push(`    private-key: ${yamlSafeQuote(node.clash['private-key'])}`);
      if (node.clash.udp !== undefined) proxyLines.push(`    udp: ${node.clash.udp}`);
      if (node.clash['remote-dns-resolve'] !== undefined) proxyLines.push(`    remote-dns-resolve: ${node.clash['remote-dns-resolve']}`);
      if (node.clash.dns) proxyLines.push(`    dns: [${node.clash.dns.map(yamlSafeQuote).join(', ')}]`);
      if (node.clash.mtu) proxyLines.push(`    mtu: ${node.clash.mtu}`);
      if (node.clash['congestion-controller']) proxyLines.push(`    congestion-controller: ${yamlSafeQuote(node.clash['congestion-controller'])}`);

      if (node.clash['reality-opts']) {
        proxyLines.push(`    reality-opts:`);
        proxyLines.push(`      public-key: ${yamlSafeQuote(node.clash['reality-opts']['public-key'])}`);
        proxyLines.push(`      short-id: ${yamlSafeQuote(node.clash['reality-opts']['short-id'])}`);
      }

      if (node.clash['ws-opts']) {
        proxyLines.push(`    ws-opts:`);
        proxyLines.push(`      path: ${yamlSafeQuote(node.clash['ws-opts'].path)}`);
        if (node.clash['ws-opts'].headers) {
          proxyLines.push(`      headers:`);
          for (const [k, v] of Object.entries(node.clash['ws-opts'].headers)) {
            proxyLines.push(`        ${k}: ${yamlSafeQuote(v)}`);
          }
        }
        if (node.clash['ws-opts']['v2ray-http-upgrade']) proxyLines.push(`      v2ray-http-upgrade: true`);
      }

      if (node.clash['httpupgrade-opts']) {
        proxyLines.push(`    httpupgrade-opts:`);
        proxyLines.push(`      path: ${yamlSafeQuote(node.clash['httpupgrade-opts'].path)}`);
        proxyLines.push(`      host: ${yamlSafeQuote(node.clash['httpupgrade-opts'].host)}`);
      }

      if (node.clash['grpc-opts']) {
        proxyLines.push(`    grpc-opts:`);
        proxyLines.push(`      grpc-service-name: ${yamlSafeQuote(node.clash['grpc-opts']['grpc-service-name'])}`);
      }

      if (node.clash.cipher) proxyLines.push(`    cipher: ${node.clash.cipher}`);
      if (node.clash.version) proxyLines.push(`    version: ${node.clash.version}`);
    }

    const proxiesBlock = proxyLines.join('\n');
    const proxyListStr = proxyNames.map(name => `      - ${yamlSafeQuote(name)}`).join('\n');

    return `# Plasma - Clash Meta (Mihomo) Subscription
port: 7890
socks-port: 7891
allow-lan: true
mode: rule
log-level: info

proxies:
${proxiesBlock}

proxy-groups:
  - name: "🛡️ Plasma"
    type: select
    proxies:
      - "⚡ Auto Select"
${proxyListStr}

  - name: "⚡ Auto Select"
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    tolerance: 50
    proxies:
${proxyListStr}

rules:
  - MATCH,"🛡️ Plasma"
`;
  }

  buildSingBoxClientJson(nodes) {
    const outbounds = [];
    const proxyTags = [];

    for (const node of nodes) {
      if (node.singboxOutbound && Array.isArray(node.singboxOutbound)) {
        for (const ob of node.singboxOutbound) {
          outbounds.push(ob);
        }
        proxyTags.push(node.name);
      }
    }

    const allOutbounds = [];

    if (proxyTags.length > 0) {
      allOutbounds.push(
        {
          type: 'selector',
          tag: '🛡️ Plasma',
          outbounds: ['⚡ Auto Select', ...proxyTags]
        },
        {
          type: 'urltest',
          tag: '⚡ Auto Select',
          outbounds: [...proxyTags],
          url: 'http://www.gstatic.com/generate_204',
          interval: '5m'
        }
      );
    }

    allOutbounds.push(...outbounds);
    allOutbounds.push({ type: 'direct', tag: 'direct' }); // BK_PROTOCOLS_APPLIED: no legacy "block" outbound (removed in sing-box 1.13)

    return JSON.stringify({
      log: { level: 'info' },
      outbounds: allOutbounds
    }, null, 2);
  }
}

// --- Module: lib/panel/http-panel.js ---
function createHttpPanel(config, stateManager, engineStatusGetter, resolvedHostGetter, bkHooks = {}) {
  const app = express();
  const panelPath = config.panelPath.replace(/^\//, '') || 'plasma';

  // ===== XHTTP -> Xray-core streaming reverse proxy (registered before any auth / static route) =====
  const BK_XHTTP_PATH = XrayEngine.xhttpPath();
  const BK_HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'upgrade', 'te', 'trailer', 'proxy-authorization']);
  let bkXhttpLogged = 0;
  app.use((req, res, next) => {
    let p = String(req.url || '').split('?')[0];
    try { p = decodeURIComponent(p); } catch (_) {}
    // BK_USERS: per-user XHTTP path -> quota/expiry check, rewrite to canonical, meter per user.
    let bkXhUser = null;
    const bkXhParsed = BkUsers.parseUserPath(p);
    if (bkXhParsed) {
      bkXhUser = bkXhParsed.user;
      if (!BkUsers.isAllowed(bkXhUser)) { res.statusCode = 403; return res.end(); }
      const bkQ = String(req.url || '').split('?')[1];
      req.url = bkXhParsed.canonical + (bkQ ? '?' + bkQ : '');
      p = bkXhParsed.canonical;
    }
    if (!(p === BK_XHTTP_PATH || p.startsWith(BK_XHTTP_PATH + '/'))) return next();
    const port = config.xhttpPort;
    if (!port) { res.statusCode = 404; return res.end(); }
    if (bkXhttpLogged < 10) { bkXhttpLogged++; Logger.info(`XHTTP ${req.method} ${p.slice(BK_XHTTP_PATH.length) || '/'} -> xray :${port}`); }
    for (const sock of [req.socket]) { try { sock.setTimeout(0); sock.setNoDelay(true); sock.setKeepAlive(true, 10000); } catch (_) {} }
    const headers = {};
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const k = req.rawHeaders[i];
      if (BK_HOP.has(k.toLowerCase())) continue;
      headers[k] = headers[k] === undefined ? req.rawHeaders[i + 1] : [].concat(headers[k], req.rawHeaders[i + 1]);
    }
    const up = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers, agent: false });
    up.on('socket', (sk) => { try { sk.setTimeout(0); sk.setNoDelay(true); } catch (_) {} });
    up.on('response', (pr) => {
      const out = {};
      for (let i = 0; i < pr.rawHeaders.length; i += 2) {
        const k = pr.rawHeaders[i];
        if (BK_HOP.has(k.toLowerCase())) continue;
        out[k] = out[k] === undefined ? pr.rawHeaders[i + 1] : [].concat(out[k], pr.rawHeaders[i + 1]);
      }
      res.removeHeader('X-Powered-By');
      res.writeHead(pr.statusCode, pr.statusMessage, out);
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      pr.on('data', (b) => { BkTraffic.add('VLESS-XHTTP', 0, b.length); if (bkXhUser) BkUsers.addUsage(bkXhUser.id, 0, b.length); });
      pr.pipe(res);
      pr.on('error', () => { try { res.destroy(); } catch (_) {} });
    });
    up.on('error', () => {
      if (!res.headersSent) { res.statusCode = 502; res.end(); } else { try { res.destroy(); } catch (_) {} }
    });
    const bkXhDone = BkTraffic.open('VLESS-XHTTP');
    res.once('close', bkXhDone);
    req.on('data', (b) => { BkTraffic.add('VLESS-XHTTP', b.length, 0); if (bkXhUser) BkUsers.addUsage(bkXhUser.id, b.length, 0); });
    req.pipe(up);
    req.on('error', () => { try { up.destroy(); } catch (_) {} });
    res.on('close', () => { if (!res.writableFinished) { try { up.destroy(); } catch (_) {} } });
  });

  // ===== Plasma: password login (create on first visit) =====
  const bkAuthFile = path.join(stateManager.paths.dataDir, 'auth.json');
  const bkLoadAuth = () => { try { return JSON.parse(fs.readFileSync(bkAuthFile, 'utf8')) || {}; } catch (_) { return {}; } };
  const bkSaveAuth = (a) => {
    try {
      fs.mkdirSync(path.dirname(bkAuthFile), { recursive: true });
      fs.writeFileSync(bkAuthFile, JSON.stringify(a, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch (err) { Logger.warn('Could not save auth.json: ' + err.message); }
  };
  (function bkInitAuth() {
    const a = bkLoadAuth();
    if (process.env.RESET_PANEL_PASSWORD === 'true') {
      delete a.hash; delete a.salt; a.secret = '';
      Logger.warn('Panel password was reset. Open the panel to create a new one, then delete RESET_PANEL_PASSWORD.');
    }
    if (!a.secret) a.secret = crypto.randomBytes(32).toString('hex');
    const envTok = String(process.env.SUB_TOKEN || '').trim();
    if (envTok) a.subToken = envTok;
    if (!a.subToken) a.subToken = crypto.randomBytes(18).toString('base64url');
    const envPw = String(process.env.PANEL_PASSWORD || '');
    if (envPw && process.env.RESET_PANEL_PASSWORD !== 'true') {
      const same = a.hash && a.salt && crypto.scryptSync(envPw, String(a.salt), 64).toString('hex') === a.hash;
      if (!same) {
        if (envPw.length < 8) Logger.warn('PANEL_PASSWORD is shorter than 8 characters - ignored.');
        else { a.salt = crypto.randomBytes(16).toString('hex'); a.hash = crypto.scryptSync(envPw, a.salt, 64).toString('hex'); Logger.info('Panel password set from PANEL_PASSWORD secret.'); }
      }
    }
    bkSaveAuth(a);
  })();
  const bkHash = (pw, salt) => crypto.scryptSync(String(pw), String(salt), 64).toString('hex');
  const bkSafeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const bkSign = (secret, v) => crypto.createHmac('sha256', secret).update(String(v)).digest('hex');
  const bkCookies = (req) => {
    const out = {};
    String(req.headers.cookie || '').split(';').forEach((p) => {
      const i = p.indexOf('=');
      if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (_) {} }
    });
    return out;
  };
  const bkIsHttps = (req) => req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  const BK_SESSION_DAYS = 30;
  const bkSetSession = (req, res, a) => {
    const exp = String(Date.now() + BK_SESSION_DAYS * 86400000);
    const val = exp + '.' + bkSign(a.secret, exp);
    res.setHeader('Set-Cookie', 'bk_session=' + val + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (BK_SESSION_DAYS * 86400) + (bkIsHttps(req) ? '; Secure' : ''));
  };
  const bkHasSession = (req) => {
    const a = bkLoadAuth();
    if (!a.hash || !a.secret) return false;
    const parts = String(bkCookies(req).bk_session || '').split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1] || Number(parts[0]) < Date.now()) return false;
    return bkSafeEq(parts[1], bkSign(a.secret, parts[0]));
  };
  const bkFails = new Map();
  const bkIp = (req) => String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  const bkBlocked = (ip) => { const r = bkFails.get(ip); return !!r && r.count >= 8 && Date.now() - r.first < 15 * 60000; };
  const bkFail = (ip) => { const r = bkFails.get(ip); if (!r || Date.now() - r.first > 15 * 60000) bkFails.set(ip, { count: 1, first: Date.now() }); else r.count++; };
  const bkEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bkPage = (mode, msg) => {
    const setup = mode === 'setup';
    const needKey = setup && !!process.env.SETUP_KEY;
    const svg = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    const ico = {
      lock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="3.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
      key: svg('<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 19 4M16 7l2 2M14 9l1.5 1.5"/>'),
      shield: svg('<path d="M12 3.2 5 6v5.2c0 4.3 2.9 8.2 7 9.6 4.1-1.4 7-5.3 7-9.6V6l-7-2.8z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
      eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
      eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.7 16.7 0 0 1-3.1 3.8M6.3 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
      info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/>'),
      bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"/></svg>',
      arrow: svg('<path d="M19 12H5M11 18l-6-6 6-6"/>')
    };
    const field = (name, fa, attrs, icon, i) =>
      '<div class="f" style="--i:' + i + '"><label for="bk-' + name + '">' + fa + '</label>' +
      '<div class="inp"><span class="ic">' + icon + '</span>' +
      '<input id="bk-' + name + '" name="' + name + '" type="password" ' + attrs + ' dir="ltr" spellcheck="false">' +
      '<button type="button" class="eye" data-for="bk-' + name + '" aria-label="نمایش / پنهان کردن رمز" aria-pressed="false"><span class="e1">' + ico.eye + '</span><span class="e2">' + ico.eyeOff + '</span></button>' +
      '</div></div>';
    const faOnly = (m) => { const parts = String(m).split(' / '); const fa = parts.find(t => /[\u0600-\u06FF]/.test(t)); return fa || parts[0] || ''; };
    let idx = 0;
    const css =
      '*{box-sizing:border-box;margin:0;padding:0}' +
      ':root{--txt:#eef0ff;--sub:#b7bddc;--mut:#8a90b3;--line:rgba(255,255,255,.12);--ease:cubic-bezier(.22,1,.36,1);' +
      '--font:"IRANSansX",Vazirmatn,Tahoma,"Segoe UI",sans-serif}' +
      'html,body{min-height:100%}body{min-height:100vh;color:var(--txt);font-family:var(--font);-webkit-font-smoothing:antialiased;overflow-x:hidden;' +
      'background:radial-gradient(900px 520px at 12% -8%,rgba(94,160,255,.22),transparent 60%),radial-gradient(820px 560px at 105% 0%,rgba(139,124,246,.24),transparent 55%),radial-gradient(700px 500px at 50% 115%,rgba(45,212,191,.12),transparent 60%),linear-gradient(160deg,#0a0e1c,#101731)}' +
      '.wrap{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:40px 18px}' +
      '.brand{display:flex;align-items:center;gap:12px;color:var(--txt);text-decoration:none;animation:fadeUp .8s var(--ease) forwards}' +
      '.brand .bic{width:44px;height:44px;border-radius:13px;background:linear-gradient(120deg,#4f8cff,#7c5cff 55%,#c86dd7);display:grid;place-items:center;color:#fff;box-shadow:0 10px 24px -8px rgba(124,108,240,.7)}' +
      '.brand .bic svg{width:25px;height:25px}.brand b{display:block;font-size:1.15rem;font-weight:800}.brand small{color:var(--mut);font-size:.74rem}' +
      '.card{position:relative;width:100%;max-width:440px;padding:36px 32px 28px;border-radius:26px;background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.025) 60%),rgba(18,22,44,.72);border:1px solid var(--line);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px);box-shadow:0 40px 90px -30px rgba(0,0,0,.65);animation:fadeUp .9s var(--ease) forwards}' +
      '.head{text-align:center}.logo{width:82px;height:82px;margin:0 auto 18px;border-radius:24px;background:linear-gradient(140deg,#4f8cff,#7c5cff 55%,#c86dd7);display:grid;place-items:center;color:#fff;box-shadow:0 16px 36px -12px rgba(120,100,240,.65)}' +
      '.logo svg{width:44px;height:44px}' +
      '.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:999px;background:rgba(139,124,246,.14);border:1px solid rgba(139,124,246,.25);color:#cfc6ff;font-size:.72rem;font-weight:700}.pill svg{width:14px;height:14px}' +
      'h1{margin:14px 0 6px;font-family:"Morabba","IRANSansX",sans-serif;font-size:1.55rem;font-weight:800;line-height:1.4}h1 span{background:linear-gradient(90deg,#9cc3ff,#c3b5ff 55%,#ffb1c3);-webkit-background-clip:text;background-clip:text;color:transparent}' +
      '.sub{margin:10px auto 24px;max-width:340px;font-size:.88rem;line-height:2;color:var(--mut)}' +
      '.alert{display:flex;gap:11px;align-items:flex-start;margin:0 0 18px;padding:13px 16px;border-radius:16px;background:rgba(240,138,166,.10);border:1px solid rgba(240,138,166,.25);color:#ffd5df;font-size:.85rem;line-height:1.9}.alert svg{flex:0 0 18px;width:18px;height:18px;margin-top:3px}' +
      '.f{margin-bottom:16px;text-align:right}.f label{display:block;margin:0 4px 8px;font-size:.82rem;font-weight:600;color:var(--sub)}' +
      '.inp{position:relative;display:flex;align-items:center}.inp input{width:100%;height:52px;padding:0 52px 0 50px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--txt);font:inherit;font-size:.98rem;outline:none;transition:border-color .3s,background .3s,box-shadow .3s}' +
      '.inp input::placeholder{color:#7b81a6}.inp input:focus{border-color:rgba(160,145,255,.55);background:rgba(255,255,255,.08);box-shadow:0 0 0 5px rgba(139,124,246,.14)}' +
      '.ic{position:absolute;left:19px;width:19px;height:19px;color:#8a90b3;pointer-events:none}.ic svg,.eye svg{width:19px;height:19px;display:block}' +
      '.eye{position:absolute;right:8px;width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:#8a90b3;cursor:pointer;display:grid;place-items:center}.eye:hover{background:rgba(255,255,255,.07);color:var(--txt)}' +
      '.eye span{grid-area:1/1;display:block;transition:opacity .3s,transform .3s}.eye .e2{opacity:0;transform:scale(.7)}.eye.on .e1{opacity:0}.eye.on .e2{opacity:1;transform:none}.eye.on{color:#c3b5ff}' +
      '.hint{margin:-6px 8px 16px;font-size:.76rem;line-height:1.9;color:var(--mut);text-align:right}' +
      '.btn{width:100%;height:54px;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:999px;cursor:pointer;color:#fff;font:inherit;font-size:1rem;font-weight:700;' +
      'background:linear-gradient(120deg,#4f8cff,#7c5cff 55%,#c86dd7);box-shadow:0 16px 34px -14px rgba(120,100,240,.75);transition:transform .3s var(--ease),filter .3s}.btn:hover{transform:translateY(-2px)}.btn:active{transform:scale(.99)}' +
      '.btn[disabled]{filter:saturate(.7) brightness(.9);cursor:wait}.btn svg{width:19px;height:19px}' +
      '.safe{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:18px;font-size:.76rem;color:var(--mut)}.safe svg{width:15px;height:15px;color:#8fd6b4}' +
      '.foot{color:var(--mut);font-size:.8rem;font-weight:700;letter-spacing:.14em}' +
      '@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
      '@media (max-width:480px){.card{padding:30px 20px 24px}h1{font-size:1.35rem}}' +
      '@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}';
    const js =
      'document.querySelectorAll(".eye").forEach(function(b){b.addEventListener("click",function(){var i=document.getElementById(b.getAttribute("data-for"));if(!i)return;var s=i.type==="password";' +
      'var p=i.selectionStart,q=i.selectionEnd;i.type=s?"text":"password";b.classList.toggle("on",s);b.setAttribute("aria-pressed",s?"true":"false");i.focus();try{i.setSelectionRange(p,q);}catch(e){}});});' +
      'var f=document.getElementById("bk-form");if(f)f.addEventListener("submit",function(){var b=f.querySelector(".btn");if(b)setTimeout(function(){b.disabled=true;},0);});';
    return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">' +
      '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">' +
      '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0a0e1c">' +
      '<title>' + (setup ? 'ساخت رمز عبور' : 'ورود') + ' | Plasma</title>' +
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%238b7cf6\' d=\'M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z\'/%3E%3C/svg%3E"><style>' + BK_FONT_CSS + css + '</style></head><body>' +
      '<main class="wrap">' +
      '<a class="brand" href="/' + panelPath + '/login"><span class="bic">' + ico.bolt + '</span>' +
      '<div><b>Plasma</b><small>پنل مدیریت اشتراک</small></div></a>' +
      '<form id="bk-form" class="card" method="post" action="/' + panelPath + '/login" autocomplete="on">' +
      '<div class="head"><div class="logo">' + ico.bolt + '</div>' +
      '<div class="pill">' + ico.shield + (setup ? 'راه‌اندازی اولیه' : 'خوش برگشتید') + '</div>' +
      '<h1>' + (setup ? 'ساخت <span>رمز پنل</span>' : 'ورود به <span>پنل Plasma</span>') + '</h1>' +
      '<p class="sub">' + (setup
        ? 'اولین ورود: یک رمز برای پنل بسازید (حداقل ۸ کاراکتر).'
        : 'رمز پنل را وارد کنید.') + '</p></div>' +
      (msg ? '<div class="alert" role="alert">' + ico.info + '<div>' + bkEsc(faOnly(msg)) + '</div></div>' : '') +
      (needKey ? field('setup_key', 'کلید راه‌اندازی', 'autocomplete="off" required placeholder="SETUP_KEY"', ico.key, idx++) +
        '<div class="hint">مقدار SETUP_KEY که در Secrets / متغیرها گذاشته‌اید.</div>' : '') +
      field('password', setup ? 'رمز جدید' : 'رمز عبور',
        'minlength="' + (setup ? 8 : 1) + '" autocomplete="' + (setup ? 'new-password' : 'current-password') + '" required autofocus placeholder="' + (setup ? 'حداقل ۸ کاراکتر' : 'رمز پنل') + '"', ico.lock, idx++) +
      (setup ? field('confirm', 'تکرار رمز', 'minlength="8" autocomplete="new-password" required placeholder="تکرار رمز"', ico.lock, idx++) : '') +
      '<button type="submit" class="btn">' + '<span>' + (setup ? 'ساخت رمز و ورود' : 'ورود') + '</span>' + ico.arrow + '</button>' +
      '<div class="safe">' + ico.shield + '<span>' + (setup ? 'رمز به‌صورت هش‌شده با scrypt و salt روی سرور ذخیره می‌شود' : 'نشست خصوصی · ۳۰ روز') + '</span></div>' +
      '</form>' +
      '<div class="foot">PLASMA</div>' +
      '</main><script>' + js + '</script></body></html>';
  };
  const bkSendPage = (res, mode, msg, code) => {
    res.status(code || 200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(bkPage(mode, msg));
  };
  app.get('/' + panelPath + '/login', (req, res) => {
    const a = bkLoadAuth();
    if (a.hash && bkHasSession(req)) return res.redirect(302, '/' + panelPath);
    bkSendPage(res, a.hash ? 'login' : 'setup', '');
  });
  app.post('/' + panelPath + '/login', express.urlencoded({ extended: false, limit: '10kb' }), (req, res) => {
    const a = bkLoadAuth();
    const ip = bkIp(req);
    const b = req.body || {};
    const mode = a.hash ? 'login' : 'setup';
    if (bkBlocked(ip)) return bkSendPage(res, mode, 'تلاش زیاد. ۱۵ دقیقه دیگه امتحان کن. / Too many attempts, try again in 15 minutes.', 429);
    if (!a.hash) {
      if (process.env.SETUP_KEY && !bkSafeEq(String(b.setup_key || ''), process.env.SETUP_KEY)) { bkFail(ip); return bkSendPage(res, 'setup', 'Setup Key اشتباهه. / Wrong setup key.', 401); }
      const pw = String(b.password || '');
      if (pw.length < 8) return bkSendPage(res, 'setup', 'رمز باید حداقل ۸ کاراکتر باشه. / Password must be at least 8 characters.', 400);
      if (pw !== String(b.confirm || '')) return bkSendPage(res, 'setup', 'تکرار رمز یکی نیست. / Passwords do not match.', 400);
      a.salt = crypto.randomBytes(16).toString('hex');
      a.hash = bkHash(pw, a.salt);
      a.secret = crypto.randomBytes(32).toString('hex');
      bkSaveAuth(a);
      Logger.success('Panel password created.');
      bkSetSession(req, res, a);
      return res.redirect(302, '/' + panelPath);
    }
    if (!bkSafeEq(bkHash(String(b.password || ''), a.salt), a.hash)) { bkFail(ip); return bkSendPage(res, 'login', 'رمز اشتباهه. / Wrong password.', 401); }
    bkFails.delete(ip);
    bkSetSession(req, res, a);
    return res.redirect(302, '/' + panelPath);
  });
  app.get('/' + panelPath + '/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'bk_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.redirect(302, '/' + panelPath + '/login');
  });

  // Auth: logged-in session cookie, or ?token=<subscription token> for VPN client subscriptions
  const authMiddleware = (req, res, next) => {
    if (bkHasSession(req)) return next();
    const a = bkLoadAuth();
    const q = typeof req.query.token === 'string' ? req.query.token : '';
    if (q && a.hash && a.subToken && bkSafeEq(q, a.subToken)) return next();
    if (req.method === 'GET' && (req.path === '/' || req.path === '/' + panelPath || req.path === '/' + panelPath + '/')) {
      return res.redirect(302, '/' + panelPath + '/login');
    }
    res.status(401).send('Unauthorized');
  };

  // Find assets directory on disk and mount express.static
  
  
  const candidateAssetDirs = [
    path.join(process.cwd(), 'assets'),
    path.join(__dirname, '..', '..', 'assets'),
    path.join(__dirname, 'assets')
  ];
  for (const dir of candidateAssetDirs) {
    if (fs.existsSync(dir)) {
      app.use('/assets', express.static(dir));
      app.use('/plasma-assets', express.static(dir));
      app.use(`/${panelPath}/assets`, express.static(dir));
      break;
    }
  }

  // Asset routes (with multiple alias paths for maximum client compatibility)
  app.get(['/plasma-assets/app.css', '/assets/app.css', `/${panelPath}/assets/app.css`, `/${panelPath}/app.css`, '/app.css'], (req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // short: panel updates show up after a redeploy
    res.send(AssetManager.getAppCss());
  });

  app.get(['/plasma-assets/app.js', '/assets/app.js', `/${panelPath}/assets/app.js`, `/${panelPath}/app.js`, '/app.js'], (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // short: panel updates show up after a redeploy
    res.send(AssetManager.getAppJs());
  });

  // Brand logo (supports .png and .jpg)
  app.get([
    '/plasma-assets/logo.png', '/plasma-assets/logo.jpg',
    '/assets/logo.png', '/assets/logo.jpg',
    `/${panelPath}/assets/logo.png`, `/${panelPath}/assets/logo.jpg`,
    `/${panelPath}/logo.png`, `/${panelPath}/logo.jpg`,
    '/logo.png', '/logo.jpg'
  ], (req, res) => {
    const imgBuffer = AssetManager.getLogo();
    if (imgBuffer) {
      const isJpg = req.path.endsWith('.jpg') || req.path.endsWith('.jpeg');
      res.setHeader('Content-Type', isJpg ? 'image/jpeg' : 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Logo not found');
    }
  });

  // Dark background bg.jpg (supports /plasma-assets/bg.jpg, /assets/bg.jpg, /bg.jpg, and legacy .png)
  app.get([
    '/plasma-assets/bg.jpg', '/plasma-assets/bg.png',
    '/assets/bg.jpg', '/assets/bg.png',
    `/${panelPath}/assets/bg.jpg`, `/${panelPath}/assets/bg.png`,
    `/${panelPath}/bg.jpg`, `/${panelPath}/bg.png`,
    '/bg.jpg', '/bg.png'
  ], (req, res) => {
    const imgBuffer = AssetManager.getBgJpg();
    if (imgBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Background not found');
    }
  });

  // Cozy background cozybg.jpg (supports /plasma-assets/cozybg.jpg, /assets/cozybg.jpg, /cozybg.jpg, and legacy .png)
  app.get([
    '/plasma-assets/cozybg.jpg', '/plasma-assets/cozybg.png',
    '/assets/cozybg.jpg', '/assets/cozybg.png',
    `/${panelPath}/assets/cozybg.jpg`, `/${panelPath}/assets/cozybg.png`,
    `/${panelPath}/cozybg.jpg`, `/${panelPath}/cozybg.png`,
    '/cozybg.jpg', '/cozybg.png'
  ], (req, res) => {
    const imgBuffer = AssetManager.getCozyBgJpg();
    if (imgBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Cozy background not found');
    }
  });

  // Home hero home.jpg (supports /plasma-assets/home.jpg, /assets/home.jpg, /home.jpg, and legacy .png)
  app.get([
    '/plasma-assets/home.jpg', '/plasma-assets/home.png',
    '/assets/home.jpg', '/assets/home.png',
    `/${panelPath}/assets/home.jpg`, `/${panelPath}/assets/home.png`,
    `/${panelPath}/home.jpg`, `/${panelPath}/home.png`,
    '/home.jpg', '/home.png'
  ], (req, res) => {
    const imgBuffer = AssetManager.getHomeJpg();
    if (imgBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Home image not found');
    }
  });

  // Helper to get active host for request
  const getRequestHost = (req) => {
    if (config.forceHost) return config.forceHost;
    // An explicit DOMAIN variable always wins; otherwise the host the visitor used (e.g. an attached custom
    // domain) beats the auto-injected RAILWAY_PUBLIC_DOMAIN, so custom domains work with zero variables.
    if (config.domain && normalizeHost(process.env.DOMAIN || process.env.SB_DOMAIN || '')) return config.domain;
    const reqHost = normalizeHost(String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]);
    // A Cloudflare Worker relay sets X-Forwarded-Host: <worker host>; the private *.replit.dev dev URL is never used.
    const reqOk = !!(reqHost && !isIpLiteral(reqHost) && reqHost !== 'localhost' && !reqHost.endsWith('.railway.internal') && !reqHost.endsWith('.replit.dev'));
    const savedRelay = (stateManager.state.publicHost && !bkIsPlatformHost(stateManager.state.publicHost) && bkSavedHostAllowed(config, stateManager.state.publicHost)) ? stateManager.state.publicHost : '';
    if (savedRelay && (!reqOk || bkIsPlatformHost(reqHost))) return savedRelay; // relay / custom domain learned earlier beats the platform domain
    if (config.domain && (!reqOk || reqHost === config.domain || bkIsPlatformHost(reqHost))) return config.domain;
    if (reqOk) {
      // All callers sit behind authMiddleware, so only real panel/subscription visits get here.
      if (bkSavedHostAllowed(config, reqHost) && stateManager.state.publicHost !== reqHost) {
        stateManager.state.publicHost = reqHost;
        stateManager.save();
        Logger.info(`Public domain learned from request Host: ${reqHost} (saved; used for links, no redeploy needed)`);
      }
      return reqHost;
    }
    if (stateManager.state.publicHost && bkSavedHostAllowed(config, stateManager.state.publicHost)) return stateManager.state.publicHost;
    if (resolvedHostGetter) {
      const h = resolvedHostGetter();
      if (h && h !== '127.0.0.1') return h;
    }
    if (req.headers.host) {
      return req.headers.host.split(':')[0];
    }
    return '127.0.0.1';
  };

  // Location cache
  let cachedLocation = null;
  const resolveLocation = async (ip) => {
    if (cachedLocation) return cachedLocation;
    try {
      
      const targetIp = ip && !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.') ? ip : '';
      const r = await axios.get(`https://freeipapi.com/api/json/${targetIp}`, { timeout: 2500 });
      if (r.data && r.data.countryName) {
        cachedLocation = (r.data.cityName ? `${r.data.cityName}, ` : '') + r.data.countryName;
        return cachedLocation;
      }
    } catch {}
    try {
      
      const r = await axios.get('https://1.1.1.1/cdn-cgi/trace', { timeout: 2000 });
      const m = r.data.match(/loc=([^\r\n]+)/);
      if (m && m[1]) {
        cachedLocation = m[1].trim();
        return cachedLocation;
      }
    } catch {}
    cachedLocation = ip || 'Global';
    return cachedLocation;
  };

  // Health endpoint
  app.get('/health', authMiddleware, async (req, res) => {
    const engines = engineStatusGetter ? engineStatusGetter() : {};
    const host = getRequestHost(req);
    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const allNodes = bkCollectNodes(req, null, 'full');
    const location = await resolveLocation(host);

    res.json({
      ok: true,
      subToken: bkLoadAuth().subToken || '',
      brand: config.brand,
      product: config.product,
      uptime: process.uptime(),
      publicPort: config.publicPort,
      host,
      domain: (host && !isIpLiteral(host)) ? host : (config.domain || ''),
      forceHost: config.forceHost || '',
      publicBaseUrl: (process.env.PUBLIC_BASE_URL || process.env.SUB_BASE_URL) ? (config.publicBaseUrl || '')
        : ((host && !isIpLiteral(host) && linkGen.edgeTls) ? 'https://' + host : (config.publicBaseUrl || '')),
      subBase: config.subBase || '',
      forceHttps: Boolean(config.forceHttps),
      location: location || 'Global Server',
      engines,
      nodes: allNodes.map(node => ({
        name: node.name,
        type: node.type,
        compat: node.compat,
        uri: node.uri,
        wgConf: node.wgConf || null,
        singboxJson: node.singboxJson || null,
        note: node.note || null
      }))
    });
  });

  // Latest-video feature removed in Plasma: the panel carries no external channel content.
  app.get(['/api/latest-video', `/${panelPath}/api/latest-video`], (req, res) => { res.json({ ok: false }); });

  // Panel HTML endpoints
  const renderPanel = (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let bkHtml = AssetManager.getIndexHtml();
    try { bkHtml = bkHtml.replace('</body>', BK_OVERVIEW_HTML.split('__PANEL__').join(panelPath) + '</body>'); } catch (_) {}
    res.send(bkHtml);
  };

  app.get('/', (req, res) => { res.status(404).type('text/plain').send('404 Not Found'); });
  // ===== BK traffic meter API (panel session only; POSTs need the X-BK-Req header -> no cross-site forms) =====
  const bkSessionOnly = (req, res, next) => (bkHasSession(req) ? next() : res.status(401).json({ ok: false, error: 'login required' }));
  const bkSameOrigin = (req, res, next) => (req.get('x-bk-req') === '1' ? next() : res.status(403).json({ ok: false, error: 'forbidden' }));
  // ===== BK_USERS: per-user subscription links + admin API =====
  // ===== Plasma multi-location: location labels, per-endpoint generators, node API =====
  const BK_LOC = { name: process.env.LOC_NAME || 'Germany', flag: process.env.LOC_FLAG || '\u{1F1E9}\u{1F1EA}' };
  const bkLocLabel = (l) => ((l && l.name) || 'Node') + ' ' + ((l && l.flag) || '');
  const bkGenFor = (req, user, endpoint) => {
    const host = endpoint ? endpoint.host : getRequestHost(req);
    const st = user ? Object.assign({}, stateManager.state, { uuid: user.uuid }) : stateManager.state;
    const gen = new LinkGenerator(config, st, host);
    if (endpoint) {
      gen.host = endpoint.host;
      gen.port = endpoint.port;
      try { gen.tlsOpt = LinkGenerator.tlsOptions(endpoint.host); } catch (_) {}
      gen.pcs = '';
      gen.keepAllowInsecure = true;
    }
    if (user) {
      const P = BkUsers.pathsFor(user);
      gen.wsPath = P.ws; gen.vmessPath = P.vmess; gen.trPath = P.trojan;
      gen.huPath = P.vlessHu; gen.vmHuPath = P.vmessHu; gen.trHuPath = P.trojanHu;
      gen.xhPath = P.xhttp; gen.ssWsPath = P.ss; gen.grpcService = P.grpcService;
    }
    return gen;
  };
  const bkRenameLoc = (nodes, label) => {
    for (const n of nodes) {
      if (!n || !n.name) continue;
      const nn = n.name.replace(/^Plasma - /, 'Plasma - ' + label + ' - ');
      if (n.uri && n.uri.includes('#')) n.uri = n.uri.slice(0, n.uri.indexOf('#') + 1) + urlSafeEncode(nn);
      if (n.uri && n.uri.startsWith('vmess://')) {
        try {
          const j = JSON.parse(Buffer.from(n.uri.slice(8), 'base64').toString('utf8'));
          if (j && typeof j === 'object') { j.ps = nn; n.uri = 'vmess://' + Buffer.from(JSON.stringify(j), 'utf8').toString('base64'); }
        } catch (_) {}
      }
      if (n.clash) n.clash.name = nn;
      if (Array.isArray(n.singboxOutbound)) {
        for (const o of n.singboxOutbound) if (o && o.tag) o.tag = nn;
        n.singboxJson = JSON.stringify(n.singboxOutbound, null, 2);
      }
      n.name = nn;
    }
    return nodes;
  };
  const bkCollectNodes = (req, user, compat) => {
    let out = bkRenameLoc(bkGenFor(req, user, null).getAllNodes({ compat, allowLocalHostLinks: true }), bkLocLabel(BK_LOC));
    let remotes = [];
    try { remotes = BkNodes.fresh(); } catch (_) {}
    for (const nd of remotes) {
      try { out = out.concat(bkRenameLoc(bkGenFor(req, user, nd).getAllNodes({ compat, allowLocalHostLinks: true }), bkLocLabel(nd))); } catch (_) {}
    }
    if (user) out = out.filter(n => n.type !== 'VLESS-gRPC');
    return out;
  };
  // Node control API (shared secret): nodes register, pull the user bundle, report usage.
  const BK_NODE_SECRET = process.env.PLASMA_NODE_SECRET || '';
  const bkNodeAuth = (req, res, next) => {
    if (!BK_NODE_SECRET || req.get('x-node-secret') !== BK_NODE_SECRET) return res.status(401).json({ ok: false, error: 'node auth' });
    next();
  };
  app.post('/api/node/register', bkNodeAuth, express.json({ limit: '16kb' }), (req, res) => {
    const b = req.body || {};
    const nd = BkNodes.register({ id: String(b.id || '').slice(0, 64), name: String(b.name || 'Node').slice(0, 40), flag: String(b.flag || '').slice(0, 8), host: String(b.host || '').slice(0, 120), port: parseInt(b.port, 10) || 0 });
    res.json({ ok: !!nd });
  });
  app.get('/api/node/bundle', bkNodeAuth, (req, res) => {
    res.json({ ok: true, mainUuid: stateManager.state.uuid, users: BkUsers.list().map(u => ({ id: u.id, tag: u.tag, name: u.name, uuid: u.uuid, token: u.token, quotaBytes: u.quotaBytes || 0, usedBytes: u.usedBytes || 0, expiresAt: u.expiresAt || 0, enabled: u.enabled !== false, createdAt: u.createdAt || 0, lastSeenAt: u.lastSeenAt || 0, lastActiveAt: u.lastActiveAt || 0 })) });
  });
  app.post('/api/node/usage', bkNodeAuth, express.json({ limit: '256kb' }), (req, res) => {
    const d = (req.body && req.body.deltas) || {};
    let applied = 0;
    for (const id of Object.keys(d)) {
      const b = Math.floor(Number(d[id]) || 0);
      if (b > 0 && BkUsers.find(id)) { BkUsers.addUsage(id, b, 0); applied += b; }
    }
    const seen = (req.body && req.body.seen) || {};
    for (const id of Object.keys(seen)) {
      const s = seen[id] || {};
      BkUsers.applySeen(id, Math.floor(Number(s.s) || 0), Math.floor(Number(s.a) || 0));
    }
    if (req.body && Array.isArray(req.body.acts)) BkActivity.ingest(req.body.acts);
    res.json({ ok: true, applied });
  });
  const bkSendUserSub = (req, res, format) => {
    const user = BkUsers.findByToken(req.params.token);
    if (!user) { res.status(404).type('text/plain').send('404 Not Found'); return; }
    if (format === 'page' || (format === 'base64' && bkIsBrowserSubReq(req))) {
      const subUrl = req.protocol + '://' + req.get('host') + '/u/' + user.token;
      const nodes = BkUsers.isAllowed(user) ? bkCollectNodes(req, user, 'v2ray') : [];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(bkSubPageHtml(BkUsers.publicView(user), nodes, subUrl));
      return;
    }
    if (!BkUsers.isAllowed(user)) { res.status(403).type('text/plain').send('Subscription is not active (expired, over quota or disabled).'); return; }
    const builder = bkGenFor(req, user, null);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Profile-Update-Interval', '24');
    res.setHeader('profile-title', 'base64:' + Buffer.from(String(user.name || 'Plasma'), 'utf8').toString('base64'));
    // Unlimited follows the standard Subscription-Userinfo convention: total=0 means
    // unlimited, so clients (Happ, v2rayN, ...) render "used / ∞" instead of a fake
    // 1 TB cap; expire is sent only when the subscription actually expires.
    let userinfo = `upload=0; download=${user.usedBytes || 0}; total=${user.quotaBytes > 0 ? user.quotaBytes : 0}`;
    if (user.expiresAt) userinfo += `; expire=${Math.floor(user.expiresAt / 1000)}`;
    res.setHeader('Subscription-Userinfo', userinfo);
    if (format === 'clash') {
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      res.send(builder.buildClashMetaYaml(bkCollectNodes(req, user, 'full')));
    } else if (format === 'sb') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(builder.buildSingBoxClientJson(bkCollectNodes(req, user, 'full')));
    } else {
      const text = bkCollectNodes(req, user, 'v2ray').map(n => n.uri).filter(Boolean).join('\n');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(format === 'raw' ? text : Buffer.from(text).toString('base64'));
    }
  };
  app.get('/u/:token', (req, res) => bkSendUserSub(req, res, 'base64'));
  app.get('/u/:token/page', (req, res) => bkSendUserSub(req, res, 'page'));
  app.get('/u/:token/raw', (req, res) => bkSendUserSub(req, res, 'raw'));
  app.get('/u/:token/clash', (req, res) => bkSendUserSub(req, res, 'clash'));
  app.get('/u/:token/sb', (req, res) => bkSendUserSub(req, res, 'sb'));

  app.get(`/${panelPath}/api/users`, bkSessionOnly, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, users: BkUsers.list().map(u => BkUsers.publicView(u)) });
  });
  app.get(`/${panelPath}/api/overview`, bkSessionOnly, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const us = BkUsers.list();
    const now = Date.now();
    let traf = { today: 0, month: 0 }; try { const sn = BkTraffic.snapshot(); traf = { today: (sn.day && sn.day.total) || 0, month: (sn.month && sn.month.used) || 0 }; } catch (_) {}
    res.json({ ok: true,
      users: { total: us.length, active: us.filter(u => BkUsers.isAllowed(u)).length, usedBytes: us.reduce((a, u) => a + (u.usedBytes || 0), 0) },
      nodes: BkNodes.list().map(n => ({ name: n.name, flag: n.flag, host: n.host, port: n.port, lastSeen: n.lastSeen || 0, fresh: now - (n.lastSeen || 0) < 180000 })),
      local: { name: BK_LOC.name, flag: BK_LOC.flag }, traffic: traf, uptimeSec: Math.floor(process.uptime()) });
  });
  app.post(`/${panelPath}/api/users`, bkSessionOnly, bkSameOrigin, express.json({ limit: '4kb' }), (req, res) => {
    const b = req.body || {};
    const u = BkUsers.create({ name: b.name, quotaGB: parseFloat(b.quotaGB) || 0, days: parseFloat(b.days) || 0 });
    if (bkHooks.reloadEngines) bkHooks.reloadEngines();
    res.json({ ok: true, user: BkUsers.publicView(u) });
  });
  app.post(`/${panelPath}/api/users/:id/update`, bkSessionOnly, bkSameOrigin, express.json({ limit: '4kb' }), (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.name !== undefined) patch.name = b.name;
    if (b.quotaGB !== undefined) patch.quotaGB = parseFloat(b.quotaGB) || 0;
    if (b.addDays !== undefined) patch.addDays = parseFloat(b.addDays) || 0;
    if (b.days !== undefined) patch.days = parseFloat(b.days) || 0;
    if (b.enabled !== undefined) patch.enabled = !!b.enabled;
    if (b.resetUsage) patch.resetUsage = true;
    const u = BkUsers.update(req.params.id, patch);
    if (!u) { res.status(404).json({ ok: false, error: 'user not found' }); return; }
    if (bkHooks.reloadEngines) bkHooks.reloadEngines();
    res.json({ ok: true, user: BkUsers.publicView(u) });
  });
    const bkUserAction = (req, res, makePatch) => {
    const cur = BkUsers.list().find(x => x.id === req.params.id);
    if (!cur) { res.status(404).json({ ok: false, error: 'user not found' }); return; }
    const u = BkUsers.update(req.params.id, makePatch(cur));
    if (bkHooks.reloadEngines) bkHooks.reloadEngines();
    res.json({ ok: true, user: BkUsers.publicView(u) });
  };
  app.post(`/${panelPath}/api/users/:id/extend`, bkSessionOnly, bkSameOrigin, express.json({ limit: '4kb' }), (req, res) => {
    const days = parseFloat((req.body || {}).days) || 0;
    bkUserAction(req, res, () => ({ addDays: days }));
  });
  app.post(`/${panelPath}/api/users/:id/add-volume`, bkSessionOnly, bkSameOrigin, express.json({ limit: '4kb' }), (req, res) => {
    const gb = parseFloat((req.body || {}).gb) || 0;
    bkUserAction(req, res, () => ({ addGB: gb }));
  });
  app.post(`/${panelPath}/api/users/:id/reset`, bkSessionOnly, bkSameOrigin, (req, res) => {
    bkUserAction(req, res, () => ({ resetUsage: true }));
  });
  app.post(`/${panelPath}/api/users/:id/toggle`, bkSessionOnly, bkSameOrigin, (req, res) => {
    bkUserAction(req, res, (cur) => ({ enabled: !(cur.enabled !== false) }));
  });
app.post(`/${panelPath}/api/users/:id/delete`, bkSessionOnly, bkSameOrigin, (req, res) => {
    if (!BkUsers.remove(req.params.id)) { res.status(404).json({ ok: false, error: 'user not found' }); return; }
    if (bkHooks.reloadEngines) bkHooks.reloadEngines();
    res.json({ ok: true });
  });
  app.get(`/${panelPath}/api/users/:id/activity`, bkSessionOnly, (req, res) => {
    const u = BkUsers.find(req.params.id);
    if (!u) { res.status(404).json({ ok: false, error: 'user not found' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    const r = BkActivity.query({ userId: u.id, from: req.query.from, to: req.query.to, q: req.query.q, limit: req.query.limit });
    res.json({ ok: true, total: r.total, top: r.top, rows: r.rows });
  });
  app.get('/f/morabba.woff2', (req, res) => { res.setHeader('Content-Type', 'font/woff2'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.send(Buffer.from(BK_FONT_MORABBA_B64, 'base64')); });
  app.get('/f/iransansx.ttf', (req, res) => { res.setHeader('Content-Type', 'font/ttf'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.send(Buffer.from(BK_FONT_IRANSANS_B64, 'base64')); });
  app.get(`/${panelPath}/users`, authMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(BK_USERS_PAGE);
  });

  app.get(`/${panelPath}/api/traffic`, bkSessionOnly, (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(BkTraffic.snapshot()); });
  app.post(`/${panelPath}/api/traffic/reset`, bkSessionOnly, bkSameOrigin, (req, res) => {
    BkTraffic.reset(); Logger.warn('Traffic counter reset from the panel.');
    res.setHeader('Cache-Control', 'no-store'); res.json(BkTraffic.snapshot());
  });
  app.post(`/${panelPath}/api/traffic/baseline`, bkSessionOnly, bkSameOrigin, express.json({ limit: '2kb' }), (req, res) => {
    const gb = Number(req.body && req.body.gb);
    if (!isFinite(gb) || gb < 0 || gb > 1000000) return res.status(400).json({ ok: false, error: 'invalid value' });
    BkTraffic.setMonthUsedGB(gb); Logger.info(`Traffic: this month's used amount set to ${gb} GiB from the panel.`);
    res.setHeader('Cache-Control', 'no-store'); res.json(BkTraffic.snapshot());
  });

  app.get(`/${panelPath}`, authMiddleware, renderPanel);

  // Subscriptions: Base64 & Raw (HTTP & HTTPS compatible for v2rayN, v2rayNG, Hiddify)
  app.get([`/${panelPath}/base64`, `/${panelPath}/raw`, `/${panelPath}/sub`, '/sub', '/base64'], authMiddleware, (req, res) => {
    const isBase64 = req.path.endsWith('/base64') || req.path.endsWith('/sub') || req.path === '/sub';
    const compatMode = req.query.compat || 'v2ray'; // Default to strict v2ray compatibility
    const host = getRequestHost(req);

    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const allowLocal = Boolean(config.allowLocalHostLinks || host === '127.0.0.1' || host === 'localhost');
    const nodes = bkCollectNodes(req, null, compatMode);

    const links = nodes.map(n => n.uri);
    const text = links.join('\n');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Plasma.txt"');
    res.setHeader('Profile-Update-Interval', '24');
    res.setHeader('profile-title', 'base64:' + Buffer.from('Plasma', 'utf8').toString('base64'));
    // The owner subscription is truly unlimited: total=0 is the standard unlimited marker.
    res.setHeader('Subscription-Userinfo', 'upload=0; download=0; total=0');

    if (isBase64) {
      res.send(Buffer.from(text).toString('base64'));
    } else {
      res.send(text);
    }
  });

  // Subscriptions: Clash Meta (Mihomo)
  app.get([`/${panelPath}/clash`, `/${panelPath}/clash.yaml`, '/clash'], authMiddleware, (req, res) => {
    const host = getRequestHost(req);
    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const nodes = bkCollectNodes(req, null, 'full');
    const yaml = linkGen.buildClashMetaYaml(nodes);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Plasma.yaml"');
    res.setHeader('Profile-Update-Interval', '24');
    res.setHeader('profile-title', 'base64:' + Buffer.from('Plasma', 'utf8').toString('base64'));
    res.send(yaml);
  });

  // Subscriptions: Sing-box client JSON
  app.get([`/${panelPath}/sb/raw`, `/${panelPath}/sb/base64`, `/${panelPath}/sb`, '/sb'], authMiddleware, (req, res) => {
    const isBase64 = req.path.endsWith('/base64');
    const host = getRequestHost(req);
    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const nodes = bkCollectNodes(req, null, 'full');
    const jsonStr = linkGen.buildSingBoxClientJson(nodes);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('profile-title', 'base64:' + Buffer.from('Plasma', 'utf8').toString('base64'));
    res.setHeader('Content-Type', isBase64 ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
    if (isBase64) {
      res.send(Buffer.from(jsonStr).toString('base64'));
    } else {
      res.send(jsonStr);
    }
  });

  // Subscriptions: Xray client JSON
  app.get([`/${panelPath}/xray/raw`, `/${panelPath}/xray/base64`], authMiddleware, (req, res) => {
    const isBase64 = req.path.endsWith('/base64');
    const jsonStr = stateManager.state.xrayJson || '{}';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', isBase64 ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
    if (isBase64) {
      res.send(Buffer.from(jsonStr).toString('base64'));
    } else {
      res.send(jsonStr);
    }
  });

  // WireGuard Configuration (.conf) - Graceful failure handling
  app.get([`/${panelPath}/wg.conf`, `/${panelPath}/wireguard.conf`, '/wg.conf'], authMiddleware, (req, res) => {
    try {
      const host = getRequestHost(req);
      const linkGen = new LinkGenerator(config, stateManager.state, host);
      let wgNode = null;
      try {
        wgNode = linkGen.generateWireGuard();
      } catch (wgErr) {
        console.warn(`[WireGuard] Warning: Failed to generate WireGuard node: ${wgErr.message}`);
      }

      let conf = wgNode && wgNode.wgConf;
      if (!conf) {
        const keys = linkGen._getOrGenerateWgKeys();
        conf = [
          '[Interface]',
          `PrivateKey = ${keys.clientPriv}`,
          'Address = 10.66.66.2/32',
          'DNS = 1.1.1.1, 8.8.8.8',
          'MTU = 1420',
          '',
          '[Peer]',
          `PublicKey = ${keys.serverPub}`,
          `Endpoint = ${host}:51820`,
          'AllowedIPs = 0.0.0.0/0, ::/0',
          'PersistentKeepalive = 25'
        ].join('\n') + '\n';
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="wg0.conf"');
      res.send(conf);
    } catch (err) {
      console.warn(`[WireGuard] WireGuard endpoint error: ${err.message}`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send('# WireGuard configuration failed gracefully.\n');
    }
  });

  app.use((req, res) => { res.status(404).type('text/plain').send('404 Not Found'); });

  const server = http.createServer(app);
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;
  server.requestTimeout = 0; // XHTTP stream-up / stream-one requests are long-lived
  server.timeout = 0;
  return { app, server };
}

// --- Module: lib/mux/tcp-router.js ---
// ===== BK_TRAFFIC_APPLIED: per-config traffic meter (bytes counted in the Node proxy layer) =====
const BkTraffic = (() => {
  const KEYS = ['VLESS-WS', 'VMess-WS', 'Trojan-WS', 'VLESS-XHTTP', 'VLESS-HTTPUpgrade', 'VMess-HTTPUpgrade', 'Trojan-HTTPUpgrade', 'VLESS-gRPC', 'Shadowsocks-WS', 'Other'];
  const GIB = 1024 * 1024 * 1024;
  const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
  const utcMonth = (d = new Date()) => d.toISOString().slice(0, 7);
  let file = null; let st = null; let dirty = false; let lastSave = 0; let writable = false;
  const live = { up: 0, down: 0 }; let samples = [];
  const active = {};
  const warned = {};
  const fresh = () => ({ v: 1, since: new Date().toISOString(), allTime: {}, day: { key: utcDay(), per: {} }, month: { key: utcMonth(), per: {}, baseBytes: 0 } });
  const norm = (label) => (KEYS.includes(label) ? label : 'Other');
  const bump = (bucket, k, up, down) => { const e = bucket[k] || (bucket[k] = { up: 0, down: 0 }); e.up += up; e.down += down; };
  const sum = (per) => { let up = 0; let down = 0; for (const k of Object.keys(per || {})) { up += per[k].up || 0; down += per[k].down || 0; } return { up, down, total: up + down }; };
  const limitBytes = () => { const g = parseFloat(process.env.TRAFFIC_LIMIT_GB || ''); return isFinite(g) && g > 0 ? g * GIB : 0; };
  function roll() {
    if (!st) return;
    const d = utcDay(); const m = utcMonth();
    if (st.day.key !== d) { st.day = { key: d, per: {} }; dirty = true; }
    if (st.month.key !== m) { st.month = { key: m, per: {}, baseBytes: 0 }; dirty = true; for (const k of Object.keys(warned)) delete warned[k]; }
  }
  function save() {
    if (!file || !st) return;
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(st), 'utf8');
      fs.renameSync(tmp, file);
      dirty = false; lastSave = Date.now(); writable = true;
    } catch (err) { writable = false; if (!warned.save) { warned.save = 1; Logger.warn('Could not save traffic.json: ' + err.message); } }
  }
  function checkLimit() {
    const lim = limitBytes(); if (!lim) return;
    const used = sum(st.month.per).total + (st.month.baseBytes || 0);
    const pct = used / lim * 100;
    if (pct >= 100 && !warned.p100) { warned.p100 = 1; warned.p80 = 1; Logger.warn(`Traffic: 100% of TRAFFIC_LIMIT_GB used this month (estimate). Check Replit -> Account -> Usage.`); }
    else if (pct >= 80 && !warned.p80) { warned.p80 = 1; Logger.warn(`Traffic: 80% of TRAFFIC_LIMIT_GB used this month (estimate).`); }
  }
  function tick() {
    const now = Date.now();
    samples.push({ t: now, up: live.up, down: live.down });
    if (samples.length > 6) samples.shift();
    roll();
    if (dirty && now - lastSave > 30000) { save(); checkLimit(); }
  }
  return {
    KEYS,
    init(dataDir) {
      file = path.join(dataDir, 'traffic.json');
      try { st = JSON.parse(fs.readFileSync(file, 'utf8')); if (!st || st.v !== 1) st = fresh(); } catch (_) { st = fresh(); }
      st.allTime = st.allTime || {}; st.day = st.day || { key: utcDay(), per: {} }; st.month = st.month || { key: utcMonth(), per: {}, baseBytes: 0 };
      roll(); save();
      const t = setInterval(tick, 1000); if (t.unref) t.unref();
      process.once('exit', () => { try { save(); } catch (_) {} });
      const lim = limitBytes();
      Logger.info(`Traffic meter: ${file}${lim ? ` (limit ${(lim / GIB).toFixed(2)} GiB/month)` : ''}`);
    },
    add(label, up, down) {
      if (!st || (!up && !down)) return;
      const k = norm(label);
      bump(st.allTime, k, up, down); bump(st.day.per, k, up, down); bump(st.month.per, k, up, down);
      live.up += up; live.down += down; dirty = true;
    },
    /** Count bytes of a proxied duplex pair: client->backend = upload, backend->client = download. */
    meter(label, client, backend) {
      const k = norm(label);
      active[k] = (active[k] || 0) + 1;
      let done = false;
      const end = () => { if (!done) { done = true; active[k] = Math.max(0, (active[k] || 1) - 1); } };
      client.on('data', (b) => this.add(k, b.length, 0));
      backend.on('data', (b) => this.add(k, 0, b.length));
      client.once('close', end); backend.once('close', end);
    },
    open(label) { const k = norm(label); active[k] = (active[k] || 0) + 1; let done = false; return () => { if (!done) { done = true; active[k] = Math.max(0, (active[k] || 1) - 1); } }; },
    save,
    reset() { st = fresh(); for (const k of Object.keys(warned)) delete warned[k]; save(); },
    setMonthUsedGB(gb) { roll(); st.month.baseBytes = Math.round(gb * GIB) - sum(st.month.per).total; dirty = true; save(); checkLimit(); },
    snapshot() {
      if (!st) return { ok: false, error: 'not started' };
      roll();
      let upBps = 0; let downBps = 0;
      if (samples.length >= 2) { const a = samples[0]; const b = samples[samples.length - 1]; const dt = (b.t - a.t) / 1000; if (dt > 0) { upBps = (b.up - a.up) / dt; downBps = (b.down - a.down) / dt; } }
      const month = sum(st.month.per); const base = st.month.baseBytes || 0;
      const lim = limitBytes(); const used = month.total + base;
      const n = new Date(); const next = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1));
      return {
        ok: true, keys: KEYS, now: n.toISOString(), since: st.since, persisted: writable, file: path.basename(file || ''),
        day: { key: st.day.key, per: st.day.per, ...sum(st.day.per) },
        month: { key: st.month.key, per: st.month.per, ...month, baseBytes: base, used, resetsAt: next.toISOString() },
        allTime: { per: st.allTime, ...sum(st.allTime) },
        live: { upBps, downBps }, active: { ...active },
        limit: lim ? { bytes: lim, used, remaining: Math.max(0, lim - used), pct: used / lim * 100, level: used >= lim ? 'over' : (used >= lim * 0.8 ? 'warn' : 'ok') } : null
      };
    }
  };
})();

// ================= BK_USERS: per-user subscriptions (traffic quota + expiry) =================
// Each subscription user gets their own UUID and their own URL paths
// (BK_P + tag + '/' + suffix). The gate rewrites user paths to the canonical
// BK_PATHS before forwarding to the shared engine inbounds, meters the bytes
// per user here, and refuses/terminates connections once a user's traffic
// quota or expiry is reached. Engine inbounds carry every currently-allowed
// user's UUID (see SingBoxEngine.bkUserUuids / XrayEngine.bkUserUuids), and a
// blocked user is purged from the engines via the onBlock hook.
const BkUsers = (() => {
  const GIB = 1024 * 1024 * 1024;
  const DAY = 86400000;
  let file = null;
  let data = { users: [] };
  let defaultUuid = '';
  let dirty = false;
  let saveTimer = null;
  let onBlock = null;
  let onUsage = null;
  const live = new Map(); // userId -> Set<killFn>

  const find = (id) => data.users.find(u => u.id === id) || null;
  const findByTag = (tag) => data.users.find(u => u.tag === tag) || null;
  const findByToken = (token) => data.users.find(u => u.token === token) || null;

  function save() {
    if (!file) return;
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, file);
      dirty = false;
    } catch (err) { Logger.warn('BkUsers: could not save users.json: ' + err.message); }
  }
  function saveSoon() {
    dirty = true;
    if (!saveTimer) {
      saveTimer = setTimeout(() => { saveTimer = null; if (dirty) save(); }, 3000);
      if (saveTimer.unref) saveTimer.unref();
    }
  }

  function isAllowed(u) {
    if (!u || !u.enabled) return false;
    if (u.expiresAt && Date.now() >= u.expiresAt) return false;
    if (u.quotaBytes > 0 && (u.usedBytes || 0) >= u.quotaBytes) return false;
    return true;
  }

  function killLive(id) {
    const set = live.get(id);
    if (!set) return;
    for (const kill of [...set]) { try { kill(); } catch (_) {} }
    set.clear();
  }

  function blockTransition(u, why) {
    Logger.warn(`BkUsers: subscription "${u.name}" (${u.tag}) blocked (${why}).`);
    killLive(u.id);
    saveSoon();
    if (onBlock) { try { onBlock(u); } catch (_) {} }
  }

  // Last-seen / last-active stamps: a connection start (meter) marks "seen",
  // flowing bytes (addUsage) mark "active". User records update at most every
  // 30s (saveSoon debounces the write); a max-merged pending map is kept
  // separately so node agents can report fresh stamps to the main panel even
  // though bundle syncs replace the local user records every 30s.
  const seenPending = {};
  function stamp(id, kind) {
    if (!id) return;
    const now = Date.now();
    let p = seenPending[id];
    if (!p) { p = seenPending[id] = { s: 0, a: 0 }; }
    if (now > (p[kind] || 0)) p[kind] = now;
    const u = find(id);
    if (!u) return;
    const key = kind === 's' ? 'lastSeenAt' : 'lastActiveAt';
    if (now - (u[key] || 0) > 30000) { u[key] = now; saveSoon(); }
  }

  function addUsage(id, up, down) {
    const u = find(id);
    if (!u || (!up && !down)) return;
    const was = isAllowed(u);
    u.usedBytes = (u.usedBytes || 0) + up + down;
    stamp(id, 'a');
    if (onUsage) { try { onUsage(u.id, up + down); } catch (_) {} }
    saveSoon();
    if (was && !isAllowed(u)) { u._wasAllowed = false; blockTransition(u, 'traffic quota reached'); }
  }

  /** Count bytes on a proxied pair (client <-> backend) for one user; mirrors BkTraffic.meter. */
  function meter(id, client, backend) {
    stamp(id, 's');
    const kill = () => {
      for (const s of [client, backend]) {
        try { if (s.destroy) s.destroy(); } catch (_) {}
        try { if (s.close) s.close(); } catch (_) {}
      }
    };
    let set = live.get(id);
    if (!set) { set = new Set(); live.set(id, set); }
    set.add(kill);
    const done = () => set.delete(kill);
    client.on('data', (b) => addUsage(id, b.length, 0));
    backend.on('data', (b) => addUsage(id, 0, b.length));
    client.once('close', done);
    backend.once('close', done);
  }

  /** Client path BK_P + tag + '/ws' -> { user, canonical: BK_P + 'ws' }; null for canonical paths. */
  function parseUserPath(p) {
    if (!p || !p.startsWith(BK_P)) return null;
    const rest = p.slice(BK_P.length);
    const slash = rest.indexOf('/');
    if (slash <= 0) return null;
    const u = findByTag(rest.slice(0, slash));
    if (!u) return null;
    return { user: u, canonical: BK_P + rest.slice(slash + 1) };
  }

  function pathsFor(u) {
    const t = u.tag;
    return {
      ws: BK_P + t + '/ws',
      vmess: BK_P + t + '/vmess',
      trojan: BK_P + t + '/trojan',
      vlessHu: BK_P + t + '/httpupgrade',
      vmessHu: BK_P + t + '/vmess-hu',
      trojanHu: BK_P + t + '/trojan-hu',
      xhttp: BK_P + t + '/xhttp',
      ss: BK_P + t + '/ss',
      grpcService: BK_PATHS.grpcService + '-' + t
    };
  }

  function publicView(u) {
    return {
      id: u.id, tag: u.tag, name: u.name, uuid: u.uuid, token: u.token,
      quotaBytes: u.quotaBytes || 0,
      usedBytes: u.usedBytes || 0,
      expiresAt: u.expiresAt || 0, enabled: u.enabled !== false,
      allowed: isAllowed(u), createdAt: u.createdAt || 0,
      lastSeenAt: u.lastSeenAt || 0, lastActiveAt: u.lastActiveAt || 0,
      sub: '/u/' + u.token
    };
  }

  return {
    init(dataDir) {
      file = path.join(dataDir, 'users.json');
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed && Array.isArray(parsed.users)) data = parsed;
      } catch (_) {}
      for (const u of data.users) u._wasAllowed = isAllowed(u);
      const t = setInterval(() => {
        for (const u of data.users) {
          const nowA = isAllowed(u);
          if (u._wasAllowed && !nowA) blockTransition(u, 'expired');
          u._wasAllowed = nowA;
        }
      }, 20000);
      if (t.unref) t.unref();
      process.once('exit', () => { try { save(); } catch (_) {} });
      if (data.users.length) Logger.info(`BkUsers: ${data.users.length} subscription user(s) loaded.`);
    },
    setOnBlock(fn) { onBlock = fn; },
    setOnUsage(fn) { onUsage = fn; },
    setDefaultUuid(uuid) { if (uuid) defaultUuid = uuid; },
    isAllowed, addUsage, meter, parseUserPath, pathsFor, publicView, find, findByTag, findByToken,
    list: () => data.users.slice(),
    syncFrom(remoteUsers, mainUuid, pending) {
      const pend = pending || {};
      const sig = () => [defaultUuid].concat(data.users.filter(isAllowed).map(u => u.uuid)).join(',');
      const before = sig();
      const oldAllowed = new Map(data.users.filter(isAllowed).map(u => [u.id, u]));
      data.users = (remoteUsers || []).map(u => {
        const prev = find(u.id);
        return {
          id: u.id, tag: u.tag, name: u.name, uuid: u.uuid, token: u.token || '',
          quotaBytes: u.quotaBytes || 0,
          usedBytes: (u.usedBytes || 0) + (pend[u.id] || 0),
          expiresAt: u.expiresAt || 0, enabled: u.enabled !== false,
          createdAt: u.createdAt || 0, _wasAllowed: true,
          lastSeenAt: Math.max(u.lastSeenAt || 0, prev ? (prev.lastSeenAt || 0) : 0),
          lastActiveAt: Math.max(u.lastActiveAt || 0, prev ? (prev.lastActiveAt || 0) : 0)
        };
      });
      for (const u of data.users) u._wasAllowed = isAllowed(u);
      if (mainUuid) defaultUuid = mainUuid;
      for (const [id, ou] of oldAllowed) {
        const nu = find(id);
        if (!nu || !isAllowed(nu)) killLive(id);
      }
      save();
      return before !== sig();
    },
    activeUuids() {
      const out = [];
      if (defaultUuid) out.push(defaultUuid);
      for (const u of data.users) if (isAllowed(u) && !out.includes(u.uuid)) out.push(u.uuid);
      return out;
    },
    /** Like activeUuids, but with the log identity (tag / 'owner') per UUID so
     *  engine configs can name each user and access logs can be attributed. */
    activeEntries() {
      const out = [];
      if (defaultUuid) out.push({ uuid: defaultUuid, tag: 'owner' });
      for (const u of data.users) if (isAllowed(u) && !out.some(e => e.uuid === u.uuid)) out.push({ uuid: u.uuid, tag: u.tag });
      return out;
    },
    /** Engine log identity (user tag, 'owner', or a raw UUID) -> user id / 'owner' / null. */
    idForName(name) {
      const n = String(name || '');
      if (!n) return null;
      if (n === 'owner') return 'owner';
      const byTag = findByTag(n);
      if (byTag) return byTag.id;
      if (defaultUuid && n === defaultUuid) return 'owner';
      const byUuid = data.users.find(u => u.uuid === n);
      return byUuid ? byUuid.id : null;
    },
    /** Merge node-reported last-seen / last-active stamps into a user record. */
    applySeen(id, s, a) {
      const u = find(id);
      if (!u) return;
      let changed = false;
      if (s && s > (u.lastSeenAt || 0)) { u.lastSeenAt = s; changed = true; }
      if (a && a > (u.lastActiveAt || 0)) { u.lastActiveAt = a; changed = true; }
      if (changed) saveSoon();
    },
    /** Drain the pending stamp map (node agent reports it to the main panel). */
    takeSeen() {
      const out = {};
      for (const id of Object.keys(seenPending)) {
        const p = seenPending[id];
        if (p.s || p.a) out[id] = { s: p.s || 0, a: p.a || 0 };
        delete seenPending[id];
      }
      return out;
    },
    /** Put drained stamps back when a node report fails (max-merge). */
    mergeSeen(map) {
      for (const id of Object.keys(map || {})) {
        const p = seenPending[id] || (seenPending[id] = { s: 0, a: 0 });
        if ((map[id].s || 0) > p.s) p.s = map[id].s;
        if ((map[id].a || 0) > p.a) p.a = map[id].a;
      }
    },
    create(opts) {
      const o = opts || {};
      const id = crypto.randomBytes(4).toString('hex');
      const u = {
        id, tag: 'u' + id,
        name: String(o.name || 'user').slice(0, 60) || 'user',
        uuid: crypto.randomUUID(),
        token: crypto.randomBytes(18).toString('base64url'),
        quotaBytes: o.quotaGB > 0 ? Math.round(o.quotaGB * GIB) : 0,
        expiresAt: o.days > 0 ? Date.now() + Math.round(o.days * DAY) : 0,
        usedBytes: 0, enabled: true, createdAt: Date.now(), _wasAllowed: true,
        lastSeenAt: 0, lastActiveAt: 0
      };
      data.users.push(u);
      save();
      Logger.info(`BkUsers: created subscription "${u.name}" (${u.tag}).`);
      return u;
    },
    update(id, patch) {
      const u = find(id);
      if (!u) return null;
      if (patch.name !== undefined) u.name = String(patch.name).slice(0, 60) || u.name;
      if (patch.quotaGB !== undefined) u.quotaBytes = patch.quotaGB > 0 ? Math.round(patch.quotaGB * GIB) : 0;
      if (patch.addGB) u.quotaBytes = (u.quotaBytes > 0 ? u.quotaBytes : 0) + Math.round(patch.addGB * GIB);
      if (patch.addDays) u.expiresAt = (u.expiresAt && u.expiresAt > Date.now() ? u.expiresAt : Date.now()) + Math.round(patch.addDays * DAY);
      if (patch.days !== undefined) u.expiresAt = patch.days > 0 ? Date.now() + Math.round(patch.days * DAY) : 0;
      if (patch.enabled !== undefined) u.enabled = !!patch.enabled;
      if (patch.resetUsage) u.usedBytes = 0;
      u._wasAllowed = isAllowed(u);
      save();
      return u;
    },
    remove(id) {
      const i = data.users.findIndex(u => u.id === id);
      if (i < 0) return false;
      killLive(id);
      data.users.splice(i, 1);
      save();
      return true;
    }
  };
})();

// ===== BkNodes: registry of remote Plasma nodes (main panel side) =====
// ===== BkActivity: per-user connection history (time + destination host) =====
// Events are distilled from engine logs (sing-box stdout, Xray access log):
// one compact JSON line per connection in activity.jsonl. Storage is hard
// capped so the disk can never fill up: at most ~3 MB and 14 days are kept
// (pruned on boot, every 6 hours, and whenever the file grows past the cap),
// plus a per-user cap. On node servers events are queued in memory (bounded)
// and shipped to the main panel with the usage report; only the main stores.
const BkActivity = (() => {
  const MAX_BYTES = 3 * 1024 * 1024;
  const MAX_AGE = 14 * 86400000;
  const KEEP_PER_USER = 4000;
  const OUTBOX_CAP = 300;
  let file = null;
  let isMain = true;
  let buf = [];
  let flushTimer = null;
  let outbox = [];

  function clean(ev) {
    if (!ev || typeof ev !== 'object') return null;
    const t = Math.floor(Number(ev.t) || 0);
    const u = String(ev.u || '').slice(0, 64);
    let h = String(ev.h || '').slice(0, 253);
    const at = h.indexOf('@'); if (at >= 0) h = h.slice(at + 1);
    const sl = h.indexOf('/'); if (sl >= 0) h = h.slice(0, sl);
    const p = Math.floor(Number(ev.p) || 0);
    const n = String(ev.n || '').slice(0, 24);
    if (!t || !u || !h) return null;
    return { t, u, h, p: p >= 0 && p <= 65535 ? p : 0, n };
  }
  function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!file || !buf.length) { buf = []; return; }
    const lines = buf.map(e => JSON.stringify(e)).join('\n') + '\n';
    buf = [];
    try {
      fs.appendFileSync(file, lines, 'utf8');
      if (fs.statSync(file).size > MAX_BYTES) prune();
    } catch (_) {}
  }
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, 2000);
    if (flushTimer.unref) flushTimer.unref();
  }
  function prune() {
    if (!file) return;
    let raw = '';
    try { raw = fs.readFileSync(file, 'utf8'); } catch (_) { return; }
    const cutoff = Date.now() - MAX_AGE;
    const kept = [];
    for (const line of raw.split('\n')) {
      if (!line) continue;
      let e = null;
      try { e = JSON.parse(line); } catch (_) { continue; }
      if (!e || !e.t || e.t < cutoff) continue;
      kept.push(e);
    }
    kept.sort((a, b) => a.t - b.t);
    const perUser = {};
    let bytes = 0;
    const out = [];
    for (let i = kept.length - 1; i >= 0; i--) {
      const e = kept[i];
      perUser[e.u] = (perUser[e.u] || 0) + 1;
      if (perUser[e.u] > KEEP_PER_USER) continue;
      const sz = JSON.stringify(e).length + 1;
      if (bytes + sz > MAX_BYTES) continue;
      bytes += sz;
      out.push(e);
    }
    out.reverse();
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, out.map(e => JSON.stringify(e)).join('\n') + (out.length ? '\n' : ''), 'utf8');
      fs.renameSync(tmp, file);
    } catch (_) {}
  }
  function readAll() {
    if (!file) return [];
    let raw = '';
    try { raw = fs.readFileSync(file, 'utf8'); } catch (_) { return []; }
    const out = [];
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try { const e = JSON.parse(line); if (e && e.t) out.push(e); } catch (_) {}
    }
    return out;
  }
  return {
    init(dataDir, main) {
      isMain = !!main;
      if (isMain) {
        file = path.join(dataDir, 'activity.jsonl');
        prune();
        const t = setInterval(prune, 6 * 3600000);
        if (t.unref) t.unref();
      }
    },
    record(ev) {
      const e = clean(ev);
      if (!e) return;
      if (!isMain) {
        outbox.push(e);
        if (outbox.length > OUTBOX_CAP) outbox.splice(0, outbox.length - OUTBOX_CAP);
        return;
      }
      buf.push(e);
      if (buf.length >= 100) flush(); else scheduleFlush();
    },
    /** Main only: store events reported by a node. */
    ingest(list) {
      if (!isMain || !Array.isArray(list)) return;
      for (const ev of list.slice(0, 1000)) {
        const e = clean(ev);
        if (e) buf.push(e);
      }
      if (buf.length) { if (buf.length >= 100) flush(); else scheduleFlush(); }
    },
    peekOutbox() { return outbox.slice(); },
    clearOutbox(n) { outbox.splice(0, n); },
    query(opts) {
      const o = opts || {};
      const from = Math.floor(Number(o.from) || 0);
      const to = Math.floor(Number(o.to) || 0) || Date.now();
      const q = String(o.q || '').toLowerCase();
      const limit = Math.min(1000, Math.max(1, Math.floor(Number(o.limit) || 300)));
      const all = readAll();
      const rows = [];
      const hosts = {};
      let total = 0;
      for (let i = all.length - 1; i >= 0; i--) {
        const e = all[i];
        if (o.userId && e.u !== o.userId) continue;
        if (e.t < from || e.t > to) continue;
        hosts[e.h] = (hosts[e.h] || 0) + 1;
        if (q && String(e.h).toLowerCase().indexOf(q) < 0) continue;
        total++;
        if (rows.length < limit) rows.push(e);
      }
      const top = Object.keys(hosts).map(h => ({ h, c: hosts[h] })).sort((a, b) => b.c - a.c).slice(0, 10);
      return { rows, total, top };
    }
  };
})();

const BkNodes = (() => {
  let file = null;
  let data = { nodes: [] };
  function save() {
    if (!file) return;
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch (err) { Logger.warn('BkNodes: could not save nodes.json: ' + err.message); }
  }
  return {
    init(dataDir) {
      file = path.join(dataDir, 'nodes.json');
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed && Array.isArray(parsed.nodes)) data = parsed;
      } catch (_) {}
      if (data.nodes.length) Logger.info(`BkNodes: ${data.nodes.length} remote node(s) known.`);
    },
    register(n) {
      if (!n || !n.id || !n.host || !n.port) return null;
      const rec = { id: n.id, name: n.name || 'Node', flag: n.flag || '', host: n.host, port: n.port, lastSeen: Date.now() };
      const i = data.nodes.findIndex(x => x.id === rec.id);
      if (i >= 0) data.nodes[i] = rec; else data.nodes.push(rec);
      save();
      return rec;
    },
    list: () => data.nodes.slice(),
    fresh: () => data.nodes.filter(n => Date.now() - (n.lastSeen || 0) < 180000)
  };
})();

// ===== Self-hosted fonts (Morabba + IRANSansX, uploaded by the owner) =====
const BK_FONT_MORABBA_B64 = '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';
const BK_FONT_IRANSANS_B64 = 'AAEAAAAQAQAABAAAR0RFRokoOzoAArxIAABKOkdQT1PNgKrKAAMGhAAAcERHU1VCZCdZRgADdsgAABeiT1MvMoeXBAYAAKUkAAAAYFNUQVQ26T8gAAOObAAAAQZjbWFw1SwMFAAApYQAAAVgZnZhcu+k7w4AANNUAAABbGdseWaXIsFOAAABDAAAlIRndmFywwULqAAA1MAAAeeGaGVhZCkE/+UAAJrYAAAANmhoZWEL3wd5AAClAAAAACRobXR4zcJYLAAAmxAAAAnwbG9jYQchLOIAAJWwAAAFKG1heHADFQFoAACVkAAAACBuYW1l9hi0DQAAquQAAAracG9zdHwVOxQAALXAAAAdkwACACb//ADZAa0AAwAHAABTMxEjNxEjESazs6qhAa3+TwgBof5fAAAAAgAQAAACRQLHAAcACgAAZSEHIwEzASMlIQMB2P6kTx0BCiABCx3+XgFIpNTUAsf9Oe8BuAAAAAADAGIAAAIlAscADwAZACIAAHMRMzIWFRQGBx4CFRQGIwMRMzI2NTQmJiMnMzI2NTQmJyNiu3J2QTwsSCl2aMvOWmctVDbYqmNhY2SnAsddWUFVCwYxSypbaQFf/rtaTyxHKRpMTkxMAgAAAAABAEb/9gJFAtEAIwAAZAYGIyImJjU1NDY2MzIWFhcjLgIjIgYGFRUUFhYzMjY2NzMCP0BtSjR2WEF1TEptQAYaCDhgQ0VpOTppRERgOAcakWY1NIp3bl6NTTRmSUJZLUeBV2lWgUYsWkMAAAACAGIAAAJMAscACwAXAABzETMyFhYVFRQGBiMDETMyNjY1NTQmJidixDiGaE6FUK2qNnxaKnZoAsc2jntQX41MAq39bTZ/ZlszfmcFAAAAAAEAYgAAAhICxwALAABBIREhFSERIRUhESEB4P6cAZb+UAGw/moBZAFh/rkaAsca/s4AAAABAGIAAAIaAscACQAAQSERIxEhFSERIQHo/pQaAbj+YgFsAV7+ogLHGv7MAAEAUv/2AlcC0QAlAABkBgYjIiYmNTU0NjYzMhYWFyMmJiMiBgYVFRQWFjMyNjc1IzUzFQJFSmI1SX1MP3hTRmtCBxsNc19HbTxAcEhGehjZ9DQoFkiLYHpTilExWz5VWkV+U3FXgkUpHs8b9gAAAAABAGIAAAJcAscACwAAYSMRIREjETMRIREzAlwa/joaGgHGGgFh/p8Cx/60AUwAAAABAHUAAACQAscAAwAAcyMRM5AbGwLHAAABACz/9gHGAscAEgAAQTMRFAYGIyImNTMUFhYzMjY2NwGsGjNdPWNqGihQOzRQLgECx/4RRGY4a2M6UCkvWDsAAQBiAAACVwLHAAwAAFMHESMRMxE3ATMBASPuchoadQEnJv7DAVYjAXZp/vMCx/5lcwEo/sH+eAABAGIAAAHpAscABQAAdyEVIREzfQFs/nkbGhoCxwAAAAEAYgAAAvgCxwAOAABTAQEzESM1EQEjAREVIxGHASUBJScb/tkV/tsaAsf9YAKg/TmxAe/9YAKc/hi0AscAAAABAGIAAAJiAscACQAAYSMBESMRMwERMwJiG/42GxsByhsCmv1mAsf9ZwKZAAIAQf/2AlkC0QARACMAAGQGBiMiJiY1NTQ2NjMyFhYVFS4CIyIGBhUVFBYWMzI2NjU1AllEek5QeUNEek5PeUQaO25JSW07PG5HSm07z41MTo9fZ1+NTE2NXmvBgUZFglloWIBFRoJZaAAAAAIAYgAAAiUCxwAMABUAAFMRIxEzMhYWFRQGBiMnMzI2NTQmIyN8Gt5IZzY1ZUjHxGBra2DEASz+1ALHMV5BQFswG1xTVmEAAAIAQf+AAlkC0QAVACcAAGQGBxcHJwYjIiYmNTU0NjYzMhYWFRUuAiMiBgYVFRQWFjMyNjY1NQJZTkiDE4srMFB5Q0R6TlB5Qxo7bUpJbTs8bkdKbTvMmCR/EYUPTo9fZ1+NTEyNX2e9gkVFgllmWYFFRoFYZgAAAAIAXwAAAkkCxwAPABkAAEEjESMRMzIWFhUUBgcTFSMBMzI2NjU0JiMjAXD2G+NHaTlaRr4c/k3gNlMucGHGATD+0ALHMlw/SW0N/tAHAUstUDJTYAAAAAABAC//9gImAtEAOAAAZCYnJiYnJiYnJiY1NDY2MzIWFhUjNCYmIyIGBhUUFhcWFhcWFhcWFhUUBgYjIiYmNTMUFjMyNjY1AgsVHR1QRDc6GC4rO2xFQGxAGjVgPT1gNRkaHk07PkwfIiIna19Gd0kagWs9YjfIOBcXHhURFQ0aRTAzTywyX0E0VC8mQiogMxQXHhASHRcaQyoiU0AsX0hWYidFLQAAAAABABsAAAI7AscABwAAQSERIxEhNSECO/79Gv79AiACrf1TAq0aAAAAAQBa//YCQALHABQAAEERFAYjIiYmNREzERQWFjMyNjY1EQJAgnBKbjwbNWJCQWI1Asf+Hm+AOWxJAeP+H0FgNDRhQQHgAAAAAQARAAACRQLHAAgAAGUXNxMzASMBMwEdDg7vHf72IP72HUUrKwKC/TkCxwABAB4AAANrAscAEgAAZRc3EzMDIwMnBwMjAzMTFzcTMwJ7ICGTHL8esBkYsh3AHZQgIKgdoXV1Aib9OQJRS0v9rwLH/dp1dQImAAAAAQAaAAACOgLHAAsAAEETMwMBIwMDIwEDMwEq5iH2AP8g8PAgAQD2IQF/AUj+pP6VAVb+qgFrAVwAAAAAAQAQAAACQwLHAAgAAEETMwERIxEBMwEp+SH+9Bv+9CMBJgGh/kf+8gEOAbkAAAAAAQAuAAACKALHAAkAAHchFSE1ASE1IRVSAdb+BgHG/k0B1xoaFQKYGhMAAAACAC3/9gHIAhoAJAAvAABkJjUGBiMiJiY1NDY2MzM1NCYjIgYGFSc0NjYzMhYWFxUUFxUjJjY3NSMiBhUUFjMBpAQgbEQxSig7bUiDVE4vTiwaNFk2OVQuAQ4fj2sbe1uDTjsRMR8zOCRCKjBJKE1CSiI7JAEqRykmSTT8ViEEEEI9fUREMUMAAgBT//YB6ALuABMAIAAAZAYGIyImJxUjETMRNjYzMhYWFRUmJiMiBgcVFhYzMjY1AegxWTw7XxsaGhxcPD1aMBxaUUJdFRVdQ1JYsnpCMitTAu7+wjQ2QHlVCX2ARkLyOD2CewAAAAABAC//9gHLAhoAIQAAZDY3Mw4CIyImJjU1NDY2MzIWFhcjJiYjIgYGFRUUFhYzAVBcBRoCNFg2QmE1NWFBOFgzAhoEXUo6VS0uVToRTUIzTSpBeVERUHdBLVQ3R1c6bEsRSWs5AAAAAAIAPP/2AdAC7gASAB8AAFI2NjMyFhcRMxEjNQYGIyImJjUXFBYzMjY3NSYjIgYHPC9aPjxbHBoaG147PVkwG1pQQl0WLYdPWQMBYXs+NjUBP/0SVC0xQntUBHGBOjj3hnl0AAACACr/9gHRAhoAGgAkAABWJiY1NTQ2NjMyFhYVFSEVFBYWMzI2NxcGBiMCBgYHITU0JiYj1mtBOGVBO1sz/nQ4XzY0Sx4SHVg6PVM2BgFwLE8zCkF3ThZGeUk5aEMcHURsPSQlDSsrAgo0XTsGNlo2AAAAAAEAIAAAAUUC+AAXAABzESM1MzU2NjMyFwcmIyYjIgYVFTMVIxF8XFwBSEEiHQQCAhgeNTyMjAH1G01KUQgZAQZEPkwb/gsAAAIAO/8rAdACGgAgACwAAFI2NjMyFhc1MxEUBgYjIiYnNxYWMzI2NzUGBiMiJiY1NRYWMzI2NzUmIyIGFTswWj07XBwbMVo9NVchEyBJMFJbARteOzxaMBtaUUJeFCyHU1kBYXlANjRg/flFZDUuKxIpKGNaUSwxQntUB32APTnwiYF8AAEAVAAAAdIC7gAUAABSNjMyFhYXESMRNCYjIgYHESMRMxGIZT04SyQBG0VKQ2USGhoB00crVUH+pwFaVVFgTv6uAu7+pwAAAAIATQAAAIMC0QADAA8AAHMjETMmNjMyFhUUBiMiJjV1GxsoDwwLEBALDA8CELEQEAsMDw8LAAAAAv+6/ysAhgLRAA0AGQAAUxEUBiMiJzcWMzI2NREmNjMyFhUUBiMiJjV1SUIYGAIWGDc6Cw8MCxAQCwwPAhD9sUhOCRoJQTsCT7EQEAsMDw8LAAAAAQBUAAAB0QLuAAwAAFMHFSMRMxE3NzMHASO7TRoaPvEl8gEBIgEdQtsC7v4KOt7h/tEAAAEAWgAAAHUC7gADAABzIxEzdRsbAu4AAAEATwAAAzQCGgAmAABTFTY2MzIWFzY2MzIWFhURIxE0JgcGBwYHMREjESYmIyIHBgcRIxFpG2M9RFMOF2lCOEwlGkZLYTcgAxoBRUtXNyIKGgIQfUBHPEE5RCtWQP6nAVdXUwECSiwo/qABY1FMTC83/rICEAAAAAEAVAAAAdICGgAUAABTFTY2MzIWFhcRIxE0JiMiBgcRIxFuGmU9OEskARtFSkNlEhoCEHs+RytVQf6nAVpVUWBO/q4CEAAAAAIALP/2AfoCGgARACMAAFI2NjMyFhYVFRQGBiMiJiY1NR4CMzI2NjU1NCYmIyIGBhUVLDZpSEhpNjxoQj5qQBoyXj47XTQzXT07XjQBWnhIRndIF093Qj12UhdUbUA9bkcPQG1BP25FEAAAAAIAU/81AegCGgATACEAAGQGBiMiJicRIxEzFTY2MzIWFhUVJiYjIgYHFRYWMzI2NzUB6DFZPDxeGxoaHFw8PVowG1tRQl0VFV5CUFoBsnpCMSv+4wLbXjI2QHlVCX2ARUH3Njx8dQwAAgA8/zUB0AIaABMAIQAAUjY2MzIWFzUzESMRBgYjIiYmNTUWFjMyNjc1JiYjIgYHFTwwWT47XRsaGhxeOj1ZMBtaUEJdFhddQFFZAQFheUA2Ml79JQEdLDBCe1QHfIE6OPdCRHx3CgABAFQAAAFAAhoADwAAQCMiBgcRIxEzFTY2MzIXBwEwFURaDxoaFldAFg8DAgBXT/6mAhBuOj4FGAAAAAABADX/9gG0AhoALgAAZCYnLgI1NDY2MzIWFhUjNCYjIgYHBhYXFhYXFhYVFAYGIyImJjUzFhYzMjY2NQGaUlJCTSEtUDQ4Vi8bW0dEUQIBOjcMGw5cUy9UNzpZMhoEWk0uSSmyQREOJjYnJj0iJUQuNkc8Lio1EAQGAxRIPSo/IiVBKjc+HjQeAAAAAAEAE//2ARcCnwAWAABTFTMVIxEUFjMyNxcGBiMiJicRIzUzNY94eCYqGBwECB0SOTIBYWECn48b/ok5NAQZAwM/RgF6G48AAAEAUv/2AdECEAAUAABhNQYGIyImJicRMxEWFjMyNjcRMxEBthhbQzpNJgEaAUtHTF4NG1UtMi1YQQFU/qtUVkdFAXP98AAAAAEAFQAAAcoCEAAGAAB3EzMDIwMz774dzhrNHCoB5v3wAhAAAAEAKQAAAscCEAAQAAB3FxMzEzcTMwMjAycHAyMDM7MdmhuaHmsfmhqDGRqBGpkemXIB6f4XcgF3/fABjV9f/nMCEAAAAQAbAAABwgIQAAsAAFM3MwMTIycHIxMDM++oIbnDIbOyIcO5IQEm6v7//vH4+AEPAQEAAAEAFf8rAc0CEAAVAAB3NxMzAwcOAiMiJicnFjMyNjc3AzP2A7cd7AwNJDAdDRUFARISKjYUINIdKQoB3f2UHR8oFQMCGQUxN1cCDQABACoAAAHGAhAACQAAdyEVITUBITUhFU4BeP5kAVz+tAFvGhoVAeAbFwAAAAIAKP/yAWoBNQAXABsAAHYmJicmNjYzMhYXBycmJiMiBhcUFhY3FwclFwXmTzIBASI7IxYpGgoDFSUSKjsBKkIjBOoBOQn+xzMdQCciOiILCh0BCAo3Jx0xFgkeMGseagAAAAABAEb//wBzAowACQAAdgICJzcWEhIHJ1QDBwQeBAkCBR46AR8BExoGGv7q/tw5BAABAFn//wCGAjMACQAAdiYmJzceAgcnZgIHBB4FCAIFHzry5xoGHOn3OAQAAAEARgAAAPgCjAASAAByJiY3NgInNxYSBwYWFjMzFwcjqUYVAwIIBR4GCAICDTg+BQICBStZU0ABSSYGJ/61REtJIw8QAAAAAAEAaAAAARsCMwAWAAByJiY3NjU0Jic3FhYXFAcGFhYzMxcHI8tGFQMBBwUeBQgBAQMNOD4GAgIGK1lTExJPwyAFH7NPLBBLSSMPEP//AA3//wDaAyUEIgA6AAAABgJ15nkAAP//ACAAAAEbAyUEIgA8AAAABgJ1+XkAAP////b+8QDDAowEIgA5AAAABwJ1/8/9Hf//ABj+8AD4AowEIgA7AAAABwJ1//H9HP///8v//wD8AsEEIgA6AAAABgKOw+wAAP//AAEAAAEyAsEEIgA8AAAABgKO+ewAAP///9T//wD3AwAEIgA6AAAABwJv/9UAh///AAIAAAElAwAEIgA8AAAABwJvAAMAh///ACT/+ALwAWgEIwBGAZAAAAACAEgAAAAB//r/+QFgAWgAEQAAZjcyNjY3NCcmJzcWFhUUBgYjBgFckVQGFxgIGw8rXaNlCBAhMhogUk8TDyWYIidCJwD//wAk//gDpwFUBCMASQGQAAAAAgBIAAAAAQAk//gBlQFUABIAAEQmJicmNjcXBgcGBhceAjMWBwEjnlcFBRQRHAcEDAoDBU+QaAICCCZNOSxdJw4QDSFDHi9AIA8QAAAAAf/8//kCFwD1ABgAAGY3MjY2NxcGFxYXFhYzFwciJiY3Mw4CIwQCcqhqFR8WBAEMDTMlAQEwRh4MBB9xn2UJDzJiSQM/LRkZGRwPEChNNDtOJwAAAf/7AAABWgEdABsAAGczMjY3NjYnJic3FgcWFjMzFwcjIiYnNwYGIyMFBUZUFg4CBgECHg0EAzwyCQICCTtNARENaWEFHx4gFFU2DQ0HVFEsLQ8QNjYHPDcAAAAB//sAAAGNAR0AHAAAZzMyNjY3NiYnJzcWBxYWMzMXByMiJjU3DgIjIwUFUFktEA8BCQEeDgQDPDEKAQEKOk4QBzduXgUfDBkWF18+CAdZTCwtDxA2NgctMhQAAAL/+gAAAVMBHAASABwAAGAmJyYnJic3FhcWFxYWMzMXByMlMzI2NxcGBiMjARtCEAgSCAgeBQUZBgwzJwUCAgX+rwVbXQkYC2llBjAvFlglJAYXGHESJSYPEB83OwVIRAAAAAAC//sAAAGNARwAEQAcAABgJicmJyYnNxcWFxYWMzMXByMlMzI2NxcOAiMjAVZDEAgaAwQeChkGDDInBgEBBv51BYJxCBkHPHVcBTEuF38REAYvcRIlJg8QHzU9BTE9HgAB//sAAAECAWgADwAAZzMyNic0Jic3FhYHBgYjIwU0WloBIhMbFCYBAW1kNB87Oil0KQ4rgCxISQAAAAAB//oAAAEZAWgAEAAAZzMyNicmJic3FhYHDgIjIwYgdGwBASITGxQnAQE3cFYgHzo7KXUoDiuALDFAIP//ACT/MgLwAWgEIgBFAAAABwJmAVD/0P//ACT/MAOnAVQEIgBHAAAABwJmAWn/zv////v/MAFaAR0EIgBKAAAABgJmAM4AAP////r/LwFTARwEIgBMAAAABgJmAM0AAP////v/MAFaAR0EIgBKAAAABgJmLc4AAP////v/MAGNARwEIgBNAAAABgJmLc4AAP////v/MAECAWgEIgBOAAAABgJmCc4AAP////v/MAECAWgEIgBOAAAABgJmO84AAP//ACT+5gLwAWgEIgBFAAAABwJrAQX/4P//ACT+5gOnAVQEIgBHAAAABwJrARj/4P///9f+5QGNAR0EIgBLAAAABgJr098AAP///9f+5AGNARwEIgBNAAAABgJr094AAP////v+5QGNAR0EIgBLAAAABgJrAt8AAP////v+5QGNARwEIgBNAAAABgJrBd8AAP///8z+5gEZAWgEIgBPAAAABgJryOAAAP////r+5gEZAWgEIgBPAAAAIgFTAAAABgJrBOD//wAk//gC8AF9BCIARQAAAAcCaAETABT//wAk//gDpwFvBCIARwAAAAcCaAExAAb////7AAABjQHcBCIASwAAAAYCaBxzAAD////7AAABjQHeBCIATQAAAAYCaDB1AAD////9AAABjwHeBCIATQIAACYCaDB1AAIBUwAA/////QAAAY8B3AQiAEsCAAAmAmgccwACAVMAAP////oAAAEZAhwEIgBPAAAABwJoACEAs/////wAAAEbAhwEIgBPAgAAJwJoACEAswACAVMAAAAA//8AJP/4AvABqQQiAEUAAAAHAm0BCAA+//8AJP/4A6cBpQQiAEcAAAAHAm0BKgA6////+wAAAY0CNwQiAEsAAAAHAm0ADwDM////+wAAAY0COAQi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Adb//AGf//oBn//8ApUAKgKNACoClQAqAo0AKgHS//sBn//6AugAJANCACQDGQAkA68AJAIe//sBsv/7AbL/+wGx//kDQgAkA68AJAIe//sBsv/7A0EAJAOZACQCCP/7AbH/+wSyACQEsgAkBLUAJAS1ACQDb//5A2//+QNq//kDav/5AmcAJwJnACcCmgAnASL/+wDl//sCZwAnAOX/+wEi//sCmgAnAekAKAIeACcCMv/7Afz/+wKUACoCtgAqAVP/+wFM//oBKv/7ApQAKgK2ACoBjQAkAbwAJgJQAB4Bzf/8AZ///AJQ//wBef/7AY0AJAG8ACYBjQAkAe0AMAGa//oBQP/6AY0AJAHtADACdwAuAfwAIwIz//wCUP/8AY0AJAG8ACYBjQAkAe0AMAGXAB4BmQAqAZcAHgGZACoBlwAeAZkAKgGXAB4BmQAqAZcAHgGZACoCvgApArcAKAJ2ACgCvgApAr4AKQK3ACgCdgAoArcAKAJ2ACgBhv/TAYb/1gGG//sBhv/7AUD/1AFD//wCvgApArcAKAJ2ACgBU//7AUz/+gEq//sCvgApArcAKAJ2ACgBhv/TAYb/1gGG//sBhv/7AUD/1AFC//wCvgApArcAKAJ2ACgBhv/TAYb/1gGG//sBhv/7AUD/1AFD//wDmwAiAY8AKAGLACgBRwAoAY8AKAGBACgDmwAiAY8AKAGLACgBRwAoAY0AJAG8ACYAxv/8AAL//gH6AE8CSQBPAfQAFAJDABQB+gBPAkkATwIBAAsCUQALAfoAFAJJABQEDAAoBHsAKAQMACgEewAoA4EAJgH6AE8CSQBPBBYAJgFCACoAnwAXAUIAKgCfABcBQQBUAXMAZAHfAFoCYwBaAZwANAHFACoB3wAqAiAAJQIgACQByQA5AaYASQFzAGQB3wBaAmMAWgJvAGQCTQA8AekAKgIgACUCIAAkAckAOQJvAGQCTQA8AekAKgIUABsCFAAiAhQASwIUAJACFACnAhQAZQIUABQCFAAZAhQAIQIUAEcCFAAeAhQAHwIUAFgCbwBkAk0APAHpACoBpgBJAXMAZAHfAFoCYwBaAm8AZAJNADwB6QAqAiAAJQIgACQByQA5AfIAOQHYABsCIwA9AiMAWwIjADkCIwAyAiMAKAIjAFkCIwA/AiMAJgIjADECIwAyAaYASQFzAGQB3wBa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AG0AIABFAGIAcgBhAGgAaQBtAGkAZgBvAG4AdABpAHIAYQBuAC4AYwBvAG0AbQBvAHMAbABlAG0AZQBiAHIAYQBoAGkAbQBpAC4AYwBvAG0AVABvACAAdQBzAGUAIAB0AGgAaQBzACAAZgBvAG4AdAAsACAAaQB0ACAAaQBzACAAbgBlAGMAZQBzAHMAYQByAHkAIAB0AG8AIABvAGIAdABhAGkAbgAgAHQAaABlACAAbABpAGMAZQBuAHMAZQAgAGYAcgBvAG0AIAB3AHcAdwAuAGYAbwBuAHQAaQByAGEAbgAuAGMAbwBtAGgAdAB0AHAAcwA6AC8ALwBmAG8AbgB0AGkAcgBhAG4ALgBjAG8AbQAvAGwAaQBjAGUAbgBzAGUAcwBJAFIAQQBOAFMAYQBuAHMAWABWAEYAVABoAGkAbgBXAGUAaQBnAGgAdABEAE8AVABTAFUAbAB0AHIAYQBMAGkAZwBoAHQASQBSAEEATgBTAGEAbgBzAFgAVgBGAC0AVQBsAHQAcgBhAEwAaQBnAGgAdABMAGkAZwBoAHQASQBSAEEATgBTAGEAbgBzAFgAVgBGAC0ATABpAGcAaAB0AEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAFIAZQBnAHUAbABhAHIATQBlAGQAaQB1AG0ASQBSAEEATgBTAGEAbgBzAFgAVgBGAC0ATQBlAGQAaQB1AG0ARABlAG0AaQBCAG8AbABkAEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEQAZQBtAGkAQgBvAGwAZABCAG8AbABkAEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEIAbwBsAGQARQB4AHQAcgBhAEIAbwBsAGQASQBSAEEATgBTAGEAbgBzAFgAVgBGAC0ARQB4AHQAcgBhAEIAbwBsAGQAQgBsAGEAYwBrAEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEIAbABhAGMAawBFAHgAdAByAGEAQgBsAGEAYwBrAEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEUAeAB0AHIAYQBCAGwAYQBjAGsASABlAGEAdgB5AEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEgAZQBhAHYAeQBUAGgAaQBuACAARAA0AEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAFQAaABpAG4ARAA0AFUAbAB0AHIAYQBMAGkAZwBoAHQAIABEADQASQBSAEEATgBTAGEAbgBzAFgAVgBGAC0AVQBsAHQAcgBhAEwAaQBnAGgAdABEADQATABpAGcAaAB0ACAARAA0AEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEwAaQBnAGgAdABEADQAUgBlAGcAdQBsAGEAcgAgAEQANABJAFIAQQBOAFMAYQBuAHMAWABWAEYALQBSAGUAZwB1AGwAYQByAEQANABNAGUAZABpAHUAbQAgAEQANABJAFIAQQBOAFMAYQBuAHMAWABWAEYALQBNAGUAZABpAHUAbQBEADQARABlAG0AaQBCAG8AbABkACAARAA0AEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEQAZQBtAGkAQgBvAGwAZABEADQAQgBvAGwAZAAgAEQANABJAFIAQQBOAFMAYQBuAHMAWABWAEYALQBCAG8AbABkAEQANABFAHgAdAByAGEAQgBvAGwAZAAgAEQANABJAFIAQQBOAFMAYQBuAHMAWABWAEYALQBFAHgAdAByAGEAQgBvAGwAZABEADQAQgBsAGEAYwBrACAARAA0AEkAUgBBAE4AUwBhAG4AcwBYAFYARgAtAEIAbABhAGMAawBEADQARQB4AHQAcgBhAEIAbABhAGMAawAgAEQANABJAFIAQQBOAFMAYQBuAHMAWABWAEYALQBFAHgAdAByAGEAQgBsAGEAYwBrAEQANABIAGUAYQB2AHkAIABEADQASQBSAEEATgBTAGEAbgBzAFgAVgBGAC0ASABlAGEAdgB5AEQANABEADQASQB0AGEAbABpAGMAAAACAAAAAAAA/ysACgAAAAAAAAAAAAAAAAAAAAAAAAAAApMAAAABAAIAAwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0ARABFAEYARwBIAEkASgBLAEwATQBOAE8AUABRAFIAUwBUAFUAVgBXAFgAWQBaAFsAXABdAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQEWARcBGAEZARoBGwEcAR0BHgEfASABIQEiASMBJAElASYBJwEoASkBKgErASwBLQEuAS8BMAExATIBMwE0ATUBNgE3ATgBOQE6ATsBPAE9AT4BPwFAAUEBQgFDAUQBRQFGAUcBSAFJAUoBSwFMAU0BTgFPAVABUQFSAVMBVAFVAVYBVwFYAVkBWgFbAVwBXQFeAV8BYAFhAWIBYwFkAWUBZgFnAWgBaQFqAWsBbAFtAW4BbwFwAXEBcgFzAXQBdQF2AXcBeAF5AXoBewF8AX0BfgF/AYABgQGCAYMBhAGFAYYBhwGIAYkBigGLAYwBjQGOAY8BkAGRAZIBkwGUAZUBlgGXAZgBmQGaAZsBnAGdAZ4BnwGgAaEBogGjAaQBpQGmAacBqAGpAaoBqwGsAa0BrgGvAbABsQGyAbMBtAG1AbYBtwG4AbkBugG7AbwBvQG+Ab8BwAHBAcIBwwHEAcUBxgHHAcgByQHKAcsBzAHNAc4BzwHQAdEB0gHTAdQB1QHWAdcB2AHZAdoB2wHcAd0B3gHfAeAB4QHiAeMB5AHlAeYB5wHoAekB6gHrAewB7QHuAe8B8AHxAfIB8wH0AfUB9gH3AfgB+QH6AfsB/AH9Af4B/wIAAgECAgIDAgQCBQIGAgcCCAIJAgoCCwIMAg0CDgIPAhACEQISAhMCFAIVAhYCFwIYAhkCGgIbAhwCHQIeAh8CIAIhAiICIwIkAiUCJgInAigCKQIqAisCLAItAi4CLwIwAjECMgIzAjQCNQI2AjcCOAI5AjoCOwI8Aj0CPgI/AkACQQJCAkMCRAJFAkYCRwJIAkkCSgJLAkwCTQJOAk8CUAJRAlICUwJUAlUCVgJXAlgCWQJaAlsCXAJdAl4CXwJgAmECYgJjAmQCZQJmABMAFAAVABYAFwAYABkAGgAbABwCZwJoAmkCagJrAmwCbQJuAm8CcAJxAnICcwJ0AnUCdgJ3AngCeQJ6AnsCfAJ9An4CfwKAAoECggKDAoQChQKGAocCiAKJAooCiwKMAo0CjgKPApACkQKSApMClAKVApYClwKYApkCmgKbApwCnQKeAp8CoAKhAqIAvAD0APUA9gKjAqQCpQKmAqcCqAKpAqoCqwKsAq0CrgKvArACsQKyArMCtAK1ArYCtwK4ArkCugK7ArwCvQK+Ar8CwALBAsICwwLEAsUCxgARAA8AHQAeAKsABAAiAIcADQAGABIAPwLHAsgCyQLKAssCzAAQAEIACwAMAF4AYAA+AEAAxQC0ALUAtgC3AKkAqgC+AL8ABQAKAs0CzgLPAtAC0QLSAtMC1AAjAAkAiwCKAIwAgwLVAtYAXwDoAtcC2ALZAtoABwLbAA4A7wDwALgAIACPACEAHwCVAJQAkwCnAGEApABBAJIAnACaAJkApQLcAJgACALdAt4C3wLgAuEC4gLjAuQC5QLmAucC6ALpAuoC6wLsAu0C7gLvAvAC8QLyAvMC9AL1AvYC9wL4AvkC+gL7AvwC/QL+Av8DAAMBAwIDAwMEAwUDBgMHAwgDCQMKAwsDDAMNAw4DDwMQB3VuaTA2MjEHdW5pMDYyNwt1bmkwNjI3LjAwMQx1bmkwNjI3LmZpbmEQdW5pMDYyNy5maW5hLjAwMQd1bmkwNjIzDHVuaTA2MjMuZmluYQd1bmkwNjI1DHVuaTA2MjUuZmluYQd1bmkwNjIyDHVuaTA2MjIuZmluYQd1bmkwNjcxDHVuaTA2NzEuZmluYQd1bmkwNjZFC3VuaTA2NkUuMDAxDHVuaTA2NkUuZmluYRB1bmkwNjZFLmZpbmEuMDAxEHVuaTA2NkUuZmluYS4wMDIMdW5pMDY2RS5tZWRpEHVuaTA2NkUubWVkaS4wMDEQdW5pMDY2RS5tZWRpLjAwMhB1bmkwNjZFLm1lZGkuMDAzDHVuaTA2NkUuaW5pdBB1bmkwNjZFLmluaXQuMDAxB3VuaTA2MjgMdW5pMDYyOC5maW5hDHVuaTA2MjgubWVkaRB1bmkwNjI4Lm1lZGkuMDAxEHVuaTA2MjgubWVkaS5hbHQUdW5pMDYyOC5tZWRpLmFsdC4wMDEMdW5pMDYyOC5pbml0EHVuaTA2MjguaW5pdC5hbHQHdW5pMDY3RQx1bmkwNjdFLmZpbmEMdW5pMDY3RS5tZWRpEHVuaTA2N0UubWVkaS4wMDEQdW5pMDY3RS5tZWRpLmFsdBR1bmkwNjdFLm1lZGkuYWx0LjAwMQx1bmkwNjdFLmluaXQQdW5pMDY3RS5pbml0LmFsdAd1bmkwNjJBDHVuaTA2MkEuZmluYQx1bmkwNjJBLm1lZGkQdW5pMDYyQS5tZWRpLjAwMRB1bmkwNjJBLm1lZGkuMDAyEHVuaTA2MkEubWVkaS5hbHQMdW5pMDYyQS5pbml0EHVuaTA2MkEuaW5pdC5hbHQHdW5pMDYyQgx1bmkwNjJCLmZpbmEMdW5pMDYyQi5tZWRpEHVuaTA2MkIubWVkaS4wMDEQdW5pMDYyQi5tZWRpLjAwMhB1bmkwNjJCLm1lZGkuYWx0DHVuaTA2MkIuaW5pdBB1bmkwNjJCLmluaXQuYWx0B3VuaTA2NzkMdW5pMDY3OS5maW5hDHVuaTA2NzkubWVkaRB1bmkwNjc5Lm1lZGkuMDAxDHVuaTA2NzkuaW5pdAd1bmkwNjJDDHVuaTA2MkMuZmluYQx1bmkwNjJDLm1lZGkMdW5pMDYyQy5pbml0B3VuaTA2ODYMdW5pMDY4Ni5maW5hDHVuaTA2ODYubWVkaQx1bmkwNjg2LmluaXQHdW5pMDYyRAx1bmkwNjJELmZpbmEQdW5pMDYyRC5maW5hLjAwMQx1bmkwNjJELm1lZGkMdW5pMDYyRC5pbml0B3VuaTA2MkUMdW5pMDYyRS5maW5hDHVuaTA2MkUubWVkaQx1bmkwNjJFLmluaXQHdW5pMDYyRgx1bmkwNjJGLmZpbmEHdW5pMDYzMAx1bmkwNjMwLmZpbmEHdW5pMDY4OAx1bmkwNjg4LmZpbmEHdW5pMDYzMQt1bmkwNjMxLjAwMwx1bmkwNjMxLmZpbmEHdW5pMDYzMgx1bmkwNjMyLmZpbmEHdW5pMDY5MQx1bmkwNjkxLmZpbmEHdW5pMDY5NQx1bmkwNjk1LmZpbmEHdW5pMDY5OAx1bmkwNjk4LmZpbmEHdW5pMDYzMwt1bmkwNjMzLjAwMQx1bmkwNjMzLmZpbmEQdW5pMDYzMy5maW5hLjAwMQx1bmkwNjMzLm1lZGkQdW5pMDYzMy5tZWRpLjAwMgx1bmkwNjMzLmluaXQQdW5pMDYzMy5pbml0LjAwMRB1bmkwNjMzLmluaXQuMDAyEHVuaTA2MzMuaW5pdC4wMDMHdW5pMDYzNAx1bmkwNjM0LmZpbmEMdW5pMDYzNC5tZWRpDHVuaTA2MzQuaW5pdAd1bmkwNjM1DHVuaTA2MzUuZmluYQx1bmkwNjM1Lm1lZGkQdW5pMDYzNS5tZWRpLjAwMQx1bmkwNjM1LmluaXQHdW5pMDYzNgx1bmkwNjM2LmZpbmEMdW5pMDYzNi5tZWRpDHVuaTA2MzYuaW5pdAd1bmkwNjM3DHVuaTA2MzcuZmluYQx1bmkwNjM3Lm1lZGkMdW5pMDYzNy5pbml0B3VuaTA2MzgMdW5pMDYzOC5maW5hDHVuaTA2MzgubWVkaQx1bmkwNjM4LmluaXQHdW5pMDYzOQx1bmkwNjM5LmZpbmEMdW5pMDYzOS5tZWRpDHVuaTA2MzkuaW5pdAd1bmkwNjNBDHVuaTA2M0EuZmluYQx1bmkwNjNBLm1lZGkMdW5pMDYzQS5pbml0B3VuaTA2NDEMdW5pMDY0MS5maW5hDHVuaTA2NDEubWVkaQx1bmkwNjQxLmluaXQHdW5pMDZBNAx1bmkwNkE0LmZpbmEMdW5pMDZBNC5tZWRpDHVuaTA2QTQuaW5pdAd1bmkwNkExDHVuaTA2QTEuZmluYQx1bmkwNkExLm1lZGkQdW5pMDZBMS5tZWRpLjAwMQx1bmkwNkExLmluaXQQdW5pMDZBMS5pbml0LjAwMQd1bmkwNjZGDHVuaTA2NkYuZmluYQd1bmkwNjQyDHVuaTA2NDIuZmluYQx1bmkwNjQyLm1lZGkMdW5pMDY0Mi5pbml0B3VuaTA2NDMMdW5pMDY0My5zczAxDHVuaTA2NDMuZmluYRF1bmkwNjQzLmZpbmEuc3MwMQx1bmkwNjQzLm1lZGkMdW5pMDY0My5pbml0EHVuaTA2NDMuaW5pdC5hbHQRdW5pMDY0My5pbml0LmFsdDMHdW5pMDZBOQx1bmkwNkE5LmZpbmEMdW5pMDZBOS5tZWRpDHVuaTA2QTkuaW5pdAd1bmkwNkFGDHVuaTA2QUYuZmluYQx1bmkwNkFGLm1lZGkMdW5pMDZBRi5pbml0B3VuaTA2QUELdW5pMDZBQS4wMDEMdW5pMDZBQS5maW5hEHVuaTA2QUEuZmluYS4wMDEMdW5pMDZBQS5tZWRpEHVuaTA2QUEubWVkaS4wMDEMdW5pMDZBQS5pbml0EHVuaTA2QUEuaW5pdC4wMDEHdW5pMDY0NAt1bmkwNjQ0LjAwMQx1bmkwNjQ0LmZpbmEMdW5pMDY0NC5tZWRpDHVuaTA2NDQuaW5pdAd1bmkwNkI1DHVuaTA2QjUuaW5pdAx1bmkwNkI1Lm1lZGkMdW5pMDZCNS5maW5hB3VuaTA2NDUMdW5pMDY0NS5maW5hDHVuaTA2NDUubWVkaQx1bmkwNjQ1LmluaXQHdW5pMDY0Ngx1bmkwNjQ2LmZpbmEMdW5pMDY0Ni5tZWRpEHVuaTA2NDYubWVkaS4wMDEMdW5pMDY0Ni5pbml0B3VuaTA2QkEMdW5pMDZCQS5maW5hB3VuaTA2NDcMdW5pMDY0Ny5maW5hEHVuaTA2NDcuZmluYS5hbHQMdW5pMDY0Ny5tZWRpEHVuaTA2NDcubWVkaS5hbHQMdW5pMDY0Ny5pbml0EHVuaTA2NDcuaW5pdC5hbHQHdW5pMDZDMAx1bmkwNkMwLmZpbmEHdW5pMDZDMQx1bmkwNkMxLmZpbmEMdW5pMDZDMS5tZWRpDHVuaTA2QzEuaW5pdAd1bmkwNkMyDHVuaTA2QzIuZmluYQd1bmkwNkJFDHVuaTA2QkUuZmluYQx1bmkwNkJFLm1lZGkMdW5pMDZCRS5pbml0B3VuaTA2MjkMdW5pMDYyOS5maW5hB3VuaTA2QzMMdW5pMDZDMy5maW5hB3VuaTA2NDgMdW5pMDY0OC5maW5hB3VuaTA2MjQMdW5pMDYyNC5maW5hB3VuaTA2QzYMdW5pMDZDNi5maW5hB3VuaTA2QzcMdW5pMDZDNy5maW5hB3VuaTA2QzkMdW5pMDZDOS5maW5hB3VuaTA2NDkMdW5pMDY0OS5maW5hEHVuaTA2NDkuZmluYS4wMDEHdW5pMDY0QQx1bmkwNjRBLnNzMDEMdW5pMDY0QS5maW5hEHVuaTA2NEEuZmluYS4wMDERdW5pMDY0QS5maW5hLnNzMDEVdW5pMDY0QS5maW5hLjAwMS5zczAxDHVuaTA2NEEubWVkaRB1bmkwNjRBLm1lZGkuMDAxEHVuaTA2NEEubWVkaS5hbHQUdW5pMDY0QS5tZWRpLmFsdC4wMDEMdW5pMDY0QS5pbml0EHVuaTA2NEEuaW5pdC5hbHQHdW5pMDYyNgx1bmkwNjI2LmZpbmEQdW5pMDYyNi5maW5hLjAwMQx1bmkwNjI2Lm1lZGkQdW5pMDYyNi5tZWRpLjAwMQx1bmkwNjI2LmluaXQHdW5pMDZDRQx1bmkwNkNFLmZpbmEQdW5pMDZDRS5maW5hLjAwMQx1bmkwNkNFLm1lZGkQdW5pMDZDRS5tZWRpLjAwMRB1bmkwNkNFLm1lZGkuYWx0FHVuaTA2Q0UubWVkaS5hbHQuMDAxDHVuaTA2Q0UuaW5pdBB1bmkwNkNFLmluaXQuYWx0B3VuaTA2Q0MMdW5pMDZDQy5maW5hEHVuaTA2Q0MuZmluYS4wMDEMdW5pMDZDQy5tZWRpEHVuaTA2Q0MubWVkaS4wMDEQdW5pMDZDQy5tZWRpLmFsdBR1bmkwNkNDLm1lZGkuYWx0LjAwMQx1bmkwNkNDLmluaXQQdW5pMDZDQy5pbml0LmFsdAd1bmkwNkQyDHVuaTA2RDIuZmluYRB1bmkwNkQyLmZpbmEuYWx0EXVuaTA2RDIuZmluYS5hbHQyEXVuaTA2RDIuZmluYS5hbHQzEXVuaTA2RDIuZmluYS5hbHQ0B3VuaTA2RDMMdW5pMDZEMy5maW5hEHVuaTA2RDMuZmluYS5hbHQRdW5pMDZEMy5maW5hLmFsdDIHdW5pMDZENQx1bmkwNkQ1LmZpbmEHdW5pMDY0MAt1bmkwNjQwLjAwMQt1bmkwNjQ0MDYyNxB1bmkwNjQ0MDYyNy5maW5hC3VuaTA2NDQwNjIzEHVuaTA2NDQwNjIzLmZpbmELdW5pMDY0NDA2MjUQdW5pMDY0NDA2MjUuZmluYQt1bmkwNjQ0MDYyMhB1bmkwNjQ0MDYyMi5maW5hC3VuaTA2NDQwNjcxEHVuaTA2NDQwNjcxLmZpbmELdW5pMDZBOTA2NDQQdW5pMDZBOTA2NDQuZmluYQt1bmkwNkFGMDY0NBB1bmkwNkFGMDY0NC5maW5hD3VuaTA2NDQwNjQ0MDY0Nwt1bmkwNkI1MDYyNxB1bmkwNkI1MDYyNy5maW5hB3VuaUZERjIHdW5pMDY2Qgd1bmkwNjZDDHVuaTA2NkIuc3MwNAx1bmkwNjZDLnNzMDQHdW5pMDY2MAd1bmkwNjYxB3VuaTA2NjIHdW5pMDY2Mwd1bmkwNjY0B3VuaTA2NjUHdW5pMDY2Ngd1bmkwNjY3B3VuaTA2NjgHdW5pMDY2OQd1bmkwNkYwB3VuaTA2RjEHdW5pMDZGMgd1bmkwNkYzB3VuaTA2RjQHdW5pMDZGNQd1bmkwNkY2B3VuaTA2RjcHdW5pMDZGOAd1bmkwNkY5DHVuaTA2NjQuc3MwMQx1bmkwNjY1LnNzMDEMdW5pMDY2Ni5zczAxDHVuaTA2NjQuc3MwMwx1bmkwNjY1LnNzMDMMdW5pMDY2Ni5zczAzDHVuaTA2RjAuc3MwMwx1bmkwNkYxLnNzMDMMdW5pMDZGMi5zczAzDHVuaTA2RjMuc3MwMwx1bmkwNkY0LnNzMDMMdW5pMDZGNS5zczAzDHVuaTA2RjYuc3MwMwx1bmkwNkY3LnNzMDMMdW5pMDZGOC5zczAzDHVuaTA2Rjkuc3MwMwx1bmkwNjY0LnNzMDQMdW5pMDY2NS5zczA0DHVuaTA2NjYuc3MwNAx1bmkwNkYwLnNzMDQMdW5pMDZGMS5zczA0DHVuaTA2RjIuc3MwNAx1bmkwNkYzLnNzMDQMdW5pMDZGNC5zczA0DHVuaTA2RjUuc3MwNAx1bmkwNkY2LnNzMDQMdW5pMDZGNy5zczA0DHVuaTA2Rjguc3MwNAx1bmkwNkY5LnNzMDQMdW5pMDZGNC51cmR1DHVuaTA2RjcudXJkdQl6ZXJvLnNzMDEIb25lLnNzMDEIdHdvLnNzMDEKdGhyZWUuc3MwMQlmb3VyLnNzMDEJZml2ZS5zczAxCHNpeC5zczAxCnNldmVuLnNzMDEKZWlnaHQuc3MwMQluaW5lLnNzMDEJemVyby5zczAyCG9uZS5zczAyCHR3by5zczAyCnRocmVlLnNzMDIJZm91ci5zczAyCWZpdmUuc3MwMghzaXguc3MwMgpzZXZlbi5zczAyCmVpZ2h0LnNzMDIJbmluZS5zczAyCXplcm8uc3MwMwhvbmUuc3MwMwh0d28uc3MwMwp0aHJlZS5zczAzCWZvdXIuc3MwMwlmaXZlLnNzMDMIc2l4LnNzMDMKc2V2ZW4uc3MwMwplaWdodC5zczAzCW5pbmUuc3MwMwl6ZXJvLnNzMDQIb25lLnNzMDQIdHdvLnNzMDQKdGhyZWUuc3MwNAlmb3VyLnNzMDQJZml2ZS5zczA0CHNpeC5zczA0CnNldmVuLnNzMDQKZWlnaHQuc3MwNAluaW5lLnNzMDQJemVyby5kbm9tCG9uZS5kbm9tCHR3by5kbm9tCnRocmVlLmRub20JZm91ci5kbm9tCWZpdmUuZG5vbQhzaXguZG5vbQpzZXZlbi5kbm9tCmVpZ2h0LmRub20JbmluZS5kbm9tCXplcm8ubnVtcghvbmUubnVtcgh0d28ubnVtcgp0aHJlZS5udW1yCWZvdXIubnVtcglmaXZlLm51bXIIc2l4Lm51bXIKc2V2ZW4ubnVtcgplaWdodC5udW1yCW5pbmUubnVtcgd1bmkyMDgwB3VuaTIwODEHdW5pMjA4Mgd1bmkyMDgzB3VuaTIwODQHdW5pMjA4NQd1bmkyMDg2B3VuaTIwODcHdW5pMjA4OAd1bmkyMDg5B3VuaTIwNzAHdW5pMDBCOQd1bmkwMEIyB3VuaTAwQjMHdW5pMjA3NAd1bmkyMDc1B3VuaTIwNzYHdW5pMjA3Nwd1bmkyMDc4B3VuaTIwNzkHdW5pMDBBMAd1bmkyMDA5B3VuaTIwMEEHdW5pMjAwQgd1bmkyMDBDB3VuaTIwMEQHdW5pRkVGRgd1bmkyMDBFB3VuaTIwMEYHdW5pMDZENAd1bmkwNjBDB3VuaTA2MUIHdW5pMDYxRgd1bmkwNjZEB3VuaUZEM0UHdW5pRkQzRgpwZXJpb2QuMDAxC3BlcmlvZC5zczA0CmNvbW1hLnNzMDQKY29sb24uc3MwNApzbGFzaC5zczA0DmJhY2tzbGFzaC5zczA0B3VuaUZERkMLdW5pRkRGQy4wMDELdW5pRkRGQy4wMDIGdG9tYWFuCnRvbWFhbi4wMDEKdG9tYWFuLjAwMgp0b21hYW4uMDAzB3VuaTA2NkEGbWludXRlBnNlY29uZAtkZWdyZWUuc3MwNAttaW51dGUuc3MwNAtzZWNvbmQuc3MwNAhiYXIuc3MwNAtkb2xsYXIuc3MwNAd1bmkwMEI1B3VuaTIyMTUMcGVyY2VudC5zczAxDHBlcmNlbnQuc3MwMgxwZXJjZW50LnNzMDMMcGVyY2VudC5zczA0B3VuaTA2MTUHdW5pRkJCMgd1bmlGQkIzC2RvdGNlbnRlcmFyB3VuaUZCQjQcdHdvZG90c2hvcml6b250YWxhYm92ZWFyLjAwMQd1bmlGQkI1B3VuaUZCQjkYdGhyZWVkb3RzZG93bmJlbG93YXIuMDAxB3VuaUZCQjYWdGhyZWVkb3RzdXBhYm92ZWFyLjAwMgd3YXNsYWFyC21pbmlLZWhlaGFyEWdhZnNhcmthc2hhYm92ZWFyFWdhZnNhcmthc2hhYm92ZWFyLjAwMQd1bmkwNjcwB3VuaTA2NTYHdW5pMDY1NAd1bmkwNjU1C3VuaTA2NTQwNjRGC3VuaTA2NTQwNjRDC3VuaTA2NTQwNjRFC3VuaTA2NTQwNjRCC3VuaTA2NTQwNjUyC3VuaTA2NTUwNjUwC3VuaTA2NTUwNjREB3VuaTA2NEIHdW5pMDY0Qwd1bmkwNjREB3VuaTA2NEUHdW5pMDY0Rgd1bmkwNjUwB3VuaTA2NTELdW5pMDY1MTA2NEILdW5pMDY1MTA2NEMLdW5pMDY1MTA2NEQLdW5pMDY1MTA2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loOAAwAoAApAAgAAAAA45AAAAApAARVVAABAAAAAAAtAADjkAABAAAAAAIAC/QADgYAAHIOAAhUAB4GAAGWDgAJcAHKBgEAAloOAAwAoAApAAgAAAAA45AAAAApAARVVAABAAAAAAAtAADjkAABAAAAAAIACBAATgYAAKIOAAiwAMoGAAGiDgAIzADuBgEAAl4OAAwAoAApAAgAAAAA45AAAAApAARVVAABAAAAAAApAADjkAABAAAAAAIACCgAggYAAOYOAAg0AW4GAAGiDgAICADeBgABugwCAAwAoAApAAgAAAAA45AAAAAtAARVVAABAAAAAAAtAADjkAABAAAAAAIAC/wAggYAAMIOAAv4AV4GAQACAg4ACtgBSgYBAAKuDAIADACgACkACAAAAADjkAAAACkABFVUAAEAAAAAAC0AAOOQAAEAAAAAAgAL7ACeBgAArg4AC8gBngYAAc4OAAq8AbYGAQACrg4ADACgABkACAAAAADjkAAAABkABFVUAAEAAAAAACkAAOOQAAEAAAAAAAAOEAC6EAAmEAHqEADSBAFSBQADXhACAAwAoAApAAgAAAAA45AAAAAtAARVVAABAAAAAAA1AADjkAABAAAAAAIACDgADgYAANYOAAhgAB4GAQACEg4ABdwBAAI2BgEAA0oMAgAMAKAAIQAIAAAAAOOQAAAAIQAEVVQAAQAAAAAALQAA45AAAQAAAAACAAPqDgAAdg4AA6YOAAHWDgAISAFSBgEAAyYOAAwAoAAlAAgAAAAA45AAAAAlAARVVAABAAAAAAAtAADjkAABAAAAAAAAEgQACgQAqhAALgQAHgQBxhABygUAAjYFAANWEgAMAKAAHQAIAAAAAOOQAAAAKQAEVVQAAQAAAAAAKQAA45AAAQAAAAACCAByBADOEAP6BAEuBQACIhAD1gQB5gUAAgYSABAA0AAlAAgAAAAA45AAAAApAARVVAABAAAAAAApAADjkAABAAAAAAAVAAzjkAABAAEAAAAD/gQAugQA0hAD8gQB7gUAAi4QAD4FAAIuBAH6EggAKgYUAgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAAQAAAAAAFQAA45AAAQAAAAACBACCBhIEAW4GEgQA3gYSAAwAoAAVAAgAAAAA45AAAAAVAARVVAABAAAAAAAVAADjkAABAAAAAAIEAIIGE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AAAAgQAMgYSBABSBhIEAFIGEgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAAQAAAAAAFQAA45AAAQAAAAACBAAyBhIEAFIGEgQAUgYSAAwAoAAVAAgAAAAA45AAAAAVAARVVAABAAAAAAAVAADjkAABAAAAAAIEADIGEgQAUgYSBABSBhIADACgABUACAAAAADjkAAAABUABFVUAAEAAAAAABUAAOOQAAEAAAAAAgQAMgYSBABSBhIEAFIGEgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAAQAAAAAAFQAA45AAAQAAAAACBAAyBhIEAFIGEgQAUgYSAAwAoAAVAAgAAAAA45AAAAAVAARVVAABAAAAAAAVAADjkAABAAAAAAIEADIGEgQAUgYSBABKBhIADACgABUACAAAAADjkAAAABUABFVUAAEAAAAAABUAAOOQAAEAAAAAAgQAMgYSBABSBhIEAFIGEgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAAQAAAAAAHQAA45AAAQAAAAACBAAyBhIEAFIGEgQAQgQDxg4ADACgABUACAAAAADjkAAAABUABFVUAAEAAAAAAB0AAOOQAAEAAAAAAgQAMgYSBABSBhIEAFIEA8YOAAwAoAAVAAgAAAAA45AAAAAVAARVVAABAAAAAAAdAADjkAABAAAAAAIEADIGEgQAUgYSBABSBAOKDgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAAQAAAAAAHQAA45AAAQAAAAACBAAyBhIEAFIGEgQAUgQDig4ADACgABUACAAAAADjkAAAABUABFVUAAEAAAAAAB0AAOOQAAEAAAAAAgQAMgYSBABSBhIEAFIEA4oOAAwAoAAVAAgAAAAA45AAAAAVAARVVAABAAAAAAAdAADjkAABAAAAAAIEADIGEgQAUgYSBABSBAOKDgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAAQAAAAAAHQAA45AAAQAAAAACBAAyBhIEAFIGEgQAUgQDig4ADACgABUACAAAAADjkAAAABUABFVUAAEAAAAAAB0AAOOQAAEAAAAAAgQAMgYSBABSBhIEAFIEA4oOAAwAoAAVAAgAAAAA45AAAAAVAARVVAABAAAAAAAdAADjkAABAAAAAAIEADIGEgQAUgYSBABKBAOKDgAMAKAAFQAIAAAAAOOQAAAAFQAEVVQAA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AhICGgIiAoQCkgKyArICwALIAugDEAL2AxADGAMYAAEAHAAEAAYACAAJAA4ADwATABQAFQAXABkAGgAcAB0AIgAjACUAKAAqACsALAAvADEAMwA0ADYCPgI/AAMAMf/4aiYANP/waiYCEf/iDnYAAwIg//NqEgIi//hqEgIk//pqEgACACP/92n+ADT/9Wn+ABIABP+tY2wADf9/AG4AFwAKafAAHv/vafAAIP/2afAAIf/2afAAIv/2afAAJP/2afAALP/2afAALv/2afAAL//zafAAMv/1afAAM//0afAANv/0afACC/+OanACDP+OanACD/+OanACJf+OanAAAAANgAAAAQA0/+FpfAABADT/0wAIAAAAD4AAAAEAMQAHaWYABAAX/+tpTgAZ//JpXgAa//ZpXgAc/+8AAAADABf/2WV0ABn/92lEABz/6WlEAAUAA//sDYAAL//baSAANP/kaSACKv9gACACK/+XZi4AAAASgAAABAAv//FpCgIgAAppCgIiAAlpCgIkAAhpCgAEAC//9mjwAiAAB2jwAiIAB2jwAiQABmjwAAsAI//1aNYAL//saNYAMf/1aNYCEv/qAAACE//oAAACIAAKaNYCIgAJaNYCJAAJaNYCKv/YAAACK//nAAACOf/xaNYAAQA0//NokgABAin/2QDIABAAIP/0aIIAIf/0aIIAIv/0aIIAJP/0aIIALv/0aIICIAAKaIICIgAJaIICJAAJaIICJgAIaIICJwAIaIICKAAIaIICKQAIaIICLgAIaIICLwAIaIICPgAIaIICPwAIaIIAAQIp/9kACAAAABWAAAAFACD/9mgSACH/9mgSACL/9mgSACT/9mgSAC7/9mgSAAECKf/ZAAgAAAAWgAAAAQIp/9kLyAAEACMAB2KeADEAGGfcADQACGfcAikAAAAaAAAAFIAAAAIALP/2ZBICKQAAZYYABAIL/8NnrgIM/8NnrgIP/8NnrgIl/8NnrgABACMABmeUAAEANAAFZ4wAAglwAEQAAAm2CoAAGQAYAAAAAP/7aQr/wWd0//hnhP/WZ3T/3mO0/9ILqv/6Z4T/xWeE//tnhP/oZ4QABmeEAAALVgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/82eEAAAAAP/0Z4QAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXIhciAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9q/2oXKBcoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXLhcuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAcAOQA5AAAAOwA7AAEAPQBEAAIAhgCMAAoAjgCWABEBFQEeABoBVAFVACQAAgARADsAOwAGAD0APQAHAD4APgAIAD8APwAJAEAAQAAOAEEAQQAKAEIAQgAL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ACsABgAJAAICmAAKAAMAAAABAqAAAQKgAAEAAAArAAYACQABAAgAAwAAAAEAEgABAqQAAQAAACsAAQABAFMABgAJAAEACAADAAAAAQASAAEChAABAAAAKwABAAEBQQAGAAkAAQAIAAMAAAABABIAAQJkAAEAAAArAAEAAQEpAAYACQABAAgAAwAAAAEAEgABAkQAAQAAACsAAQABATgABgAJAAEACAADAAAAAQASAAECJAABAAAAKwABAAEAWwAGAAkAAQAIAAMAAAABABIAAQIEAAEAAAArAAEAAQBeAAYACQABAAgAAwAAAAEAEgABAeQAAQAAACsAAQABASwABgAJAAEACAADAAAAAQASAAEBxAABAAAAKwABAAEBOwAGAAkAAQAIAAMAAAABABIAAQGkAAEAAAArAAEAAQBWAAYACQABAAgAAwAAAAEAEgABAYQAAQAAACsAAQABAUQABgAJAAkAGAAwAEgAYAD0AQwBJAE8AVQAAwABAFoAAQASAAAAAQAAACsAAQABAT4AAwABAEIAAQASAAAAAQAAACsAAQABASQAAwABACoAAQASAAAAAQAAACsAAQABAS8AAwABABIAAQCOAAAAAQAAACsAAQA8AGIAZgBqAG4AcgB0AHcAeAB7AHwAgACBAIQAhQCbAJ0AowCkAKcAqQCsAK0AsACxALQAtQC4ALkAvAC9AMAAwQDEAMUAyADKANAA0QDWANcA3ADdAOAA4QDmAOgA7QDuAPAA8QD1APYA+QD7AQEBAwEJAQoBDwEQAAEAAQE1AAMAAAABABIAAQB4AAEAAAArAAEAAQFAAAMAAAABABIAAQBgAAEAAAArAAEAAQEoAAMAAAABABIAAQBIAAEAAAArAAEAAQE3AAMAAAABABIAAQAwAAEAAAArAAEAAQBSAAMAAAABABIAAQAYAAEAAAArAAEAAQBaAAEAJABAAFQAVQBcAF0AdgB6AH4AgwCOAJAAlgC3ALsAzwD4AP0BAQEJAQ4BFgEYASABJAEqASsBLwE1ATkBOgE+AUIBQwFHAUgBTQAGAAkAAwAMACQAPAADAAAAAQASAAEAnAABAAAAKwABAAEAZgADAAAAAQASAAEAhAABAAAAKwABAAEAYgADAAAAAQASAAEAbAABAAAAKwABAAEAYwAGAAkAAwAMACQAPAADAAAAAQASAAEASAABAAAAKwABAAEAbgADAAAAAQASAAEAMAABAAAAKwABAAEAagADAAAAAQASAAEAGAABAAAAKwABAAEAawABAAsAYgBjAGQAZQBqAGsAcgBzAJIAlgDQAAYACQABAAgAAwABABQAAQLkAAEAagABAAAALAABACkAUgBUAFYAVwBaAFwAXgBfAGIAZgBqAG4AcgB0AJkAmwCdAKIAowCkAKcAqQCsAK0A+QD7AQoBKAEqASwBLQExATMBNwE5ATsBPAFAAUIBRAFFAAEAFQBHAFEAUgBUAFkAWgBcAGEAYgBpAGoAcQByAPkBKAEqATEBNwE5AUABQgABAAAAAQAIAAIALAATANMA1QEjASYBJwF+AX8BgAGnAagBqQGqAasBrAGtAa4BrwGwAmAAAQATANIA1AEiASQBJQFuAW8BcAGdAZ4BnwGgAaEBogGjAaQBpQGmAl4AAQAAAAEACAACABwACwGxAbIBswG0AbUBtgG3AbgBuQG6AmEAAgACAZ0BpgAAAl4CXgAKAAEAAAABAAgAAgA0ABcBgQGCAYMBhAGFAYYBhwGIAYkBigGLAYwBjQG7AbwBvQG+Ab8BwAHBAcIBwwHEAAIAAwFuAXAAAAF0AX0AAwGdAaYADQABAAAAAQAIAAIATgAkAWgBaQGOAY8BkAGRAZIBkwGUAZUBlgGXAZgBmQGaAcUBxgHHAcgByQHKAcsBzAHNAc4CGAIZAhoCGwIcAkICQwJEAkUCRwJjAAIACQFmAWcAAAFuAXAAAgF0AX0ABQGdAaYADwILAg0AGQIVAhYAHAI9AkAAHgJGAkYAIgJeAl4AIwABAAAAAQAIAAEABv/2AAIAAQHZAeIAAAABAAkAAQAIAAEAFAABAAEACQABAAgAAQAGAAIAAQACAUcBTQABAAkAAQAIAAEABgADAAEAAQFHAAEACQABAAgAAgA6ABoAVABVAFcAXABdAF8AZQBkAGcAbQBsAG8BJQEqASsBLQEwATYBOQE6ATwBPwFCAUMBRQFLAAEAGgBSAFMAVgBaAFsAXgBiAGMAZgBqAGsAbgEkASgBKQEsAS8BNQE3ATgBOwE+AUABQQFEAUcAAQAJAAEACAABAAYAAQABAA8AUgBUAFoAXABiAGoAcgD5ASgBKgExATcBOQFAAUIAAAABAAEACAADAAAAFAAPAAAALAACd2dodAEAAABET1RTAQEAAWl0YWwBLAACAB4AKgA2AEIATgBeAGoAdgCCAI4AmgCmALIAvgDKAAEAAAAAABEAZAAAAAEAAAAAAQIAyAAAAAEAAAAAAQQBLAAAAAEAAAACAAIBkAAAAAMAAAACAAIBkAAAArwAAAABAAAAAAEHAfQAAAABAAAAAAEJAlgAAAABAAAAAAELArwAAAABAAAAAAENAyAAAAABAAAAAAEPA4QAAAABAAAAAAERA7YAAAABAAAAAAETA+gAAAABAAEAAgACAAAAAAABAAEAAAErAAQAAAADAAIAAgACAAAAAAABAAAAAA==';
const BK_FONT_CSS = "/* plasma-fonts */ @font-face{font-family:'Morabba';src:url('/f/morabba.woff2') format('woff2');font-weight:700;font-style:normal;font-display:swap} @font-face{font-family:'IRANSansX';src:url('/f/iransansx.ttf') format('truetype');font-weight:100 1000;font-style:normal;font-display:swap}";

// ===== Subscription info page (browser view of /u/<token>, premium design) =====
function bkIsBrowserSubReq(req) {
  const ua = String((req && req.get && req.get('user-agent')) || '');
  const accept = String((req && req.get && req.get('accept')) || '');
  if (!/mozilla/i.test(ua)) return false;
  if (!/text\/html/i.test(accept)) return false;
  if (/(v2ray|streisand|hiddify|sing-?box|clash|shadowrocket|quantumult|surge|loon|foxray|neko|happ|karing|v2box|napsternet|potatso|stash|shadowsocks|wireguard|openvpn|tun2socks)/i.test(ua)) return false;
  return true;
}

function bkSubPageHtml(view, nodes, subUrl) {
  const v = view || {};
  let statusText = 'فعال', statusCls = 'ok';
  if (v.enabled === false) { statusText = 'غیرفعال'; statusCls = 'off'; }
  else if (v.expiresAt && Date.now() >= v.expiresAt) { statusText = 'منقضی‌شده'; statusCls = 'end'; }
  else if (v.quotaBytes > 0 && (v.usedBytes || 0) >= v.quotaBytes) { statusText = 'اتمام حجم'; statusCls = 'end'; }
  else if (!v.allowed) { statusText = 'غیرفعال'; statusCls = 'off'; }
  const viewJson = JSON.stringify({
    name: v.name || 'Plasma', statusText, statusCls,
    quotaBytes: v.quotaBytes || 0, usedBytes: v.usedBytes || 0,
    expiresAt: v.expiresAt || 0, createdAt: v.createdAt || 0, allowed: !!v.allowed,
    lastSeenAt: v.lastSeenAt || 0, lastActiveAt: v.lastActiveAt || 0
  }).replace(/</g, '\\u003c');
  const cfgJson = JSON.stringify((nodes || []).map(n => ({ name: n.name || '', type: n.type || '', uri: n.uri || '' })).filter(n => n.uri)).replace(/</g, '\\u003c');
  const subJson = JSON.stringify({ main: subUrl, raw: subUrl + '/raw', clash: subUrl + '/clash', sb: subUrl + '/sb' }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<title>اطلاعات اشتراک | Plasma</title>
<style>${BK_FONT_CSS}
.hero h1,.card h3,.ring .p,.tile .val{font-family:'Morabba','IRANSansX',sans-serif}
*{box-sizing:border-box}html{background:#060913}body{font-family:'IRANSansX',Vazirmatn,Tahoma,sans-serif;background:radial-gradient(1000px 560px at 8% -10%,rgba(94,160,255,.15),transparent 60%),radial-gradient(900px 620px at 108% -4%,rgba(124,92,255,.25),transparent 55%),radial-gradient(760px 520px at 50% 118%,rgba(45,212,191,.09),transparent 60%),linear-gradient(165deg,#060913,#0b1122);color:#eef0ff;margin:0;padding:26px 16px 44px;min-height:100vh}
.wrap{max-width:880px;margin:0 auto}
.brand{text-align:center;font-weight:800;letter-spacing:4px;color:#9d8fff;font-size:12.5px;margin-bottom:16px}
.hero{position:relative;overflow:hidden;border-radius:26px;padding:26px 22px;background:linear-gradient(130deg,#4f8cff,#7c5cff 55%,#b45cff);box-shadow:0 30px 60px -22px rgba(110,80,255,.55);margin-bottom:16px}
.hero:before{content:'';position:absolute;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.13);top:-190px;left:-90px}
.hero:after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;background:rgba(45,212,191,.25);bottom:-150px;right:8%}
.hrow{position:relative;z-index:1;display:flex;align-items:center;gap:16px}
.avatar{width:64px;height:64px;flex:0 0 64px;border-radius:20px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);display:grid;place-items:center;font-size:26px;font-weight:800;color:#fff;backdrop-filter:blur(4px)}
.hero h1{margin:0;font-size:1.5rem;color:#fff;word-break:break-word}
.hero .sub2{color:rgba(255,255,255,.85);font-size:12.5px;margin-top:4px}
.pill{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:800;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);color:#fff}
.pill .dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399}
.pill.off .dot{background:#cbd5e1;box-shadow:none}.pill.end .dot{background:#fb7185;box-shadow:0 0 10px #fb7185}
.card{background:rgba(255,255,255,.045);border:1px solid rgba(150,140,255,.18);border-radius:22px;padding:20px;margin-bottom:16px;box-shadow:0 24px 54px -24px rgba(2,4,16,.7);backdrop-filter:blur(10px)}
.card h3{margin:0 0 14px;font-size:1.02rem}
.ringwrap{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.ring{position:relative;width:132px;height:132px;flex:0 0 132px}
.ring svg{transform:rotate(-90deg)}
.ring .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring .p{font-size:1.45rem;font-weight:800}
.ring .t{font-size:11px;color:#93a0b8}
.tiles{flex:1;min-width:230px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tile{background:rgba(255,255,255,.04);border:1px solid rgba(150,140,255,.14);border-radius:16px;padding:11px 13px}
.tile .k{color:#93a0b8;font-size:11px}
.tile .val{font-weight:800;font-size:14.5px;margin-top:3px}
.linkbox{display:flex;gap:8px;align-items:stretch;background:#0a0f22;border:1px solid #2c3a63;border-radius:14px;padding:8px;margin-bottom:12px}
.linkbox .u{flex:1;direction:ltr;text-align:left;font-family:monospace;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:7px 4px;color:#c9d4ff}
button{background:linear-gradient(120deg,#4f8cff,#7c5cff);color:#fff;border:0;border-radius:11px;padding:9px 15px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;white-space:nowrap;box-shadow:0 10px 22px -10px rgba(110,80,255,.7)}
button.soft{background:rgba(255,255,255,.08);border:1px solid rgba(150,140,255,.25);box-shadow:none}
button.green{background:linear-gradient(120deg,#0ea873,#2ecc71);width:100%;padding:13px;font-size:14.5px;border-radius:13px;box-shadow:0 14px 28px -12px rgba(20,184,120,.65)}
.apps{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.apps a{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;color:#fff;font-weight:800;font-size:13.5px;padding:13px 10px;border-radius:14px}
.apps .a1{background:linear-gradient(120deg,#0ea5a4,#2dd4bf);box-shadow:0 14px 28px -12px rgba(45,212,191,.55)}
.apps .a2{background:linear-gradient(120deg,#2563eb,#5ea0ff);box-shadow:0 14px 28px -12px rgba(94,160,255,.55)}
.apps .a3{background:linear-gradient(120deg,#7c5cff,#b45cff);box-shadow:0 14px 28px -12px rgba(150,90,255,.55)}
.fmt{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 12px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.step{display:flex;gap:11px;align-items:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(150,140,255,.14);border-radius:16px;padding:13px}
.step .n{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:linear-gradient(120deg,#4f8cff,#7c5cff);display:grid;place-items:center;font-weight:800;font-size:13.5px;color:#fff}
.step .h{font-weight:800;font-size:13px}
.step .d{color:#93a0b8;font-size:11.5px;line-height:1.9}
.cfg{display:flex;gap:11px;align-items:flex-start;padding:12px 2px;border-bottom:1px solid rgba(150,140,255,.12)}.cfg:last-child{border-bottom:0}
.cfg .cdot{width:11px;height:11px;border-radius:50%;margin-top:5px;flex:0 0 11px}
.cfg .mn{flex:1;min-width:0}
.cfg .nm{font-weight:700;font-size:13.5px}
.cfg .tp{color:#93a0b8;font-size:11px;margin-right:8px}
.cfg .uri{direction:ltr;text-align:left;font-family:monospace;font-size:11px;color:#9fb2e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:5px 0 7px}
.cfg .ops{display:flex;gap:6px}
.warn{background:rgba(251,113,133,.09);border:1px solid rgba(251,113,133,.35);color:#ffb3c0;border-radius:16px;padding:15px 17px;font-size:13.5px;margin-bottom:16px;line-height:2}
.foot{color:#8a92ba;font-size:12px;text-align:center;line-height:2}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a2450;border:1px solid rgba(150,140,255,.4);color:#fff;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:700;opacity:0;pointer-events:none;transition:.25s;z-index:50;box-shadow:0 18px 36px -12px rgba(0,0,0,.7)}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#qrM{position:fixed;inset:0;background:rgba(3,5,12,.82);display:none;align-items:center;justify-content:center;z-index:60}
#qrM.open{display:flex}
#qrM .box{background:#101736;border:1px solid rgba(150,140,255,.3);border-radius:20px;padding:22px;text-align:center;max-width:320px}
#qrM img{background:#fff;border-radius:12px;padding:8px}
#qrM .t{margin-bottom:12px;font-weight:700;font-size:14px;word-break:break-all}
@media (max-width:520px){.tiles{grid-template-columns:1fr 1fr}.ringwrap{justify-content:center}}
</style></head><body><div class="wrap">
<div class="brand">P L A S M A</div>
<div class="hero"><div class="hrow">
<div class="avatar" id="avatar">P</div>
<div style="flex:1;min-width:0"><h1 id="subName">—</h1><div class="sub2">اشتراک اینترنت Plasma</div></div>
<span class="pill" id="stPill"><span class="dot"></span><span id="stTxt">—</span></span>
</div></div>
<div class="card"><div class="ringwrap">
<div class="ring"><svg width="132" height="132" viewBox="0 0 132 132"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4f8cff"/><stop offset="55%" stop-color="#7c5cff"/><stop offset="100%" stop-color="#c86dd7"/></linearGradient></defs><circle cx="66" cy="66" r="58" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="11"/><circle id="ringFg" cx="66" cy="66" r="58" fill="none" stroke="url(#rg)" stroke-width="11" stroke-linecap="round" stroke-dasharray="364.4" stroke-dashoffset="364.4"/></svg><div class="c"><div class="p" id="pctTxt">۰٪</div><div class="t">مصرف‌شده</div></div></div>
<div class="tiles">
<div class="tile"><div class="k">سقف حجم</div><div class="val" id="qTotal">—</div></div>
<div class="tile"><div class="k">مصرف‌شده</div><div class="val" id="qUsed">—</div></div>
<div class="tile"><div class="k">باقی‌مانده</div><div class="val" id="qRemain">—</div></div>
<div class="tile"><div class="k">زمان باقی‌مانده</div><div class="val" id="expLeft">—</div></div>
<div class="tile"><div class="k">تاریخ انقضا</div><div class="val" id="expD">—</div></div>
<div class="tile"><div class="k">تاریخ ساخت</div><div class="val" id="crD">—</div></div>
<div class="tile"><div class="k">آخرین آنلاین شدن</div><div class="val" id="lastOn">—</div></div>
<div class="tile"><div class="k">آخرین فعالیت</div><div class="val" id="lastAct">—</div></div>
</div></div></div>
<div id="linksZone"></div>
<div class="card"><h3>راهنمای اتصال</h3><div class="steps">
<div class="step"><div class="n">۱</div><div><div class="h">کپی یا اسکن</div><div class="d">لینک اشتراک را کپی کنید یا با دکمه QR اسکن کنید.</div></div></div>
<div class="step"><div class="n">۲</div><div><div class="h">وارد کردن در برنامه</div><div class="d">در v2rayNG، Hiddify، Streisand یا Happ گزینه Import از کلیپ‌بورد را بزنید — یا از دکمه‌های بالا استفاده کنید.</div></div></div>
<div class="step"><div class="n">۳</div><div><div class="h">اتصال</div><div class="d">یک کانفیگ را انتخاب و وصل شوید. تمام لوکیشن‌ها به این اشتراک وصل‌اند.</div></div></div>
</div></div>
<div class="foot">Plasma — اینترنت سریع، امن و بدون دردسر</div>
</div>
<div id="toast">کپی شد!</div>
<div id="qrM"><div class="box"><div class="t" id="qrT"></div><img id="qrI" width="230" height="230" alt="QR"><div style="margin-top:14px"><button class="soft" onclick="closeQr()">بستن</button></div></div></div>
<script>
var VIEW = ${viewJson};
var CFGS = ${cfgJson};
var SUBS = ${subJson};
function fmtBytes(b){ if(!b) return '0 B'; var u=['B','KB','MB','GB','TB']; var i=Math.min(u.length-1, Math.floor(Math.log(b)/Math.log(1024))); return (b/Math.pow(1024,i)).toFixed(i?2:0)+' '+u[i]; }
function fmtDate(t){ return t ? new Date(t).toLocaleString('fa-IR') : '—'; }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m||'کپی شد!'; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },1800); }
function copyText(s){ if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(s).then(function(){ toast(); }, function(){ fb(s); }); } else fb(s); }
function fb(s){ var ta=document.createElement('textarea'); ta.value=s; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); toast(); }catch(e){ toast('کپی نشد'); } document.body.removeChild(ta); }
function openQr(text, title){ document.getElementById('qrT').textContent=title||'کد QR'; document.getElementById('qrI').src='https://api.qrserver.com/v1/create-qr-code/?size=230x230&data='+encodeURIComponent(text); document.getElementById('qrM').classList.add('open'); }
function closeQr(){ document.getElementById('qrM').classList.remove('open'); }
document.getElementById('qrM').addEventListener('click', function(e){ if(e.target===this) closeQr(); });
function el(tag, cls, txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(txt, fn, cls){ var b=el('button', cls||'', txt); b.onclick=fn; return b; }
function pcolor(t){ t=String(t||'').toUpperCase(); if(t.indexOf('VMESS')===0) return '#5ea0ff'; if(t.indexOf('TROJAN')===0) return '#f472b6'; if(t.indexOf('SHADOW')===0) return '#fb923c'; if(t.indexOf('VLESS')===0) return '#8b7cff'; return '#94a3b8'; }
function linkRow(url, label){
  var box=el('div','linkbox'); var u=el('div','u', url); u.title=url; box.appendChild(u);
  box.appendChild(btn('کپی', function(){ copyText(url); }));
  box.appendChild(btn('QR', function(){ openQr(url, label||'لینک اشتراک'); }, 'soft'));
  return box;
}
(function init(){
  document.getElementById('subName').textContent = VIEW.name;
  document.getElementById('avatar').textContent = (VIEW.name||'P').trim().charAt(0) || 'P';
  var pill=document.getElementById('stPill'); pill.className='pill '+VIEW.statusCls;
  document.getElementById('stTxt').textContent = VIEW.statusText;
  var C = 364.4;
  var pct = VIEW.quotaBytes ? Math.min(100, Math.round(100*VIEW.usedBytes/VIEW.quotaBytes)) : -1;
  document.getElementById('ringFg').style.strokeDashoffset = VIEW.quotaBytes ? String(C*(1-pct/100)) : '0';
  document.getElementById('pctTxt').textContent = VIEW.quotaBytes ? pct+'٪' : '∞';
  document.getElementById('qTotal').textContent = VIEW.quotaBytes ? fmtBytes(VIEW.quotaBytes) : 'نامحدود ∞';
  document.getElementById('qUsed').textContent = fmtBytes(VIEW.usedBytes);
  document.getElementById('qRemain').textContent = VIEW.quotaBytes ? fmtBytes(Math.max(0, VIEW.quotaBytes - VIEW.usedBytes)) : 'نامحدود ∞';
  document.getElementById('expD').textContent = VIEW.expiresAt ? fmtDate(VIEW.expiresAt) : 'بدون انقضا ∞';
  document.getElementById('expLeft').textContent = !VIEW.expiresAt ? 'نامحدود' : (function(){ var d=Math.ceil((VIEW.expiresAt-Date.now())/86400000); return d>0 ? d+' روز' : 'تمام شده'; })();
  document.getElementById('crD').textContent = VIEW.createdAt ? fmtDate(VIEW.createdAt) : '—';
  document.getElementById('lastOn').textContent = VIEW.lastSeenAt ? fmtDate(VIEW.lastSeenAt) : '—';
  document.getElementById('lastAct').textContent = VIEW.lastActiveAt ? fmtDate(VIEW.lastActiveAt) : '—';
  var z=document.getElementById('linksZone');
  if(!VIEW.allowed){
    z.appendChild(el('div','warn','این اشتراک در حال حاضر فعال نیست ('+VIEW.statusText+'). برای فعال‌سازی با پشتیبانی در تماس باشید.'));
    return;
  }
  var c0=el('div','card'); c0.appendChild(el('h3','','افزودن سریع به برنامه'));
  var apps=el('div','apps');
  var a1=el('a','a1','v2rayNG'); a1.href='v2rayng://install-config?url='+encodeURIComponent(SUBS.main);
  var a2=el('a','a2','Hiddify'); a2.href='hiddify://import/'+SUBS.main+'#Plasma';
  var a3=el('a','a3','Streisand'); a3.href='streisand://import/'+encodeURIComponent(SUBS.main);
  apps.appendChild(a1); apps.appendChild(a2); apps.appendChild(a3);
  c0.appendChild(apps);
  z.appendChild(c0);
  var c1=el('div','card'); c1.appendChild(el('h3','','لینک اشتراک'));
  c1.appendChild(linkRow(SUBS.main, 'لینک اشتراک'));
  var fmt=el('div','fmt');
  fmt.appendChild(btn('نسخه خام (Raw)', function(){ copyText(SUBS.raw); }, 'soft'));
  fmt.appendChild(btn('Clash', function(){ copyText(SUBS.clash); }, 'soft'));
  fmt.appendChild(btn('Sing-box', function(){ copyText(SUBS.sb); }, 'soft'));
  c1.appendChild(fmt);
  var all=el('button','green','کپی همه کانفیگ‌ها');
  all.onclick=function(){ copyText(CFGS.map(function(c){ return c.uri; }).join('\\n')); };
  c1.appendChild(all);
  z.appendChild(c1);
  if(CFGS.length){
    var c2=el('div','card'); c2.appendChild(el('h3','','کانفیگ‌ها ('+CFGS.length+')'));
    CFGS.forEach(function(c){
      var d=el('div','cfg');
      var dot=el('span','cdot'); dot.style.background=pcolor(c.type); dot.style.boxShadow='0 0 9px '+pcolor(c.type);
      d.appendChild(dot);
      var mn=el('div','mn');
      var head=el('div'); head.appendChild(el('span','nm', c.name)); if(c.type) head.appendChild(el('span','tp', c.type));
      mn.appendChild(head);
      mn.appendChild(el('div','uri', c.uri));
      var ops=el('div','ops');
      ops.appendChild(btn('کپی کانفیگ', function(){ copyText(c.uri); }));
      ops.appendChild(btn('QR Code', function(){ openQr(c.uri, c.name); }, 'soft'));
      mn.appendChild(ops);
      d.appendChild(mn);
      c2.appendChild(d);
    });
    z.appendChild(c2);
  }
})();
</script></body></html>`;
}

// ===== Panel overview strip v2 (injected into the panel page by renderPanel) =====
const BK_OVERVIEW_HTML = `<style>
.pov-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:11px;margin:0 0 18px}
.pov-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.045);border:1px solid rgba(150,140,255,.20);border-radius:18px;padding:13px 15px;box-shadow:0 18px 40px -22px rgba(2,4,16,.7)}
.pov-ic{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;font-size:19px;color:#fff}
.pov-i1{background:linear-gradient(135deg,#4f8cff,#7c5cff)}.pov-i2{background:linear-gradient(135deg,#7c5cff,#c86dd7)}.pov-i3{background:linear-gradient(135deg,#0284c7,#38bdf8)}.pov-i4{background:linear-gradient(135deg,#d97706,#fbbf24)}.pov-i5{background:linear-gradient(135deg,#0ea873,#34d399)}.pov-i6{background:linear-gradient(135deg,#db2777,#fb7185)}
.pov-n{font-size:1.08rem;font-weight:850;line-height:1.2;font-family:'Morabba','IRANSansX',sans-serif}
.pov-t{font-size:10.5px;opacity:.62;margin-top:1px}
.pov-wrap a{text-decoration:none;color:inherit;transition:transform .25s}
.pov-wrap a:hover{transform:translateY(-2px)}
.bk-side{display:none}
@media (min-width:1100px){.bk-side{display:block;margin-top:auto;background:rgba(255,255,255,.045);border:1px solid rgba(150,140,255,.20);border-radius:16px;padding:12px 14px}
.bk-side .r{display:flex;justify-content:space-between;align-items:center;font-size:.74rem;padding:3px 0;color:#b9c0e4}
.bk-side .r b{color:#eef0ff;font-weight:700}
.bk-side .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399;margin-inline-end:6px}}
</style>
<script>
(function(){
  function fmtBytes(b){ if(!b) return '0 B'; var u=['B','KB','MB','GB','TB']; var i=Math.min(u.length-1, Math.floor(Math.log(b)/Math.log(1024))); return (b/Math.pow(1024,i)).toFixed(i?2:0)+' '+u[i]; }
  function fmtUp(s){ s=Math.max(0, Math.floor(s||0)); var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60); if(d) return d+' روز و '+h+' ساعت'; if(h) return h+' ساعت و '+m+' دقیقه'; return m+' دقیقه'; }
  function build(){
    var home = document.getElementById('viewHome');
    if(!home) return null;
    var wrap = document.getElementById('povWrap');
    if(!wrap){ wrap = document.createElement('div'); wrap.id='povWrap'; wrap.className='pov-wrap'; home.insertBefore(wrap, home.firstChild); }
    return wrap;
  }
  function card(icon, icls, num, label, href){
    var inner = '<div class="pov-ic '+icls+'">'+icon+'</div><div><div class="pov-n">'+num+'</div><div class="pov-t">'+label+'</div></div>';
    return href ? '<a class="pov-card" href="'+href+'">'+inner+'</a>' : '<div class="pov-card">'+inner+'</div>';
  }
  function load(){
    fetch('/__PANEL__/api/overview', { credentials:'same-origin' }).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(j){
      var wrap = build(); if(!wrap) return;
      var fresh = (j.nodes||[]).filter(function(n){ return n.fresh; }).length;
      var loc = (j.local||{});
      var tr = j.traffic || { today:0, month:0 };
      wrap.innerHTML =
        card('👥','pov-i1', j.users.total + ' <span style="font-size:.7rem;opacity:.7">(' + j.users.active + ' فعال)</span>', 'اشتراک‌ها — مدیریت', '/__PANEL__/users') +
        card('💾','pov-i2', fmtBytes(j.users.usedBytes), 'مصرف اشتراک‌ها') +
        card('📈','pov-i3', fmtBytes(tr.today), 'ترافیک امروز سرور') +
        card('🗓️','pov-i4', fmtBytes(tr.month), 'ترافیک این ماه') +
        card('🌐','pov-i5', fresh + ' / ' + (j.nodes||[]).length, 'نودهای آنلاین') +
        card('📍','pov-i6', (loc.name||'') + ' ' + (loc.flag||''), 'لوکیشن · آپتایم ' + fmtUp(j.uptimeSec));
      var inner = document.querySelector('.header-inner');
      if (inner) { var sc = document.getElementById('bkSide');
        if (!sc) { sc = document.createElement('div'); sc.id = 'bkSide'; sc.className = 'bk-side'; var act = document.querySelector('.header-actions'); if (act) inner.insertBefore(sc, act); else inner.appendChild(sc); }
        sc.innerHTML = '<div class="r"><span><span class="dot"></span>وضعیت سرور</span><b>فعال</b></div>' +
          '<div class="r"><span>لوکیشن</span><b>' + (loc.name || '') + ' ' + (loc.flag || '') + '</b></div>' +
          '<div class="r"><span>نودهای آنلاین</span><b>' + fresh + ' / ' + (j.nodes || []).length + '</b></div>' +
          '<div class="r"><span>آپتایم</span><b>' + fmtUp(j.uptimeSec) + '</b></div>'; }
    }).catch(function(){ var w=document.getElementById('povWrap'); if(w) w.remove(); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
  setInterval(load, 60000);
})();
</script>`;

const BK_USERS_PAGE = `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<title>مدیریت اشتراک‌ها | Plasma</title>
<style>
/* plasma-fonts */
@font-face{font-family:'Morabba';src:url('/f/morabba.woff2') format('woff2');font-weight:700;font-style:normal;font-display:swap}
@font-face{font-family:'IRANSansX';src:url('/f/iransansx.ttf') format('truetype');font-weight:100 1000;font-style:normal;font-display:swap}
h2,h3,.stat .n{font-family:'Morabba','IRANSansX',sans-serif}
*{box-sizing:border-box}html{background:#060913}body{font-family:'IRANSansX',Vazirmatn,Tahoma,sans-serif;background:radial-gradient(1000px 560px at 8% -10%,rgba(94,160,255,.15),transparent 60%),radial-gradient(900px 620px at 108% -4%,rgba(124,92,255,.25),transparent 55%),radial-gradient(760px 520px at 50% 118%,rgba(45,212,191,.09),transparent 60%),linear-gradient(165deg,#060913,#0b1122);color:#eef0ff;margin:0;padding:24px;min-height:100vh}
h2{font-size:1.4rem;margin:0;font-weight:850}h3{margin-top:0;font-size:1.02rem}
.top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px}
.top .brand{display:flex;align-items:center;gap:11px}
.logoic{width:42px;height:42px;border-radius:13px;background:linear-gradient(120deg,#4f8cff,#7c5cff 55%,#c86dd7);display:grid;place-items:center;font-size:20px;box-shadow:0 10px 24px -8px rgba(124,108,240,.7)}
.top a{color:#8db1ff;font-size:13px;text-decoration:none;font-weight:700}
.card{background:rgba(255,255,255,.045);border:1px solid rgba(150,140,255,.18);border-radius:22px;padding:20px;margin-bottom:16px;box-shadow:0 24px 54px -24px rgba(2,4,16,.7);backdrop-filter:blur(10px)}
input,select{background:#0a0f22;border:1px solid #2c3a63;color:#fff;border-radius:12px;padding:10px;width:100%;font-family:inherit;outline:none}
input:focus,select:focus{border-color:rgba(150,140,255,.6);box-shadow:0 0 0 4px rgba(124,92,255,.15)}
button{background:linear-gradient(120deg,#4f8cff,#7c5cff);color:#fff;border:0;border-radius:999px;padding:7px 14px;cursor:pointer;margin:2px;font-family:inherit;font-size:12px;font-weight:700;box-shadow:0 8px 18px -8px rgba(110,80,255,.7)}
button.soft{background:rgba(255,255,255,.08);border:1px solid rgba(150,140,255,.25);box-shadow:none}
button.red{background:linear-gradient(120deg,#e11d48,#fb7185);box-shadow:0 8px 18px -8px rgba(244,63,94,.6)}
button.big{padding:11px 22px;font-size:13px}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid rgba(150,140,255,.13);padding:11px 8px;text-align:right;font-size:13px;vertical-align:top}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
label{font-size:12px;color:#93a0b8;display:block;margin-bottom:5px}
.bar{height:8px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;min-width:120px;direction:ltr}
.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#4f8cff,#8b7cf6)}
.bar i.hot{background:linear-gradient(90deg,#f5b14c,#fb7185)}
.badge{display:inline-block;padding:3px 11px;border-radius:999px;font-size:11px;font-weight:800}
.badge.ok{background:rgba(52,211,153,.15);color:#34d399}.badge.off{background:rgba(255,255,255,.11);color:#aab}
.badge.end{background:rgba(251,113,133,.15);color:#fb7185}
.mut{color:#93a0b8;font-size:11px}.links a{color:#8db1ff;font-size:12px;margin-left:9px;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.stat{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.045);border:1px solid rgba(150,140,255,.18);border-radius:18px;padding:14px 16px;box-shadow:0 18px 40px -22px rgba(2,4,16,.7)}
.stat .ic{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;font-size:19px}
.stat .n{font-size:1.22rem;font-weight:850;line-height:1.15}.stat .t{color:#93a0b8;font-size:11px;margin-top:1px}
.i1{background:linear-gradient(135deg,#4f8cff,#7c5cff)}.i2{background:linear-gradient(135deg,#0ea873,#34d399)}.i3{background:linear-gradient(135deg,#e11d48,#fb7185)}.i4{background:linear-gradient(135deg,#7c5cff,#c86dd7)}.i5{background:linear-gradient(135deg,#0284c7,#38bdf8)}.i6{background:linear-gradient(135deg,#d97706,#fbbf24)}
.nodechip{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.06);border:1px solid rgba(150,140,255,.22);border-radius:999px;padding:6px 13px;font-size:12px;margin:2px;font-weight:600}
.dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 9px #34d399}
.dot.off{background:#fb7185;box-shadow:0 0 9px #fb7185}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.toolbar .search{flex:2;min-width:180px}.toolbar .filter{flex:1;min-width:140px}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a2450;border:1px solid rgba(150,140,255,.4);color:#fff;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:700;opacity:0;pointer-events:none;transition:.25s;z-index:50;box-shadow:0 18px 36px -12px rgba(0,0,0,.7)}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#qrM{position:fixed;inset:0;background:rgba(3,5,12,.82);display:none;align-items:center;justify-content:center;z-index:60}
#qrM.open{display:flex}
#qrM .box{background:#101736;border:1px solid rgba(150,140,255,.3);border-radius:20px;padding:22px;text-align:center;max-width:320px}
#qrM img{background:#fff;border-radius:12px;padding:8px}
#qrM .t{margin-bottom:12px;font-weight:700;font-size:14px;word-break:break-all}
#createResult{display:none;border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.07);border-radius:14px;padding:12px 14px;margin-top:12px}
@media (max-width:760px){ table,thead,tbody,tr,td{display:block;width:100%} thead{display:none} tr{border:1px solid rgba(150,140,255,.16);border-radius:14px;margin-bottom:12px;padding:8px} td{border-bottom:0;padding:6px 8px} }
</style></head><body>
<div class="top"><div class="brand"><div class="logoic">⚡</div><h2>مدیریت اشتراک‌ها</h2></div><a id="backLink" href="#">→ بازگشت به پنل</a></div>
<div class="stats">
<div class="stat"><div class="ic i1">👥</div><div><div class="n" id="sumTotal">—</div><div class="t">کل اشتراک‌ها</div></div></div>
<div class="stat"><div class="ic i2">✅</div><div><div class="n" id="sumActive">—</div><div class="t">فعال</div></div></div>
<div class="stat"><div class="ic i3">⛔</div><div><div class="n" id="sumBlocked">—</div><div class="t">مسدود / منقضی</div></div></div>
<div class="stat"><div class="ic i4">💾</div><div><div class="n" id="sumUsed">—</div><div class="t">مصرف اشتراک‌ها</div></div></div>
<div class="stat"><div class="ic i5">📈</div><div><div class="n" id="sumToday">—</div><div class="t">ترافیک امروز سرور</div></div></div>
<div class="stat"><div class="ic i6">🗓️</div><div><div class="n" id="sumMonth">—</div><div class="t">ترافیک این ماه</div></div></div>
</div>
<div class="card"><h3>نودها</h3><div id="nodesRow"><span class="mut">در حال بارگذاری…</span></div></div>
<div class="card"><h3>✨ اشتراک جدید</h3><div class="grid">
<div><label>نام کاربر</label><input id="n"></div>
<div><label>حجم (GB) — ۰ یعنی نامحدود</label><input id="g" type="number" min="0" step="any" value="10"></div>
<div><label>مدت (روز) — ۰ یعنی بدون انقضا</label><input id="d" type="number" min="0" step="any" value="30"></div>
</div><p><button class="big" onclick="createUser()">ساخت اشتراک</button></p>
<div id="createResult"><div class="mut" style="margin-bottom:7px">✅ اشتراک ساخته شد — لینک‌ها:</div><div id="createLinks"></div></div>
</div>
<div class="card">
<div class="toolbar"><div class="search"><input id="q" placeholder="🔍 جستجو بر اساس نام یا تگ…"></div><div class="filter"><select id="f"><option value="all">همه وضعیت‌ها</option><option value="active">فقط فعال</option><option value="blocked">مسدود / منقضی / تمام‌شده</option><option value="disabled">غیرفعال</option></select></div><button class="soft" onclick="exportAll()">📋 خروجی همه لینک‌ها</button></div>
<div class="mut" id="cnt" style="margin-bottom:8px"></div>
<table><thead><tr><th>نام</th><th>مصرف</th><th>انقضا</th><th>وضعیت</th><th>لینک‌ها</th><th>عملیات</th></tr></thead><tbody id="rows"></tbody></table>
</div>
<div id="toast">کپی شد!</div>
<div id="qrM"><div class="box"><div class="t" id="qrT"></div><img id="qrI" width="230" height="230" alt="QR"><div style="margin-top:14px"><button class="soft" onclick="closeQr()">بستن</button></div></div></div>
<style>
.bkM{position:fixed;inset:0;background:rgba(3,5,12,.82);display:none;align-items:center;justify-content:center;z-index:60;padding:14px}
.bkM.open{display:flex}
.bkM .box{background:#101736;border:1px solid rgba(150,140,255,.3);border-radius:20px;padding:22px;max-width:340px;width:100%;text-align:right;max-height:88vh;overflow:auto}
.bkM .box.wide{max-width:640px}
.bkM .t{margin-bottom:12px;font-weight:700;font-size:14px;word-break:break-all}
.bkM .fld{display:block;font-size:12px;color:#9fb2e8;margin-bottom:10px}
.bkM .fld input{display:block;width:100%;margin-top:5px;background:#0a0f22;border:1px solid #2c3a63;border-radius:10px;color:#eef0ff;padding:8px 10px;font-family:inherit;box-sizing:border-box}
.repRow{display:flex;gap:10px;padding:8px 2px;border-bottom:1px solid rgba(150,140,255,.12);font-size:12.5px;align-items:baseline}
.repRow .h{flex:1;direction:ltr;text-align:left;font-family:monospace;word-break:break-all}
.chip{display:inline-block;background:rgba(255,255,255,.07);border:1px solid rgba(150,140,255,.25);border-radius:999px;padding:3px 10px;margin:2px;font-size:11.5px;direction:ltr}
</style>
<div id="setM" class="bkM"><div class="box">
<div class="t" id="setT">تنظیم اشتراک</div>
<div class="mut" id="setCur" style="margin-bottom:10px"></div>
<label class="fld">حجم کل (GB) — ۰ یعنی نامحدود<input id="setGb" type="number" min="0" step="any" placeholder="خالی = بدون تغییر"></label>
<label class="fld">مهلت از الان (روز) — ۰ یعنی بدون انقضا<input id="setDays" type="number" min="0" step="any" placeholder="خالی = بدون تغییر"></label>
<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
<button onclick="saveSettings()">ذخیره</button>
<button class="soft" onclick="document.getElementById('setGb').value='0'">حجم نامحدود</button>
<button class="soft" onclick="document.getElementById('setDays').value='0'">بدون انقضا</button>
<button class="soft" onclick="closeSettings()">بستن</button>
</div></div></div>
<div id="repM" class="bkM"><div class="box wide">
<div class="t" id="repT">گزارش فعالیت</div>
<div class="mut" id="repMeta" style="margin-bottom:10px"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
<label class="fld" style="flex:1;min-width:150px">جست‌وجو در سایت‌ها<input id="repQ" type="text" placeholder="example.com"></label>
<label class="fld">از<input id="repFrom" type="datetime-local"></label>
<label class="fld">تا<input id="repTo" type="datetime-local"></label>
<button onclick="loadReport()">نمایش</button>
<button class="soft" onclick="closeReport()">بستن</button>
</div>
<div id="repSum" style="margin:12px 0"></div>
<div id="repList"></div>
</div></div>
<script>
var PREFIX = location.pathname.replace(/\\/users\\/?$/, '');
var API = PREFIX + '/api/users';
var OVERVIEW = PREFIX + '/api/overview';
document.getElementById('backLink').href = PREFIX || '/';
var ALL = [];
function H(){ return {'Content-Type':'application/json','x-bk-req':'1'}; }
function fmtBytes(b){ if(!b) return '0 B'; var u=['B','KB','MB','GB','TB']; var i=Math.min(u.length-1, Math.floor(Math.log(b)/Math.log(1024))); return (b/Math.pow(1024,i)).toFixed(i?2:0)+' '+u[i]; }
function fmtDate(t){ return t ? new Date(t).toLocaleString('fa-IR') : 'بدون انقضا'; }
function fmtAgo(t){ if(!t) return 'نامشخص'; var s=Math.max(0, Math.floor((Date.now()-t)/1000)); if(s<20) return 'همین الان'; if(s<60) return s+' ثانیه پیش'; var m=Math.floor(s/60); if(m<60) return m+' دقیقه پیش'; var h=Math.floor(m/60); if(h<24) return h+' ساعت پیش'; return Math.floor(h/24)+' روز پیش'; }
function daysLeft(t){ if(!t) return 'نامحدود'; var d=Math.ceil((t-Date.now())/86400000); return d>0 ? d+' روز مانده' : 'تمام شده'; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m||'کپی شد!'; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },1900); }
function copyText(s, msg){ if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(s).then(function(){ toast(msg); }, function(){ fb(s, msg); }); } else fb(s, msg); }
function fb(s, msg){ var ta=document.createElement('textarea'); ta.value=s; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); toast(msg); }catch(e){ toast('کپی نشد'); } document.body.removeChild(ta); }
function openQr(text, title){ document.getElementById('qrT').textContent=title||'کد QR'; document.getElementById('qrI').src='https://api.qrserver.com/v1/create-qr-code/?size=230x230&data='+encodeURIComponent(text); document.getElementById('qrM').classList.add('open'); }
function closeQr(){ document.getElementById('qrM').classList.remove('open'); }
document.getElementById('qrM').addEventListener('click', function(e){ if(e.target===this) closeQr(); });
function load(){ fetch(API,{headers:H()}).then(function(r){return r.json();}).then(function(j){ ALL=j.users||[]; renderStats(); render(); }); loadOverview(); }
function renderStats(){ var act=0, used=0; ALL.forEach(function(u){ if(u.allowed) act++; used+=u.usedBytes||0; }); document.getElementById('sumTotal').textContent=ALL.length; document.getElementById('sumActive').textContent=act; document.getElementById('sumBlocked').textContent=ALL.length-act; document.getElementById('sumUsed').textContent=fmtBytes(used); }
function loadOverview(){ fetch(OVERVIEW,{headers:H()}).then(function(r){return r.json();}).then(function(j){ if(j.traffic){ document.getElementById('sumToday').textContent=fmtBytes(j.traffic.today); document.getElementById('sumMonth').textContent=fmtBytes(j.traffic.month); } var row=document.getElementById('nodesRow'); row.innerHTML=''; var loc=(j.local||{}); var lc=document.createElement('span'); lc.className='nodechip'; lc.innerHTML='<span class="dot"></span>'+esc((loc.name||'Local')+' '+(loc.flag||''))+' — این سرور'; row.appendChild(lc); (j.nodes||[]).forEach(function(n){ var c=document.createElement('span'); c.className='nodechip'; c.innerHTML='<span class="dot'+(n.fresh?'':' off')+'"></span>'+esc((n.name||'Node')+' '+(n.flag||''))+'<span class="mut">'+(n.fresh?'آنلاین':'آفلاین — '+fmtAgo(n.lastSeen))+'</span>'; row.appendChild(c); }); if(!(j.nodes||[]).length){ var m=document.createElement('span'); m.className='mut'; m.textContent=' نود راه‌دوری ثبت نشده'; row.appendChild(m); } }).catch(function(){}); }
function statusOf(u){ if(!u.enabled) return 'disabled'; if(!u.allowed) return 'blocked'; return 'active'; }
function render(){ var q=(document.getElementById('q').value||'').toLowerCase(); var f=document.getElementById('f').value; var tb=document.getElementById('rows'); tb.innerHTML=''; var users=ALL.filter(function(u){ var okQ=!q || (u.name||'').toLowerCase().indexOf(q)>=0 || (u.tag||'').toLowerCase().indexOf(q)>=0; var okF=f==='all' || statusOf(u)===f; return okQ && okF; }); document.getElementById('cnt').textContent='نمایش '+users.length+' از '+ALL.length+' اشتراک'; if(!users.length){ tb.innerHTML='<tr><td colspan="6">موردی پیدا نشد</td></tr>'; return; } users.forEach(function(u){
 var tr=document.createElement('tr');
 var pct = u.quotaBytes ? Math.min(100, Math.round(100*(u.usedBytes||0)/u.quotaBytes)) : 0;
 var expired = u.expiresAt && Date.now()>=u.expiresAt;
 var status = !u.enabled ? '<span class="badge off">غیرفعال</span>' : (u.allowed ? '<span class="badge ok">فعال</span>' : '<span class="badge end">'+(expired?'منقضی':'تمام‌شده')+'</span>');
 var sub = location.origin + u.sub;
 tr.innerHTML = '<td></td><td></td><td></td><td></td><td class="links"></td><td></td>';
 tr.children[0].innerHTML = '<b>'+esc(u.name)+'</b><div class="mut">'+esc(u.tag)+'</div>' + (u.lastActiveAt ? '<div class="mut">آخرین فعالیت: '+fmtAgo(u.lastActiveAt)+'</div>' : '');
 tr.children[1].innerHTML = (u.quotaBytes ? '<div class="bar"><i class="'+(pct>=80?'hot':'')+'" style="width:'+pct+'%"></i></div><div class="mut">'+fmtBytes(u.usedBytes)+' از '+fmtBytes(u.quotaBytes)+' ('+pct+'٪)</div>' : '<div>'+fmtBytes(u.usedBytes)+' مصرف</div><div class="mut">حجم نامحدود</div>');
 tr.children[2].innerHTML = fmtDate(u.expiresAt)+'<div class="mut">'+daysLeft(u.expiresAt)+'</div>';
 tr.children[3].innerHTML = status;
 var L=tr.children[4];
 L.appendChild(mkLink('اشتراک', sub)); L.appendChild(mkLink('صفحه', sub+'/page')); L.appendChild(mkLink('Clash', sub+'/clash')); L.appendChild(mkLink('Sing-box', sub+'/sb'));
 var c=tr.children[5];
 c.appendChild(btn('کپی لینک', function(){ copyText(sub); }));
 c.appendChild(btn('QR', function(){ openQr(sub, 'اشتراک '+u.name); }, 'soft'));
 c.appendChild(btn('کپی Clash', function(){ copyText(sub+'/clash'); }, 'soft'));
 c.appendChild(btn('کپی Sing-box', function(){ copyText(sub+'/sb'); }, 'soft'));
 c.appendChild(btn('تمدید', function(){ var v=prompt('چند روز تمدید شود؟','30'); if(v) post(u.id+'/extend',{days:parseFloat(v)||0}); }));
 c.appendChild(btn('افزودن حجم', function(){ var v=prompt('چند GB اضافه شود؟','10'); if(v) post(u.id+'/add-volume',{gb:parseFloat(v)||0}); }, 'soft'));
 c.appendChild(btn('تنظیم', function(){ openSettings(u); }));
 c.appendChild(btn('گزارش فعالیت', function(){ openReport(u); }, 'soft'));
 c.appendChild(btn('ریست مصرف', function(){ if(confirm('مصرف این اشتراک صفر شود؟')) post(u.id+'/reset',{}); }, 'soft'));
 c.appendChild(btn(u.enabled?'غیرفعال':'فعال', function(){ post(u.id+'/toggle',{}); }, 'soft'));
 c.appendChild(btn('حذف', function(){ if(confirm('این اشتراک حذف شود؟')) post(u.id+'/delete',{}); }, 'red'));
 tb.appendChild(tr); }); }
function mkLink(t,href){ var a=document.createElement('a'); a.href=href; a.textContent=t; a.target='_blank'; return a; }
function btn(t,f,cls){ var b=document.createElement('button'); b.textContent=t; if(cls)b.className=cls; b.onclick=f; return b; }
function post(path, body){ fetch(API+'/'+path,{method:'POST',headers:H(),body:JSON.stringify(body||{})}).then(function(){ load(); }); }
function exportAll(){ if(!ALL.length){ toast('اشتراکی نیست'); return; } var lines=ALL.map(function(u){ return u.name+': '+location.origin+u.sub; }); copyText(lines.join('\\n'), 'لینک همه اشتراک‌ها کپی شد ('+ALL.length+')'); }
var SET_ID=null, REP_ID=null;
function fmtDT(t){ return t ? new Date(t).toLocaleString('fa-IR') : '—'; }
function openSettings(u){ SET_ID=u.id; document.getElementById('setT').textContent='تنظیم اشتراک «'+u.name+'»'; document.getElementById('setCur').textContent='حجم فعلی: '+(u.quotaBytes?fmtBytes(u.quotaBytes):'نامحدود')+' — انقضا: '+(u.expiresAt?fmtDate(u.expiresAt):'بدون انقضا'); document.getElementById('setGb').value=''; document.getElementById('setDays').value=''; document.getElementById('setM').classList.add('open'); }
function closeSettings(){ document.getElementById('setM').classList.remove('open'); }
function saveSettings(){ var body={}; var g=document.getElementById('setGb').value; var d=document.getElementById('setDays').value; if(g!=='') body.quotaGB=parseFloat(g)||0; if(d!=='') body.days=parseFloat(d)||0; if(!Object.keys(body).length){ toast('چیزی وارد نشده'); return; } closeSettings(); post(SET_ID+'/update', body); toast('ذخیره شد'); }
function openReport(u){ REP_ID=u.id; document.getElementById('repT').textContent='گزارش فعالیت «'+u.name+'»'; document.getElementById('repMeta').textContent='آخرین آنلاین شدن: '+(u.lastSeenAt?(fmtDT(u.lastSeenAt)+' ('+fmtAgo(u.lastSeenAt)+')'):'—')+' — آخرین فعالیت: '+(u.lastActiveAt?(fmtDT(u.lastActiveAt)+' ('+fmtAgo(u.lastActiveAt)+')'):'—'); document.getElementById('repQ').value=''; document.getElementById('repFrom').value=''; document.getElementById('repTo').value=''; document.getElementById('repM').classList.add('open'); loadReport(); }
function closeReport(){ document.getElementById('repM').classList.remove('open'); }
function loadReport(){ var q=document.getElementById('repQ').value||''; var f=document.getElementById('repFrom').value; var t=document.getElementById('repTo').value; var url=API+'/'+REP_ID+'/activity?limit=300'; if(q) url+='&q='+encodeURIComponent(q); if(f) url+='&from='+new Date(f).getTime(); if(t) url+='&to='+new Date(t).getTime(); document.getElementById('repList').innerHTML='<div class="mut">در حال بارگذاری…</div>'; fetch(url,{headers:H()}).then(function(r){return r.json();}).then(function(j){ var tops=(j.top||[]).map(function(x){ return '<span class="chip">'+esc(x.h)+' ×'+x.c+'</span>'; }).join(''); document.getElementById('repSum').innerHTML='<div class="mut">تعداد اتصال در این بازه: '+(j.total||0)+'</div>'+(tops?'<div style="margin-top:6px">پرتکرارترین‌ها: '+tops+'</div>':''); var L=document.getElementById('repList'); if(!(j.rows||[]).length){ L.innerHTML='<div class="mut">موردی نیست</div>'; return; } L.innerHTML=j.rows.map(function(e){ return '<div class="repRow"><span>'+fmtDT(e.t)+'</span><span class="h">'+esc(e.h)+(e.p?':'+e.p:'')+'</span><span class="mut">'+esc(e.n||'')+'</span></div>'; }).join(''); }).catch(function(){ document.getElementById('repList').innerHTML='<div class="mut">خطا در بارگذاری</div>'; }); }
document.getElementById('setM').addEventListener('click', function(e){ if(e.target===this) closeSettings(); });
document.getElementById('repM').addEventListener('click', function(e){ if(e.target===this) closeReport(); });
function createUser(){ var name=document.getElementById('n').value; var g=parseFloat(document.getElementById('g').value)||0; var d=parseFloat(document.getElementById('d').value)||0; fetch(API,{method:'POST',headers:H(),body:JSON.stringify({name:name,quotaGB:g,days:d})}).then(function(r){return r.json();}).then(function(j){ document.getElementById('n').value=''; if(j && j.user){ var sub=location.origin+j.user.sub; var box=document.getElementById('createResult'); box.style.display='block'; var L=document.getElementById('createLinks'); L.innerHTML=''; L.appendChild(btn('کپی لینک اشتراک', function(){ copyText(sub); })); L.appendChild(btn('صفحه اشتراک', function(){ window.open(sub+'/page','_blank'); }, 'soft')); L.appendChild(btn('QR', function(){ openQr(sub, 'اشتراک '+j.user.name); }, 'soft')); var nm=document.createElement('span'); nm.className='mut'; nm.textContent=' «'+j.user.name+'» '; L.appendChild(nm); } load(); }); }
document.getElementById('q').addEventListener('input', render);
document.getElementById('f').addEventListener('change', render);
load(); setInterval(load, 30000);
</script></body></html>
`;

class TcpRouter {
  constructor(config, targetPorts, expressServer, expressApp) {
    this.config = config;
    this.ports = targetPorts;
    this.httpServer = expressServer;
    this.expressApp = expressApp || (expressServer && expressServer.listeners('request')[0]);
    this.server = null;
    this.httpsServer = null;
    this.internalHttpsPort = null;
  }

  pipeToBackend(clientSocket, firstChunk, targetPort, label) {
    clientSocket.setTimeout(0);
    clientSocket.setKeepAlive(true, 10000);
    clientSocket.setNoDelay(true);

    const backend = net.connect(targetPort, '127.0.0.1', () => {
      backend.setTimeout(0);
      backend.setKeepAlive(true, 10000);
      backend.setNoDelay(true);
      backend.write(firstChunk);
      if (label !== 'Internal-HTTPS') { // decrypted WS / HTTPUpgrade / XHTTP traffic is metered inside the HTTPS server
        BkTraffic.add(label, firstChunk ? firstChunk.length : 0, 0);
        BkTraffic.meter(label, clientSocket, backend);
      }
      clientSocket.pipe(backend);
      backend.pipe(clientSocket);
      clientSocket.resume();
    });

    backend.on('error', (err) => {
      const now = Date.now();
      if (!this._lastWarns) this._lastWarns = {};
      if (!this._lastWarns[label] || now - this._lastWarns[label] > 15000) {
        Logger.warn(`TCP Router: ${label} backend on :${targetPort} unreachable (${err.message})`);
        this._lastWarns[label] = now;
      }
      try { clientSocket.destroy(); } catch {}
    });

    clientSocket.on('error', () => {
      try { backend.destroy(); } catch {}
    });
  }

  attachUpgradeHandlers(server) {
    server.on('upgrade', (req, socket, head) => {
      socket.setTimeout(0);
      socket.setKeepAlive(true, 10000);
      socket.setNoDelay(true);

      let url = req.url || '';
      try { url = decodeURIComponent(url.split('?')[0]); } catch (_) { url = url.split('?')[0]; }
      // BK_USERS: per-user subscription path -> quota/expiry check, rewrite to the canonical path.
      let bkUser = null;
      let bkFwdUrl = req.url;
      const bkParsed = BkUsers.parseUserPath(url);
      if (bkParsed) {
        bkUser = bkParsed.user;
        if (!BkUsers.isAllowed(bkUser)) {
          socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
          socket.destroy();
          return;
        }
        url = bkParsed.canonical;
        const bkQ = String(req.url || '').split('?')[1];
        bkFwdUrl = url + (bkQ ? '?' + bkQ : '');
      }
      // BK_PROTOCOLS_APPLIED: exact path routing (longest path first, so ".../vmess-hu" never matches ".../vmess").
      const pp = this.config.panelPath;
      const routes = [
        [BK_PATHS.vlessWs, `/${pp}-ws`, this.ports.vlessWs, 'VLESS-WS'],
        [BK_PATHS.vmessWs, `/${pp}-vmess`, this.ports.vmessWs, 'VMess-WS'],
        [BK_PATHS.trojanWs, `/${pp}-trojan`, this.ports.trojanWs, 'Trojan-WS'],
        [BK_PATHS.vlessHu, `/${pp}-hu`, this.ports.vlessHu, 'VLESS-HTTPUpgrade'],
        [BK_PATHS.vmessHu, `/${pp}-vmess-hu`, this.ports.vmessHu, 'VMess-HTTPUpgrade'],
        [BK_PATHS.trojanHu, `/${pp}-trojan-hu`, this.ports.trojanHu, 'Trojan-HTTPUpgrade'],
        [BK_PATHS.xhttp, `/${pp}-xh`, this.config.xhttpPort, 'VLESS-XHTTP'],
        [BK_PATHS.ssWs, `/${pp}-ss`, this.config.ssWsPort, 'Shadowsocks-WS']
      ];
      const hit = (p) => url === p || url.startsWith(p + '/');

      let destPort = null;
      let label = 'Unknown Upgrade';
      for (const [branded, legacy, port, lbl] of routes) {
        if (hit(branded) || hit(legacy)) { if (port) { destPort = port; label = lbl; } break; }
      }

      this._upgradeCount = (this._upgradeCount || 0) + 1;
      if (this._upgradeCount <= 20 || !destPort) {
        Logger.info(`WS upgrade #${this._upgradeCount} ${label} path=${url.slice(0, 80)} host=${req.headers.host || '-'}${destPort ? ' -> :' + destPort : ' -> 404 (no route)'}`);
      }

      if (!destPort) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      const backend = net.connect(destPort, '127.0.0.1', () => {
        backend.setTimeout(0);
        backend.setKeepAlive(true, 10000);
        backend.setNoDelay(true);

        let headersStr = `${req.method} ${bkFwdUrl} HTTP/${req.httpVersion}\r\n`;
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          headersStr += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
        }
        headersStr += '\r\n';

        backend.write(headersStr);
        if (head && head.length > 0) {
          backend.write(head);
        }

        BkTraffic.add(label, head && head.length ? head.length : 0, 0);
        BkTraffic.meter(label, socket, backend);
        if (bkUser) BkUsers.meter(bkUser.id, socket, backend);
        socket.pipe(backend);
        backend.pipe(socket);
      });

      let bkConnected = false;
      backend.once('connect', () => { bkConnected = true; });
      backend.on('error', (err) => {
        if (!bkConnected) {
          const now = Date.now();
          if (!this._lastUpErr || now - this._lastUpErr > 15000) {
            this._lastUpErr = now;
            Logger.error(`${label} backend :${destPort} unreachable (${err.message}) - is sing-box running? See sing-box.log`);
          }
          try { socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); } catch {}
        }
        try { socket.destroy(); } catch {}
      });

      socket.on('error', () => {
        try { backend.destroy(); } catch {}
      });
      socket.on('close', () => { try { backend.destroy(); } catch {} });
      backend.on('close', () => { try { socket.destroy(); } catch {} });
    });
  }

  async setupInternalHttps() {
    // BK_PROTOCOLS_APPLIED: one internal TLS terminator for everything TLS on the shared port:
    //   ALPN http/1.1 -> Express panel / subscription + WS / HTTPUpgrade / XHTTP upgrades (as before)
    //   ALPN h2       -> per-stream router: gRPC service path -> sing-box VLESS-gRPC (h2c), anything else -> panel
    // (Xray clients with a uTLS fingerprint offer "h2,http/1.1" for gRPC exactly like a browser, so the choice
    //  has to be made per HTTP/2 stream, not from the ClientHello.)
    try {
      const certs = ensureTlsCertificates(this.config.paths.certPath, this.config.paths.keyPath, this.config.domain || 'localhost');
      if (!certs || !certs.cert || !certs.key) return;

      const handler = this.expressApp || (this.httpServer && this.httpServer.listeners('request')[0]);
      this.h1Server = http.createServer(handler);
      this.h1Server.keepAliveTimeout = 120000;
      this.h1Server.headersTimeout = 125000;
      this.h1Server.requestTimeout = 0;
      this.h1Server.timeout = 0;
      this.attachUpgradeHandlers(this.h1Server);

      const grpcBackend = this.config.enable.vlessGrpcTls && this.ports.vlessGrpc;
      if (grpcBackend) this._setupH2Router();

      this.httpsServer = tls.createServer({
        cert: certs.cert,
        key: certs.key,
        ALPNProtocols: grpcBackend ? ['h2', 'http/1.1'] : ['http/1.1']
      }, (sock) => {
        sock.on('error', () => {});
        if (sock.alpnProtocol === 'h2' && this.h2Server) this.h2Server.emit('connection', sock);
        else this.h1Server.emit('connection', sock);
      });
      this.httpsServer.on('tlsClientError', () => {});

      await new Promise((resolve) => {
        this.httpsServer.listen(0, '127.0.0.1', () => {
          this.internalHttpsPort = this.httpsServer.address().port;
          Logger.item('Internal HTTPS Port', this.internalHttpsPort);
          resolve();
        });
        this.httpsServer.on('error', (err) => {
          Logger.warn(`Internal HTTPS server failed to start: ${err.message}`);
          resolve();
        });
      });
    } catch (err) {
      Logger.warn(`Internal HTTPS setup error: ${err.message}`);
    }
  }

  _setupH2Router() {
    const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'host', 'http2-settings', 'te']);
    const grpcPrefix = '/' + BK_PATHS.grpcService + '/';
    const big = { initialWindowSize: 4 * 1024 * 1024, maxFrameSize: 64 * 1024 };
    this.h2Server = http2.createServer({ settings: big });
    this.h2Server.on('session', (session) => {
      session.on('error', () => {});
      try { session.setLocalWindowSize(16 * 1024 * 1024); } catch (_) {}
      session.on('close', () => { if (session._bkBackend) { try { session._bkBackend.close(); } catch (_) {} } });
    });
    const backendFor = (session) => {
      let be = session._bkBackend;
      if (be && !be.closed && !be.destroyed) return be;
      be = http2.connect(`http://127.0.0.1:${this.ports.vlessGrpc}`, { settings: big });
      be.on('error', () => {});
      be.on('connect', () => { try { be.setLocalWindowSize(16 * 1024 * 1024); } catch (_) {} });
      session._bkBackend = be;
      return be;
    };
    this.h2Server.on('stream', (stream, headers) => {
      stream.on('error', () => {});
      const p = String(headers[':path'] || '/');
      // BK_USERS: per-user gRPC service names (<grpcService>-<tag>) -> quota check + canonical rewrite.
      let bkGrpcUser = null;
      let bkFwdPath = p;
      const bkSvc = p.split('/')[1] || '';
      if (bkSvc.startsWith(BK_PATHS.grpcService + '-')) {
        bkGrpcUser = BkUsers.findByTag(bkSvc.slice(BK_PATHS.grpcService.length + 1));
        if (!bkGrpcUser || !BkUsers.isAllowed(bkGrpcUser)) { try { stream.close(http2.constants.NGHTTP2_REFUSED_STREAM); } catch (_) {} return; }
        bkFwdPath = '/' + BK_PATHS.grpcService + p.slice(1 + bkSvc.length);
      }
      const fwd = {};
      for (const k of Object.keys(headers)) if (!k.startsWith(':') && !HOP.has(k)) fwd[k] = headers[k];

      if (p.startsWith(grpcPrefix) || bkGrpcUser) {
        let up;
        try {
          up = backendFor(stream.session).request({ ...fwd, ':method': headers[':method'] || 'POST', ':path': bkFwdPath, ':scheme': 'http', ':authority': headers[':authority'] || '127.0.0.1', te: 'trailers' }, { endStream: false });
        } catch (_) { try { stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR); } catch (__) {} return; }
        let trailers = null;
        up.on('error', () => { try { stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR); } catch (_) {} });
        up.on('response', (rh) => {
          const out = { ':status': rh[':status'] || 200 };
          for (const k of Object.keys(rh)) if (!k.startsWith(':') && !HOP.has(k)) out[k] = rh[k];
          try { stream.respond(out, { waitForTrailers: true }); } catch (_) { return; }
          BkTraffic.meter('VLESS-gRPC', stream, up);
          if (bkGrpcUser) BkUsers.meter(bkGrpcUser.id, stream, up);
          up.pipe(stream);
        });
        up.on('trailers', (t) => { trailers = t; });
        stream.on('wantTrailers', () => {
          const t = {};
          if (trailers) for (const k of Object.keys(trailers)) if (!k.startsWith(':')) t[k] = trailers[k];
          if (!Object.keys(t).length) t['grpc-status'] = '0';
          try { stream.sendTrailers(t); } catch (_) {}
        });
        stream.pipe(up);
        stream.on('close', () => { if (!up.closed) { try { up.close(); } catch (_) {} } });
        up.on('close', () => { if (!stream.closed && !stream.headersSent) { try { stream.close(); } catch (_) {} } });
        return;
      }

      // A browser (or other HTTP/2 client) that is not gRPC: relay the request to the panel over HTTP/1.1.
      fwd.host = headers[':authority'] || 'localhost';
      fwd['x-forwarded-proto'] = 'https';
      const rq = http.request({ host: '127.0.0.1', port: this.config.publicPort, method: headers[':method'] || 'GET', path: p, headers: fwd, agent: false });
      rq.on('response', (r) => {
        const out = { ':status': r.statusCode };
        for (const [k, v] of Object.entries(r.headers)) if (!HOP.has(k)) out[k] = v;
        try { stream.respond(out); } catch (_) { r.destroy(); return; }
        r.pipe(stream);
      });
      rq.on('error', () => { try { if (!stream.headersSent) stream.respond({ ':status': 502 }); stream.end(); } catch (_) {} });
      stream.pipe(rq);
    });
  }

  async start() {
    this.httpServer.keepAliveTimeout = 120000;
    this.httpServer.headersTimeout = 125000;
    this.attachUpgradeHandlers(this.httpServer);

    await this.setupInternalHttps();

    this.server = net.createServer((socket) => {
      socket.setTimeout(0);
      socket.setKeepAlive(true, 10000);
      socket.setNoDelay(true);

      // BK_PROTOCOLS_APPLIED: a TLS ClientHello (esp. with post-quantum key shares, ~1.8 KB) often arrives split
      // over several TCP segments; wait for the whole first record so SNI / ALPN routing sees every extension.
      let pending = null;
      let waitTimer = null;
      const onFirstData = (data) => {
        pending = pending ? Buffer.concat([pending, data]) : data;
        const needMore = (pending[0] === 0x16 && pending[1] === 0x03 && pending.length >= 5 && pending.length < Math.min(pending.readUInt16BE(3) + 5, 16389))
          || (pending.length < 16 && 'PRI * HTTP/2.0\r\n'.startsWith(pending.toString('latin1')));
        if (needMore) {
          if (!waitTimer) waitTimer = setTimeout(() => { socket.removeListener('data', onFirstData); socket.pause(); route(pending); }, 1500);
          return;
        }
        if (waitTimer) clearTimeout(waitTimer);
        socket.removeListener('data', onFirstData);
        socket.pause();
        route(pending);
      };
      socket.on('data', onFirstData);
      const route = (chunk) => {

        // 1. SOCKS5 check (byte 0x05)
        if (this.config.enable.socks && this.ports.socks && chunk.length >= 2 && chunk[0] === 0x05) {
          this.pipeToBackend(socket, chunk, this.ports.socks, 'SOCKS5');
          return;
        }

        // 2. TLS ClientHello check (0x16 0x03)
        if (chunk.length >= 3 && chunk[0] === 0x16 && chunk[1] === 0x03) {
          const { sni, alpn } = parseClientHello(chunk);
          let target = null;

          // Priority 1: Reality target SNI
          if (this.config.enable.reality && this.ports.reality && sni === this.config.reality.target) {
            target = { port: this.ports.reality, label: 'REALITY' };
          }
          // Priority 2: ShadowTLS SNI (if explicitly enabled)
          else if (this.config.enable.shadowTlsVless && this.ports.shadowTls && sni === this.config.shadowTls.sni) {
            target = { port: this.ports.shadowTls, label: 'ShadowTLS-VLESS' };
          }
          // Priority 3: gRPC over TLS. gRPC clients offer ONLY "h2"; browsers / WS / HTTPUpgrade clients offer
          // "http/1.1" (often together with h2), so they still reach the internal HTTPS server below.
          // (BK_PROTOCOLS_APPLIED: previously any ClientHello containing h2 - e.g. every browser - went to gRPC.)
          else if (alpn && alpn.includes('h2') && !alpn.includes('http/1.1') && this.config.enable.vlessGrpcTls && this.ports.vlessGrpcTls) {
            target = { port: this.ports.vlessGrpcTls, label: 'VLESS-gRPC' };
          }
          else if (alpn && alpn.includes('h2') && !alpn.includes('http/1.1') && this.config.enable.trojanGrpcTls && this.ports.trojanGrpcTls) {
            target = { port: this.ports.trojanGrpcTls, label: 'Trojan-gRPC-TLS' };
          }
          // Priority 4: Internal HTTPS server (handles VLESS-WS-TLS, VMess-WS-TLS, HTTPS Sub, HTTPS Panel)
          else if (this.internalHttpsPort) {
            target = { port: this.internalHttpsPort, label: 'Internal-HTTPS' };
          }
          // Priority 5: Fallback to vlessWsTls if singbox port is open
          else if (this.config.enable.vlessWsTls && this.ports.vlessWsTls) {
            target = { port: this.ports.vlessWsTls, label: 'VLESS-WS-TLS' };
          }
          // Priority 6: Reality decoy fallback
          else if (this.config.enable.reality && this.ports.reality) {
            target = { port: this.ports.reality, label: 'REALITY-Decoy' };
          }

          if (target) {
            this.pipeToBackend(socket, chunk, target.port, target.label);
            return;
          }
        }

        // 3. HTTP Proxy check (CONNECT or absolute URL)
        if (this.config.enable.httpProxy && this.ports.httpProxy) {
          const headerSnippet = chunk.toString('latin1', 0, Math.min(chunk.length, 256));
          if (/^CONNECT /i.test(headerSnippet) || /^(GET|POST|HEAD) https?:\/\//i.test(headerSnippet)) {
            this.pipeToBackend(socket, chunk, this.ports.httpProxy, 'HTTP-Proxy');
            return;
          }
        }

        // 4. gRPC check (HTTP/2 cleartext connection preface)
        if (this.config.enable.vlessGrpc && this.ports.vlessGrpc && chunk.length >= 16) {
          if (chunk.toString('latin1', 0, 16) === 'PRI * HTTP/2.0\r\n') {
            this.pipeToBackend(socket, chunk, this.ports.vlessGrpc, 'VLESS-gRPC');
            return;
          }
        }

        // 5. Shadowsocks check: raw encrypted stream doesn't look like standard HTTP verbs
        const firstWords = chunk.toString('latin1', 0, Math.min(chunk.length, 8));
        const isHttpVerb = /^(GET|POST|PUT|HEAD|OPTIONS|DELETE|PATCH|TRACE) /i.test(firstWords);

        if (!isHttpVerb && this.config.enable.shadowsocks && this.ports.shadowsocks) {
          this.pipeToBackend(socket, chunk, this.ports.shadowsocks, 'Shadowsocks');
          return;
        }

        // 6. Fallback: Hand off to internal HTTP server (Express panel & WS upgrades)
        socket.unshift(chunk);
        this.httpServer.emit('connection', socket);
        socket.resume();
      };

      socket.on('error', () => {});
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.publicPort, '0.0.0.0', () => {
        Logger.success(`Public TCP multiplexer listening on 0.0.0.0:${this.config.publicPort}`);
        resolve(this.server);
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    if (this.server) {
      try { this.server.close(); } catch {}
    }
    if (this.httpsServer) {
      try { this.httpsServer.close(); } catch {}
    }
  }
}

// --- Module: lib/boot.js ---
// A saved (learned) public host may only be reused when it is an IP literal or a host that is
// still configured (DOMAIN / PUBLIC_BASE_URL / SUB_BASE_URL). Otherwise a stale hostname —
// e.g. a filtered domain the owner once opened the panel with — would poison every generated
// config link forever, even after the variable is removed from plasma.env.
function bkSavedHostAllowed(config, h) {
  if (!h) return false;
  if (isIpLiteral(h)) return true;
  const dom = normalizeHost(process.env.DOMAIN || process.env.SB_DOMAIN || '');
  if (dom && h === dom) return true;
  if (config && config.domain && h === normalizeHost(config.domain)) return true;
  const urls = [config && config.publicBaseUrl, config && config.subBase, process.env.PUBLIC_BASE_URL, process.env.SUB_BASE_URL];
  for (const u of urls) {
    if (!u) continue;
    let host = '';
    try { host = new URL(u).hostname; } catch (_) { host = String(u).replace(/^https?:\/\//, '').split(/[/:?#]/)[0]; }
    if (host && h === host) return true;
  }
  return false;
}

async function resolvePublicHost(config, savedHost) {
  if (config.forceHost) return config.forceHost;
  const explicitDomain = normalizeHost(process.env.DOMAIN || process.env.SB_DOMAIN || '');
  if (savedHost && !bkIsPlatformHost(savedHost) && !bkSavedHostAllowed(config, savedHost)) { Logger.warn(`Ignoring saved public host '${savedHost}' (not an IP and not configured via DOMAIN/PUBLIC_BASE_URL); detecting the public IP instead.`); savedHost = ''; }
  if (savedHost && !explicitDomain && !bkIsPlatformHost(savedHost)) { Logger.info(`Using public domain saved from an earlier panel visit: ${savedHost}`); return savedHost; }
  if (config.domain) return config.domain;
  if (savedHost && !savedHost.endsWith('.replit.dev')) { Logger.info(`Using public domain saved from an earlier panel visit: ${savedHost}`); return savedHost; }
  if (bkOnReplit()) {
    if (!process.env.REPLIT_DEPLOYMENT) {
      Logger.warn('Running in the Replit editor: the *.replit.dev URL is private and cannot be used for configs.');
      Logger.warn('Publish the app (Reserved VM or Autoscale) and open https://<name>.replit.app/plasma (or your Worker address).');
    } else {
      Logger.warn('No public domain found in REPLIT_DOMAINS: links use the domain you open the panel with (saved automatically).');
    }
  } else if (bkOnRailway()) {
    Logger.warn('No public domain yet: Railway -> Settings -> Networking -> Generate Domain (port 8080 / the port Railway suggests).');
    Logger.warn('No redeploy or variable needed: links use the domain you open the panel with (it is saved automatically).');
  }
  if (process.env.CFIP) return process.env.CFIP;
  if (process.env.DOMAIN || process.env.SB_DOMAIN) return process.env.DOMAIN || process.env.SB_DOMAIN;

  try {
    const res = await axios.get('https://api.ipify.org?format=text', { timeout: 3500 });
    if (res.data && typeof res.data === 'string' && res.data.trim()) {
      return res.data.trim();
    }
  } catch {}

  try {
    const res = await axios.get('https://ifconfig.me/ip', { timeout: 3500 });
    if (res.data && typeof res.data === 'string' && res.data.trim()) {
      return res.data.trim();
    }
  } catch {}

  try {
    const res = await axios.get('https://1.1.1.1/cdn-cgi/trace', { timeout: 3500 });
    if (res.data && typeof res.data === 'string') {
      const match = res.data.match(/ip=([^\r\n]+)/);
      if (match && match[1]) return match[1].trim();
    }
  } catch {}

  return '127.0.0.1';
}


// ================= Plasma Telegram bot: admin management from Telegram =================
// Enabled when TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_ID are set (env or plasma.env).
// Only the admin's Telegram account can use it. Long-polling, no extra dependencies.
function startPlasmaTelegramBot(opts) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const adminId = String(process.env.TELEGRAM_ADMIN_ID || '').trim();
  if (!token || !adminId) return;
  if ((process.env.PLASMA_ROLE || '').toLowerCase() === 'node') return;
  const config = opts.config || {};
  const base = (process.env.BOT_PUBLIC_URL || '').replace(/\/+$/, '') ||
    ((config.forceHttps ? 'https://' : 'http://') + opts.resolvedHost + ':' + config.publicPort);
  const API = 'https://api.telegram.org/bot' + token + '/';
  const GIB = 1024 * 1024 * 1024;
  const fmtGB = (b) => {
    b = Number(b) || 0;
    if (b >= GIB) return (b / GIB).toFixed(2).replace(/\.?0+$/, '') + ' GB';
    if (b >= 1048576) return Math.round(b / 1048576) + ' MB';
    return Math.round(b / 1024) + ' KB';
  };
  const daysLeft = (u) => (u.expiresAt ? Math.max(0, Math.ceil((u.expiresAt - Date.now()) / 86400000)) : null);
  const statusFa = (u) => (!u.enabled ? '🔴 غیرفعال' : (!BkUsers.isAllowed(u) ? '🔴 قطع (حجم/زمان)' : '🟢 فعال'));
  const userText = (u) => {
    const dl = daysLeft(u);
    const quota = u.quotaBytes > 0 ? fmtGB(u.quotaBytes) : 'نامحدود';
    const pct = u.quotaBytes > 0 ? Math.min(100, Math.round((u.usedBytes || 0) / u.quotaBytes * 100)) : 0;
    return '👤 ' + u.name + '\n' +
      'وضعیت: ' + statusFa(u) + '\n' +
      '📊 مصرف: ' + fmtGB(u.usedBytes || 0) + ' از ' + quota + (u.quotaBytes > 0 ? ' (' + pct + '٪)' : '') + '\n' +
      '⏳ زمان: ' + (dl === null ? 'نامحدود' : dl + ' روز مانده');
  };
  const mainKb = () => ({ inline_keyboard: [
    [{ text: '📊 گزارش کلی', callback_data: 'report' }],
    [{ text: '👥 اشتراک‌ها', callback_data: 'users' }, { text: '➕ ساخت اشتراک', callback_data: 'new' }],
    [{ text: '🖥 وضعیت نودها', callback_data: 'nodes' }]
  ]});
  async function tg(method, body) {
    const r = await fetch(API + method, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => null);
    if (!j || !j.ok) throw new Error('Telegram ' + method + ': ' + ((j && j.description) || ('HTTP ' + r.status)));
    return j.result;
  }
  const send = (chatId, text, kb) => tg('sendMessage', { chat_id: chatId, text, reply_markup: kb || mainKb() }).catch(e => Logger.warn('Telegram bot: ' + e.message));
  const flows = new Map();
  function showUsers(chatId) {
    const users = BkUsers.list();
    if (!users.length) return send(chatId, 'هنوز اشتراکی ساخته نشده.');
    const kb = users.slice(0, 30).map(u => [{ text: u.name + ' • ' + fmtGB(u.usedBytes || 0) + (BkUsers.isAllowed(u) && u.enabled ? '' : ' 🔴'), callback_data: 'u:' + u.id }]);
    kb.push([{ text: '🏠 منوی اصلی', callback_data: 'menu' }]);
    return send(chatId, '👥 اشتراک‌ها (' + users.length + '):', { inline_keyboard: kb });
  }
  function showUser(chatId, id) {
    const u = BkUsers.list().find(x => x.id === id);
    if (!u) return send(chatId, 'این اشتراک دیگه وجود نداره.');
    const kb = { inline_keyboard: [
      [{ text: '➕ ۱۰ گیگ', callback_data: 'addgb:' + id }, { text: '➕ ۳۰ روز', callback_data: 'adddays:' + id }],
      [{ text: '🔄 ریست مصرف', callback_data: 'reset:' + id }, { text: u.enabled ? '⏸ غیرفعال' : '▶️ فعال', callback_data: 'toggle:' + id }],
      [{ text: '🔗 ارسال لینک اشتراک', callback_data: 'link:' + id }],
      [{ text: '🗑 حذف', callback_data: 'del:' + id }, { text: '🔙 لیست', callback_data: 'users' }]
    ]};
    return send(chatId, userText(u), kb);
  }
  function showReport(chatId) {
    const users = BkUsers.list();
    const active = users.filter(u => BkUsers.isAllowed(u)).length;
    const sumUsed = users.reduce((s, u) => s + (u.usedBytes || 0), 0);
    let traffic = '';
    try {
      const snap = BkTraffic.snapshot();
      if (snap && snap.ok) traffic = '\n📈 ترافیک کل این ماه: ' + fmtGB(snap.month.used || 0) + '\n📅 ترافیک امروز: ' + fmtGB((snap.day.total != null ? snap.day.total : (snap.day.up || 0) + (snap.day.down || 0)) || 0);
    } catch (_) {}
    const nodes = BkNodes.list();
    const nodesTxt = nodes.length ? nodes.map(n => '\n🖥 ' + n.name + ' ' + (n.flag || '') + ': ' + (Date.now() - (n.lastSeen || 0) < 180000 ? '🟢 آنلاین' : '🔴 آفلاین')).join('') : '\n🖥 نودی ثبت نشده';
    return send(chatId, '📊 گزارش Plasma\n👥 اشتراک‌ها: ' + users.length + ' (فعال: ' + active + ')\n💾 مجموع مصرف اشتراک‌ها: ' + fmtGB(sumUsed) + traffic + nodesTxt + '\n⏱ آپتایم: ' + Math.floor(process.uptime() / 60) + ' دقیقه');
  }
  function showNodes(chatId) {
    const nodes = BkNodes.list();
    if (!nodes.length) return send(chatId, '🖥 هیچ نودی ثبت نشده.\nنود فنلاند رو روشن کنی خودش اینجا میاد.');
    const txt = nodes.map(n => '🖥 ' + n.name + ' ' + (n.flag || '') + '\nآدرس: ' + n.host + ':' + n.port + '\nوضعیت: ' + (Date.now() - (n.lastSeen || 0) < 180000 ? '🟢 آنلاین' : '🔴 آفلاین (آخرین تماس: ' + Math.round((Date.now() - (n.lastSeen || 0)) / 60000) + ' دقیقه پیش)')).join('\n\n');
    return send(chatId, txt);
  }
  const changed = () => { if (opts.reloadEngines) { try { opts.reloadEngines(); } catch (_) {} } };
  async function handleCallback(q) {
    const chatId = q.message && q.message.chat && q.message.chat.id;
    const data = q.data || '';
    tg('answerCallbackQuery', { callback_query_id: q.id }).catch(() => {});
    if (!chatId) return;
    const [cmd, arg] = data.split(':');
    if (cmd === 'menu') return send(chatId, 'منوی اصلی Plasma:');
    if (cmd === 'report') return showReport(chatId);
    if (cmd === 'users') return showUsers(chatId);
    if (cmd === 'nodes') return showNodes(chatId);
    if (cmd === 'new') { flows.set(chatId, { step: 'name' }); return send(chatId, '➕ ساخت اشتراک جدید\nاسم اشتراک رو بفرست (مثلاً: علی):', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'menu' }]] }); }
    if (cmd === 'u') return showUser(chatId, arg);
    if (cmd === 'link') {
      const u = BkUsers.list().find(x => x.id === arg);
      if (u) await send(chatId, '🔗 لینک اشتراک «' + u.name + '»:\n' + base + '/u/' + u.token + '\n\nلینک Clash:\n' + base + '/u/' + u.token + '/clash');
      return;
    }
    if (cmd === 'addgb') { BkUsers.update(arg, { addGB: 10 }); changed(); await send(chatId, '✅ ۱۰ گیگ اضافه شد.'); return showUser(chatId, arg); }
    if (cmd === 'adddays') { BkUsers.update(arg, { addDays: 30 }); changed(); await send(chatId, '✅ ۳۰ روز اضافه شد.'); return showUser(chatId, arg); }
    if (cmd === 'reset') { BkUsers.update(arg, { resetUsage: true }); changed(); await send(chatId, '✅ مصرف ریست شد.'); return showUser(chatId, arg); }
    if (cmd === 'toggle') { const u = BkUsers.list().find(x => x.id === arg); if (u) { BkUsers.update(arg, { enabled: !u.enabled }); changed(); } return showUser(chatId, arg); }
    if (cmd === 'del') return send(chatId, '⚠️ اشتراک حذف بشه؟ این کار برگشت نداره.', { inline_keyboard: [[{ text: '🗑 بله، حذف کن', callback_data: 'delok:' + arg }], [{ text: '🔙 برگرد', callback_data: 'u:' + arg }]] });
    if (cmd === 'delok') { BkUsers.remove(arg); changed(); await send(chatId, '🗑 اشتراک حذف شد.'); return showUsers(chatId); }
  }
  async function handleMessage(msg) {
    const chatId = msg.chat && msg.chat.id;
    const fromId = msg.from && String(msg.from.id);
    if (!chatId) return;
    if (fromId !== adminId) { await send(chatId, '⛔️ این ربات خصوصیه.'); return; }
    const text = String(msg.text || '').trim();
    const flow = flows.get(chatId);
    if (text === '/start' || text === '/menu') { flows.delete(chatId); return send(chatId, 'سلام 👋 به پنل مدیریت Plasma خوش اومدی.'); }
    if (flow) {
      if (flow.step === 'name') {
        if (text.length < 1) return send(chatId, 'یه اسم بفرست:');
        flow.name = text.slice(0, 60); flow.step = 'gb';
        return send(chatId, 'حجم اشتراک چند گیگ باشه؟ (عدد بفرست، ۰ = نامحدود)', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'menu' }]] });
      }
      if (flow.step === 'gb') {
        const gb = Number(text.replace(/[^\d.]/g, ''));
        if (!isFinite(gb) || gb < 0) return send(chatId, 'فقط عدد بفرست (۰ = نامحدود):');
        flow.gb = gb; flow.step = 'days';
        return send(chatId, 'مدت اشتراک چند روز باشه؟ (عدد بفرست، ۰ = نامحدود)', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'menu' }]] });
      }
      if (flow.step === 'days') {
        const days = Number(text.replace(/[^\d]/g, ''));
        if (!isFinite(days) || days < 0) return send(chatId, 'فقط عدد بفرست (۰ = نامحدود):');
        flows.delete(chatId);
        const u = BkUsers.create({ name: flow.name, quotaGB: flow.gb, days });
        changed();
        await send(chatId, '✅ اشتراک ساخته شد!\n\n' + userText(u) + '\n\n🔗 لینک اشتراک:\n' + base + '/u/' + u.token);
        return showUser(chatId, u.id);
      }
    }
    return send(chatId, 'از منوی زیر استفاده کن:');
  }
  (async () => {
    try {
      const me = await tg('getMe', {});
      Logger.info('Telegram bot connected: @' + (me.username || me.id));
    } catch (e) { Logger.warn('Telegram bot: getMe failed: ' + e.message); }
    let offset = 0;
    for (;;) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 70000);
        const r = await fetch(API + 'getUpdates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offset, timeout: 50, allowed_updates: ['message', 'callback_query'] }), signal: ctrl.signal });
        clearTimeout(timer);
        const j = await r.json().catch(() => null);
        if (!j || !j.ok) { await new Promise(res => setTimeout(res, 5000)); continue; }
        for (const up of j.result) {
          offset = up.update_id + 1;
          try {
            if (up.callback_query) {
              if (String(up.callback_query.from.id) === adminId) await handleCallback(up.callback_query);
            } else if (up.message) await handleMessage(up.message);
          } catch (e) { Logger.warn('Telegram bot update error: ' + e.message); }
        }
      } catch (e) {
        await new Promise(res => setTimeout(res, 5000));
      }
    }
  })();
  Logger.info('Telegram bot started (admin-only management).');
}

async function startGate(userConfig = {}) {
  // 1. Banner & notices
  Logger.banner();
  Logger.renewNotice();

  // 2. Build configuration
  const config = buildConfig(userConfig);
  Logger.section('Configuration');
  Logger.item('Public Port', config.publicPort);
  Logger.item('Panel Path', `/${config.panelPath}`);
  Logger.item('Data Directory', config.paths.dataDir);
  {
    const dInfo = resolveDataDir.info || { source: 'unknown' };
    const onRw = !!(process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_PUBLIC_DOMAIN);
    const vol = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    Logger.info(`Data directory: ${config.paths.dataDir} (${dInfo.source})`);
    if (bkOnReplit() && !process.env.BK_DATA_DIR) {
      Logger.warn('Replit: the published app filesystem resets on every Publish (and on Autoscale restarts).');
      Logger.warn('To keep the same configs/password, add Secrets UUID, PANEL_PASSWORD and SUB_TOKEN (all optional).');
    } else if (onRw && !vol) {
      Logger.warn('No Railway Volume attached: panel password, UUID and configs are reset on every redeploy.');
      Logger.warn('Fix (no variables needed): right-click the service -> Attach Volume (any mount path, e.g. /data).');
    } else if (onRw && vol && path.resolve(config.paths.dataDir) !== path.resolve(vol) && !path.resolve(config.paths.dataDir).startsWith(path.resolve(vol) + path.sep)) {
      Logger.warn(`Data directory is outside the attached volume (${vol}); remove BK_DATA_DIR or point it inside the volume to keep data.`);
    }
  }

  BkTraffic.init(config.paths.dataDir);

  // 3. Persistent state
  const stateMgr = new StateManager(config.paths, config);
  const state = stateMgr.loadOrCreate();
  BkUsers.init(config.paths.dataDir);
  BkActivity.init(config.paths.dataDir, (process.env.PLASMA_ROLE || '').toLowerCase() !== 'node');
  BkUsers.setDefaultUuid(state.uuid);
  BkNodes.init(config.paths.dataDir);
  Logger.item('UUID', bkMask(state.uuid) + (process.env.UUID || process.env.SB_UUID ? ' (from env)' : ' (saved/generated; set UUID to pin it)'));

  // 4. Resolve host / IP
  const resolvedHost = await resolvePublicHost(config, state.publicHost || '');
  stateMgr.setPublicIp(resolvedHost);
  Logger.item('Resolved Host', resolvedHost);

  // 5. Allocate dynamic internal ports
  const allocatedPorts = {};
  if (config.enable.vlessWs) allocatedPorts.vlessWs = await allocatePorts();
  if (config.enable.vlessWsTls) allocatedPorts.vlessWsTls = await allocatePorts();
  if (config.enable.vmessWs || config.enable.vmessWsTls) allocatedPorts.vmessWs = await allocatePorts();
  if (config.enable.trojanGrpcTls) allocatedPorts.trojanGrpcTls = await allocatePorts();
  if (config.enable.vlessHttpUpgrade) allocatedPorts.vlessHu = await allocatePorts();
  if (config.enable.vlessGrpc || config.enable.vlessGrpcTls) allocatedPorts.vlessGrpc = await allocatePorts();
  if (config.enable.vlessGrpcTls) allocatedPorts.vlessGrpcTls = await allocatePorts();
  if (config.enable.vmessHttpUpgrade) allocatedPorts.vmessHu = await allocatePorts();
  if (config.enable.trojanHttpUpgrade) allocatedPorts.trojanHu = await allocatePorts();
  if (config.enable.ssWs) allocatedPorts.ssWs = await allocatePorts();
  if (config.enable.trojanWs) allocatedPorts.trojanWs = await allocatePorts();
  if (config.enable.reality) allocatedPorts.reality = await allocatePorts();
  if (config.enable.shadowTlsVless) allocatedPorts.shadowTls = await allocatePorts();
  if (config.enable.shadowsocks) allocatedPorts.shadowsocks = await allocatePorts();
  if (config.enable.socks) allocatedPorts.socks = await allocatePorts();
  if (config.enable.httpProxy) allocatedPorts.httpProxy = await allocatePorts();
  if (config.enable.vlessXhttp) allocatedPorts.xray = await allocatePorts();

  // 6. Manage Binaries
  Logger.section('Engines & Binaries');
  const binManager = new BinaryManager(config);

  const hasSingBox = await binManager.ensureSingBox();
  let hasXray = false;
  if (config.enable.vlessXhttp || config.enable.ssWs) {
    hasXray = await binManager.ensureXray();
  }
  let hasCloudflared = false;
  if (config.enable.argo) {
    hasCloudflared = await binManager.ensureCloudflared();
  }

  // 7. Start Engine Instances
  let singboxInstance = null;
  if (hasSingBox) {
    singboxInstance = new SingBoxEngine(config, stateMgr, allocatedPorts);
    singboxInstance.start();
  } else {
    Logger.warn('sing-box binary could not be started. (Mock/offline mode active).');
  }

  let xrayInstance = null;
  config.xhttpPort = null;
  config.ssWsPort = null;
  if (hasXray && (allocatedPorts.xray || allocatedPorts.ssWs)) {
    xrayInstance = new XrayEngine(config, stateMgr, { xhttp: allocatedPorts.xray, ssWs: allocatedPorts.ssWs });
    if (xrayInstance.start()) {
      config.xhttpPort = allocatedPorts.xray || null;
      config.ssWsPort = allocatedPorts.ssWs || null;
    } else {
      Logger.warn('Xray-core did not start; VLESS-XHTTP / Shadowsocks-WS links hidden.');
    }
  } else if (config.enable.vlessXhttp || config.enable.ssWs) {
    Logger.warn('VLESS-XHTTP / Shadowsocks-WS enabled but Xray-core is not available; their links are hidden.');
  }

  let argoInstance = null;
  let argoDomain = null;
  if (hasCloudflared && config.enable.argo) {
    argoInstance = new ArgoTunnel(config, config.publicPort);
    argoDomain = await argoInstance.start();
  }

  // 8. Generate share links & subscriptions
  const linkGen = new LinkGenerator(config, stateMgr.state, resolvedHost);
  const compatNodes = linkGen.getAllNodes({ compat: 'v2ray', argoDomain, allowLocalHostLinks: config.allowLocalHostLinks });
  const allNodes = linkGen.getAllNodes({ compat: 'full', argoDomain, allowLocalHostLinks: true });
  const links = compatNodes.map(n => n.uri);
  const clashYaml = linkGen.buildClashMetaYaml(allNodes);
  const singboxJson = linkGen.buildSingBoxClientJson(allNodes);

  stateMgr.setLinks(links, clashYaml, singboxJson);

  // 9. HTTP Panel & TCP multiplexer
  const engineStatusGetter = () => ({
    singbox: !!(singboxInstance && singboxInstance.process && !singboxInstance.process.killed),
    xray: !!(xrayInstance && xrayInstance.process && !xrayInstance.process.killed),
    argo: !!(argoInstance && argoInstance.process && !argoInstance.process.killed)
  });

  // BK_USERS: rebuild engines whenever the set of allowed subscription UUIDs changes
  // (user created/deleted, quota or expiry state changed). Debounced; a few seconds of
  // engine downtime at most, and the router keeps blocking blocked users in the meantime.
  let bkReloadTimer = null;
  const reloadEngines = () => {
    if (bkReloadTimer) return;
    bkReloadTimer = setTimeout(() => {
      bkReloadTimer = null;
      try {
        if (hasSingBox) {
          if (singboxInstance) singboxInstance.stop();
          singboxInstance = new SingBoxEngine(config, stateMgr, allocatedPorts);
          singboxInstance.start();
        }
      } catch (e) { Logger.warn('BK_USERS: sing-box reload failed: ' + e.message); }
      try {
        if (hasXray && (allocatedPorts.xray || allocatedPorts.ssWs)) {
          if (xrayInstance) xrayInstance.stop();
          const xi = new XrayEngine(config, stateMgr, { xhttp: allocatedPorts.xray, ssWs: allocatedPorts.ssWs });
          xrayInstance = xi;
          if (xi.start()) { config.xhttpPort = allocatedPorts.xray || null; config.ssWsPort = allocatedPorts.ssWs || null; }
        }
      } catch (e) { Logger.warn('BK_USERS: Xray reload failed: ' + e.message); }
    }, 500);
    if (bkReloadTimer.unref) bkReloadTimer.unref();
  };
  BkUsers.setOnBlock(() => reloadEngines());

  // ===== Plasma node agent: this instance acts as a remote node of a main panel =====
  if ((process.env.PLASMA_ROLE || '').toLowerCase() === 'node') {
    const nodeMain = (process.env.NODE_MAIN_URL || '').replace(/\/+$/, '');
    const nodeSecret = process.env.PLASMA_NODE_SECRET || '';
    if (nodeMain && nodeSecret) {
      const nodeIdFile = path.join(config.paths.dataDir, 'node-id.txt');
      let nodeId = '';
      try { nodeId = fs.readFileSync(nodeIdFile, 'utf8').trim(); } catch (_) {}
      if (!nodeId) { nodeId = crypto.randomBytes(8).toString('hex'); try { fs.writeFileSync(nodeIdFile, nodeId); } catch (_) {} }
      const nodeName = process.env.NODE_NAME || 'Finland';
      const nodeFlag = process.env.NODE_FLAG || '\u{1F1EB}\u{1F1EE}';
      const nodeHost = process.env.NODE_PUBLIC_HOST || resolvedHost;
      const nodePort = parseInt(process.env.NODE_PUBLIC_PORT || '', 10) || config.publicPort;
      const pending = {};
      BkUsers.setOnUsage((id, bytes) => { pending[id] = (pending[id] || 0) + bytes; });
      const nodeHeaders = { 'x-node-secret': nodeSecret, 'content-type': 'application/json' };
      const nodeCall = async (method, route, body) => {
        const r = await fetch(nodeMain + route, { method, headers: nodeHeaders, body: body ? JSON.stringify(body) : undefined });
        if (!r.ok) throw new Error('main panel HTTP ' + r.status);
        return r.json().catch(() => ({}));
      };
      const nodeRegister = () => nodeCall('POST', '/api/node/register', { id: nodeId, name: nodeName, flag: nodeFlag, host: nodeHost, port: nodePort }).catch(e => Logger.warn('Node agent: register failed: ' + e.message));
      const nodePull = async () => {
        try {
          const j = await nodeCall('GET', '/api/node/bundle');
          if (j && Array.isArray(j.users)) {
            const changed = BkUsers.syncFrom(j.users, j.mainUuid, pending);
            if (changed) { Logger.info('Node agent: user bundle updated from main panel; reloading engines.'); reloadEngines(); }
          }
        } catch (e) { Logger.warn('Node agent: bundle pull failed: ' + e.message); }
      };
      const nodeReport = async () => {
        const ids = Object.keys(pending).filter(id => pending[id] > 0);
        const seen = BkUsers.takeSeen();
        const acts = BkActivity.peekOutbox();
        if (!ids.length && !Object.keys(seen).length && !acts.length) return;
        const snap = {};
        for (const id of ids) snap[id] = pending[id];
        try {
          await nodeCall('POST', '/api/node/usage', { deltas: snap, seen, acts });
          for (const id of ids) { pending[id] -= snap[id]; if (pending[id] <= 0) delete pending[id]; }
          BkActivity.clearOutbox(acts.length);
        } catch (e) {
          BkUsers.mergeSeen(seen);
          Logger.warn('Node agent: usage report failed: ' + e.message);
        }
      };
      Logger.section('Plasma Node');
      Logger.item('Main panel', nodeMain);
      Logger.item('Location', nodeName + ' ' + nodeFlag);
      const t0 = setTimeout(() => { nodeRegister(); nodePull(); }, 4000); if (t0.unref) t0.unref();
      const t1 = setInterval(nodeRegister, 60000); if (t1.unref) t1.unref();
      const t2 = setInterval(nodePull, 30000); if (t2.unref) t2.unref();
      const t3 = setInterval(nodeReport, 45000); if (t3.unref) t3.unref();
    } else {
      Logger.warn('Node agent: PLASMA_ROLE=node but NODE_MAIN_URL / PLASMA_NODE_SECRET missing; agent disabled.');
    }
  }

  startPlasmaTelegramBot({ config, resolvedHost, reloadEngines });

  const { server: expressServer, app: expressApp } = createHttpPanel(config, stateMgr, engineStatusGetter, () => resolvedHost, { reloadEngines });
  const tcpRouter = new TcpRouter(config, allocatedPorts, expressServer, expressApp);
  await tcpRouter.start();

  // 10. Summary
  const panelUrl = (config.forceHttps || bkOnEdgeHost()) && !isIpLiteral(resolvedHost)
    ? `https://${resolvedHost}/${config.panelPath}`
    : `http://${resolvedHost}:${config.publicPort}/${config.panelPath}`;
  Logger.item('Link host / SNI', `${linkGen.host} / ${linkGen.tlsOpt.sni} (port ${linkGen.port}, fp=${linkGen.tlsOpt.fp || 'none'}, alpn=${linkGen.tlsOpt.alpn.join(',') || 'none'})`);
  Logger.section('Plasma Active');
  Logger.item('Host', bkPlatformName());
  Logger.item('Web Panel', panelUrl);

  // Graceful shutdown
  const shutdown = () => {
    Logger.info('Stopping Plasma...');
    if (singboxInstance) singboxInstance.stop();
    if (xrayInstance) xrayInstance.stop();
    if (argoInstance) argoInstance.stop();
    if (tcpRouter) tcpRouter.stop();
    try { BkTraffic.save(); } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return {
    config,
    state: stateMgr.state,
    nodes: compatNodes,
    allNodes,
    panelUrl,
    allocatedPorts,
    tcpRouter,
    singboxInstance,
    xrayInstance,
    argoInstance,
    shutdown
  };
}

// --- Auto-start execution ---
// Some Pterodactyl eggs (e.g. HeavenCloud) load the main file through ts-node
// instead of running it directly; there require.main !== module even though
// this file IS the process entry point, and Plasma would exit 0 silently.
// Fall back to scanning argv for this file's own path.
const _bkEntryIsThisFile = (() => {
  try {
    const _p = require('path');
    return process.argv.slice(1).some((a) => typeof a === 'string' && /\.js$/.test(a) && _p.resolve(a) === __filename);
  } catch (_) { return false; }
})();
if (require.main === module || _bkEntryIsThisFile) {
  startGate(BK_CONFIG).catch(err => {
    console.error('[FATAL] Failed to start Plasma:', err);
    process.exit(1);
  });
}

module.exports = {
  BK_CONFIG,
  startGate
};
