import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { strToU8, zipSync } from "fflate";
import { Buffer } from "node:buffer";

test("@claim:demo-sandbox sample data loads in an isolated demo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Try it with sample data" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByText("Demo — sample data, nothing is saved"),
  ).toBeVisible();
  await expect(page.locator(".ledger-row")).toHaveCount(5);
  expect(
    await page.evaluate(() => localStorage.getItem("epub-bridge:ledger:v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator(".ledger-row")).toHaveCount(5);
});

test("@claim:portable-export exports every demo note as JSON and Markdown", async ({
  page,
}) => {
  await page.goto("/demo");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const json = JSON.parse(
    await (await jsonDownload).createReadStream().then(async (stream) => {
      let value = "";
      for await (const chunk of stream) value += chunk.toString();
      return value;
    }),
  );
  expect(json.annotations).toHaveLength(5);
  expect(json.annotations[0].cfi).toMatch(/^epubcfi/);
  const mdDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  const stream = await (await mdDownload).createReadStream();
  let markdown = "";
  for await (const chunk of stream) markdown += chunk.toString();
  expect(markdown).toContain("# Annotation ledger");
  expect(markdown.match(/^> /gm)).toHaveLength(5);
});

test("@claim:local-processing demo sends no reading data off site", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173")
      external.push(request.url());
  });
  await page.goto("/demo");
  await page.getByLabel("Filter notes").fill("Walden");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect(external).toEqual([]);
});

test("@claim:offline-export saved demo reloads and exports offline", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:4173/demo");
    await page
      .waitForFunction(
        () => navigator.serviceWorker?.controller !== null,
        null,
        { timeout: 10_000 },
      )
      .catch(async () => {
        await page.reload();
      });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".ledger-row")).toHaveCount(5);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    expect((await download).suggestedFilename()).toBe("annotation-ledger.json");
  } finally {
    await context.close();
  }
});

test("@claim:epub-quote-match finds an unmatched quote in an EPUB chapter", async ({
  page,
}) => {
  const quote =
    "A person should keep a portable record of every careful reading.";
  const epub = zipSync({
    "META-INF/container.xml": strToU8(
      '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
    ),
    "OPS/book.opf": strToU8(
      '<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>The Portable Reader</dc:title><dc:creator>A. Reader</dc:creator></metadata><manifest><item id="chapter" href="chapter.xhtml"/></manifest><spine><itemref idref="chapter"/></spine></package>',
    ),
    "OPS/chapter.xhtml": strToU8(
      `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Margin Notes</title></head><body><h1>Margin Notes</h1><p>${quote}</p></body></html>`,
    ),
  });
  await page.goto("/ledger");
  await page
    .locator("#epub-input")
    .setInputFiles({
      name: "portable-reader.epub",
      mimeType: "application/epub+zip",
      buffer: Buffer.from(epub),
    });
  await page.locator("#annotation-input").setInputFiles({
    name: "notes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `Book Title,Author,Chapter,Highlight,Annotation,Date\nThe Portable Reader,A. Reader,,${quote},Keep this,2026-08-20`,
    ),
  });
  await expect(page.locator(".ledger-row")).toHaveCount(1);
  await expect(page.locator(".ledger-row")).toContainText("Quote matched");
  await expect(page.locator(".ledger-row")).toContainText("Margin Notes");
  await expect(page.locator(".ledger-row code")).toContainText("epubcfi");
});

test("@claim:license-verify accepts a valid desktop license response", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    });
  });
  await page.route("https://api.sociobot.in/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"valid":true,"reason":"ok","expires_at":null}',
    }),
  );
  await page.goto("/download?license=test-license-token");
  await expect(page.locator("#license-status")).toHaveText("License active");
  await page.goto("/ledger");
  await expect(
    page.getByRole("button", { name: "Choose folders" }),
  ).toBeVisible();
});

