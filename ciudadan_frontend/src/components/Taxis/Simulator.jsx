/*import { useState } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

const API_KEY = "TU_API_KEY";

export default function Simulator() {
    // 1. Estado inicial de la posición del marcador
    const [markerPosition, setMarkerPosition] = useState({
        lat: 16.7516,
        lng: -93.1029
    });

    // 2. Función que se activa al terminar de arrastrar el marcador
    const handleDragEnd = (event) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();

        // Actualizamos el estado con la nueva posición
        setMarkerPosition({ lat: newLat, lng: newLng });

        // Aquí puedes recalcular tu ruta si es necesario
        console.log("Nueva posición:", newLat, newLng);
    };

    return (
        <APIProvider apiKey={API_KEY}>
            <div style={{ width: '100vw', height: '100vh' }}>
                <Map
                    defaultCenter={markerPosition}
                    defaultZoom={13}
                    mapId="DEMO_MAP_ID"
                >
                    { 3. Marcador con la propiedad draggable habilitada }
                    <Marker
                        position={markerPosition}
                        draggable={true}
                        onDragEnd={handleDragEnd}
                    />
                </Map>
            </div>
        </APIProvider>
    );
}*/