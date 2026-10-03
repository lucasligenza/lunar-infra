import {chooseOverlay} from './workspace';
import {test,expect} from '@playwright/test';
import {openDestinations} from './workspace';

test('validated polar visibility colors the globe and matches actual native inspection',async({page,request})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.text().includes('same key'))errors.push(message.text());});
  await page.goto('/'); await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:/^Shackleton crater/}).click();
  const expected=await(await request.get('/api/sites/inspect?latitude=-89.67&longitude=129.78')).json();
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${expected.elevation.value.toLocaleString('en-US')} m`);
  await expect(page.getByTestId('atlas-slope')).toHaveText(`${expected.slope.value.toFixed(2)}°`);
  await expect(page.getByTestId('atlas-sunlight')).toHaveText(`${(expected.solar_visibility.value*100).toFixed(1)}%`);
  const host=page.getByTestId('moon-canvas');const terrain=await host.getAttribute('data-terrain');
  await chooseOverlay(page,'illumination');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await expect(page.getByRole('complementary',{name:'Overlays'})).toContainText('100%');
  expect(await host.getAttribute('data-terrain')).toBe(terrain);
  await page.screenshot({path:'../artifacts/simple-solar-overlay.png'});
  await page.getByRole('button',{name:'Close overlays',exact:true}).click();
  await openDestinations(page);await page.getByRole('button',{name:/^Tycho crater/}).click();
  await expect(page.getByTestId('atlas-sunlight')).toHaveText('Unavailable here');
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Overlays'}).locator('.overlay-coverage')).toContainText('Outside the prepared south-pole region');
  expect(errors).toEqual([]);
});

test('Diviner temperature is a source-specific summer local-time overlay, with missing data preserved',async({page,request})=>{
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:/^Shackleton crater/}).click();
  const native=await(await request.get('/api/atlas/inspect?latitude=-89.67&longitude=129.78')).json();
  expect(native.temperature.source_id).toContain('LTIM01');expect(native.temperature.unit).toBe('K');
  await expect(page.getByTestId('atlas-temperature')).toHaveText(`${native.temperature.value.toFixed(1)} K`);
  await chooseOverlay(page,'temperature');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await expect(page.locator('.overlay-menu .active-layer-caption')).toContainText('00:00-00:15 local time');
  await page.screenshot({path:'../artifacts/simple-thermal-overlay.png'});
  const missing=await(await request.get('/api/atlas/inspect?latitude=-89.5&longitude=0')).json();
  expect(missing.temperature.status).toBe('nodata');expect(missing.temperature.value).toBeNull();
  const outside=await(await request.get('/api/atlas/inspect?latitude=0&longitude=0')).json();
  expect(outside.temperature.status).toBe('unavailable');expect(outside.temperature.value).toBeNull();
});

test('polar colors visibly render, blank HTTP 200 tiles do not report success, and preparation is explicit',async({page,request})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGL|shader/i.test(message.text()))errors.push(message.text());});
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:/^Shackleton crater/}).click();
  const host=page.getByTestId('moon-canvas');
  for(const kind of ['temperature','illumination']) {
    await chooseOverlay(page,kind);await page.getByRole('button',{name:'Go to supported region'}).click();await chooseOverlay(page,kind);
    await expect(page.getByTestId('atlas-overlay-status')).toContainText('ready / rendered',{timeout:45000});
    await expect.poll(async()=>JSON.parse((await host.getAttribute('data-overlay-resources'))!).data_tiles).toBeGreaterThan(0);
    expect(JSON.parse((await host.getAttribute('data-overlay-resources'))!).retained_tiles).toBeLessThanOrEqual(96);
    await page.getByRole('slider',{name:'Scientific layer opacity'}).fill('1');
    await expect.poll(async()=>Math.hypot(...(await host.getAttribute('data-camera'))!.split(',').map(Number))).toBeCloseTo(1.08,2);
    const color=(await host.screenshot()).toString('base64');
    await page.getByRole('slider',{name:'Scientific layer opacity'}).fill('0');
    await expect(page.getByTestId('atlas-overlay-status')).toContainText('hidden at 0%');
    const plain=(await host.screenshot()).toString('base64');
    // Compare rendered pixels only to prove visibility, never to infer measurements.
    const changed=await page.evaluate(async({color,plain})=>{
      const decode=async(value:string)=>{const bitmap=await createImageBitmap(await(await fetch(`data:image/png;base64,${value}`)).blob());const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d')!;context.drawImage(bitmap,0,0);bitmap.close();return context.getImageData(0,0,canvas.width,canvas.height).data;};
      const a=await decode(color),b=await decode(plain);let count=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>30)count++;return count;
    },{color,plain});
    expect(changed).toBeGreaterThan(1000);
    await page.getByRole('slider',{name:'Scientific layer opacity'}).fill('0.75');
    await host.screenshot({path:`../artifacts/repair-${kind}-rendered.png`});
  }
  const blank=await(await request.get('/api/atlas/tiles/diviner-polar-midnight/temperature/2/0/0.png')).body();
  await page.route('**/api/atlas/tiles/**',route=>route.fulfill({status:200,contentType:'image/png',body:blank}));
  await chooseOverlay(page,'temperature');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('No prepared data');
  expect(errors).toEqual([]);
  await page.unroute('**/api/atlas/tiles/**');
  await page.route('**/api/atlas/layers',async route=>{const response=await route.fetch();const layers=await response.json();await route.fulfill({response,json:layers.map((layer:any)=>layer.id==='temperature'?{...layer,preparation_status:'not_prepared',angular_spacing_deg:null}:layer)});});
  await page.getByRole('button',{name:'Close overlays',exact:true}).click();await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('not prepared locally');
});
