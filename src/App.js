import logo from "./logo.svg";
import "./App.css";
import "leaflet/dist/leaflet.css";
import countries from "./data/countries.json";  // import countries data
import React, { useState } from "react";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import { Icon, divIcon, point } from "leaflet";

const countryStyle = {
  fillColor: "white", 
  color: "black",
  fillOpacity: 1,
  weight: 0.85,
};

export default function GeoQuizzPlacement() {
  const [highlightedCountry, setHighlightedCountry] = useState(null);

  // create custom icon
  const customIcon = new Icon({
    iconUrl: require("./img/marker.png"),
    iconSize: [38, 38],
  });

  const position = [55.16444, 61.436844];

  const onCountryMouseOver = (event) => {
    const layer = event.target;
    layer.setStyle({
      fillColor: "green",
      weight: 2,
      fillOpacity: 0.5,
    });
    setHighlightedCountry(layer.feature.properties.ADMIN);
  };

  const onCountryMouseOut = (event) => {
    const layer = event.target;
    layer.setStyle(countryStyle);
    setHighlightedCountry(null);
  };

  return (
    <MapContainer center={position} zoom={2.5} style={{ height: "100vh" }}>
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
      noWrap={true}
      minZoom={0}
      maxZoom={20}
      />

      <GeoJSON
        style={countryStyle}
        data={countries.features}
        onEachFeature={(feature, layer) => {
          layer.on({
            mouseover: onCountryMouseOver,
            mouseout: onCountryMouseOut,
          });
        }}
      />

      {highlightedCountry && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1000,
            backgroundColor: "white",
            padding: "5px",
          }}
        >
          <h2>{highlightedCountry}</h2>
        </div>
      )}
    </MapContainer>
  );
}
