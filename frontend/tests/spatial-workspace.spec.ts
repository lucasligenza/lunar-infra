import {test,expect,type Locator} from '@playwright/test';
import {chooseOverlay,openDestinations,openMissions,overlaySourceDetails} from './workspace';

async function hitTarget(control:Locator) {
  await expect(control).toBeInViewport();
  expect(await control.evaluate(element=>{
    const b=element.getBoundingClientRect(),target=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
    return target===element||element.contains(target);
  })).toBe(true);
}

test('temporary science and selection panels preserve the full canvas, camera and reachable controls at four desktop sizes',async({page,request})=>{
  test.setTimeout(120000);
  await page.addInitScript(()=>localStorage.setItem('lunaros.motion.v1','reduce'));
  const destinations=await(await request.get('/api/destinations')).json();
  const destination=destinations.find((item:{id:string})=>item.id==='apollo-11');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768]]) {
    await page.setViewportSize({width,height});await page.goto('/');
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    const viewport=page.locator('.globe-viewport'),host=page.getByTestId('moon-canvas');
    const original=(await viewport.boundingBox())!;
    expect(original.width).toBe(width);
    expect(original.height).toBeGreaterThan(height*.88);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button')).toHaveText(['Explore','Build','Simulate']);
    await page.screenshot({path:`../artifacts/spatial-final-explore-${width}.png`});
    await openDestinations(page);await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
    await expect(page.getByTestId('atlas-elevation')).toBeVisible();
    await expect.poll(async()=>Math.hypot(...(await host.getAttribute('data-camera'))!.split(',').map(Number))).toBeCloseTo(destination.camera_distance_radii,3);
    const camera=await host.getAttribute('data-camera');
    const region=page.getByRole('complementary',{name:'Selected lunar region'});
    const bounds=(await region.boundingBox())!;
    expect(bounds.width*bounds.height/(original.width*original.height)).toBeLessThan(.25);
    expect(await viewport.boundingBox()).toEqual(original);
    await hitTarget(page.getByRole('button',{name:'Close region details',exact:true}));
    await page.screenshot({path:`../artifacts/spatial-final-selection-${width}.png`});
    await chooseOverlay(page,'elevation');
    await expect(page.getByTestId('atlas-overlay-status')).toContainText('ready / rendered');
    expect(await viewport.boundingBox()).toEqual(original);
    await expect(host).toHaveAttribute('data-camera',camera!);
    const atlas=(await page.getByRole('complementary',{name:'Overlays'}).boundingBox())!;
    expect(atlas.width*atlas.height/(original.width*original.height)).toBeLessThan(.25);
    await hitTarget(page.getByRole('button',{name:'Reset globe',exact:true}));
    await hitTarget(page.getByRole('button',{name:'Close overlays',exact:true}));
    await hitTarget(page.getByRole('button',{name:'Close region details',exact:true}));
    await expect(page.getByRole('slider',{name:'Scientific layer opacity'})).toBeInViewport();
    await page.screenshot({path:`../artifacts/spatial-final-overlays-${width}.png`});
    // Escape closes the newest surface first: the Overlays menu, then the location drawer.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary',{name:'Overlays'})).toHaveCount(0);
    await expect(page.getByRole('complementary',{name:'Selected lunar region'})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(host).toHaveAttribute('data-camera',camera!);
    await hitTarget(page.getByRole('button',{name:'Open region details',exact:true}));
    await page.getByRole('button',{name:'Search commands',exact:true}).click();
    await expect(page.getByRole('combobox',{name:'Search commands'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'Search commands',exact:true})).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  expect(errors).toEqual([]);
});

test('catalog connection failures cannot be hidden by successful point inspection and can be retried',async({page})=>{
  let failing=true;
  await page.route('**/api/atlas/datasets',route=>{
    return failing?route.fulfill({status:502,body:'Synthetic metadata connection failure'}):route.continue();
  });
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  const error=page.getByRole('alert').filter({hasText:'Scientific catalog unavailable'});
  await expect(error).toBeVisible();
  await overlaySourceDetails(page);
  const sources=page.getByRole('radiogroup',{name:'Terrain source'});
  await expect(sources.getByRole('radio',{name:'Best available'})).toBeDisabled();
  await expect(page.getByTestId('atlas-elevation')).toContainText('m');
  await expect(error).toBeVisible();
  failing=false;await page.getByRole('button',{name:'Retry catalog',exact:true}).click();
  await expect(sources.getByRole('radio',{name:'LOLA 0.25°'})).toBeEnabled();
  await sources.getByRole('radio',{name:'LOLA 0.25°'}).check();
  await expect(error).toHaveCount(0);
  await expect(sources.getByRole('radio',{name:'LOLA 0.25°'})).toBeChecked();
});

test('a phone-sized mission can save its edited name without losing access to navigation',async({page,request})=>{
  await page.setViewportSize({width:390,height:844});
  const name=`Phone save ${Date.now()}`;
  const response=await request.post('/api/scenarios',{data:{name,site:{latitude_deg:-89.5,longitude_deg:0}}});
  expect(response.status()).toBe(201);const scenario=await response.json();
  try {
    await page.goto('/?mode=mission');await openMissions(page);
    await page.getByRole('button',{name:`Open scenario: ${name}`,exact:true}).click();
    await openMissions(page);await page.getByLabel('Scenario name',{exact:true}).fill(`${name} edited`);
    const save=page.getByRole('button',{name:'Save scenario',exact:true});await hitTarget(save);
    await hitTarget(page.getByRole('button',{name:'Build',exact:true}));
    const saved=page.waitForResponse(response=>response.request().method()==='PATCH'&&response.url().endsWith(`/scenarios/${scenario.id}`));
    await save.click();expect((await saved).ok()).toBe(true);
    const stored=await(await request.get(`/api/scenarios/${scenario.id}`)).json();
    expect(stored.name).toBe(`${name} edited`);expect(stored.revision).toBe(scenario.revision+1);
    await expect(save).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  } finally {
    const latest=await(await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});
