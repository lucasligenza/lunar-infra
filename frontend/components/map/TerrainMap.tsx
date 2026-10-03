"use client";

import { useEffect, useRef, useState } from "react";
import {recordActivity} from '../../lib/activity';
import Map from "ol/Map.js";
import View from "ol/View.js";
import Projection from "ol/proj/Projection.js";
import ImageLayer from "ol/layer/Image.js";
import VectorLayer from "ol/layer/Vector.js";
import ImageStatic from "ol/source/ImageStatic.js";
import VectorSource from "ol/source/Vector.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import LineString from "ol/geom/LineString.js";
import Polygon from "ol/geom/Polygon.js";
import { Circle as CircleStyle, Fill, Icon as IconStyle, Stroke, Style, Text } from "ol/style.js";
import { defaults as controls } from "ol/control/defaults.js";
import ScaleLine from "ol/control/ScaleLine.js";
import { groundScale, toGeographic, toPolar } from "../../lib/lunar";
import { ASSET_NAMES, type Asset, type Location } from "../../types/mission";
import { markerSvg } from "../../lib/asset-icons";
import type { AssetVisual } from "../globe/MoonCanvas";
import type { Layer, Region, Site } from "../../types/scientific";

type Props = {
  region: Region; layer: Layer; site: Site | null; grid: boolean;opacity?:number;
  onSelect: (longitude: number, latitude: number) => void;
  onPointer: (coordinate: [number, number]) => void;
  assets?: Asset[]; baseSite?: Location; selectedAssetId?: string | null;
  onAssetSelect?: (id: string) => void; placementActive?: boolean;
  assetStates?: Record<string, AssetVisual>; routes?: { id: string; from: Location; to: Location; moving?: boolean }[];
};

