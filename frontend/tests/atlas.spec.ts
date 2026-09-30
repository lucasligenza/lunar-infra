import {test,expect} from '@playwright/test';
import {SphereGeometry} from 'three';
import {tileGeometry,geographicTile} from '../lib/atlas-render';

test('georeferenced overlay patches preserve globe geometry at seam and poles',()=>{
  const base=new SphereGeometry(1,360,180),before=Array.from(base.attributes.position.array);
  expect(geographicTile(0,0,0)).toEqual({west:0,east:180,north:90,south:-90});
  for(const [z,x,y] of [[0,0,0],[0,1,0],[2,0,0],[2,7,3],[5,63,31]]) {
    const patch=tileGeometry(base,z,x,y);expect(patch.attributes.position.count).toBeGreaterThan(0);
    const position=patch.attributes.position,uv=patch.attributes.uv;
    let minimumRadius=Infinity,maximumRadius=0,minimumUV=Infinity,maximumUV=-Infinity,hemisphere=Infinity;
    for(let i=0;i<position.count;i++) {
      const radius=Math.hypot(position.getX(i),position.getY(i),position.getZ(i));
      minimumRadius=Math.min(minimumRadius,radius);maximumRadius=Math.max(maximumRadius,radius);
      minimumUV=Math.min(minimumUV,uv.getX(i),uv.getY(i));maximumUV=Math.max(maximumUV,uv.getX(i),uv.getY(i));
      hemisphere=Math.min(hemisphere,(x===0?-1:1)*position.getZ(i));
    }
    expect(minimumRadius).toBeGreaterThan(.9998);expect(maximumRadius).toBeLessThanOrEqual(1.000001);
    expect(minimumUV).toBeGreaterThanOrEqual(-1e-6);expect(maximumUV).toBeLessThanOrEqual(1.000001);
    if(z===0)expect(hemisphere).toBeGreaterThanOrEqual(-1e-6);patch.dispose();
  }
  expect(Array.from(base.attributes.position.array)).toEqual(before);base.dispose();
});

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

test('scientific layers follow the 3D surface with legends opacity and synchronized reveal',async({page,request})=>{
  test.setTimeout(90000);
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.getByRole('button',{name:'Close destinations',exact:true}).click();
  const host=page.getByTestId('moon-canvas'),terrain=await host.getAttribute('data-terrain');
  await page.getByRole('button',{name:'Lunar atlas',exact:true}).click();
  await page.getByRole('combobox',{name:'Scientific overlay',exact:true}).selectOption('elevation');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await expect(page.getByRole('region',{name:'Scientific surface layers'})).toContainText('12,000 m');
  await expect.poll(async()=>Number(await host.getAttribute('data-overlay-tiles'))).toBeGreaterThan(0);
  await page.getByRole('slider',{name:'Scientific layer opacity',exact:true}).fill('0.5');
  await expect(page.getByRole('slider',{name:'Scientific layer opacity',exact:true})).toHaveValue('0.5');
  await page.getByRole('checkbox',{name:'Compare imagery and science',exact:true}).check();
  await page.getByRole('slider',{name:'Comparison reveal',exact:true}).fill('0.65');
  await expect(page.locator('.atlas-reveal')).toHaveAttribute('style',/65%/);
  await page.screenshot({path:'../artifacts/phase4-elevation-overlay.png'});
  expect(await host.getAttribute('data-terrain')).toBe(terrain);
  await page.getByRole('combobox',{name:'Scientific overlay',exact:true}).selectOption('slope');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await expect(page.getByRole('region',{name:'Scientific surface layers'})).toContainText('30 deg');
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  const canvas=page.getByLabel('Interactive 3D Moon',{exact:true}),box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.64,box.y+box.height*.6,{steps:12});await page.mouse.up();
  await page.getByRole('button',{name:'slope / best prepared terrain',exact:true}).click();
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await page.screenshot({path:'../artifacts/phase4-slope-overlay.png'});
  const layers=await (await request.get('/api/atlas/layers')).json();expect(layers.some((value:any)=>value.id==='slope'&&value.dataset_id==='gld100')).toBe(true);
  expect(await host.getAttribute('data-terrain')).toBe(terrain);
});