test("@claim:release-fallback caches a release and shows a fallback when GitHub is unavailable", async ({
  page,
}) => {
  let requests = 0;
  const release = {
    tag_name: "v0.1.0",
    html_url:
      "https://github.com/B-Divyesh/sf-epub-annotation-bridge/releases/tag/v0.1.0",
    assets: [
      {
        name: "epub-annotation-bridge_0.1.0_amd64.AppImage",
        browser_download_url:
          "https://example.test/epub-annotation-bridge.AppImage",
      },
      {
        name: "epub-annotation-bridge_0.1.0_x64.msi",
        browser_download_url: "https://example.test/epub-annotation-bridge.msi",
      },
      {
        name: "epub-annotation-bridge_0.1.0_x64.dmg",
        browser_download_url: "https://example.test/epub-annotation-bridge.dmg",
      },
    ],
  };
  const releasesUrl = "**/repos/B-Divyesh/sf-epub-annotation-bridge/releases**";
  await page.route(
    releasesUrl,
    async (route) => {
      requests += 1;
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify([release]),
      });
    },
  );
  await page.goto("/download");
  const platform = await page.evaluate(() =>
    /Mac/i.test(navigator.userAgent)
      ? "macOS"
      : /Win/i.test(navigator.userAgent)
        ? "Windows"
        : "Linux",
  );
  await expect(
    page.getByRole("link", { name: `Download for ${platform}` }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: `Download for ${platform}` }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await page.unroute(releasesUrl);
  await page.route(
    releasesUrl,
    (route) => route.abort(),
  );
  await page.evaluate(() => localStorage.removeItem("epub-bridge:release"));
  await page.reload();
  await expect(page.getByText("Downloads are being published.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open the release page/ }),
  ).toBeVisible();
});

test("filtering hides nonmatching annotations and explains the empty result", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByLabel("Filter notes").fill("no result exists");
  await expect(page.locator(".ledger-row:visible")).toHaveCount(0);
  await expect(page.locator("#filter-status")).toHaveText(
    "No annotations match this filter.",
  );
  await page.getByLabel("Filter notes").fill("Walden");
  await expect(page.locator(".ledger-row:visible")).toHaveCount(2);
});

test("@claim:checkout-registration keeps an unavailable checkout from sending visitors to a broken URL", async ({
  page,
}) => {
  const checkoutRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/checkout")) checkoutRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByText("Checkout is being registered")).toBeVisible();
  await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0);
  expect(checkoutRequests).toEqual([]);
});

test("a malformed EPUB is rejected and a valid import remains available", async ({
  page,
}) => {
  await page.goto("/ledger");
  await page
    .locator("#epub-input")
    .setInputFiles({
      name: "broken.epub",
      mimeType: "application/epub+zip",
      buffer: Buffer.from("not a zip"),
    });
  await page
    .locator("#annotation-input")
    .setInputFiles({
      name: "notes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Book Title,Highlight\nWalden,A valid note"),
    });
  await expect(page.locator("#desk-status")).toContainText(
    "not a readable EPUB archive",
  );
  await page.locator("#epub-input").setInputFiles([]);
  await page
    .locator("#annotation-input")
    .setInputFiles({
      name: "recovered.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Book Title,Highlight\nWalden,A valid note"),
    });
  await expect(page.locator(".ledger-row")).toHaveCount(1);
});

test("pages meet the serious accessibility baseline", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  for (const path of [
    "/",
    "/demo",
    "/download",
    "/privacy",
    "/terms",
    "/missing",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/EPUB Annotation Bridge/);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(
      results.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact || ""),
      ),
      `${path}: ${JSON.stringify(results.violations)}`,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  const enlargedOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(enlargedOverflow).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole("link", { name: /EPUB Annotation Bridge/ }),
  ).toBeVisible();
  for (const name of ["Reset demo", "Start for real", "Demo", "Privacy"]) {
    const target = page
      .getByRole(name === "Reset demo" ? "button" : "link", { name })
      .first();
    const box = await target.boundingBox();
    expect(box, `${name} has a bounding box`).not.toBeNull();
    expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
  }
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  testInfo.annotations.push({
    type: "a11y",
    description: "axe serious/critical: 0",
  });
});

test("keyboard and error states give a clear next step", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.goto("/ledger");
  await expect(page.getByText("No annotations yet")).toBeVisible();
  await page.locator("#epub-input").focus();
  const fileControlOutline = await page
    .locator(".file-button")
    .first()
    .evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(fileControlOutline).toBe("solid");
  await page
    .locator("#annotation-input")
    .setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not supported"),
    });
  await expect(page.locator("#desk-status")).toContainText(
    "This file type is not supported",
  );
});
