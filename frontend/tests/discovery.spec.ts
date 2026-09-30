import {test,expect} from '@playwright/test';

test('catalog previews real acquisition budgets and handles bounded metadata discovery and source failure',async({page})=>{
  // Synthetic protocol metadata tests UI handling; no temperature is supplied.
  let attempts=0;
  await page.route('**/api/atlas/discovery/diviner-gcp*',route=>{
    attempts++;if(attempts===1)return route.fulfill({status:503,json:{detail:'PDS metadata connection failed; no numeric source was substituted.'}});
    return route.fulfill({json:{collection_id:'urn:nasa:pds:test:protocol',source_url:'https://pds.nasa.gov/api/search/1/products',
      fetched_at:'2026-09-30T00:00:00Z',metadata_sha256:'0'.repeat(64),total_products:1,limit:20,note:'Synthetic protocol fixture; no scientific values.',products:[{
        identifier:'urn:nasa:pds:test:protocol:metadata_only::1.0',title:'Metadata protocol test',product_class:'Product_Observational',label_url:'https://pds.nasa.gov/test.xml',version:'1.0',
        period:{start:null,stop:null},indexed_coverage:{south:0,north:10,west:0,east:360,note:'Unvalidated index bounds'},
        files:[{url:'https://pds.nasa.gov/test.tab',bytes:156211313,md5:null,media_type:'text/plain'}]}]}});
  });
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.getByRole('button',{name:'Lunar atlas',exact:true}).click();
  await page.getByRole('button',{name:'Catalog',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Search science datasets'});
  await search.fill('GLD100');await page.locator('.atlas-catalog > details > summary').click();
  await page.getByRole('button',{name:'Inspect acquisition budget',exact:true}).click();
  await expect(page.getByText(/Download budget 132.7 MB/)).toBeVisible();
  await search.fill('Diviner');await page.getByText('Diviner thermal products',{exact:true}).click();
  await page.getByRole('button',{name:'Browse PDS products',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'PDS metadata connection failed'})).toBeVisible();
  await page.getByRole('button',{name:'Browse PDS products',exact:true}).click();
  await expect(page.getByText(/1 of 1 indexed products/)).toBeVisible();
  await page.getByText('Metadata protocol test',{exact:true}).click();
  await expect(page.getByText('156.21 MB / text/plain',{exact:true})).toBeVisible();
  await expect(page.getByText('Numerical queries and overlays unavailable.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Original scientific label',exact:true})).toHaveAttribute('href','https://pds.nasa.gov/test.xml');
  await page.getByRole('button',{name:'Refresh PDS metadata',exact:true}).click();
  await expect.poll(()=>attempts).toBe(3);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button',{name:'Close atlas',exact:true})).toBeInViewport();
});
