import {missionInspector,missionTools} from './workspace';
import { test, expect } from "@playwright/test";
import { toPolar, toGeographic } from "../lib/lunar";
import type { Site } from "../types/scientific";

const formatted = (value: number, fraction = false) => (fraction ? value * 100 : value)
  .toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

test("browser coordinate math matches PyProj API transforms", async ({ request }) => {
  const regions = await (await request.get("/api/regions")).json();
  const radius = regions[0].reference_radius_m;
  for (const [longitude, latitude] of [[0, -89], [90, -89], [180, -89], [270, -89], [33, -89.5]]) {
    const response = await request.get(`/api/sites/inspect?longitude=${longitude}&latitude=${latitude}`);
    expect(response.ok()).toBeTruthy();
    const site: Site = await response.json();
    const [x, y] = toPolar(longitude, latitude, radius);
    expect(x).toBeCloseTo(site.coordinates.x_m, 6);
    expect(y).toBeCloseTo(site.coordinates.y_m, 6);
    const [lon, lat] = toGeographic(x, y, radius);
    expect(lon).toBeCloseTo(longitude, 8);
    expect(lat).toBeCloseTo(latitude, 8);
  }
  expect(toPolar(123, -90, radius)).toEqual([0, -0]);
});

test("real NASA map selection, inspector, layers and navigation work", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?mode=regional");
  await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
  await missionInspector(page);
  await expect(page.getByText("Select a location", { exact: true })).toBeVisible();
  await missionTools(page);
  await page.getByRole("button", { name: "Collapse tools" }).click();
  await expect(page.getByRole("region", { name: "Scientific layers" })).not.toBeVisible();
  await page.getByRole("button", { name: "Expand tools" }).click();
  await expect(page.getByRole("region", { name: "Scientific layers" })).toBeVisible();
  await page.getByLabel("Latitude (°)", { exact: true }).fill("-89.5");
  await page.getByLabel("Longitude (° E)", { exact: true }).fill("0");
  const expected: Site = await (await request.get("/api/sites/inspect?latitude=-89.5&longitude=0")).json();
  await missionTools(page);
  await page.getByRole("button", { name: "Inspect location" }).click();
  await expect(page.getByTestId("elevation-value")).toHaveText(formatted(expected.elevation.value!));
  await expect(page.getByTestId("slope-value")).toHaveText(formatted(expected.slope.value!));
  await expect(page.getByTestId("illumination-value")).toHaveText(formatted(expected.solar_visibility.value!, true));
  await missionTools(page);
  for (const name of ["Local slope", "Solar visibility", "Elevation"]) {
    await page.getByRole("radio", { name }).check();
    await expect(page.getByRole("radio", { name })).toBeChecked();
    await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
    await expect(page.getByRole("region", { name: "Scientific legend" })).toContainText(name);
  }
  const previousResolution = await page.getByTestId("map-resolution").textContent();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByTestId("map-resolution")).not.toHaveText(previousResolution!);
  await page.getByRole("button", { name: "Reset map view" }).click();
  const map = page.getByTestId("terrain-map");
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width * .67, box.y + box.height * .45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .72, box.y + box.height * .55, { steps: 10 });
  await page.mouse.up();
  const clickedResponse = page.waitForResponse(value => value.url().includes("/sites/inspect") && value.status() === 200);
  await map.click({ position: { x: box.width * .6, y: box.height * .55 } });
  const clicked: Site = await (await clickedResponse).json();
  await expect(page.getByTestId("elevation-value")).toHaveText(formatted(clicked.elevation.value!));
  await expect(page.getByTestId("selected-coordinate")).toContainText(Math.abs(clicked.coordinates.latitude_deg).toFixed(5));
  await missionTools(page);
  await expect(page.getByRole("checkbox", { name: "Lunar coordinate grid" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Lunar coordinate grid" }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Lunar coordinate grid" })).not.toBeChecked();
  await missionInspector(page);
  await page.locator(".data-sources summary").filter({ hasText: "LDEM_75S_240M" }).click();
  await expect(page.getByRole("link", { name: "NASA source: ldem_75s_240m.lbl" })).toBeVisible();
  await page.screenshot({ path: "../artifacts/lunaros-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("outside-region queries clear stale measurements", async ({ page }) => {
  await page.goto("/?mode=regional");
  await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
  await missionTools(page);
  await page.getByRole("button", { name: "Inspect location" }).click();
  await expect(page.getByTestId("elevation-value")).toBeVisible();
  await missionTools(page);
  await page.getByLabel("Latitude (°)", { exact: true }).fill("-80");
  await missionTools(page);
  await page.getByRole("button", { name: "Inspect location" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Location unavailable" })).toContainText("outside the prepared");
  await expect(page.getByTestId("elevation-value")).toHaveCount(0);
});

test("unavailable API shows an actionable error and retry works", async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto("/?mode=regional");
  await expect(page.getByRole("alert").filter({ hasText: "Scientific data unavailable" })).toContainText("Prepare the NASA datasets");
  await expect(page.getByTestId("elevation-value")).toHaveCount(0);
  await page.unroute("**/api/health");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
});

test("mobile map and coordinate form remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?mode=regional");
  await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
  await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Tools", exact: true }).click();
  const controls = await page.getByRole("region", { name: "Scientific layers" }).boundingBox();
  const coordinates = await page.getByRole("heading", { name: "Inspect by coordinates" }).boundingBox();
  expect(controls!.y + controls!.height).toBeLessThan(coordinates!.y);
  await missionTools(page);
  await page.getByRole("button", { name: "Inspect location" }).click();
  await expect(page.getByTestId("elevation-value")).toBeVisible();
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: "../artifacts/lunaros-mobile.png", fullPage: true });
});

test("failed raster loads show an error and can be retried", async ({ page }) => {
  await page.route("**/api/regions/south-pole/layers/elevation.png*", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/?mode=regional");
  await expect(page.getByTestId("layer-status")).toContainText("Layer unavailable");
  await page.unroute("**/api/regions/south-pole/layers/elevation.png*");
  await page.getByRole("button", { name: "Retry layer" }).click();
  await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
});
