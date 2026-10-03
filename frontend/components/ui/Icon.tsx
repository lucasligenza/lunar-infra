const paths = {
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  layers: 'm3 8 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 16l9 5 9-5',
  build: 'm3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10',
  simulate: 'M4 4v16h16M7 14l4-5 4 3 5-7',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5',
  chevron: 'm8 4 8 8-8 8',
  down: 'm5 9 7 7 7-7',
  close: 'm6 6 12 12M6 18 18 6',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  target: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  elevation: 'm2 19 6-12 4 7 4-10 6 15H2Zm4-4 2 1 2-1M14 9l2 2 2-2',
  slope: 'M3 19 21 5v14H3Zm11 0a7 7 0 0 0-2-5',
  temperature: 'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 8v10M18 5h3M18 9h2',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
  geology: 'm3 7 7-4 11 4-5 6 5 5-10 3-8-5V7Zm0 0 8 4 5 2M11 11v10M10 3l1 8',
  habitat: 'M3 20V10l9-7 9 7v10H3ZM9 20v-7h6v7M6 11h1M17 11h1',
  solar_array: 'm5 3-3 13h20L19 3H5Zm7 0v13M4 9h16M12 16v5M8 21h8',
  battery: 'M3 6h16v12H3V6Zm16 4h3v4h-3M7 10v4M11 10v4M15 10v4',
  communications: 'M4 4a12 12 0 0 0 16 16L4 4Zm8 8 6-6M16 3a5 5 0 0 1 5 5M9 19l-2 3M15 19l2 3',
  robot: 'M5 17h14l2-8H3l2 8Zm2 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 9V5h6V2',
  play: 'm8 4 12 8-12 8V4Z',
  pause: 'M7 4v16M17 4v16',
  plus: 'M12 4v16M4 12h16',
  folder: 'M3 6h7l2 3h9v11H3V6Z',
  back: 'm15 4-8 8 8 8',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
  activity: 'M3 5h18v14H3V5Zm4 5 3 2-3 2M12 15h5',
  mission: 'M4 21V4M4 4h11l-2 4 2 4H4',
  grid: 'M4 4h16v16H4V4Zm0 5.3h16M4 14.7h16M9.3 4v16M14.7 4v16',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7.5h.01',
} as const;
export type IconName = keyof typeof paths;

/** Small, shared UI glyphs. Never encode scientific measurements or status. */
export default function Icon({name,className=''}:{name:IconName;className?:string}) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]}/></svg>;
}
