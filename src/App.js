import logo from "./logo.svg";
import "./App.css";
import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon, divIcon, point } from "leaflet";

export default function Map() {
  // create custom icon
  const customIcon = new Icon({
    // iconUrl: "https://cdn-icons-png.flaticon.com/128/5195/5195685.png",
    iconUrl: require("./img/marker.png"),
    iconSize: [38, 38], // size of the icon
  });
  const position = [55.16444, 61.436844];

  // markers
  const markers = [
    {
      geocode: [55.16, 61.4368],
      popUp: "Hello, I am pop up 1",
    },
    {
      geocode: [48.85, 2.3522],
      popUp: "Hello, I am pop up 2",
    }
  ];
  return (
    <MapContainer center={position} zoom={13}>

      {/* Normal Map */}
      {/* <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      /> */}

      {/* Lava Map */}
      {/* <TileLayer 
      attribution="ThunderForest"
      url="https://{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey=258b9cf0d7ab4f8cabfffb496606dfa4"
      /> */}

      {/* Toner Map */}
      <TileLayer 
      attribution="Stamen Toner"
      url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.png"
      minZoom={0}
      maxZoom={20}
      />
      {markers.map((marker) => (
        <Marker position={marker.geocode} icon={customIcon}>
          <Popup>{marker.popUp}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
