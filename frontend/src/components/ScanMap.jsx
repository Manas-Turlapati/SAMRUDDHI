import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const scanIcon = L.icon({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function ScanMap({ predictions }) {
  const scans = predictions.filter((item) => Number.isFinite(item.location?.latitude) && Number.isFinite(item.location?.longitude));
  if (!scans.length) return <div className="empty-state">No scans have shared a location yet. Farmers can opt in before an analysis.</div>;
  const center = [scans[0].location.latitude, scans[0].location.longitude];

  return <section className="scan-map-panel">
    <div className="section-heading"><span className="eyebrow">Community map</span><h2>Reported disease scans</h2><p>Only scans shared with location permission appear here.</p></div>
    <MapContainer center={center} zoom={6} scrollWheelZoom={false} className="scan-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {scans.map((scan) => <Marker key={scan._id} position={[scan.location.latitude, scan.location.longitude]} icon={scanIcon}>
        <Popup><strong>{scan.disease}</strong><br />Confidence: {Math.round((scan.confidence > 1 ? scan.confidence / 100 : scan.confidence) * 100)}%<br />{new Date(scan.createdAt).toLocaleDateString()}</Popup>
      </Marker>)}
    </MapContainer>
  </section>;
}
