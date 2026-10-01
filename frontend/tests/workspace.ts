import { expect, type Page } from '@playwright/test';

export async function openActivity(page:Page, name:string) {
  await page.keyboard.press('Control+k');
  const search=page.getByRole('combobox',{name:'Search commands'});
  await search.fill(`Open ${name}`); await search.press('Enter');
  await expect(page.getByRole('dialog',{name:'Command palette'})).not.toBeVisible();
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
