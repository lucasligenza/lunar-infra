import { test, expect } from "@playwright/test";

test("independent drafts survive saves and stale revisions cannot overwrite server state", async ({ page, request }) => {
  const name = `Conflict outpost ${Date.now()}`;
  const location = { latitude_deg: -89.5, longitude_deg: 0 };
  const scenario = await (await request.post("/api/scenarios", { data: { name, site: location,
    assets: [{ kind: "habitat", name: "Habitat", location }] } })).json();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: `Open scenario: ${name}`, exact: true }).click();
    await page.getByRole("button", { name: "Select asset: Habitat", exact: true }).click();
    await page.getByLabel("Continuous demand (kW)", { exact: true }).fill("12");
    await page.getByLabel("Time step (seconds)", { exact: true }).fill("1800");
    await page.getByLabel("Scenario name", { exact: true }).fill(`${name} renamed`);
    await page.getByRole("button", { name: "Save scenario", exact: true }).click();
    await expect(page.getByLabel("Continuous demand (kW)", { exact: true })).toHaveValue("12");
    await expect(page.getByLabel("Time step (seconds)", { exact: true })).toHaveValue("1800");
    await expect(page.getByRole("button", { name: "Save asset", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Save asset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save asset", exact: true })).toBeDisabled();
    await expect(page.getByLabel("Time step (seconds)", { exact: true })).toHaveValue("1800");
    const current = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    expect((await request.patch(`/api/scenarios/${scenario.id}`, { data: { revision: current.revision, name: `${name} server edit` } })).status()).toBe(200);
    await page.getByLabel("Scenario name", { exact: true }).fill(`${name} stale edit`);
    await page.getByRole("button", { name: "Save scenario", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Scenario changed" })).toBeVisible();
    expect((await (await request.get(`/api/scenarios/${scenario.id}`)).json()).name).toBe(`${name} server edit`);
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button", { name: `Open scenario: ${name} renamed`, exact: true }).click();
    await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(`${name} stale edit`);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: `Open scenario: ${name} renamed`, exact: true }).click();
    await expect(page.getByLabel("Scenario name", { exact: true })).toHaveValue(`${name} server edit`);
    await expect(page.getByLabel("Time step (seconds)", { exact: true })).toHaveValue("3600");
  } finally {
    const latest = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});

test("custom mission parameters reject missing illumination and preserve explicit temporal inputs", async ({ page, request }) => {
  const name = `Custom series ${Date.now()}`;
  const location = { latitude_deg: -89.5, longitude_deg: 0 };
  const scenario = await (await request.post("/api/scenarios", { data: { name, site: location, assets: [
    { kind: "habitat", name: "Load", location, demand_kw: 2 },
    { kind: "solar_array", name: "Array", location, rated_power_kw: 10, derating: 1 },
  ] } })).json();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: `Open scenario: ${name}`, exact: true }).click();
    await page.getByLabel("Mission end (UTC)", { exact: true }).fill("2027-01-01T02:00");
    await page.getByLabel("Time step (seconds)", { exact: true }).fill("1800");
    const profile = page.getByLabel("Electrical input factors (one per interval)", { exact: true });
    await profile.fill("1,,0");
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "missing measurement" })).toBeVisible();
    await profile.fill("1, NaN, 0, 1");
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "non-finite" })).toBeVisible();
    await profile.fill("1, 0, 0.5, 1");
    const result = page.waitForResponse(value => value.url().endsWith("/simulations") && value.request().method() === "POST");
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    const run = await (await result).json();
    expect(run.result.input_kind).toBe("custom_hypothetical");
    expect(run.result.mission.timestep_seconds).toBe(1800);
    expect(run.result.mission.end).toBe("2027-01-01T02:00:00Z");
    expect(run.result.intervals.map((value: { generation_kw: number }) => value.generation_kw)).toEqual([10, 0, 5, 10]);
    await expect(page.getByText("Hypothetical custom input", { exact: true })).toBeVisible();
    await page.getByRole("slider", { name: "Mission interval" }).press("End");
    await expect(page.getByTestId("telemetry-generation")).toHaveText("10.00");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Tools", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Workspace", exact: true })).toBeInViewport();
    await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Timeline", exact: true }).click();
    await expect(page.getByRole("button", { name: "Collapse timeline", exact: true })).toBeInViewport();
  } finally {
    const latest = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});
