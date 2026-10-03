// One vector icon set for hypothetical infrastructure, used by the HTML UI, the
// Three.js globe sprites and the OpenLayers polar map. Paths use a 24-unit
// viewBox and are drawn locally (Path2D / inline SVG); no runtime network fetch.
import type {AssetKind} from '../types/mission';

export const ASSET_ICON_PATHS:Record<AssetKind,string>={
  // Pressurized dome module with door and mast.
  habitat:'M3 19h18M5 19v-4.5a7 7 0 0 1 14 0V19M10 19v-3.5h4V19M12 7.5V4.5M10.5 4.5h3',
  // Tilted photovoltaic panel on a post.
  solar_array:'M5 4h15l-2.5 9.5h-15L5 4ZM3.8 8.8h15M10 4l-2.5 9.5M15 4l-2.5 9.5M10 13.5V19M6.5 19h7',
  // Upright storage cell with terminal and charge bands.
  battery:'M7 6.5h10V21H7V6.5ZM10 3.5h4v3M9.5 11h5M9.5 14.5h5M9.5 18h5',
  // Parabolic dish on a tripod.
  communications:'M4.5 9.5a8 8 0 0 0 10 10l-10-10ZM9.5 14.5l5.5-5.5M15 9l2.2-2.2M12 21h8M16 21l-1.6-5.2',
  // Six-wheeled surface rover with mast.
  robot:'M3.5 14h17v-3.5h-17V14ZM7 10.5V7h7v3.5M14 7l3-3M6 18.5a1.8 1.8 0 1 0 0-.01M12 18.5a1.8 1.8 0 1 0 0-.01M18 18.5a1.8 1.8 0 1 0 0-.01M4 14l1 2.7M20 14l-1 2.7',
};

export type MarkerTone='neutral'|'nominal'|'idle'|'warning'|'failure';
export const TONE_COLOR:Record<MarkerTone,string>={neutral:'#cfd8e3',nominal:'#53b987',idle:'#7d8794',warning:'#d7a44b',failure:'#d96b6b'};
export const SELECTED_COLOR='#91bdf0';

export type MarkerStyle={kind:AssetKind;tone:MarkerTone;selected:boolean;soc?:number|null;dim?:boolean};

export function markerKey(style:MarkerStyle) {
  return `${style.kind}|${style.tone}|${style.selected}|${style.soc==null?'-':Math.round(style.soc*20)}|${Boolean(style.dim)}`;
}

/** Draw a circular badge: dark disc, state ring, optional SOC arc, white vector glyph. */
export function drawMarker(context:CanvasRenderingContext2D,size:number,style:MarkerStyle) {
  const c=size/2,ring=TONE_COLOR[style.tone];
  context.clearRect(0,0,size,size);
  if(style.selected){context.beginPath();context.arc(c,c,c-1,0,Math.PI*2);context.fillStyle='rgba(145,189,240,.28)';context.fill();}
  const radius=style.selected?c*.78:c*.72;
  context.beginPath();context.arc(c,c,radius,0,Math.PI*2);context.fillStyle=style.dim?'rgba(14,18,24,.78)':'rgba(12,17,23,.94)';context.fill();
  context.lineWidth=size*(style.selected?.07:.05);context.strokeStyle=style.selected?SELECTED_COLOR:ring;context.stroke();
  if(style.soc!=null){
    context.beginPath();context.arc(c,c,radius+size*.06,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,style.soc)));
    context.lineWidth=size*.045;context.strokeStyle=style.tone==='warning'||style.tone==='failure'?TONE_COLOR[style.tone]:TONE_COLOR.nominal;context.stroke();
  }
  const scale=radius*1.25/24;
  context.save();context.translate(c-12*scale,c-12*scale);context.scale(scale,scale);
  context.lineWidth=1.7;context.lineCap='round';context.lineJoin='round';
  context.strokeStyle=style.dim?'#9aa4b0':'#f0f3f6';context.stroke(new Path2D(ASSET_ICON_PATHS[style.kind]));
  context.restore();
}

/** Inline SVG data URI for OpenLayers icons (generated locally, never fetched). */
export function markerSvg(style:MarkerStyle,size=40) {
  const ring=style.selected?SELECTED_COLOR:TONE_COLOR[style.tone],stroke=style.selected?3:2;
  const halo=style.selected?`<circle cx="20" cy="20" r="19" fill="rgba(145,189,240,.28)"/>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">${halo}<circle cx="20" cy="20" r="${style.selected?15.5:14.5}" fill="rgba(12,17,23,.94)" stroke="${ring}" stroke-width="${stroke}"/>`+
    `<g transform="translate(8.5 8.5) scale(.96)" fill="none" stroke="${style.dim?'#9aa4b0':'#f0f3f6'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ASSET_ICON_PATHS[style.kind]}"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
