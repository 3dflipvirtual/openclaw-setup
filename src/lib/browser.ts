import { chromium, type Browser } from "playwright";

let browserInstance: Browser | null = null;

const GLOBAL_BROWSER_ENABLED =
  (process.env.BROWSER_ENABLED ?? "").toLowerCase() === "true";

export async function launchBrowser(): Promise<Browser> {
  if (!GLOBAL_BROWSER_ENABLED) {
    throw new Error("Browser control is globally disabled (BROWSER_ENABLED=false).");
  }

  if (!browserInstance) {
    console.log("[browser] Launching Chromium...");
    browserInstance = await chromium.launch({ headless: true });
    console.log("[browser] Chromium launched.");
  }

  return browserInstance;
}

export async function searchAndExtract(query: string): Promise<string> {
  if (!GLOBAL_BROWSER_ENABLED) {
    throw new Error("Browser control is globally disabled (BROWSER_ENABLED=false).");
  }

  const browser = await launchBrowser();
  const page = await browser.newPage();

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  console.log("[browser] Opening URL:", url);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const text = await page.innerText("body").catch(() => "");
  console.log(
    "[browser] Extracted text length:",
    text ? text.length : 0
  );

  await page.close();

  return (text || "").slice(0, 4000);
}