export default function TerrainMap({ region, layer, site, grid, opacity=1, onSelect, onPointer, assets, baseSite, selectedAssetId, onAssetSelect, placementActive, assetStates, routes }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const raster = useRef<ImageLayer<ImageStatic> | null>(null);
  const graticule = useRef<VectorLayer<VectorSource> | null>(null);
  const marker = useRef<VectorSource | null>(null);
  const selectCallback = useRef(onSelect);
  const pointerCallback = useRef(onPointer);
  const assetCallback = useRef(onAssetSelect);
  const placing = useRef(placementActive);
  const infrastructure = useRef<VectorSource | null>(null);
  const [imageStatus, setImageStatus] = useState("Loading terrain layer…");
  useEffect(()=>{if(imageStatus==='Layer ready')recordActivity('DATA','Regional terrain layer loaded',`${region.id} / ${layer.id}`);else if(imageStatus.includes('unavailable'))recordActivity('WARN','Regional terrain layer unavailable',`${region.id} / ${layer.id}`);},[imageStatus]);
  const [retry, setRetry] = useState(0);
  const [resolution, setResolution] = useState<number | null>(null);
  const [hoveredAsset, setHoveredAsset] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => { selectCallback.current = onSelect; pointerCallback.current = onPointer; }, [onSelect, onPointer]);
  useEffect(() => { assetCallback.current = onAssetSelect; placing.current = placementActive; }, [onAssetSelect, placementActive]);

  useEffect(() => {
    if (!target.current) return;
    const projection = new Projection({
      code: "LUNAR:MEPA-SP", units: "m", extent: region.bounds_m,
      getPointResolution: (value, point) => value / groundScale(point[0], point[1], region.reference_radius_m),
    });
    const imageLayer = new ImageLayer<ImageStatic>();
    const gridSource = new VectorSource();
    for (const latitude of [-89.5, -89]) {
      const coordinates = Array.from({ length: 181 }, (_, i) => toPolar(i * 2, latitude, region.reference_radius_m));
      const circle = new Feature(new LineString(coordinates));
      circle.setStyle(new Style({ stroke: new Stroke({ color: "rgba(221,236,240,0.3)", width: 1, lineDash: [4, 6] }) }));
      gridSource.addFeature(circle);
    }
    for (const longitude of [0, 90, 180, 270]) {
      const end = toPolar(longitude, -88.5, region.reference_radius_m);
      const line = new Feature(new LineString([[0, 0], end]));
      line.setStyle(new Style({ stroke: new Stroke({ color: "rgba(221,236,240,0.25)", width: 1 }) }));
      gridSource.addFeature(line);
      const label = new Feature(new Point(toPolar(longitude, -88.85, region.reference_radius_m)));
      label.setStyle(new Style({ text: new Text({ text: `${longitude}° E`, font: "12px sans-serif",
        fill: new Fill({ color: "#edf5f7" }), stroke: new Stroke({ color: "#192a38", width: 3 }) }) }));
      gridSource.addFeature(label);
    }
    const pole = new Feature(new Point([0, 0]));
    pole.setStyle(new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: "#f3f7f8" }) }),
      text: new Text({ text: "South pole", offsetY: 15, font: "12px sans-serif",
        fill: new Fill({ color: "#f3f7f8" }), stroke: new Stroke({ color: "#192a38", width: 3 }) }) }));
    gridSource.addFeature(pole);
    const gridLayer = new VectorLayer({ source: gridSource });
    const markerSource = new VectorSource();
    const selectionLayer = new VectorLayer({ source: markerSource, style: new Style({
      image: new CircleStyle({ radius: 7, fill: new Fill({ color: "#eac281" }), stroke: new Stroke({ color: "#16232d", width: 2 }) }),
      stroke: new Stroke({ color: "#f4d092", width: 2 }),
      fill: new Fill({ color: "rgba(244,208,146,0.15)" }),
    }) });
    const assetSource = new VectorSource();
    const assetLayer = new VectorLayer({ source: assetSource });
    const instance = new Map({ target: target.current, layers: [imageLayer, gridLayer, selectionLayer, assetLayer],
      controls: controls({ zoom: false, rotate: false }).extend([new ScaleLine({ units: "metric" })]),
      view: new View({ projection, center: [0, 0], resolution: 180, minResolution: 30, maxResolution: 480,
        extent: region.bounds_m, enableRotation: false, showFullExtent: true }) });
    instance.getView().fit(region.bounds_m, { padding: [50, 60, 60, 60] });
    instance.on("singleclick", event => {
      const identifier = instance.forEachFeatureAtPixel(event.pixel, feature => feature.get("assetId"), { layerFilter: value => value === assetLayer, hitTolerance: 7 });
      if (identifier && !placing.current) { assetCallback.current?.(identifier); return; }
      const [longitude, latitude] = toGeographic(event.coordinate[0], event.coordinate[1], region.reference_radius_m);
      selectCallback.current(longitude, latitude);
    });
    instance.on("pointermove", event => {
      const name = instance.forEachFeatureAtPixel(event.pixel, feature => feature.get("assetName"), { layerFilter: value => value === assetLayer, hitTolerance: 7 });
      setHoveredAsset(name ? { name, x: event.pixel[0], y: event.pixel[1] } : null);
      if (!event.dragging) pointerCallback.current(toGeographic(event.coordinate[0], event.coordinate[1], region.reference_radius_m));
    });
    const updateResolution = () => setResolution(instance.getView().getResolution() ?? null);
    instance.on("moveend", updateResolution);
    updateResolution();
    map.current = instance; raster.current = imageLayer; graticule.current = gridLayer; marker.current = markerSource;
    infrastructure.current = assetSource;
    // An external map must detach on React cleanup, including Strict Mode remounts.
    // https://react.dev/reference/react/useEffect#controlling-a-non-react-widget
    return () => { instance.setTarget(undefined); instance.dispose(); map.current = null; raster.current = null; };
  }, [region]);

  useEffect(() => {
    const source = infrastructure.current;
    if (!source) return;
    source.clear();
    if (baseSite) {
      const base = new Feature(new Point(toPolar(baseSite.longitude_deg, baseSite.latitude_deg, region.reference_radius_m)));
      base.setStyle(new Style({ image: new CircleStyle({ radius: 14, stroke: new Stroke({ color: "#91bdf0", width: 1.5, lineDash: [3, 3] }) }),
        text: new Text({ text: "Base site", offsetY: -24, fill: new Fill({ color: "#cfd8e3" }), stroke: new Stroke({ color: "#142331", width: 3 }) }) }));
      source.addFeature(base);
    }
    for (const route of routes ?? []) {
      const path = new Feature(new LineString([route.from, route.to].map(point => toPolar(point.longitude_deg, point.latitude_deg, region.reference_radius_m))));
      path.setStyle(new Style({ stroke: new Stroke({ color: route.moving ? "#91bdf0" : "rgba(145,189,240,.6)", width: 2, lineDash: [6, 5] }) }));
      source.addFeature(path);
    }
    for (const asset of assets ?? []) {
      const visual = assetStates?.[asset.id], position = visual?.position ?? asset.location, selected = asset.id === selectedAssetId;
      const feature = new Feature(new Point(toPolar(position.longitude_deg, position.latitude_deg, region.reference_radius_m)));
      feature.set("assetId", asset.id);
      feature.set("assetName", `${asset.name} · hypothetical ${ASSET_NAMES[asset.kind].toLowerCase()}${visual?.note ? ` · ${visual.note}` : ""}`);
      // Locally generated vector badge (no network); constant screen size like the globe sprites.
      feature.setStyle(new Style({ image: new IconStyle({ src: markerSvg({ kind: asset.kind, tone: visual?.tone ?? (asset.operational ? "neutral" : "idle"), selected, soc: visual?.soc, dim: visual?.dim ?? !asset.operational }, 40),
        width: selected ? 38 : 32, height: selected ? 38 : 32 }), zIndex: selected ? 2 : 1 }));
      source.addFeature(feature);
      if (asset.id !== selectedAssetId) continue;
      const label = new Feature(new Point(toPolar(asset.location.longitude_deg, asset.location.latitude_deg, region.reference_radius_m)));
      label.set("assetId", asset.id);
      label.set("assetName", asset.name);
      label.setStyle(new Style({ text: new Text({ text: asset.name, offsetY: 24, font: "12px sans-serif", fill: new Fill({ color: "#e8f3f7" }), stroke: new Stroke({ color: "#142331", width: 3 }) }) }));
      source.addFeature(label);
    }
  }, [assets, baseSite, selectedAssetId, region, assetStates, routes]);

  useEffect(() => {
    if (!map.current || !raster.current) return;
    setImageStatus("Loading terrain layer…");
    // Georeferenced native-grid rendering; nearest-neighbor preserves cell boundaries.
    // https://openlayers.org/en/latest/apidoc/module-ol_source_ImageStatic-Static.html
    const source = new ImageStatic({ url: `/api${layer.image_url}?retry=${retry}`, imageExtent: region.bounds_m,
      projection: map.current.getView().getProjection(), interpolate: false,
      attributions: "NASA / LRO LOLA" });
    let active = true;
    source.on("imageloadend", () => { if (active) setImageStatus("Layer ready"); });
    source.on("imageloaderror", () => { if (active) setImageStatus("Layer unavailable. Check the backend and retry."); });
    raster.current.setSource(source);
    return () => { active = false; source.dispose(); };
  }, [region, layer, retry]);

  useEffect(() => { graticule.current?.setVisible(grid); }, [grid, region]);
  useEffect(()=>{raster.current?.setOpacity(opacity);},[opacity,region]);
  useEffect(() => {
    marker.current?.clear();
    if (!site || !marker.current) return;
    const { x_m: x, y_m: y } = site.coordinates;
    const { x_m: cx, y_m: cy } = site.sample.center;
    const half = region.resolution_m / 2;
    marker.current.addFeature(new Feature(new Point([x, y])));
    marker.current.addFeature(new Feature(new Polygon([[[cx - half, cy - half], [cx + half, cy - half],
      [cx + half, cy + half], [cx - half, cy + half], [cx - half, cy - half]]])));
    map.current?.getView().setCenter([x, y]);
  }, [site, region]);

  function navigate(action: "in" | "out" | "reset") {
    const view = map.current?.getView();
    if (!view) return;
    if (action === "reset") view.fit(region.bounds_m, { padding: [50, 60, 60, 60] });
    else view.adjustZoom(action === "in" ? 1 : -1);
  }

  return <>
    <div className={placementActive ? "terrain-map placing" : "terrain-map"} ref={target} tabIndex={0} role="application"
      aria-label="Interactive lunar south-pole map" data-testid="terrain-map" />
    {hoveredAsset && <div className="map-tooltip" role="tooltip" style={{ left: `${hoveredAsset.x}px`, top: `${hoveredAsset.y}px` }}>{hoveredAsset.name}</div>}
    <div className="map-navigation" aria-label="Map navigation">
      <button onClick={() => navigate("in")} aria-label="Zoom in">+</button>
      <button onClick={() => navigate("out")} aria-label="Zoom out">−</button>
      <button onClick={() => navigate("reset")} aria-label="Reset map view">⌖</button>
    </div>
    <div className="map-resolution" data-testid="map-resolution">{resolution ? `${resolution.toFixed(0)} m / screen pixel` : "Preparing map"}</div>
    {imageStatus !== "Layer ready" && <div className="map-message" role="status">{imageStatus}
      {imageStatus.startsWith("Layer unavailable") && <button onClick={() => setRetry(value => value + 1)}>Retry layer</button>}
    </div>}
    <span className="sr-only" data-testid="layer-status" role="status">{imageStatus}</span>
  </>;
}
