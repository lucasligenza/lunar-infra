import { expect, type Page } from '@playwright/test';

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
  const mobile=page.getByRole('navigation',{name:'Workspace navigation'});
  if(await mobile.isVisible()){await mobile.getByRole('link',{name:'Tools',exact:true}).click();return;}
  const all=page.getByRole('button',{name:'Show all mission tools',exact:true});
  if(await all.isVisible())await all.click();
  const button=page.getByRole('button',{name:'Expand tools',exact:true});
  if(await button.isVisible())await button.click();
  await expect(page.getByRole('complementary',{name:'Exploration tools'})).toBeVisible();
}
export async function missionInspector(page:Page) {
  const mobile=page.getByRole('navigation',{name:'Workspace navigation'});
  if(await mobile.isVisible()){await mobile.getByRole('link',{name:'Inspector',exact:true}).click();return;}
  const button=page.getByRole('button',{name:'Show inspector',exact:true});
  if(await button.isVisible())await button.click();
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
  const details=panel.locator('details');
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
