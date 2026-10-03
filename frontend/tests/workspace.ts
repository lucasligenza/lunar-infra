import { expect, type Page } from '@playwright/test';

const LABELS:Record<string,string>={none:'Imagery',elevation:'Elevation',slope:'Slope',geology:'Geology',temperature:'Temperature',illumination:'Solar visibility'};

/** Open the Overlays menu (Explore, Build or Simulate) and choose a layer row. */
export async function chooseOverlay(page:Page,id:string) {
  await openOverlays(page);
  await page.getByRole('complementary',{name:'Overlays',exact:true}).getByRole('group',{name:'Scientific overlay',exact:true}).getByRole('radio',{name:LABELS[id],exact:true}).check();
}
export async function openOverlays(page:Page) {
  const menu=page.getByRole('complementary',{name:'Overlays',exact:true});
  if(await menu.isVisible())return menu;
  await page.getByRole('button',{name:'Overlays',exact:true}).filter({visible:true}).first().click();
  await expect(menu).toBeVisible();return menu;
}
export async function overlaySourceDetails(page:Page) {
  const menu=await openOverlays(page);const details=menu.locator('.source-details');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  return menu;
}

export async function openActivity(page:Page, name:string) {
  await page.keyboard.press('Control+k');
  const search=page.getByRole('combobox',{name:'Search commands'});
  await search.fill(`Open ${name}`);
  // Saving can temporarily disable navigation. Wait for the actual command,
  // rather than press Enter while its backing request is still in flight.
  await expect(page.getByRole('option',{name:`Open ${name}`,exact:false}).first()).toHaveAttribute('aria-disabled','false');
  await search.press('Enter');
  await expect(page.getByRole('dialog',{name:'Command palette'})).not.toBeVisible();
}
export async function runCommand(page:Page, label:string) {
  await page.keyboard.press('Control+k');
  const search=page.getByRole('combobox',{name:'Search commands'});
  await search.fill(label);
  await expect(page.getByRole('option',{name:label,exact:false}).first()).toHaveAttribute('aria-disabled','false');
  await search.press('Enter');
  await expect(page.getByRole('dialog',{name:'Command palette'})).not.toBeVisible();
}

async function drawer(page:Page,label:string,button:string) {
  await expect(page.locator('.local-shell')).toBeVisible();
  const surface=page.getByRole('complementary',{name:label,exact:true});
  if(await surface.isVisible())return surface;
  await page.getByRole('button',{name:button,exact:true}).click();
  await expect(surface).toBeVisible();return surface;
}
/** Missions drawer: open/create/rename/duplicate/delete scenarios and select placed assets. */
export async function openMissions(page:Page) { return drawer(page,'Missions','Missions'); }
/** Simulation setup drawer: hypothetical input profiles and Run simulation. */
export async function openSetup(page:Page) {
  await expect(page.locator('.local-shell')).toBeVisible();
  const surface=page.getByRole('complementary',{name:'Simulation setup',exact:true});
  if(await surface.isVisible())return surface;
  await page.getByRole('button',{name:/^(Set up simulation|Setup)$/}).click();
  await expect(surface).toBeVisible();return surface;
}
/** Add-asset palette in Build. */
export async function openPalette(page:Page) {
  const palette=page.getByRole('complementary',{name:'Infrastructure catalog',exact:true});
  if(await palette.isVisible())return palette;
  await page.getByRole('button',{name:'+ Add Asset',exact:true}).click();
  await expect(palette).toBeVisible();return palette;
}
/** Location drawer with coordinate entry expanded (Build / Simulate / 2D analysis). */
export async function openCoordinates(page:Page) {
  const surface=page.getByRole('complementary',{name:'Location',exact:true});
  if(!await surface.isVisible()){
    await missionSurface(page);
    await page.getByRole('button',{name:'Open location details',exact:true}).click();
    await expect(surface).toBeVisible();
  }
  const entry=surface.locator('.coordinate-entry');
  if(await entry.getAttribute('open')===null)await entry.locator('summary').click();
  return surface;
}
/** Close every Build/Simulate menu and drawer, restoring the canvas. */
export async function missionSurface(page:Page) {
  for(const label of ['Close overlays','Close asset palette','Close location','Close asset','Close missions','Close simulation setup']){
    const close=page.getByRole('button',{name:label,exact:true});if(await close.isVisible())await close.click();
  }
}
export async function assetAdvanced(page:Page) {
  const details=page.locator('.asset-advanced');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
export async function openDestinations(page:Page) {
  const open=page.getByRole('button',{name:'Open destinations',exact:true});
  if(await open.isVisible())await open.click();
}
export async function closeDestinations(page:Page) {
  const close=page.getByRole('button',{name:'Close destinations',exact:true});
  if(await close.isVisible())await close.click();
}
/** Explore analysis tools drawer (regional analysis, sectors, catalog). */
export async function openAnalysis(page:Page,tab:'Analysis'|'Regions'|'Catalog'='Analysis') {
  const panel=page.getByRole('complementary',{name:'Analysis tools',exact:true});
  if(!await panel.isVisible())await runCommand(page,tab==='Catalog'?'Open dataset catalog':'Open regional analysis');
  await expect(panel).toBeVisible();
  await panel.getByRole('radiogroup',{name:'Analysis tool'}).getByRole('radio',{name:tab,exact:true}).check();
  return panel;
}
export async function regionSources(page:Page) {
  const panel=page.getByRole('complementary',{name:'Selected lunar region'});
  const details=panel.locator('details.site-provenance');
  if(await details.getAttribute('open')===null)await details.getByText('Sources & provenance',{exact:true}).click();
}
export async function simulationAdvanced(page:Page) {
  await openSetup(page);
  const details=page.locator('.simulation-advanced');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
/** Select a placed asset through the Missions drawer; the asset drawer replaces it. */
export async function openAsset(page:Page,name:string) {
  const asset=page.getByRole('complementary',{name:'Asset',exact:true});
  if(await asset.isVisible()&&await asset.getByRole('heading',{name,exact:true}).isVisible())return asset;
  await (await openMissions(page)).getByRole('button',{name:`Select asset: ${name}`,exact:true}).click();
  await expect(asset).toBeVisible();return asset;
}
/** Location drawer in Build/Simulate (opened from the selection strip). */
export async function openLocation(page:Page) {
  const surface=page.getByRole('complementary',{name:'Location',exact:true});
  if(await surface.isVisible())return surface;
  await page.getByRole('button',{name:'Open location details',exact:true}).click();
  await expect(surface).toBeVisible();return surface;
}
/** True when two elements' rectangles do not intersect. */
export async function separate(a:import('@playwright/test').Locator,b:import('@playwright/test').Locator) {
  const x=(await a.boundingBox())!,y=(await b.boundingBox())!;
  return x.x+x.width<=y.x||y.x+y.width<=x.x||x.y+x.height<=y.y||y.y+y.height<=x.y;
}
/** The element's center is not covered by another element. */
export async function reachable(control:import('@playwright/test').Locator) {
  return control.evaluate(element=>{const b=element.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===element||element.contains(hit);});
}
