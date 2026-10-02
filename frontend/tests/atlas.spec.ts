import {chooseOverlay} from './workspace';
import {openActivity,openDestinations,closeDestinations,atlasAdvanced,regionAdvanced} from './workspace';
import {test,expect} from '@playwright/test';
import {SphereGeometry,PerspectiveCamera} from 'three';
import {tileGeometry,geographicTile,visibleTiles,viewportTiles} from '../lib/atlas-render';
import {lunarVector} from '../lib/globe';
import {areaBoundary} from '../lib/atlas-area';

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

test('close-up camera includes surface tiles whose centers are outside the viewport',()=>{
  for(const [lon,lat] of [[23.47,.67],[359.9,0],[.1,89.5],[270,-89.5],[180,20]])for(const z of [1,3,5]) {
    const camera=new PerspectiveCamera(42,870/590,.002,30);camera.position.set(...lunarVector(lon,lat,1.18));
    if(Math.abs(lat)>85)camera.up.set(0,0,lat>0?-1:1);camera.lookAt(0,0,0);
    const tiles=visibleTiles(camera,z),x=Math.floor(lon/(180/2**z)),y=Math.min(2**z-1,Math.floor((90-lat)/(180/2**z)));
    expect(tiles.some(tile=>tile.x===x&&tile.y===y)).toBe(true);
    const selected=viewportTiles(camera);expect(selected.length).toBeLessThanOrEqual(24);
    expect(selected).toEqual(visibleTiles(camera,selected[0].z));
  }
});

test('failed scientific tiles retain native queries and retry with bounded rendering resources',async({page,request})=>{
  let failing=true;
  await page.route('**/api/atlas/tiles/**',route=>failing?route.fulfill({status:503,body:'Synthetic tile protocol failure'}):route.continue());
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Tycho crater/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  const destination=(await(await request.get('/api/destinations')).json()).find((place:any)=>place.id==='tycho');
  const sample=await(await request.get(`/api/atlas/inspect?latitude=${destination.coordinates.latitude_deg}&longitude=${destination.coordinates.longitude_deg}`)).json();
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${sample.elevation.value.toLocaleString('en-US')} m`);
  await chooseOverlay(page,'slope');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific tiles unavailable');
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${sample.elevation.value.toLocaleString('en-US')} m`);
  failing=false;await page.getByRole('button',{name:'Retry scientific layer',exact:true}).click();
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  const host=page.getByTestId('moon-canvas');
  await expect.poll(async()=>JSON.parse((await host.getAttribute('data-overlay-resources'))!).active_requests).toBe(0);
  const resources=JSON.parse((await host.getAttribute('data-overlay-resources'))!);
  expect(resources.retained_tiles).toBeLessThanOrEqual(32);expect(resources.visible_tiles).toBeGreaterThan(0);
  await chooseOverlay(page,'none');
  await expect.poll(async()=>Number(await host.getAttribute('data-overlay-tiles'))).toBe(0);
});

