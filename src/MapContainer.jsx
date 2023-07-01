import MapObject from "./MapObject";
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapContainer(props){
        return (
            <div className="map-container">
                <MapObject />
            </div>
        );
    }