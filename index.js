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
  appCss: "/* ====================================================================\n   PLASMA — Modern RTL UI (dark default, light alt theme)\n   ==================================================================== */\n*{box-sizing:border-box;margin:0;padding:0}\n:root{\n  --bg:#0a0e1c; --bg2:#101731; --surface:rgba(255,255,255,.045); --surface2:rgba(255,255,255,.075);\n  --card:#121830; --line:rgba(148,163,255,.16); --txt:#eef0ff; --sub:#b9c0e4; --mut:#8a92ba;\n  --vio:#8b7cf6; --blu:#5ea0ff; --acc:#7c6cf0; --acc2:#4f8cff; --ok:#3ecf8e; --warn:#f5b14c; --bad:#f2708a;\n  --grad:linear-gradient(120deg,#4f8cff,#7c5cff 55%,#c86dd7);\n  --shadow:0 18px 44px -18px rgba(0,0,0,.6);\n  --font:\"Vazirmatn\",Tahoma,\"Segoe UI\",system-ui,-apple-system,sans-serif;\n  --ease:cubic-bezier(.22,1,.36,1); --radius:18px;\n}\nbody.theme-cozy, body[data-theme=\"cozy\"]{\n  --bg:#eef1fb; --bg2:#e2e8fa; --surface:rgba(20,28,70,.05); --surface2:rgba(20,28,70,.09);\n  --card:#ffffff; --line:rgba(50,60,130,.16); --txt:#1b2140; --sub:#47507a; --mut:#6d76a0;\n  --shadow:0 18px 40px -20px rgba(50,60,140,.35);\n}\nhtml{scroll-behavior:smooth}\nbody{\n  min-height:100vh; color:var(--txt); font-family:var(--font); direction:rtl;\n  background:\n    radial-gradient(900px 520px at 12% -8%, rgba(94,160,255,.20), transparent 60%),\n    radial-gradient(820px 560px at 105% 0%, rgba(139,124,246,.22), transparent 55%),\n    radial-gradient(700px 500px at 50% 115%, rgba(200,109,215,.12), transparent 60%),\n    linear-gradient(160deg, var(--bg), var(--bg2));\n  background-attachment:fixed;\n  -webkit-font-smoothing:antialiased; overflow-x:hidden;\n}\na{color:inherit}\nbutton{font-family:inherit;cursor:pointer}\ninput{font-family:inherit}\n::selection{background:rgba(139,124,246,.4)}\n\n/* ---------- ambient ---------- */\n.cinema-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.ambient-glow{position:absolute;width:560px;height:560px;border-radius:50%;filter:blur(130px);opacity:.35;background:#4f6bff;top:-160px;inset-inline-start:-120px;animation:plasmaFloat 24s var(--ease) infinite alternate}\n.ambient-vignette{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(0,0,0,.28))}\n@keyframes plasmaFloat{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.15)}}\n\n.app-container{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:0 18px 90px}\n\n/* ---------- header ---------- */\n.cinema-header{position:sticky;top:0;z-index:60;margin:0 -18px;padding:0 18px;background:color-mix(in srgb, var(--bg) 78%, transparent);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}\n.header-inner{display:flex;align-items:center;gap:18px;min-height:68px;max-width:1180px;margin:0 auto}\n.header-brand{display:flex;align-items:center;gap:12px;text-decoration:none;flex:0 0 auto}\n.brand-icon-box{width:42px;height:42px;border-radius:13px;background:var(--grad);display:grid;place-items:center;color:#fff;box-shadow:0 10px 24px -8px rgba(124,108,240,.7)}\n.brand-icon-box svg{width:24px;height:24px}\n.brand-logo-img{display:none}\n.brand-info{display:flex;flex-direction:column;line-height:1.25}\n.brand-title{font-size:1.12rem;font-weight:800;letter-spacing:.01em}\n.brand-title .white-text, .brand-title .red-text{color:var(--txt)}\n.brand-tagline{font-size:.72rem;color:var(--mut)}\n.header-nav{display:flex;gap:4px;margin-inline-start:auto}\n.nav-link{position:relative;display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:999px;color:var(--sub);text-decoration:none;font-size:.9rem;font-weight:600;transition:background .25s,color .25s}\n.nav-link svg.nav-icon{width:17px;height:17px}\n.nav-link:hover{background:var(--surface2);color:var(--txt)}\n.nav-link.active{background:var(--grad);color:#fff;box-shadow:0 8px 20px -8px rgba(124,108,240,.8)}\n.active-indicator{display:none}\n.header-actions{display:flex;align-items:center;gap:10px;margin-inline-start:8px}\n.theme-toggle-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--sub);font-size:.82rem;font-weight:600;transition:background .25s,color .25s}\n.theme-toggle-btn:hover{background:var(--surface2);color:var(--txt)}\n.theme-svg{width:16px;height:16px}\n.theme-icon-sun{display:none}\nbody.theme-cozy .theme-icon-sun{display:block}\nbody.theme-cozy .theme-icon-moon{display:none}\n.hamburger-btn{display:none;width:42px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--surface);flex-direction:column;align-items:center;justify-content:center;gap:5px}\n.hamburger-bar{display:block;width:18px;height:2px;border-radius:2px;background:var(--txt);transition:transform .3s var(--ease),opacity .3s}\n.hamburger-btn.active .hamburger-bar:nth-child(1){transform:translateY(7px) rotate(45deg)}\n.hamburger-btn.active .hamburger-bar:nth-child(2){opacity:0}\n.hamburger-btn.active .hamburger-bar:nth-child(3){transform:translateY(-7px) rotate(-45deg)}\n\n/* mobile drawer */\n.mobile-drawer{max-height:0;overflow:hidden;transition:max-height .45s var(--ease)}\n.mobile-drawer.open{max-height:420px}\n.drawer-nav{display:flex;flex-direction:column;gap:4px;padding:12px 0 6px}\n.drawer-nav-item{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:13px;color:var(--sub);text-decoration:none;font-weight:600;font-size:.93rem}\n.drawer-nav-item svg.drawer-icon{width:19px;height:19px}\n.drawer-nav-item.active{background:var(--grad);color:#fff}\n.drawer-socials{display:none}\n\n/* mobile bottom nav */\n.mobile-nav-bar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:70;background:color-mix(in srgb, var(--bg) 88%, transparent);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:8px 10px calc(8px + env(safe-area-inset-bottom))}\n.mob-link{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:12px;color:var(--mut);text-decoration:none;font-size:.7rem;font-weight:600;position:relative}\n.mob-link svg.mob-icon{width:21px;height:21px}\n.mob-link.active{color:var(--txt);background:var(--surface2)}\n\n/* ---------- views ---------- */\n.main-content{padding-top:30px}\n.view-page{display:none;animation:plasmaFade .5s var(--ease)}\n.view-page.active{display:block}\n@keyframes plasmaFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}\n\n/* ---------- hero ---------- */\n.hero-section{display:grid;grid-template-columns:1.15fr .85fr;gap:26px;align-items:stretch;margin-bottom:26px}\n.hero-left{display:flex;flex-direction:column;justify-content:center;gap:16px;padding:14px 4px}\n.hero-tag{align-self:flex-start;padding:6px 14px;border-radius:999px;background:rgba(139,124,246,.14);border:1px solid rgba(139,124,246,.3);color:var(--sub);font-size:.72rem;font-weight:700;letter-spacing:.06em}\n.hero-title{font-size:2.6rem;font-weight:850;line-height:1.2}\n.hero-title .accent-red, .accent-red{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}\n.hero-desc{color:var(--sub);line-height:2;font-size:.98rem}\n.hero-btn-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}\n.btn-primary-red{display:inline-flex;align-items:center;gap:9px;padding:13px 26px;border-radius:999px;background:var(--grad);color:#fff;text-decoration:none;font-weight:700;font-size:.95rem;box-shadow:0 16px 32px -12px rgba(124,108,240,.75);transition:transform .3s var(--ease),box-shadow .3s}\n.btn-primary-red:hover{transform:translateY(-2px)}\n.btn-primary-red svg.btn-icon, .btn-secondary-dark svg.btn-icon{width:18px;height:18px}\n.btn-secondary-dark{display:inline-flex;align-items:center;gap:9px;padding:13px 24px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--txt);text-decoration:none;font-weight:600;font-size:.95rem;transition:background .25s}\n.btn-secondary-dark:hover{background:var(--surface2)}\n.hero-right{display:flex}\n.single-hero-card{position:relative;flex:1;border-radius:26px;border:1px solid var(--line);background:linear-gradient(150deg, rgba(94,160,255,.16), rgba(139,124,246,.14) 45%, rgba(200,109,215,.12)), var(--surface);display:flex;align-items:center;justify-content:center;min-height:260px;overflow:hidden}\n.hero-card-glow{position:absolute;width:340px;height:340px;border-radius:50%;background:#7c6cf0;filter:blur(110px);opacity:.35}\n.hero-visual{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff}\n.hero-visual svg{width:92px;height:92px;filter:drop-shadow(0 14px 28px rgba(0,0,0,.4))}\n.hero-visual span{font-size:1.5rem;font-weight:800;letter-spacing:.04em}\n.hero-card-img{display:none}\n.hero-card-badge{position:absolute;bottom:16px;inset-inline-start:16px;display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(10,14,28,.55);color:#e8ecff;font-size:.78rem;font-weight:600;backdrop-filter:blur(8px)}\n.pulse-dot, .status-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 rgba(62,207,142,.5);animation:plasmaPulse 2s infinite}\n@keyframes plasmaPulse{70%{box-shadow:0 0 0 8px rgba(62,207,142,0)}100%{box-shadow:0 0 0 0 rgba(62,207,142,0)}}\n\n/* ---------- location card ---------- */\n.location-preview-section{margin-bottom:26px}\n.location-card{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 24px;box-shadow:var(--shadow)}\n.location-card-left{display:flex;gap:16px;align-items:flex-start}\n.location-pin-wrap{width:50px;height:50px;border-radius:15px;background:var(--grad);display:grid;place-items:center;color:#fff;flex:0 0 auto}\n.location-pin-wrap svg.pin-svg{width:25px;height:25px}\n.location-subtitle{font-size:.7rem;font-weight:700;letter-spacing:.08em;color:var(--mut)}\n.location-name{font-size:1.25rem;font-weight:750;margin:5px 0 10px}\n.location-badges-row{display:flex;gap:7px;flex-wrap:wrap}\n.badge-status-online{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;background:rgba(62,207,142,.13);color:var(--ok);font-size:.76rem;font-weight:700}\n.badge-pill{padding:5px 11px;border-radius:999px;background:var(--surface2);color:var(--sub);font-size:.74rem;font-weight:600}\n.location-card-right{display:flex;flex-direction:column;gap:14px;align-items:flex-end}\n.quick-stats-row{display:flex;gap:12px}\n.quick-stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 18px;text-align:center;min-width:96px}\n.qs-label{display:block;font-size:.68rem;color:var(--mut);font-weight:700;letter-spacing:.05em}\n.qs-value{display:block;font-size:1.05rem;font-weight:800;margin-top:3px;direction:ltr}\n.btn-view-nodes{display:inline-flex;align-items:center;gap:8px;color:var(--blu);text-decoration:none;font-weight:700;font-size:.9rem}\n.btn-view-nodes .arrow{transition:transform .3s var(--ease)}\n.btn-view-nodes:hover .arrow{transform:translateX(-4px)}\n\n/* ---------- features bar ---------- */\n.features-bar-section{margin-bottom:10px}\n.features-bar-card{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}\n.feature-cell{display:flex;gap:13px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:17px 18px}\n.feature-icon-wrap{width:44px;height:44px;border-radius:13px;background:rgba(139,124,246,.14);display:grid;place-items:center;flex:0 0 auto}\n.feature-icon-wrap svg.feat-svg{width:22px;height:22px;stroke:var(--vio)}\n.feat-title{font-weight:750;font-size:.94rem}\n.feat-sub{color:var(--mut);font-size:.79rem;margin-top:2px}\n\n/* ---------- section cards ---------- */\n.subs-container-card, .nodes-container-card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px;box-shadow:var(--shadow)}\n.section-top-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:8px}\n.section-title-wrap{display:flex;align-items:center;gap:11px}\n.red-bar-indicator{width:5px;height:24px;border-radius:3px;background:var(--grad)}\n.section-heading{font-size:1.3rem;font-weight:800}\n.server-status-tag{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:.82rem;color:var(--sub)}\n.server-status-tag b{direction:ltr;color:var(--txt)}\n.subs-caption{color:var(--mut);line-height:2;font-size:.88rem;margin-bottom:18px}\n.server-metrics-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}\n.metric-box{background:var(--surface);border:1px solid var(--line);border-radius:15px;padding:14px 16px;text-align:center}\n.metric-label{display:block;font-size:.72rem;color:var(--mut);font-weight:700}\n.metric-val{display:block;font-size:1rem;font-weight:800;margin-top:5px;direction:ltr;word-break:break-all}\n\n/* protocol toggle */\n.proto-selector-wrap{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin:16px 0}\n.proto-label{font-weight:700;font-size:.9rem;color:var(--sub)}\n.proto-toggle-group{display:inline-flex;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:4px;gap:4px}\n.proto-btn{display:inline-flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--sub);padding:8px 18px;border-radius:999px;font-size:.86rem;font-weight:700;transition:background .25s,color .25s}\n.proto-btn .proto-dot{width:8px;height:8px;border-radius:50%;background:var(--mut)}\n.proto-btn.active{background:var(--grad);color:#fff}\n.proto-btn.active .proto-dot{background:#fff}\n.sub-compat-badge{font-size:.78rem;color:var(--mut)}\n\n/* notice */\n.v2rayng-notice-banner{display:flex;gap:12px;align-items:flex-start;background:rgba(94,160,255,.1);border:1px solid rgba(94,160,255,.28);border-radius:15px;padding:14px 17px;margin:16px 0;line-height:2;font-size:.86rem;color:var(--sub)}\n.v2rayng-notice-banner .notice-icon{flex:0 0 auto;color:var(--blu)}\n.v2rayng-notice-banner strong{color:var(--txt)}\n\n/* subscription rows */\n.sub-items-list{display:flex;flex-direction:column;gap:14px;margin-top:8px}\n.sub-row-card{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px}\n.sub-meta-header{display:flex;flex-direction:column;gap:5px;min-width:200px}\n.sub-client-name{font-weight:800;font-size:1rem;display:flex;align-items:center;gap:9px;flex-wrap:wrap}\n.sub-row-card .sub-caption, .sub-meta-header span{color:var(--mut);font-size:.8rem}\n.badge-recommended, .badge-clash, .badge-singbox, .badge-advanced, .badge-wg{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.68rem;font-weight:800;background:rgba(139,124,246,.18);color:var(--vio);border:1px solid rgba(139,124,246,.3)}\n.badge-clash{background:rgba(94,160,255,.15);color:var(--blu);border-color:rgba(94,160,255,.3)}\n.badge-singbox{background:rgba(62,207,142,.13);color:var(--ok);border-color:rgba(62,207,142,.3)}\n.sub-row-url{flex:1;min-width:240px}\n.sub-row-url input, .node-uri-input{width:100%;background:var(--bg);border:1px solid var(--line);color:var(--sub);border-radius:11px;padding:10px 13px;font-size:.78rem;direction:ltr;text-align:left;outline:none}\n.sub-row-url input:focus, .node-uri-input:focus{border-color:var(--vio)}\n.sub-action-group{display:flex;gap:8px}\n.btn-copy, .btn-qr, .btn-download{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:999px;border:1px solid var(--line);background:var(--grad);color:#fff;font-weight:700;font-size:.85rem;text-decoration:none;transition:transform .25s var(--ease),opacity .25s}\n.btn-qr, .btn-download{background:var(--surface2);color:var(--txt)}\n.btn-copy:hover, .btn-qr:hover, .btn-download:hover{transform:translateY(-1px);opacity:.92}\n.btn-copy svg, .btn-qr svg, .btn-download svg, .btn-action-svg{width:16px;height:16px}\n\n/* ---------- nodes ---------- */\n.nodes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:15px;margin-top:16px}\n.nodes-loading, .no-nodes-msg{grid-column:1/-1;text-align:center;color:var(--mut);padding:34px 10px;line-height:2}\n.spinner{width:34px;height:34px;margin:0 auto 12px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--vio);animation:plasmaSpin 1s linear infinite}\n@keyframes plasmaSpin{to{transform:rotate(360deg)}}\n.node-item-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px;display:flex;flex-direction:column;gap:13px}\n.node-card-header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}\n.node-card-title-group{display:flex;align-items:center;gap:9px;min-width:0}\n.proto-badge{padding:4px 11px;border-radius:999px;font-size:.68rem;font-weight:800;background:rgba(94,160,255,.16);color:var(--blu);direction:ltr}\n.badge-proto-vmess{background:rgba(139,124,246,.18);color:var(--vio)}\n.badge-proto-trojan{background:rgba(242,112,138,.15);color:var(--bad)}\n.badge-proto-ss{background:rgba(245,177,76,.15);color:var(--warn)}\n.badge-proto-wg{background:rgba(62,207,142,.14);color:var(--ok)}\n.badge-proto-tuic{background:rgba(200,109,215,.16);color:#c86dd7}\n.node-remark-title{font-size:.92rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;text-align:end}\n.node-badges-group{display:flex;gap:5px;flex-wrap:wrap}\n.node-badge-tag{padding:3px 9px;border-radius:999px;background:var(--surface2);color:var(--mut);font-size:.66rem;font-weight:700;direction:ltr}\n.badge-reality{color:var(--warn)} .badge-tls{color:var(--ok)}\n.node-card-meta{display:flex;gap:8px;flex-wrap:wrap}\n.node-location-tag{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-size:.8rem}\n.node-location-tag svg.loc-icon{width:14px;height:14px}\n.node-uri-box input{width:100%}\n.node-actions-row{display:flex;gap:8px}\n.btn-node-copy{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px;border:0;border-radius:11px;background:var(--grad);color:#fff;font-weight:700;font-size:.84rem}\n.btn-node-qr, .btn-node-dl{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 15px;border-radius:11px;border:1px solid var(--line);background:var(--surface2);color:var(--txt);font-weight:700;font-size:.84rem;text-decoration:none}\n\n/* ---------- usage (bku) ---------- */\n.bku-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin:16px 0}\n.bku-card{background:var(--surface);border:1px solid var(--line);border-radius:15px;padding:16px 18px}\n.bku-card-label{font-size:.78rem;color:var(--mut);font-weight:700}\n.bku-card-total{font-size:1.45rem;font-weight:850;margin:7px 0 4px;direction:ltr;text-align:end}\n.bku-card-split{display:flex;gap:14px;color:var(--sub);font-size:.8rem;direction:ltr}\n.bku-muted{color:var(--mut);font-size:.74rem}\n.bku-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:15px}\n.bku-table{width:100%;border-collapse:collapse;font-size:.85rem;min-width:640px}\n.bku-table th, .bku-table td{padding:11px 14px;border-bottom:1px solid var(--line);text-align:start;white-space:nowrap}\n.bku-table th{color:var(--mut);font-size:.74rem;background:var(--surface)}\n.bku-table td{direction:ltr;text-align:end}\n.bku-table td:first-child{direction:rtl;text-align:start}\n.bku-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-inline-end:8px}\n.bku-pill{display:inline-block;min-width:24px;text-align:center;padding:2px 8px;border-radius:999px;background:var(--surface2);color:var(--mut);font-weight:700}\n.bku-pill.on{background:rgba(62,207,142,.16);color:var(--ok)}\n.bku-nav-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warn);margin-inline-start:6px}\n.bku-nav-dot.over{background:var(--bad)}\ntfoot td, .bku-table tfoot td{font-weight:800}\n.bku-limit{border:1px solid rgba(245,177,76,.35);background:rgba(245,177,76,.08);border-radius:15px;padding:16px 18px;margin:16px 0}\n.bku-limit.is-over{border-color:rgba(242,112,138,.45);background:rgba(242,112,138,.08)}\n.bku-limit-top{display:flex;justify-content:space-between;font-weight:700;font-size:.9rem;direction:ltr}\n.bku-bar{height:9px;border-radius:99px;background:var(--surface2);overflow:hidden;margin:11px 0;direction:ltr}\n.bku-bar-fill{height:100%;border-radius:99px;background:var(--grad);transition:width .6s var(--ease)}\n.bku-limit.is-warn .bku-bar-fill{background:linear-gradient(90deg,#f5b14c,#f28c4c)}\n.bku-limit.is-over .bku-bar-fill{background:linear-gradient(90deg,#f2708a,#e5486c)}\n.bku-limit-msg{color:var(--sub);font-size:.84rem}\n.bku-note{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 17px;color:var(--sub);line-height:2.1;font-size:.85rem;margin:16px 0}\n.bku-fa{direction:rtl}\n.bku-actions{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;margin-top:14px}\n.bku-sync{display:flex;align-items:center;gap:9px;flex-wrap:wrap;color:var(--sub);font-size:.86rem}\n.bku-sync input{width:130px;background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:9px 12px;direction:ltr;outline:none}\n.bku-btn{padding:10px 20px;border:0;border-radius:999px;background:var(--grad);color:#fff;font-weight:700;font-size:.86rem}\n.bku-btn-soft{background:var(--surface2);color:var(--txt);border:1px solid var(--line)}\n.bku-btn[disabled]{opacity:.55;cursor:wait}\n.bku-foot-meta{margin-top:13px;color:var(--mut);font-size:.76rem;direction:ltr;text-align:end}\n\n/* ---------- footer ---------- */\n.cinema-footer{margin-top:34px;text-align:center;color:var(--mut);font-size:.83rem;line-height:2}\n.footer-links-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}\n.footer-links-row a{color:var(--sub);text-decoration:none}\n.footer-subtext{color:var(--mut)}\n\n/* ---------- modal & toast ---------- */\n.cinema-modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(4,6,16,.72);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:18px}\n.cinema-modal-backdrop.active{display:flex}\n.cinema-modal-box{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px;max-width:360px;width:100%;text-align:center;box-shadow:var(--shadow)}\n.modal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}\n.modal-top h3, #qrModalTitle{font-size:1.05rem;font-weight:800}\n.btn-close-modal{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--txt);font-size:1.05rem;line-height:1}\n#qrcodeWrapper{display:grid;place-items:center;background:#fff;border-radius:16px;padding:16px;margin-bottom:14px}\n#qrcodeWrapper img{display:block;max-width:100%}\n.qr-notice, .modal-center{color:var(--mut);font-size:.83rem;line-height:1.9}\n.cinema-toast{position:fixed;bottom:26px;left:50%;transform:translate(-50%,20px);z-index:120;background:var(--card);border:1px solid var(--line);color:var(--txt);padding:12px 24px;border-radius:999px;font-size:.88rem;font-weight:700;opacity:0;pointer-events:none;transition:opacity .35s var(--ease),transform .35s var(--ease);box-shadow:var(--shadow)}\n.cinema-toast.show{opacity:1;transform:translate(-50%,0)}\n\n/* hidden legacy blocks (socials removed from markup; keep classes harmless) */\n.header-sponsor-link, .header-tg-link, .header-yt-btn, .footer-sponsor-link, .sponsor-tag, .sponsor-title, .sponsor-pill, .tg-svg, .yt-svg{display:none}\n\n/* ---------- responsive ---------- */\n@media (max-width:1024px){\n  .features-bar-card{grid-template-columns:repeat(2,1fr)}\n  .bku-cards{grid-template-columns:1fr}\n  .server-metrics-strip{grid-template-columns:repeat(2,1fr)}\n}\n@media (max-width:860px){\n  .header-nav{display:none}\n  .hamburger-btn{display:flex}\n  .hero-section{grid-template-columns:1fr}\n  .hero-title{font-size:2rem}\n  .location-card-right{align-items:flex-start}\n  .app-container{padding-bottom:110px}\n  .mobile-nav-bar{display:flex}\n  .theme-toggle-label{display:none}\n}\n@media (max-width:520px){\n  .features-bar-card{grid-template-columns:1fr}\n  .subs-container-card, .nodes-container-card{padding:19px}\n  .sub-row-card{flex-direction:column;align-items:stretch}\n  .quick-stats-row{flex-wrap:wrap}\n}\n@media (prefers-reduced-motion:reduce){\n  *,*:before,*:after{animation:none!important;transition:none!important}\n}\n\n\n/* ====================================================================\n   PLASMA v3 — premium TitanDesk-inspired overrides (dark theme)\n   ==================================================================== */\n:root{\n  --bg:#060913; --bg2:#0b1122;\n  --surface:rgba(255,255,255,.05); --surface2:rgba(255,255,255,.09);\n  --card:#0d1430; --line:rgba(150,140,255,.20);\n  --vio:#8b7cff; --blu:#5ea0ff; --acc:#7c5cff; --acc2:#4f8cff;\n  --grad:linear-gradient(120deg,#4f8cff,#7c5cff 52%,#c86dd7);\n  --shadow:0 24px 54px -20px rgba(2,4,16,.75);\n  --radius:20px;\n}\nbody:not(.theme-cozy):not([data-theme=\"cozy\"]){\n  background:\n    radial-gradient(1000px 560px at 8% -10%, rgba(94,160,255,.16), transparent 60%),\n    radial-gradient(900px 620px at 108% -4%, rgba(124,92,255,.26), transparent 55%),\n    radial-gradient(760px 520px at 50% 118%, rgba(45,212,191,.10), transparent 60%),\n    linear-gradient(165deg, var(--bg), var(--bg2));\n  background-attachment:fixed;\n}\n.node-item-card,.subs-container-card,.nodes-container-card,.location-card,.cinema-modal-box{border-radius:22px;box-shadow:var(--shadow)}\n.feature-cell{border-radius:20px;transition:transform .3s var(--ease),border-color .3s}\n.feature-cell:hover{transform:translateY(-3px);border-color:rgba(150,140,255,.4)}\n.node-item-card{transition:transform .3s var(--ease),border-color .3s}\n.node-item-card:hover{transform:translateY(-3px);border-color:rgba(150,140,255,.4)}\n.btn-primary-red:hover{transform:translateY(-2px)}\n.nav-link{border-radius:12px;transition:background .25s,color .25s}\n::selection{background:rgba(124,92,255,.45);color:#fff}\n::-webkit-scrollbar{width:10px;height:10px}\n::-webkit-scrollbar-track{background:transparent}\n::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7c5cff,#4f8cff);border-radius:99px;border:2px solid var(--bg)}\n",
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
          ...this.bkUserUuids().map(u => ({ uuid: u, alterId: 0 }))
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
          ...this.bkUserUuids().map(u => ({ uuid: u, flow: '' }))
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
          ...this.bkUserUuids().map(u => ({ uuid: u, flow: '' }))
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
          ...this.bkUserUuids().map(u => ({ uuid: u, flow: '' }))
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
        users: this.bkUserUuids().map(u => ({ uuid: u, alterId: 0 })),
        transport: { type: 'httpupgrade', path: BK_PATHS.vmessHu }
      });
    }

    // 3c. Trojan + HTTPUpgrade local inbound
    if (enable.trojanHttpUpgrade && this.ports.trojanHu) {
      inbounds.push({
        type: 'trojan', tag: 'trojan-hu-in', listen: '127.0.0.1', listen_port: this.ports.trojanHu,
        users: this.bkUserUuids().map(u => ({ password: u })),
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
            ...this.bkUserUuids().map(u => ({ uuid: u, flow: '' }))
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
          ...this.bkUserUuids().map(u => ({ password: u }))
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
          ...this.bkUserUuids().map(u => ({ password: u }))
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
          ...this.bkUserUuids().map(u => ({ uuid: u, flow: '' }))
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
        users: this.bkUserUuids().map(u => ({ uuid: u, flow: '' })),
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
        settings: { clients: this.bkUserUuids().map(u => ({ id: u, level: 0 })), decryption: 'none' },
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
      log: { loglevel: 'warning' },
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
      '--font:Vazirmatn,Tahoma,"Segoe UI",sans-serif}' +
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
      'h1{margin:14px 0 6px;font-size:1.55rem;font-weight:800;line-height:1.4}h1 span{background:linear-gradient(90deg,#9cc3ff,#c3b5ff 55%,#ffb1c3);-webkit-background-clip:text;background-clip:text;color:transparent}' +
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
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%238b7cf6\' d=\'M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z\'/%3E%3C/svg%3E"><style>' + css + '</style></head><body>' +
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
    const savedRelay = (stateManager.state.publicHost && !bkIsPlatformHost(stateManager.state.publicHost)) ? stateManager.state.publicHost : '';
    if (savedRelay && (!reqOk || bkIsPlatformHost(reqHost))) return savedRelay; // relay / custom domain learned earlier beats the platform domain
    if (config.domain && (!reqOk || reqHost === config.domain || bkIsPlatformHost(reqHost))) return config.domain;
    if (reqOk) {
      // All callers sit behind authMiddleware, so only real panel/subscription visits get here.
      if (stateManager.state.publicHost !== reqHost) {
        stateManager.state.publicHost = reqHost;
        stateManager.save();
        Logger.info(`Public domain learned from request Host: ${reqHost} (saved; used for links, no redeploy needed)`);
      }
      return reqHost;
    }
    if (stateManager.state.publicHost) return stateManager.state.publicHost;
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
    res.json({ ok: true, mainUuid: stateManager.state.uuid, users: BkUsers.list().map(u => ({ id: u.id, tag: u.tag, name: u.name, uuid: u.uuid, token: u.token, quotaBytes: u.quotaBytes || 0, usedBytes: u.usedBytes || 0, expiresAt: u.expiresAt || 0, enabled: u.enabled !== false, createdAt: u.createdAt || 0 })) });
  });
  app.post('/api/node/usage', bkNodeAuth, express.json({ limit: '64kb' }), (req, res) => {
    const d = (req.body && req.body.deltas) || {};
    let applied = 0;
    for (const id of Object.keys(d)) {
      const b = Math.floor(Number(d[id]) || 0);
      if (b > 0 && BkUsers.find(id)) { BkUsers.addUsage(id, b, 0); applied += b; }
    }
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
    const total = user.quotaBytes > 0 ? user.quotaBytes : 1099511627776;
    const expire = user.expiresAt ? Math.floor(user.expiresAt / 1000) : 1893456000;
    res.setHeader('Subscription-Userinfo', `upload=0; download=${user.usedBytes || 0}; total=${total}; expire=${expire}`);
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
    // Set 1 TB total traffic and future expiry (v2rayNG rejects total=0 as expired quota)
    res.setHeader('Subscription-Userinfo', 'upload=1073741824; download=2147483648; total=1099511627776; expire=1893456000');

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

  function addUsage(id, up, down) {
    const u = find(id);
    if (!u || (!up && !down)) return;
    const was = isAllowed(u);
    u.usedBytes = (u.usedBytes || 0) + up + down;
    if (onUsage) { try { onUsage(u.id, up + down); } catch (_) {} }
    saveSoon();
    if (was && !isAllowed(u)) { u._wasAllowed = false; blockTransition(u, 'traffic quota reached'); }
  }

  /** Count bytes on a proxied pair (client <-> backend) for one user; mirrors BkTraffic.meter. */
  function meter(id, client, backend) {
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
      data.users = (remoteUsers || []).map(u => ({
        id: u.id, tag: u.tag, name: u.name, uuid: u.uuid, token: u.token || '',
        quotaBytes: u.quotaBytes || 0,
        usedBytes: (u.usedBytes || 0) + (pend[u.id] || 0),
        expiresAt: u.expiresAt || 0, enabled: u.enabled !== false,
        createdAt: u.createdAt || 0, _wasAllowed: true
      }));
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
        usedBytes: 0, enabled: true, createdAt: Date.now(), _wasAllowed: true
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
    expiresAt: v.expiresAt || 0, createdAt: v.createdAt || 0, allowed: !!v.allowed
  }).replace(/</g, '\\u003c');
  const cfgJson = JSON.stringify((nodes || []).map(n => ({ name: n.name || '', type: n.type || '', uri: n.uri || '' })).filter(n => n.uri)).replace(/</g, '\\u003c');
  const subJson = JSON.stringify({ main: subUrl, raw: subUrl + '/raw', clash: subUrl + '/clash', sb: subUrl + '/sb' }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<title>اطلاعات اشتراک | Plasma</title>
<style>
*{box-sizing:border-box}html{background:#060913}body{font-family:Vazirmatn,Tahoma,sans-serif;background:radial-gradient(1000px 560px at 8% -10%,rgba(94,160,255,.15),transparent 60%),radial-gradient(900px 620px at 108% -4%,rgba(124,92,255,.25),transparent 55%),radial-gradient(760px 520px at 50% 118%,rgba(45,212,191,.09),transparent 60%),linear-gradient(165deg,#060913,#0b1122);color:#eef0ff;margin:0;padding:26px 16px 44px;min-height:100vh}
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
.pov-n{font-size:1.08rem;font-weight:850;line-height:1.2}
.pov-t{font-size:10.5px;opacity:.62;margin-top:1px}
.pov-wrap a{text-decoration:none;color:inherit;transition:transform .25s}
.pov-wrap a:hover{transform:translateY(-2px)}
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
*{box-sizing:border-box}html{background:#060913}body{font-family:Vazirmatn,Tahoma,sans-serif;background:radial-gradient(1000px 560px at 8% -10%,rgba(94,160,255,.15),transparent 60%),radial-gradient(900px 620px at 108% -4%,rgba(124,92,255,.25),transparent 55%),radial-gradient(760px 520px at 50% 118%,rgba(45,212,191,.09),transparent 60%),linear-gradient(165deg,#060913,#0b1122);color:#eef0ff;margin:0;padding:24px;min-height:100vh}
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
 tr.children[0].innerHTML = '<b>'+esc(u.name)+'</b><div class="mut">'+esc(u.tag)+'</div>';
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
 c.appendChild(btn('ریست مصرف', function(){ if(confirm('مصرف این اشتراک صفر شود؟')) post(u.id+'/reset',{}); }, 'soft'));
 c.appendChild(btn(u.enabled?'غیرفعال':'فعال', function(){ post(u.id+'/toggle',{}); }, 'soft'));
 c.appendChild(btn('حذف', function(){ if(confirm('این اشتراک حذف شود؟')) post(u.id+'/delete',{}); }, 'red'));
 tb.appendChild(tr); }); }
function mkLink(t,href){ var a=document.createElement('a'); a.href=href; a.textContent=t; a.target='_blank'; return a; }
function btn(t,f,cls){ var b=document.createElement('button'); b.textContent=t; if(cls)b.className=cls; b.onclick=f; return b; }
function post(path, body){ fetch(API+'/'+path,{method:'POST',headers:H(),body:JSON.stringify(body||{})}).then(function(){ load(); }); }
function exportAll(){ if(!ALL.length){ toast('اشتراکی نیست'); return; } var lines=ALL.map(function(u){ return u.name+': '+location.origin+u.sub; }); copyText(lines.join('\\n'), 'لینک همه اشتراک‌ها کپی شد ('+ALL.length+')'); }
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
async function resolvePublicHost(config, savedHost) {
  if (config.forceHost) return config.forceHost;
  const explicitDomain = normalizeHost(process.env.DOMAIN || process.env.SB_DOMAIN || '');
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
        if (!ids.length) return;
        const snap = {};
        for (const id of ids) snap[id] = pending[id];
        try {
          await nodeCall('POST', '/api/node/usage', { deltas: snap });
          for (const id of ids) { pending[id] -= snap[id]; if (pending[id] <= 0) delete pending[id]; }
        } catch (e) { Logger.warn('Node agent: usage report failed: ' + e.message); }
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
if (require.main === module) {
  startGate(BK_CONFIG).catch(err => {
    console.error('[FATAL] Failed to start Plasma:', err);
    process.exit(1);
  });
}

module.exports = {
  BK_CONFIG,
  startGate
};
