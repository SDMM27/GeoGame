import logo from "./logo.svg";
import "./App.css";
import "leaflet/dist/leaflet.css";
import countries from "./data/countriesWithDifficulty_FR.json"; // import countries data
import React, { useState, useEffect } from "react";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import { Icon } from "leaflet";

const countryStyle = {
  fillColor: "transparent",
  color: "black",
  fillOpacity: 1,
  weight: 0.85,
};

const getRandomCountry = () => {
  const randomIndex = Math.floor(Math.random() * countries.features.length);
  const randomCountry = countries.features[randomIndex].properties.ADMIN;
  return randomCountry;
};

export default function GeoQuizzPlacement() {
  let [highlightedCountry, setHighlightedCountry] = useState(null);
  let [targetCountry, setTargetCountry] = useState(null);
  let [markerPosition, setMarkerPosition] = useState(null);
  let [score, setScore] = useState(0);
  let [gameStarted, setGameStarted] = useState(false);

  // create custom icon
  const customIcon = new Icon({
    iconUrl: require("./img/marker.png"),
    iconSize: [38, 38],
  });

  const position = [36.737232, 3.086472];

  useEffect(() => {
    document.title = "Geo Country Placement";
  }, []);
  

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setTargetCountry(getRandomCountry());
  };

  const onCountryMouseOver = (event) => {
    if (gameStarted) {
      const layer = event.target;
      layer.setStyle({
        fillColor: "green",
        weight: 2,
        fillOpacity: 0.5,
      });
      setHighlightedCountry(layer.feature.properties.ADMIN);
    }
  };

  const onCountryMouseOut = (event) => {
    if (gameStarted) {
      const layer = event.target;
      layer.setStyle(countryStyle);
      setHighlightedCountry(null);
    }
  };

  const onCountryClick = (event) => {
    if (gameStarted) {
      console.log(event.target.feature.properties.ADMIN);
      console.log(targetCountry);
      if (event.target.feature.properties.ADMIN === targetCountry) {
        console.log("Bravo ! " + targetCountry + " est la bonne réponse !");
        targetCountry = getRandomCountry();
        setTargetCountry(targetCountry);
        console.log(targetCountry + ' a été choisi comme nouvelle cible !');
        score = score + 1;
        setScore(score);
      } else if(score > 0) {
        score = score - 1;
        setScore(score);
      }
      setMarkerPosition(event.latlng);
    }
  };
  

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <h1 id="gameTitle">Geo Country Placement</h1>
      <div id="scoreContainer">
        <h2>Score: {score}</h2>
      </div>
      {!gameStarted && (
        <div id="startContainer">
          <button onClick={startGame}>Start</button>
        </div>
      )}
      {gameStarted && (   
        <div id="targetCountryContainer">
          <h2>Target: {targetCountry}</h2>
        </div>)}
      {gameStarted && (
        <div className="mapContainer">
          <MapContainer
            center={position}
            zoom={2}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={false}
          >
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
                  click: onCountryClick,
                  mouseover: onCountryMouseOver,
                  mouseout: onCountryMouseOut,
                });
              }}
            />

            {markerPosition && (
              <Marker position={markerPosition} icon={customIcon}>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

