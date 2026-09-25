import { toPng } from "html-to-image";

export const DASHBOARD_CAPTURE_EXCLUDE_ATTR = "data-dashboard-capture-exclude";

const CAPTURE_EXPAND_ATTR = "data-dashboard-capture-expand";
const SCROLLABLE_OVERFLOW_PATTERN = /(auto|scroll|hidden|clip)/;

const waitForPaint = () => new Promise<void>(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

const waitForAssets = async () => {
  await document.fonts?.ready;
  await waitForPaint();
};

const isHiddenByState = (element: HTMLElement) =>
  Boolean(element.closest('[aria-hidden="true"], [inert]'));

const shouldExpandForCapture = (element: HTMLElement) => {
  if (isHiddenByState(element)) return false;
  const style = window.getComputedStyle(element);
  const clipsOverflow = SCROLLABLE_OVERFLOW_PATTERN.test(
    `${style.overflow} ${style.overflowX} ${style.overflowY}`,
  );
  if (!clipsOverflow) return false;

  return element.scrollHeight > element.clientHeight + 1
    || element.scrollWidth > element.clientWidth + 1;
};

const markScrollableDescendants = (root: HTMLElement) => {
  const marked: HTMLElement[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (!shouldExpandForCapture(element)) continue;
    element.setAttribute(CAPTURE_EXPAND_ATTR, "true");
    marked.push(element);
  }
  return marked;
};

const getBackgroundColor = () => {
  const bodyColor = window.getComputedStyle(document.body).backgroundColor;
  if (bodyColor && bodyColor !== "rgba(0, 0, 0, 0)") return bodyColor;
  return window.getComputedStyle(document.documentElement).backgroundColor || undefined;
};

const createCaptureClone = (element: HTMLElement, width: number, height: number) => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.minHeight = `${height}px`;
  clone.style.height = "auto";

  clone.querySelectorAll<HTMLElement>(`[${DASHBOARD_CAPTURE_EXCLUDE_ATTR}]`)
    .forEach(excluded => { excluded.remove(); });

  clone.querySelectorAll<HTMLElement>(".dashboard-board-message--whole")
    .forEach(message => {
      message.classList.add("is-visible");
      for (const item of message.querySelectorAll<HTMLElement>(
        ".dashboard-board-message__content, .dashboard-board-message__eyebrow, h2, p, footer",
      )) {
        item.style.opacity = "1";
        item.style.transform = "none";
        item.style.animation = "none";
        item.style.transition = "none";
      }
    });

  clone.querySelectorAll<HTMLElement>(`[${CAPTURE_EXPAND_ATTR}]`)
    .forEach(scrollable => {
      scrollable.style.overflow = "visible";
      scrollable.style.overflowX = "visible";
      scrollable.style.overflowY = "visible";
      scrollable.style.height = "auto";
      scrollable.style.maxHeight = "none";
      scrollable.style.width = `${scrollable.scrollWidth}px`;
      scrollable.style.maxWidth = "none";
    });

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.style.transform = "translateX(-200vw)";
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.overflow = "visible";
  host.append(clone);
  document.body.append(host);
  return { clone, host };
};

const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};

export const captureElementAsPng = async (element: HTMLElement, fileName: string) => {
  const marked = markScrollableDescendants(element);
  let host: HTMLElement | null = null;

  try {
    await waitForAssets();

    const width = Math.ceil(Math.max(element.scrollWidth, element.getBoundingClientRect().width));
    const height = Math.ceil(Math.max(element.scrollHeight, element.getBoundingClientRect().height));
    const { clone, host: captureHost } = createCaptureClone(element, width, height);
    host = captureHost;
    await waitForPaint();

    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const dataUrl = await toPng(clone, {
      backgroundColor: getBackgroundColor(),
      cacheBust: true,
      canvasHeight: height * pixelRatio,
      canvasWidth: width * pixelRatio,
      height,
      pixelRatio,
      width,
    });

    downloadDataUrl(dataUrl, fileName);
  } finally {
    host?.remove();
    marked.forEach(item => item.removeAttribute(CAPTURE_EXPAND_ATTR));
  }
};

export const buildDashboardCaptureFileName = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `dashboard-${year}-${month}-${day}.png`;
};
