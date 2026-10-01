"use client";
import {ASSET_NAMES,ASSET_SYMBOLS,type AssetKind,type Scenario,type Location} from '../../types/mission';

export default function InfrastructureCatalog({scenario,working,placement,selectedAssetId,validLocation,onPlace,onSelect,onBase}: {
  scenario:Scenario;working:boolean;placement:AssetKind|'move'|null;selectedAssetId:string|null;validLocation:Location|null;
  onPlace:(kind:AssetKind)=>void;onSelect:(id:string)=>void;onBase:()=>void;
}) {return (
<details open className="tool-section asset-catalog"><summary>Infrastructure catalog</summary>
            <p>Hypothetical assets. Click a tool, then place it on valid terrain.</p>
            {(Object.keys(ASSET_NAMES) as AssetKind[]).map(kind => <button key={kind} disabled={working} aria-pressed={placement === kind}
              onClick={()=>onPlace(kind)}><span className="asset-badge" aria-hidden="true">{ASSET_SYMBOLS[kind]}</span>Place {ASSET_NAMES[kind].toLowerCase()}</button>)}
            <div className="asset-list">{scenario.assets.map(asset => <button key={asset.id} aria-pressed={asset.id === selectedAssetId}
              disabled={working} onClick={()=>onSelect(asset.id)} aria-label={`Select asset: ${asset.name}`}><span>{ASSET_SYMBOLS[asset.kind]}</span>{asset.name}</button>)}</div>
            <button disabled={working || !validLocation} onClick={onBase}>Use selected location as base site</button>
          </details>
);}
