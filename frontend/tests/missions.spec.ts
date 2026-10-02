import {assetAdvanced,missionInspector,missionTools} from './workspace';
import { test, expect } from "@playwright/test";

test("scenario placement editing movement persistence duplication and deletion", async ({ page, request }) => {
  const name = `Browser outpost ${Date.now()}`;
  const created: string[] = [];
  try {
    await page.goto("/?mode=mission");
    await expect(page.getByTestId("layer-status")).toHaveText("Layer ready");
    await missionTools(page);
    await page.getByRole("button", { name: "Inspect location" }).click();
    await expect(page.getByTestId("elevation-value")).toBeVisible();
    await missionTools(page);
    await page.getByLabel("Scenario name", { exact: true }).fill(name);
    const creation = page.waitForResponse(r => r.url().endsWith("/scenarios") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Create scenario at selected site" }).click();
    const scenario = await (await creation).json(); created.push(scenario.id);
    await expect(page.getByRole("button", { name: "Place habitat", exact: true })).toBeVisible();
    const map = page.getByTestId("terrain-map"); const box = (await map.boundingBox())!;
    await missionTools(page);
    await page.getByRole("button", { name: "Place habitat", exact: true }).click();
    await map.click({ position: { x: box.width * .6, y: box.height * .4 } });
    await expect(page.getByRole("complementary", { name: "Asset configuration" })).toBeVisible();
    await page.getByLabel("Asset name", { exact: true }).fill("Research habitat");
    await page.getByLabel("Continuous demand (kW)", { exact: true }).fill("12");
    await expect(page.getByRole("complementary", { name: "Asset configuration" }).getByText("Unsaved asset changes", { exact: true })).toBeVisible();
    await missionInspector(page);
    await page.getByRole("button", { name: "Save asset", exact: true }).click();
    await expect(page.getByText("Asset configuration saved", { exact: true })).toBeVisible();
    const saved = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    expect(saved.assets[0].demand_kw).toBe(12);
    const originalLocation = saved.assets[0].location;
    await page.screenshot({ path: "../artifacts/lunaros-infrastructure.png", fullPage: true });
    await page.getByRole("button", { name: "Move on map" }).click();
    await map.click({ position: { x: box.width * .4, y: box.height * .65 } });
    await expect(page.getByRole("button", { name: "Cancel placement" })).toHaveCount(0);
    const moved = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    expect(moved.assets[0].location).not.toEqual(originalLocation);
    await page.reload();
    await missionTools(page);
    await page.getByRole("button", { name: `Open scenario: ${name}`, exact: true }).click();
    await missionTools(page);
    await page.getByRole("button", { name: "Select asset: Research habitat", exact: true }).click();
    await expect(page.getByLabel("Continuous demand (kW)", { exact: true })).toHaveValue("12");
    await assetAdvanced(page);
    await page.getByLabel("Asset latitude (°)", { exact: true }).fill("-80");
    await missionInspector(page);
    await page.getByRole("button", { name: "Save asset", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "outside" })).toBeVisible();
    expect((await (await request.get(`/api/scenarios/${scenario.id}`)).json()).assets[0].location).toEqual(moved.assets[0].location);
    const duplication = page.waitForResponse(r => r.url().endsWith("/duplicate"));
    page.once("dialog", dialog => dialog.accept());
    await missionTools(page);
    await page.getByRole("button", { name: "Duplicate scenario", exact: true }).click();
    const duplicate = await (await duplication).json(); created.push(duplicate.id);
    await expect(page.getByRole("button", { name: `Open scenario: ${name} copy`, exact: true })).toBeVisible();
    await missionTools(page);
    await page.getByRole("button", { name: "Select asset: Research habitat", exact: true }).click();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Remove asset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Select asset: Research habitat", exact: true })).toHaveCount(0);
    page.once("dialog", dialog => dialog.dismiss());
    await missionTools(page);
    await page.getByRole("button", { name: "Delete scenario", exact: true }).click();
    expect((await request.get(`/api/scenarios/${duplicate.id}`)).status()).toBe(200);
    page.once("dialog", dialog => dialog.accept());
    await missionTools(page);
    await page.getByRole("button", { name: "Delete scenario", exact: true }).click();
    await expect(page.getByRole("button", { name: `Open scenario: ${name} copy`, exact: true })).toHaveCount(0);
  } finally {
    for (const id of created) {
      const response = await request.get(`/api/scenarios/${id}`);
      if (response.ok()) {
        const scenario = await response.json();
        await request.delete(`/api/scenarios/${id}?revision=${scenario.revision}`);
      }
    }
  }
});
