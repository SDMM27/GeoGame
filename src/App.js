import logo from "./logo.svg";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "leaflet/dist/leaflet.css";
import countries from "./data/countriesWithDifficulty_FR.json"; // import countries data
import React, { useState, useEffect, useRef } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";

const countryStyle = {
  fillColor: "transparent",
  color: "black",
  fillOpacity: 1,
  weight: 0.85,
};

const getRandomCountry = (difficulty) => {
  const difficulties = [
    "Facile",
    "Moyen",
    "Difficile",
    "Impossible",
    "ImpossibleOnly",
  ];
  const selectedDifficultyIndex = difficulties.indexOf(difficulty);

  let availableDifficulties;
  if (difficulty === "ImpossibleOnly") {
    availableDifficulties = ["Impossible"];
  } else {
    availableDifficulties = difficulties.slice(0, selectedDifficultyIndex + 1);
  }

  const filteredCountries = countries.features.filter((country) =>
    availableDifficulties.includes(country.properties.Difficulty)
  );

  const randomIndex = Math.floor(Math.random() * filteredCountries.length);
  const randomCountry = filteredCountries[randomIndex].properties.ADMIN;
  return randomCountry;
};

export default function GeoQuizzPlacement() {
  let [highlightedCountry, setHighlightedCountry] = useState(null);
  let [targetCountry, setTargetCountry] = useState(null);
  const targetCountryRef = useRef(targetCountry); // Create a ref
  let [markerPosition, setMarkerPosition] = useState(null);
  let [score, setScore] = useState(0);
  let [gameStarted, setGameStarted] = useState(false);
  let [difficulty, setDifficulty] = useState("Facile");
  let [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const consecutiveErrorsRef = useRef(consecutiveErrors); // Create a ref
  const geoJsonRef = useRef(null);
  const [mapRef, setMapRef] = useState(null);

  // create custom icon
  const customIcon = new Icon({
    iconUrl: require("./img/marker.png"),
    iconSize: [38, 38],
  });

  const position = [36.737232, 3.086472];

  function zoomCountryMap(lat, lng) {
    //function to zoom in on selected country
    let targetDifficulty = countries.features.find(
      (country) => country.properties.ADMIN === targetCountryRef.current // Use the ref instead of the state variable
    ).properties.Difficulty;
    if (targetCountryRef.current === "Vatican") {
      mapRef.setView([lat, lng], 20);
    } else if (targetDifficulty === "Difficile") {
      mapRef.setView([lat, lng], 7);
    } else if (targetDifficulty === "Impossible") {
      mapRef.setView([lat, lng], 9);
    } else {
      mapRef.setView([lat, lng], 4);
    }
  }

  useEffect(() => {
    let leafletContainer =
      document.getElementsByClassName("leaflet-container")[0];
    if (leafletContainer) {
      leafletContainer.style.background = "none";
    }
    document.title = "Geo Country Placement";
    targetCountryRef.current = targetCountry; // Update the ref whenever targetCountry changes
    consecutiveErrorsRef.current = consecutiveErrors; // Update the ref whenever consecutiveErrors changes
    if (geoJsonRef.current && mapRef.current) {
      if (consecutiveErrors >= 3) {
        const targetLayer = geoJsonRef.current
          .getLayers()
          .find(
            (layer) =>
              layer.feature.properties.ADMIN === targetCountryRef.current
          );

        if (targetLayer) {
          targetLayer.setStyle({
            fillColor: "red",
            weight: 2,
            fillOpacity: 0.5,
          });

          // Zoom to the target country
          const countryCenter = targetLayer.getBounds().getCenter();
          zoomCountryMap(countryCenter.lat, countryCenter.lng);
        }
      } else {
        // Reset the style of all layers when the error count is less than 3
        geoJsonRef.current.eachLayer((layer) => {
          layer.setStyle(countryStyle);
        });
      }
    }
  }, [targetCountry, consecutiveErrors]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setTargetCountry(getRandomCountry(difficulty));
  };

  const restart = () => {
    setGameStarted(false);
    setScore(0);
    setTargetCountry(null);
    setMarkerPosition(null);
    setConsecutiveErrors(0);
  };

  const decrementScore = (difficulty) => {
    let decrementAmount = 0;
    if (difficulty === "Facile") {
      decrementAmount = 3;
    } else if (difficulty === "Moyen") {
      decrementAmount = 2;
    } else if (difficulty === "Difficile") {
      decrementAmount = 1;
    } else if (difficulty === "Impossible") {
      decrementAmount = 0.5;
    }

    setScore((prevScore) => {
      const newScore = prevScore - decrementAmount;
      return Math.max(0, newScore);
    });
  };

  const incrementScore = (difficulty) => {
    let incrementAmount = 0;
    if (difficulty === "Facile") {
      incrementAmount = 1;
    } else if (difficulty === "Moyen") {
      incrementAmount = 2;
    } else if (difficulty === "Difficile") {
      incrementAmount = 3;
    } else if (difficulty === "Impossible") {
      incrementAmount = 4;
    }

    setScore((prevScore) => {
      const newScore = prevScore + incrementAmount;
      return newScore;
    });
  };

  const onCountryMouseOver = (event) => {
    if (gameStarted) {
      const layer = event.target;
      layer.setStyle({
        fillColor: "purple",
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

  const changeCountry = () => {
    targetCountry = getRandomCountry(difficulty);
    setTargetCountry(targetCountry);
  };

  const passCountry = () => {
    setConsecutiveErrors(0);
    changeCountry();
    decrementScore("Difficile");
  };

  const onCountryClick = (event) => {
    if (gameStarted) {
      console.log("erreurs consécutives : " + consecutiveErrorsRef.current);
      // console.log('pays cliqué : ' + event.target.feature.properties.ADMIN);
      // console.log('pays recherché : ' + targetCountryRef.current); // Use the ref instead of the state variable
      let targetDifficulty = countries.features.find(
        (country) => country.properties.ADMIN === targetCountryRef.current // Use the ref instead of the state variable
      ).properties.Difficulty;
      if (event.target.feature.properties.ADMIN === targetCountryRef.current) {
        // Use the ref instead of the state variable
        console.log(
          "Bravo ! " + targetCountryRef.current + " est la bonne réponse !"
        ); // Use the ref instead of the state variable
        changeCountry();
        if (consecutiveErrorsRef.current < 3) {
          incrementScore(targetDifficulty);
        }
        setConsecutiveErrors(0); // Reset the error count on correct guess
      } else {
        decrementScore(targetDifficulty);
        setConsecutiveErrors((prevErrors) => prevErrors + 1); // Increment the error count on incorrect guess
      }
      setMarkerPosition(event.latlng);
    }
  };

  return (
    <div className="container">
      <h1 className="app-title text-center my-4">Geo Country Placement</h1>

      <div className="col-12 col-md-12">
        <div className="mapContainer">
          <div className="col-12 col-md-5">
            {!gameStarted && (
              <div className="form-group">
                <label htmlFor="difficulty">Difficulté :</label>
                <select
                  id="difficulty"
                  className="form-control"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="Facile">Facile</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Difficile">Difficile</option>
                  <option value="Impossible">Impossible</option>
                  <option value="ImpossibleOnly">Hardcore</option>
                </select>
              </div>
            )}
            {!gameStarted && (
              <button className="btn btn-primary" onClick={startGame}>
                Start
              </button>
            )}
          </div>
          {gameStarted && (
          <div 
              style={{
                position: 'relative',
                top: '10px',
                left: '10px',
                zIndex: 1000
            }}
            >
              <button className="btn btn-secondary" onClick={passCountry}>
                Passer le pays
              </button>
              <button className="btn btn-danger" onClick={restart}>
                Recommencer
              </button>
            </div> )}

          {gameStarted && (
            <MapContainer
              ref={mapRef}
              center={position}
              zoom={2}
              scrollWheelZoom={true}
              zoomControl={false}
              dragging={true}
              doubleClickZoom={false}
              maxBounds={[
                [90, -180],
                [-90, 180],
              ]}
              whenReady={({ target }) => {
                setMapRef(target);
                setTimeout(() => {
                  target.invalidateSize();
                }, 100);
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  zIndex: 1000,
                }}
              >
                <h2 className="textContainer targetCountry">
                  Pays à trouver : {targetCountry}
                </h2>
                <h2 className="textContainer">Score : {score}</h2>
              </div>
              {/* Toner Map */}
              <TileLayer
                attribution="Stamen Toner"
                url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.png"
                noWrap={true}
                minZoom={2}
                maxZoom={20}
              />

              <GeoJSON
                ref={geoJsonRef}
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
                <Marker position={markerPosition} icon={customIcon}></Marker>
              )}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
