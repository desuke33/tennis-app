"use client";

import { useEffect, useState } from "react";

// LINE/Facebook/Instagram等のアプリ内蔵ブラウザ(WebView)からのアクセスを検知する。
// GoogleはOAuthログインをこれらの埋め込みブラウザから意図的にブロックするため、
// 分かりにくいGoogle側のエラー画面が出る前に案内する。
const IN_APP_BROWSER_PATTERNS = [
  /\bLine\//i,
  /FBAN|FBAV/i, // Facebook
  /Instagram/i,
  /MicroMessenger/i, // WeChat
  /Twitter/i,
  /; wv\)/i, // 汎用Android WebView
];

function isInAppBrowser(userAgent: string) {
  return IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function InAppBrowserWarning() {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    setDetected(isInAppBrowser(navigator.userAgent));
  }, []);

  if (!detected) return null;

  return (
    <div className="max-w-sm rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
      LINEなどのアプリ内蔵ブラウザからはGoogleログインができません。
      <br />
      画面右上の「•••」などのメニューから「他のブラウザで開く」を選び、
      SafariまたはChromeで開き直してください。
    </div>
  );
}
