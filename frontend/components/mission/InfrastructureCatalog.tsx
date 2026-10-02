"use client";
import {ASSET_NAMES,type AssetKind,type Scenario,type Location} from '../../types/mission';
import Icon from '../ui/Icon';

const purpose:Record<AssetKind,string>={habitat:'Living & research',solar_array:'Electrical generation',battery:'Energy storage',communications:'Surface communications',robot:'Mobile equipment'};

export default function InfrastructureCatalog({scenario,working,placement,selectedAssetId,validLocation,onPlace,onSelect,onBase}: {
  scenario:Scenario;working:boolean;placement:AssetKind|'move'|null;selectedAssetId:string|null;validLocation:Location|null;
  onPlace:(kind:AssetKind)=>void;onSelect:(id:string)=>void;onBase:()=>void;
}) {return (
<section className="tool-section asset-catalog" aria-label="Infrastructure catalog">
            <p>Choose an asset, then click the surface.</p>
            {(Object.keys(ASSET_NAMES) as AssetKind[]).map(kind => <button key={kind} disabled={working} aria-pressed={placement === kind}
              aria-label={`Place ${ASSET_NAMES[kind].toLowerCase()}`} onClick={()=>onPlace(kind)}><span className="asset-badge" aria-hidden="true"><Icon name={kind}/></span><span className="asset-choice-copy"><strong>{kind==='robot'?'Rover':kind==='communications'?'Communications':ASSET_NAMES[kind]}</strong><small>{purpose[kind]}</small></span><Icon name="plus"/></button>)}
            <details className="placed-assets"><summary>Placed assets ({scenario.assets.length})</summary>
            <div className="asset-list">{scenario.assets.map(asset => <button key={asset.id} aria-pressed={asset.id === selectedAssetId}
              disabled={working} onClick={()=>onSelect(asset.id)} aria-label={`Select asset: ${asset.name}`}><Icon name={asset.kind}/>{asset.name}</button>)}</div>
            </details><details><summary>Base location</summary><button disabled={working || !validLocation} onClick={onBase}>Use selected location as base site</button></details>
          </section>
);}
