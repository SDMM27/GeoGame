import logo from "./logo.svg";
import "./App.css";
import "leaflet/dist/leaflet.css";
import countries from "./data/countries_FR.json"; // import countries data
import React, { useState, useEffect } from "react";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import { Icon, divIcon, point } from "leaflet";

const countryStyle = {
  fillColor: "transparent",
  color: "black",
  fillOpacity: 1,
  weight: 0.85,
};

export default function GeoQuizzPlacement() {
  const [highlightedCountry, setHighlightedCountry] = useState(null);
  const [targetCountry, setTargetCountry] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [score, setScore] = useState(0);


  // create custom icon
  const customIcon = new Icon({
    iconUrl: require("./img/marker.png"),
    iconSize: [38, 38],
  });

  const position = [36.737232, 3.086472];
  
  const getRandomCountry = () => {
    const randomIndex = Math.floor(Math.random() * countries.features.length);
    const randomCountry = countries.features[randomIndex].properties.ADMIN;
    console.log(randomCountry);
    return randomCountry;
  };

  useEffect(() => {
    setTargetCountry(getRandomCountry());
  }, []);

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

  const onMapClick = (event) => {
    if (highlightedCountry === targetCountry) {
      setScore(score + 1);
      setTargetCountry(getRandomCountry());
    }
    setMarkerPosition(event.latlng);
  };
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <h1 id="gameTitle">Geo Country Placement</h1>
      <div id="scoreContainer">
        <h2>Score: {score}</h2>
      </div>
      <div className="mapContainer">
        <MapContainer center={position} zoom={2} scrollWheelZoom="center" dragging={false} onClick={onMapClick}>
          {/* Toner Map */}
          <TileLayer
            attribution="Stamen Toner"
            url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.png"
            noWrap={true}
            minZoom={2}
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
        </MapContainer>

        {targetCountry && (
          <Marker position={position} icon={customIcon}>
            <Popup>{targetCountry}</Popup>
          </Marker>
        )}

        {markerPosition && (
          <Marker position={markerPosition}>
            <Popup>Clicked location</Popup>
          </Marker>
        )}
    </div>
    </div>
  );
}
