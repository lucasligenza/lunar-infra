import { expect, type Page } from '@playwright/test';

export async function chooseOverlay(page:Page,id:string,mission=false) {
  const labels:Record<string,string>={none:'Imagery',elevation:'Elevation',slope:'Slope',geology:'Geology',temperature:'Temperature',illumination:'Solar visibility'};
  await page.getByRole('group',{name:mission?'Mission scientific overlay':'Scientific overlay',exact:true}).getByRole('radio',{name:labels[id],exact:true}).check();
}

export async function openActivity(page:Page, name:string) {
  await page.keyboard.press('Control+k');
  const search=page.getByRole('combobox',{name:'Search commands'});
  await search.fill(`Open ${name}`);
  // Saving can temporarily disable navigation. Wait for the actual command,
  // rather than press Enter while its backing request is still in flight.
  await expect(page.getByRole('option',{name:`Open ${name}`,exact:false})).toHaveAttribute('aria-disabled','false');
  await search.press('Enter');
  await expect(page.getByRole('dialog',{name:'Command palette'})).not.toBeVisible();
  if(name==='Simulate'&&!await page.getByRole('region',{name:'Mission timeline'}).isVisible())await missionTools(page);
}
export async function missionTools(page:Page) {
  await expect(page.locator('.local-shell')).toBeVisible();
  const closeInspector=page.getByRole('button',{name:'Close inspector',exact:true});
  if(await closeInspector.isVisible())await closeInspector.click();
  const workspace=page.locator('.mission-workspace');
  if(await workspace.getAttribute('data-tools-open')==='true'&&await workspace.getAttribute('data-tools-section')!=='all')await page.getByRole('button',{name:'Collapse tools',exact:true}).click();
  const button=page.getByRole('button',{name:'Expand tools',exact:true});
  if(await workspace.getAttribute('data-tools-open')!=='true'){
    if(!await button.isVisible())await missionDetails(page);
    if(await button.isVisible())await button.click();
  }
  await expect(page.getByRole('complementary',{name:'Exploration tools'})).toBeVisible();
  const placed=page.locator('.placed-assets:visible');
  if(await placed.count()&&await placed.getAttribute('open')===null)await placed.locator('summary').click();
}
export async function missionInspector(page:Page) {
  if(await page.locator('#context-inspector').isVisible())return;
  await missionSurface(page);
  const button=page.getByRole('button',{name:'Show inspector',exact:true});
  if(!await button.isVisible())await page.locator('.mission-actions > summary').click();
  if(await button.isVisible())await button.click();
}
export async function missionSurface(page:Page) {
  for(const label of ['Collapse tools','Close inspector']){
    const close=page.getByRole('button',{name:label,exact:true});if(await close.isVisible())await close.click();
  }
}
export async function assetAdvanced(page:Page) {
  const details=page.locator('.asset-advanced');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
export async function missionDetails(page:Page) {
  const menu=page.locator('.mission-actions');
  if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
}
export async function openDestinations(page:Page) {
  const open=page.getByRole('button',{name:'Open destinations',exact:true});
  if(await open.isVisible())await open.click();
}
export async function closeDestinations(page:Page) {
  const close=page.getByRole('button',{name:'Close destinations',exact:true});
  if(await close.isVisible())await close.click();
}
export async function atlasAdvanced(page:Page) {
  const panel=page.getByRole('complementary',{name:'Lunar atlas'});
  const button=panel.getByRole('button',{name:'Advanced',exact:true});
  if(await button.getAttribute('aria-expanded')==='false')await button.click();
}
export async function regionAdvanced(page:Page) {
  const panel=page.getByRole('complementary',{name:'Selected lunar region'});
  const details=panel.locator(':scope > details');
  if(await details.getAttribute('open')===null)await details.getByText('Advanced',{exact:true}).click();
}
export async function utilities(page:Page) {
  const details=page.locator('.utility-menu');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
export async function simulationAdvanced(page:Page) {
  await missionTools(page);
  const details=page.locator('.simulation-advanced');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}
