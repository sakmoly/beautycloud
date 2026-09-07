export type InstallBrowserKind =
  | "ios-safari"
  | "ios-chrome"
  | "ios-other"
  | "android-chrome"
  | "android-other"
  | "desktop";

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function detectInstallBrowser(): InstallBrowserKind {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    if (/CriOS/i.test(ua)) return "ios-chrome";
    if (/FxiOS|EdgiOS|OPiOS/i.test(ua)) return "ios-other";
    if (/Safari/i.test(ua)) return "ios-safari";
    return "ios-other";
  }

  if (/Android/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "android-chrome";
    return "android-other";
  }

  return "desktop";
}

export function installGuideTitle(kind: InstallBrowserKind): string {
  switch (kind) {
    case "ios-chrome":
      return "Open in Safari first";
    case "ios-safari":
    case "ios-other":
      return "Add to Home Screen (iPhone)";
    case "android-chrome":
    case "android-other":
      return "Add to Home Screen (Android)";
    default:
      return "Install Beauty Cloud on your phone";
  }
}

export function installGuideSteps(kind: InstallBrowserKind): string[] {
  switch (kind) {
    case "ios-chrome":
      return [
        "On iPhone, Chrome cannot add apps to the home screen — only Safari can.",
        "Copy this page link (button below), then open Safari.",
        "Paste the link in Safari's address bar and open Beauty Cloud.",
        "Tap Share (↑ in a square) at the bottom of Safari.",
        "Scroll the menu and tap Add to Home Screen, then Add.",
      ];
    case "ios-safari":
      return [
        "Make sure you are in Safari (blue compass icon), not Chrome.",
        "Tap Share (↑ in a square) at the bottom of the screen.",
        "Scroll down in the share sheet.",
        "Tap Add to Home Screen.",
        "Tap Add — the Beauty Cloud icon will appear on your home screen.",
      ];
    case "ios-other":
      return [
        "For the best result on iPhone, open this site in Safari.",
        "In Safari: tap Share (↑ in a square) at the bottom.",
        "Choose Add to Home Screen, then Add.",
      ];
    case "android-chrome":
      return [
        "Tap the menu ⋮ (three dots) in the top-right corner of Chrome.",
        "Look for Install app or Add to Home screen (not Bookmark).",
        "If you only see Bookmark, tap ⋮ menu — the home screen option is there.",
        "Confirm — Beauty Cloud will appear as an icon on your home screen.",
      ];
    case "android-other":
      return [
        "Open the browser menu (usually ⋮ three dots).",
        "Choose Add to Home screen or Install app.",
        "This is different from Add bookmark or Add to favorites.",
      ];
    default:
      return [
        "On your phone, open this site in the browser.",
        "iPhone: use Safari → Share → Add to Home Screen.",
        "Android: Chrome menu ⋮ → Install app or Add to Home screen.",
      ];
  }
}