test('atlas queries original GLD100 across regions and switches verified datasets',async({page,request})=>{
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  const sample=await (await request.get('/api/atlas/inspect?latitude=0.67&longitude=23.47')).json();
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${sample.elevation.value.toLocaleString('en-US')} m`);
  await expect(page.getByRole('complementary',{name:'Lunar atlas'})).toContainText('WAC_GLD100_E000N1800_032P');
  await atlasAdvanced(page);
  await page.getByRole('combobox',{name:'Atlas terrain dataset'}).selectOption('lola-global');
  const lola=await (await request.get('/api/atlas/inspect?latitude=0.67&longitude=23.47&dataset=lola-global')).json();
  await expect(page.getByTestId('atlas-elevation')).toHaveText(`${lola.elevation.value.toLocaleString('en-US')} m`);
  await page.getByText('Measurement metadata',{exact:true}).click();
  await expect(page.getByRole('region',{name:'Atlas terrain inspection'}).getByText('MEAN EARTH/POLAR AXIS OF DE421',{exact:true})).toBeVisible();
  await page.screenshot({path:'../artifacts/phase4-elevation-slice.png'});
  await atlasAdvanced(page);
  await page.getByRole('button',{name:'Catalog',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search science datasets'}).fill('mineralogy');
  await page.getByText('Moon Mineralogy Mapper observations',{exact:true}).click();
  await expect(page.getByText('Numerical queries unavailable; 3D overlay unavailable',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  await closeDestinations(page);
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Close atlas',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('scientific layers follow the 3D surface with legends opacity and synchronized reveal',async({page,request})=>{
  test.setTimeout(90000);
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await closeDestinations(page);
  const host=page.getByTestId('moon-canvas'),terrain=await host.getAttribute('data-terrain');
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await chooseOverlay(page,'elevation');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await expect(page.getByRole('region',{name:'Scientific surface layers'})).toContainText('12,000 m');
  await expect.poll(async()=>Number(await host.getAttribute('data-overlay-tiles'))).toBeGreaterThan(0);
  await page.getByRole('slider',{name:'Scientific layer opacity',exact:true}).fill('0.5');
  await expect(page.getByRole('slider',{name:'Scientific layer opacity',exact:true})).toHaveValue('0.5');
  await atlasAdvanced(page);
  await page.getByRole('checkbox',{name:'Compare imagery and science',exact:true}).check();
  await page.getByRole('slider',{name:'Comparison reveal',exact:true}).fill('0.65');
  await expect(page.locator('.atlas-reveal')).toHaveAttribute('style',/65%/);
  await page.screenshot({path:'../artifacts/phase4-elevation-overlay.png'});
  expect(await host.getAttribute('data-terrain')).toBe(terrain);
  await chooseOverlay(page,'slope');
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

test('sectors favorites arbitrary regions profiles and mode state use actual numeric atlas output',async({page,request})=>{
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await regionAdvanced(page);
  await page.getByRole('button',{name:'Analyze this region',exact:true}).click();
  const analysis=page.getByRole('region',{name:'Regional atlas analysis'});
  await expect(analysis).toContainText('0.67000° / 23.47000° E');
  await expect(page.getByTestId('terrain-map')).toBeHidden();
  await page.getByRole('button',{name:'Calculate regional statistics',exact:true}).click();
  const expected=await (await request.post('/api/atlas/analysis',{data:{area:{kind:'circle',latitude_deg:.67,longitude_deg:23.47,radius_km:25}}})).json();
  await expect(page.getByTestId('area-elevation')).toHaveText([expected.elevation.minimum,expected.elevation.mean,expected.elevation.maximum].map((value:number)=>value.toFixed(1)).join(' · ')+' m');
  await page.getByRole('button',{name:'Generate elevation profile',exact:true}).click();
  await expect(page.getByRole('img',{name:'Numeric elevation profile'})).toBeVisible();
  await page.getByRole('slider',{name:'Inspect profile sample',exact:true}).fill('64');
  await expect(page.getByRole('button',{name:'Close atlas',exact:true})).toBeInViewport();
  const exported=page.waitForEvent('download');await page.getByRole('button',{name:'Export profile CSV',exact:true}).click();expect((await exported).suggestedFilename()).toBe('lunar-elevation-profile.csv');
  await page.screenshot({path:'../artifacts/phase4-regional-profile.png'});
  await openActivity(page, 'Explore');
  await openActivity(page, 'Analyze');
  await expect(page.getByTestId('area-elevation')).toHaveText([expected.elevation.minimum,expected.elevation.mean,expected.elevation.maximum].map((value:number)=>value.toFixed(1)).join(' · ')+' m');
  await atlasAdvanced(page);
  await page.getByRole('button',{name:'Regions',exact:true}).click();
  await page.getByRole('combobox',{name:'Sector depth',exact:true}).selectOption('1');
  await expect(page.locator('.sector-overview button')).toHaveCount(24);
  await page.getByRole('combobox',{name:'Hemisphere',exact:true}).selectOption('far');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Far sector 1.1.1/}).click();
  await expect.poll(()=>page.getByTestId('moon-canvas').getAttribute('data-sector-boundaries')).not.toBe('0');
  await page.getByRole('textbox',{name:'Favorite name',exact:true}).fill('Far-side study');
  await page.getByRole('button',{name:'Save selected location',exact:true}).click();
  await expect(page.getByRole('button',{name:'Far-side study',exact:true})).toBeVisible();
  await page.screenshot({path:'../artifacts/phase4-sectors.png'});
  await openActivity(page, 'Explore');
  await page.reload();await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.getByRole('button',{name:'Overlays',exact:true}).click(); await atlasAdvanced(page);
  await page.getByRole('button',{name:'Regions',exact:true}).click();
  await page.getByRole('button',{name:'Far-side study',exact:true}).click();
  await atlasAdvanced(page);
  await page.getByRole('button',{name:'Analysis',exact:true}).click();
  await page.getByRole('combobox',{name:'Analysis area',exact:true}).selectOption('box');
  await page.getByLabel('south (°)',{exact:true}).fill('-1');await page.getByLabel('north (°)',{exact:true}).fill('1');
  await page.getByRole('button',{name:'Calculate regional statistics',exact:true}).click();
  await expect(page.getByRole('region',{name:'Regional terrain statistics'})).toContainText('350°–10° E');
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Close atlas',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('analysis radius outlines use lunar great-circle geometry across seam and poles',()=>{
  for(const location of [{latitude_deg:0,longitude_deg:359.9},{latitude_deg:90,longitude_deg:0},{latitude_deg:89.9,longitude_deg:0},{latitude_deg:-90,longitude_deg:180}]) {
    const outline=areaBoundary(location,{radius:'50',kind:'circle',bounds:{south:'0',north:'1',west:'0',east:'1'},endpoint:{latitude:'0',longitude:'0'},report:null,profile:null});
    expect(new Set(outline.slice(0,-1).map(point=>`${point.latitude_deg.toFixed(7)}/${point.longitude_deg.toFixed(7)}`)).size).toBe(96);
    for(const point of outline){const lat=point.latitude_deg*Math.PI/180,start=location.latitude_deg*Math.PI/180,delta=(point.longitude_deg-location.longitude_deg)*Math.PI/180;
      const angle=2*Math.asin(Math.sqrt(Math.sin((lat-start)/2)**2+Math.cos(lat)*Math.cos(start)*Math.sin(delta/2)**2));expect(angle*1737.4).toBeCloseTo(50,7);}
  }
});

test('USGS geology colors the Moon with original categorical legend and source-linked interpretation',async({page,request})=>{
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  const point=await (await request.get('/api/atlas/inspect?latitude=.67&longitude=23.47')).json();
  await expect(page.getByTestId('atlas-geology')).toHaveText(`${point.geology.category.code} / ${point.geology.category.name}`);
  await chooseOverlay(page,'geology');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await page.getByText('49 geological units / categorical legend',{exact:true}).click();
  await expect(page.locator('.geology-legend li')).toHaveCount(49);
  await closeDestinations(page);
  await page.getByRole('button',{name:'Reset globe',exact:true}).click();
  await expect.poll(async()=>Number((await page.getByTestId('moon-canvas').getAttribute('data-camera'))!.split(',')[0])).toBeGreaterThan(3);
  await page.screenshot({path:'../artifacts/phase4-geology-globe.png'});
  await atlasAdvanced(page);
  await page.getByRole('button',{name:'Catalog',exact:true}).click();await page.getByRole('searchbox',{name:'Search science datasets'}).fill('geology');
  await page.getByText('Unified Geologic Map of the Moon',{exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Lunar atlas'})).toContainText('Numerical source available');
});
