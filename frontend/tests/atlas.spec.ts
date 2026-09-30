import {test,expect} from '@playwright/test';

test('atlas queries original GLD100 across regions and switches verified datasets',async({page,request})=>{
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.getByRole('button',{name:'Lunar atlas',exact:true}).click();
  const sample=await (await request.get('/api/atlas/inspect?latitude=0.67&longitude=23.47')).json();
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${sample.elevation.value.toLocaleString('en-US')} m`);
  await expect(page.getByRole('complementary',{name:'Lunar atlas'})).toContainText('WAC_GLD100_E000N1800_032P');
  await page.getByRole('combobox',{name:'Atlas terrain dataset'}).selectOption('lola-global');
  const lola=await (await request.get('/api/atlas/inspect?latitude=0.67&longitude=23.47&dataset=lola-global')).json();
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${lola.elevation.value.toLocaleString('en-US')} m`);
  await page.getByText('Measurement metadata',{exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Lunar atlas'}).getByText('MEAN EARTH/POLAR AXIS OF DE421',{exact:true})).toBeVisible();
  await page.screenshot({path:'../artifacts/phase4-elevation-slice.png'});
  await page.getByRole('searchbox',{name:'Search science datasets'}).fill('mineralogy');
  await page.getByText('Moon Mineralogy Mapper observations',{exact:true}).click();
  await expect(page.getByText('Numerical queries unavailable; 3D overlay unavailable',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  await page.getByRole('button',{name:'Close destinations',exact:true}).click();
  await page.getByRole('button',{name:'Lunar atlas',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Close atlas',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
