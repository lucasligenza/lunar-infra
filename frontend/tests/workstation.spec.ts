import {test,expect} from '@playwright/test';
import {chooseOverlay,openDestinations} from './workspace';

test('visible scientific choices support keyboard selection and the same registered overlays',async({page})=>{
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.getByRole('button',{name:'Visit Shackleton crater',exact:true}).click();
  await expect(page.getByTestId('global-coordinate')).toContainText('89.67000');
  await page.getByRole('button',{name:'View scientific overlays',exact:true}).click();
  const choices=page.getByRole('group',{name:'Scientific overlay',exact:true});
  await expect(choices.getByRole('radio')).toHaveCount(6);
  await choices.getByRole('radio',{name:'Imagery',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(choices.getByRole('radio',{name:'Elevation',exact:true})).toBeChecked();
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('ready / rendered');
  await expect(page.getByRole('button',{name:'Explore',exact:true})).toHaveAttribute('aria-pressed','true');
  await chooseOverlay(page,'temperature');
  await expect(page.locator('.atlas-panel .active-layer-caption')).toContainText('00:00-00:15 local time');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('ready / rendered');
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  await expect(page.getByTestId('global-coordinate')).toContainText('89.67000');
});

test('global controls, scientific panel and camera have distinct reachable space',async({page})=>{
  test.setTimeout(120000);
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]){
    await page.setViewportSize({width,height});await page.goto('/');
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await page.screenshot({path:`../artifacts/overhaul-explore-${width}.png`});
    await openDestinations(page);await page.getByRole('button',{name:/^Shackleton crater/}).click();
    await page.getByRole('button',{name:'Overlays',exact:true}).click();
    await chooseOverlay(page,'elevation');await expect(page.getByTestId('atlas-overlay-status')).toContainText('ready / rendered');
    const panel=page.getByRole('complementary',{name:'Lunar atlas'}),toolbar=page.locator('.globe-toolbar');
    const p=(await panel.boundingBox())!,t=(await toolbar.boundingBox())!;
    expect(t.y+t.height).toBeLessThanOrEqual(p.y+1);
    await page.screenshot({path:`../artifacts/overhaul-overlays-${width}.png`});
    for(const control of [page.getByRole('button',{name:'Close atlas',exact:true}),page.getByRole('radio',{name:'Solar visibility',exact:true})]){
      await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport();
      expect(await control.evaluate(e=>{const b=e.getBoundingClientRect();const top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return top===e||e.contains(top);})).toBe(true);
    }
    await page.getByRole('button',{name:'Close atlas',exact:true}).click();
    await page.getByRole('button',{name:'Close region details',exact:true}).click();
    await expect(page.getByRole('button',{name:'Reset globe',exact:true})).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
