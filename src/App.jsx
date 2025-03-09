import { useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import * as toGeoJSON from "@tmcw/togeojson";
import "leaflet/dist/leaflet.css";

export default function KMLViewer() {
  const [geojsonData, setGeojsonData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const kml = parser.parseFromString(e.target.result, "text/xml");
        const geojson = toGeoJSON.kml(kml);
        setGeojsonData(geojson);
        processSummary(geojson);
        processDetails(geojson);
      } catch (error) {
        console.error("Error parsing KML file:", error);
      }
    };
    reader.readAsText(file);
  };

  const processSummary = (geojson) => {
    const typeCounts = geojson.features.reduce((acc, feature) => {
      const type = feature.geometry.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    setSummary(typeCounts);
  };

  const processDetails = (geojson) => {
    const details = geojson.features.reduce((acc, feature) => {
      const type = feature.geometry.type;
      if (["LineString", "MultiLineString"].includes(type)) {
        const length = calculateLength(feature.geometry.coordinates);
        acc[type] = (acc[type] || 0) + length;
      }
      return acc;
    }, {});
    setDetails(details);
  };

  const calculateLength = (coordinates) => {
    let totalLength = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalLength += distance(coordinates[i - 1], coordinates[i]);
    }
    return totalLength;
  };

  const distance = (coord1, coord2) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div>
      <input type="file" accept=".kml" onChange={handleFileUpload} />
      <button onClick={() => setShowSummary(!showSummary)}>Summary</button>
      <button onClick={() => setShowDetails(!showDetails)}>Details</button>
      {showSummary && summary && (
        <div>
          <h3>Summary</h3>
          <ul>
            {Object.entries(summary).map(([type, count]) => (
              <li key={type}>{type}: {count}</li>
            ))}
          </ul>
        </div>
      )}
      {showDetails && details && (
        <div>
          <h3>Details</h3>
          <ul>
            {Object.entries(details).map(([type, length]) => (
              <li key={type}>{type}: {length.toFixed(2)} km</li>
            ))}
          </ul>
        </div>
      )}
      <MapContainer center={[0, 0]} zoom={2} style={{ height: "500px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {geojsonData && <GeoJSON data={geojsonData} />}
      </MapContainer>
    </div>
  );
}
