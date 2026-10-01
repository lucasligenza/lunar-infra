import {openDestinations,closeDestinations} from './workspace';
import { test, expect } from '@playwright/test';
import { lunarCoordinate, lunarVector, terrainHeight } from '../lib/globe';
import { toPolar } from '../lib/lunar';

test('lunar globe coordinates, seam, poles and global samples match scientific API', async ({request})=>{
  for(const [lon,lat] of [[0,0],[90,0],[180,0],[270,0],[129.78,-89.67],[0,90],[0,-90],[359.999,20]]) {
    const vector = lunarVector(lon,lat);
    expect(Math.hypot(...vector)).toBeCloseTo(1,12);
    const result = lunarCoordinate(...vector);
    expect(result[0]).toBeCloseTo(lon,8);expect(result[1]).toBeCloseTo(lat,8);
  }
  expect(lunarVector(90,0)[2]).toBeCloseTo(-1,12);
  expect(()=>lunarCoordinate(0,0,0)).toThrow();expect(()=>lunarVector(0,100)).toThrow();
  const bytes = await (await request.get('/api/globe/elevation.bin')).body();
  const samples = new Int16Array(bytes.length/2);
  for(let i=0;i<samples.length;i++) samples[i]=bytes.readInt16LE(i*2);
  for(const [lon,lat] of [[0,0],[359.9,0],[23.47,.67],[0,-90],[0,90],[129.78,-89.67]]) {
    const point = await (await request.get(`/api/globe/inspect/location?longitude=${lon}&latitude=${lat}`)).json();
    expect(terrainHeight(samples,lon,lat)).toBe(point.elevation.value);
    if(point.local_analysis) {
      const local = await (await request.get(`/api/sites/inspect?longitude=${lon}&latitude=${lat}`)).json();
      const projected = toPolar(...lunarCoordinate(...lunarVector(lon,lat)),1737400);
      expect(projected[0]).toBeCloseTo(local.coordinates.x_m,5);expect(projected[1]).toBeCloseTo(local.coordinates.y_m,5);
    }
  }
});

test('global NASA globe supports destinations, surface picking, layers and camera controls', async ({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await expect(page.getByRole('button',{name:'Moon',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'../artifacts/phase3-global-initial.png'});
  await closeDestinations(page);
  const canvas = page.getByLabel('Interactive 3D Moon', {exact:true});
  const box = (await canvas.boundingBox())!;
  await canvas.click({position:{x:box.width/2,y:box.height/2}});
  await expect(page.getByTestId('global-elevation')).not.toHaveText('Unavailable');
  await page.getByRole('button',{name:'Display',exact:true}).click();
  await page.getByRole('checkbox',{name:'Lunar graticule',exact:true}).check();
  await page.getByRole('checkbox',{name:'NASA color visualization',exact:true}).uncheck();
  await page.getByRole('checkbox',{name:'NASA color visualization',exact:true}).check();
  await page.getByRole('button',{name:'Zoom globe in',exact:true}).click();
  await page.getByRole('button',{name:'Zoom globe out',exact:true}).click();
  await page.getByRole('button',{name:'Display',exact:true}).click();
  await page.getByRole('button',{name:'Open destinations',exact:true}).click();
  for(const name of ['South Pole–Aitken basin','Lunar north pole','Tycho crater','Copernicus crater','Mare Tranquillitatis / Apollo 11','Lunar south pole','Shackleton crater']) {
  await openDestinations(page);
    await page.getByRole('button',{name:new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`)}).click();
    await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await expect(page.getByTestId('local-coverage')).toHaveText(['Lunar south pole','Shackleton crater'].includes(name)?'240 m south-pole grid':'outside coverage');
  }
  await page.screenshot({path:'../artifacts/phase3-global-selected.png'});
  await page.getByRole('button',{name:'Reset globe',exact:true}).click();
  await page.getByRole('button',{name:'Close region details',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Selected lunar region'})).toHaveCount(0);
  await page.getByLabel('Find a lunar destination').fill('Tycho');
  await expect(page.getByRole('button',{name:/^Tycho crater/})).toBeVisible();
  await expect(page.getByRole('button',{name:/^Copernicus crater/})).toHaveCount(0);
  expect(errors).toEqual([]);
});
