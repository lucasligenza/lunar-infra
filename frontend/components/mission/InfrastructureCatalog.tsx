"use client";
import {ASSET_NAMES,type AssetKind,type Scenario,type Location} from '../../types/mission';
import Icon from '../ui/Icon';

const purpose:Record<AssetKind,string>={habitat:'Living & research',solar_array:'Electrical generation',battery:'Energy storage',communications:'Surface communications',robot:'Mobile equipment'};
export const ASSET_LABEL:Record<AssetKind,string>={habitat:'Habitat',solar_array:'Solar array',battery:'Battery',communications:'Communications',robot:'Rover'};

/** Add-asset palette: choose equipment, then click the surface. Nothing else lives here. */
export default function InfrastructureCatalog({working,placement,onPlace,onClose}: {
  working:boolean;placement:AssetKind|'move'|'route'|null;onPlace:(kind:AssetKind)=>void;onClose:()=>void;
}) {return (
<aside className="surface-menu asset-catalog" aria-label="Infrastructure catalog">
  <header className="menu-header"><h2>Add asset</h2><button onClick={onClose} aria-label="Close asset palette" title="Close asset palette"><Icon name="close"/></button></header>
  <div className="menu-body"><p>Choose equipment, then click the surface.</p>
    {(Object.keys(ASSET_NAMES) as AssetKind[]).map(kind => <button key={kind} disabled={working} aria-pressed={placement === kind}
      aria-label={`Place ${ASSET_NAMES[kind].toLowerCase()}`} onClick={()=>onPlace(kind)}><span className="asset-badge" aria-hidden="true"><Icon name={kind}/></span><span className="asset-choice-copy"><strong>{ASSET_LABEL[kind]}</strong><small>{purpose[kind]}</small></span><Icon name="plus"/></button>)}
  </div>
</aside>
);}

/** Placed equipment and base site, shown in the Missions drawer. */
export function MissionAssets({scenario,working,selectedAssetId,validLocation,onSelect,onBase}:{
  scenario:Scenario;working:boolean;selectedAssetId:string|null;validLocation:Location|null;onSelect:(id:string)=>void;onBase:()=>void;
}) {
  return <section className="placed-assets" aria-label="Placed assets"><h3>Placed assets ({scenario.assets.length})</h3>
    {!scenario.assets.length&&<p>No equipment yet. Use Add asset, then click the surface.</p>}
    <div className="asset-list">{scenario.assets.map(asset => <button key={asset.id} aria-pressed={asset.id === selectedAssetId}
      disabled={working} onClick={()=>onSelect(asset.id)} aria-label={`Select asset: ${asset.name}`}><Icon name={asset.kind}/><span>{asset.name}</span><small>{ASSET_LABEL[asset.kind]}</small></button>)}</div>
    <div className="base-site"><h3>Base site</h3><p className="mono">{scenario.site.latitude_deg.toFixed(5)}° / {scenario.site.longitude_deg.toFixed(5)}° E</p>
      <button disabled={working || !validLocation} onClick={onBase}>Use selected location as base site</button></div>
  </section>;
}
