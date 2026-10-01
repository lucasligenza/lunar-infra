import {test,expect} from '@playwright/test';
import {openDestinations} from './workspace';

test('validated polar visibility colors the globe and matches actual native inspection',async({page,request})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.text().includes('same key'))errors.push(message.text());});
  await page.goto('/'); await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:/^Shackleton crater/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  const expected=await(await request.get('/api/sites/inspect?latitude=-89.67&longitude=129.78')).json();
  await expect(page.getByTestId('atlas-sunlight')).toHaveText(`${(expected.solar_visibility.value*100).toFixed(1)}%`);
  const host=page.getByTestId('moon-canvas');const terrain=await host.getAttribute('data-terrain');
  await page.getByRole('combobox',{name:'Scientific overlay'}).selectOption('illumination');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await expect(page.getByRole('region',{name:'Scientific surface layers'})).toContainText('100%');
  expect(await host.getAttribute('data-terrain')).toBe(terrain);
  await page.screenshot({path:'../artifacts/simple-solar-overlay.png'});
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  await openDestinations(page);await page.getByRole('button',{name:/^Tycho crater/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await expect(page.getByTestId('atlas-sunlight')).toHaveText('Unavailable here');
  expect(errors).toEqual([]);
});
