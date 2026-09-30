"use client";

import { useEffect, useRef, useState } from "react";
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
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style.js";
import { defaults as controls } from "ol/control/defaults.js";
import ScaleLine from "ol/control/ScaleLine.js";
import { groundScale, toGeographic, toPolar } from "../../lib/lunar";
import type { Layer, Region, Site } from "../../types/scientific";

type Props = {
  region: Region; layer: Layer; site: Site | null; grid: boolean;
  onSelect: (longitude: number, latitude: number) => void;
  onPointer: (coordinate: [number, number]) => void;
};

export default function TerrainMap({ region, layer, site, grid, onSelect, onPointer }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const raster = useRef<ImageLayer<ImageStatic> | null>(null);
  const graticule = useRef<VectorLayer<VectorSource> | null>(null);
  const marker = useRef<VectorSource | null>(null);
  const selectCallback = useRef(onSelect);
  const pointerCallback = useRef(onPointer);
  const [imageStatus, setImageStatus] = useState("Loading terrain layer…");
  const [retry, setRetry] = useState(0);
  const [resolution, setResolution] = useState<number | null>(null);

  useEffect(() => { selectCallback.current = onSelect; pointerCallback.current = onPointer; }, [onSelect, onPointer]);

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
    const instance = new Map({ target: target.current, layers: [imageLayer, gridLayer, selectionLayer],
      controls: controls({ zoom: false, rotate: false }).extend([new ScaleLine({ units: "metric" })]),
      view: new View({ projection, center: [0, 0], resolution: 180, minResolution: 30, maxResolution: 480,
        extent: region.bounds_m, enableRotation: false, showFullExtent: true }) });
    instance.getView().fit(region.bounds_m, { padding: [50, 60, 60, 60] });
    instance.on("singleclick", event => {
      const [longitude, latitude] = toGeographic(event.coordinate[0], event.coordinate[1], region.reference_radius_m);
      selectCallback.current(longitude, latitude);
    });
    instance.on("pointermove", event => {
      if (!event.dragging) pointerCallback.current(toGeographic(event.coordinate[0], event.coordinate[1], region.reference_radius_m));
    });
    const updateResolution = () => setResolution(instance.getView().getResolution() ?? null);
    instance.on("moveend", updateResolution);
    updateResolution();
    map.current = instance; raster.current = imageLayer; graticule.current = gridLayer; marker.current = markerSource;
    // An external map must detach on React cleanup, including Strict Mode remounts.
    // https://react.dev/reference/react/useEffect#controlling-a-non-react-widget
    return () => { instance.setTarget(undefined); instance.dispose(); map.current = null; raster.current = null; };
  }, [region]);

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
    <div className="terrain-map" ref={target} tabIndex={0} role="application"
      aria-label="Interactive lunar south-pole map" data-testid="terrain-map" />
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
