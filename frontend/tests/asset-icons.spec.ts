import {test,expect} from '@playwright/test';
import {ASSET_ICON_PATHS,markerSvg,markerKey} from '../lib/asset-icons';

test('asset markers are local vector icons for every kind, never letter symbols',()=>{
  const kinds=['habitat','solar_array','battery','communications','robot'] as const;
  expect(Object.keys(ASSET_ICON_PATHS).sort()).toEqual([...kinds].sort());
  expect(new Set(Object.values(ASSET_ICON_PATHS)).size).toBe(kinds.length);
  for(const kind of kinds){
    const uri=markerSvg({kind,tone:'neutral',selected:false});
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    const svg=decodeURIComponent(uri.split(',')[1]);
    expect(svg).toContain(ASSET_ICON_PATHS[kind]);
    expect(svg).not.toContain('<text');
    // Selected state is distinct and restrained: a halo plus an accent ring.
    const selected=decodeURIComponent(markerSvg({kind,tone:'neutral',selected:true}).split(',')[1]);
    expect(selected).toContain('#91bdf0');expect(selected).not.toBe(svg);
  }
  expect(markerKey({kind:'battery',tone:'warning',selected:false,soc:.51}))
    .not.toBe(markerKey({kind:'battery',tone:'nominal',selected:false,soc:.51}));
});
