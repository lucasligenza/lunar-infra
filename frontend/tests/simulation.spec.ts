import { test, expect } from "@playwright/test";
import type { SimulationRun } from "../types/simulation";

test("simulation inputs playback charts telemetry stale state and saved result reopening", async ({ page, request }) => {
  const name = `Energy outpost ${Date.now()}`;
  const location = { latitude_deg: -89.5, longitude_deg: 0 };
  const creation = await request.post("/api/scenarios", { data: { name, site: location, assets: [
    { kind: "habitat", name: "Research habitat", location }, { kind: "solar_array", name: "Array", location: { ...location, longitude_deg: 10 } },
    { kind: "battery", name: "Storage", location: { ...location, longitude_deg: 20 } },
  ] } });
  expect(creation.status()).toBe(201);
  const scenario = await creation.json();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto("/?mode=simulation");
    await page.getByRole("button", { name: `Open scenario: ${name}`, exact: true }).click();
    await expect(page.getByText("Real-data playback unavailable.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "explicit synthetic profile" })).toBeVisible();
    await page.getByRole("button", { name: "Apply synthetic stress profile", exact: true }).click();
    const response = page.waitForResponse(value => value.url().endsWith("/simulations") && value.request().method() === "POST");
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    const run: SimulationRun = await (await response).json();
    await expect(page.getByRole("region", { name: "Mission timeline" })).toBeVisible();
    await expect(page.getByText("Synthetic demonstration", { exact: true })).toBeVisible();
    const slider = page.getByRole("slider", { name: "Mission interval" });
    await expect(page.getByTestId("telemetry-generation")).toHaveText(run.result.intervals[0].generation_kw.toFixed(2));
    await expect(page.getByTestId("telemetry-demand")).toHaveText(run.result.intervals[0].demand_kw.toFixed(2));
    await page.getByRole("button", { name: /First shortage:/ }).click();
    const selected = Number(await slider.inputValue());
    expect(run.result.intervals[selected].unserved_kw).toBeGreaterThan(0);
    await expect(page.getByTestId("telemetry-unserved")).toHaveText(`${run.result.intervals[selected].unserved_kw.toFixed(2)} kW`);
    await expect(page.getByTestId("telemetry-soc")).toHaveText(`${(run.result.intervals[selected].soc_end! * 100).toFixed(2)}%`);
    await page.getByLabel("Chart window", { exact: true }).selectOption("12");
    await expect(page.getByRole("button", { name: /Electrical generation chart/ })).toBeVisible();
    await slider.focus(); await slider.press("Home"); await slider.press("ArrowRight");
    await expect(slider).toHaveValue("1");
    await expect(page.getByTestId("telemetry-generation")).toHaveText(run.result.intervals[1].generation_kw.toFixed(2));
    await page.getByLabel("Playback speed", { exact: true }).selectOption("4");
    await page.getByRole("button", { name: "Play mission", exact: true }).click();
    await expect.poll(() => slider.inputValue()).not.toBe("1");
    await page.getByRole("button", { name: "Pause playback", exact: true }).click();
    const paused = await slider.inputValue();
    await expect(page.getByTestId("telemetry-demand")).toHaveText(run.result.intervals[Number(paused)].demand_kw.toFixed(2));
    await page.getByRole("button", { name: "Collapse timeline", exact: true }).click();
    await expect(slider).toHaveCount(0);
    await page.getByRole("button", { name: "Expand timeline", exact: true }).click();
    await page.getByRole("button", { name: "Design", exact: true }).click();
    await page.getByRole("button", { name: "Select asset: Research habitat", exact: true }).click();
    await page.getByLabel("Continuous demand (kW)", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Save asset", exact: true }).click();
    await expect(page.getByRole("region", { name: "Mission timeline" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Simulated telemetry" })).toHaveCount(0);
    await expect(page.getByText("Saved results are from an older revision.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Simulate", exact: true }).click();
    const rerun = page.waitForResponse(value => value.url().endsWith("/simulations") && value.request().method() === "POST");
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    const updated: SimulationRun = await (await rerun).json();
    await expect(page.getByTestId("telemetry-demand")).toHaveText(updated.result.intervals[0].demand_kw.toFixed(2));
    await page.reload();
    await page.getByRole("button", { name: `Open scenario: ${name}`, exact: true }).click();
    await expect(page.getByRole("region", { name: "Mission timeline" })).toBeVisible();
    await expect(page.getByTestId("telemetry-demand")).toHaveText(updated.result.intervals[0].demand_kw.toFixed(2));
    await page.screenshot({ path: "../artifacts/lunaros-mission-control.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "../artifacts/lunaros-mission-mobile.png", fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    const latest = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});
