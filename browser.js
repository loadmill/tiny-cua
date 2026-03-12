import { chromium } from "playwright";
import path from "path";

export const display_width = 800;
export const display_height = 800;

export async function launchBrowser(saveHar) {
  const browser = await chromium.launch({
    headless: false,
    chromiumSandbox: true,
    env: { DISPLAY: ":0" },
    args: [`--window-size=${display_width},${display_height}`, "--disable-extensions", "--disable-file-system"],
  });

  const timestamp = Date.now();
  const harPath = path.join(process.cwd(), `cua-session-${timestamp}.har`);

  const context = await browser.newContext({
    recordHar: saveHar ? { path: harPath, content: "embed"} : undefined,
    viewport: {  width: display_width, height: display_height },
  });

  const page = await context.newPage();

  return { browser, context, page};
}
