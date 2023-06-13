import logo from "./logo.svg";
import "./App.css";
import "leaflet/dist/leaflet.css";
import countries from "./data/countriesWithDifficulty_FR.json"; // import countries data
import React, { useState, useEffect, useRef } from "react";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import { Icon } from "leaflet";

const countryStyle = {
  fillColor: "transparent",
  color: "black",
  fillOpacity: 1,
  weight: 0.85,
};

const getRandomCountry = (difficulty) => {
  const difficulties = ["Facile", "Moyen", "Difficile", "Impossible", "ImpossibleOnly"];
  const selectedDifficultyIndex = difficulties.indexOf(difficulty);

  let availableDifficulties;
  if (difficulty === "ImpossibleOnly") {
    availableDifficulties = ["Impossible"];
  } else {
    availableDifficulties = difficulties.slice(0, selectedDifficultyIndex + 1);
  }

  const filteredCountries = countries.features.filter(
    (country) => availableDifficulties.includes(country.properties.Difficulty)
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


  // create custom icon
  const customIcon = new Icon({
    iconUrl: require("./img/marker.png"),
    iconSize: [38, 38],
  });

  const position = [36.737232, 3.086472];

  useEffect(() => {
    document.title = "Geo Country Placement";
    targetCountryRef.current = targetCountry; // Update the ref whenever targetCountry changes
  }, [targetCountry]);

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
  }

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
    
    setScore(prevScore => {
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
    
    setScore(prevScore => {
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
  }

  const passCountry = () => {
    console.log('le pays était: ' + targetCountry);
    changeCountry();
    console.log(targetCountry + " a été choisi comme nouvelle cible !");
   decrementScore('Difficile');
  }

  const onCountryClick = (event) => {
    if (gameStarted) {
      console.log('pays cliqué : ' + event.target.feature.properties.ADMIN);
      console.log('pays recherché : ' + targetCountryRef.current); // Use the ref instead of the state variable
      let targetDifficulty = countries.features.find(
          (country) => country.properties.ADMIN === targetCountryRef.current // Use the ref instead of the state variable
        ).properties.Difficulty;
      if (event.target.feature.properties.ADMIN === targetCountryRef.current) { // Use the ref instead of the state variable
        console.log("Bravo ! " + targetCountryRef.current + " est la bonne réponse !"); // Use the ref instead of the state variable
        changeCountry();
        incrementScore(targetDifficulty);
      } else {
        decrementScore(targetDifficulty);
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
      <div id="difficultyContainer">
  <h2>Difficulté :</h2>
  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
    <option value="Facile">Facile</option>
    <option value="Moyen">Moyen</option>
    <option value="Difficile">Difficile</option>
    <option value="Impossible">Impossible</option>
    <option value="ImpossibleOnly">Hardcore</option>
  </select>
</div>)}

      {!gameStarted && (
        <div id="startContainer">
          <button onClick={startGame}>Start</button>
        </div>
      )}
      {gameStarted && (   
        <div id="targetCountryContainer">
          <h2>Pays à trouver : {targetCountry}</h2>
        </div>)}
        {gameStarted && (
          <div id="passTheCountry">
          <button onClick={passCountry}>Passer le pays</button>
        </div>
        )}
        {gameStarted && (
          <div id="restart">
          <button onClick={restart}>Recommencer</button>
        </div>
        )}
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

