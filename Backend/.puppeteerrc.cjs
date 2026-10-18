/**
 * Do NOT download Chromium during `npm install`. The build image can't fetch it,
 * and PDF export is an optional feature that degrades to HTTP 501 when the
 * browser is absent (xlsx/json export is unaffected). To enable PDF later,
 * provide a Chromium and set PUPPETEER_EXECUTABLE_PATH, then remove this.
 */
module.exports = { skipDownload: true };
