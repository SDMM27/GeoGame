import Form from "./pages/form";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import Scoreboard from "./pages/Scoreboard";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";
import countries from "./data/countriesWithDifficulty_FR.json"; // import countries data
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";

import {
  MapContainer,
  TileLayer,
  GeoJSON,
} from "react-leaflet";
// import { Icon} from "leaflet";

// const [finalScore, setFinalScore] = useState(0);

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
  let [setHighlightedCountry] = useState(null);
  let [targetCountry, setTargetCountry] = useState(null);
  const targetCountryRef = useRef(targetCountry); // Create a ref
  let [setMarkerPosition] = useState(null);
  let [score, setScore] = useState(0);
  let [gameStarted, setGameStarted] = useState(false);
  let [difficulty, setDifficulty] = useState("Facile");
  let [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const consecutiveErrorsRef = useRef(consecutiveErrors); // Create a ref
  const geoJsonRef = useRef(null);
  const [mapRef, setMapRef] = useState(null);
  let [timer, setTimer] = useState(65); // timer set to 60 seconds

  // create custom icon
  // const customIcon = new Icon({
  //   iconUrl: require("./img/marker.png"),
  //   iconSize: [38, 38],
  // });

  const position = [36.737232, 3.086472];

  const zoomCountryMap = useCallback((lat, lng) => {
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
}, [targetCountryRef, mapRef]);

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
      }
    }
  }, [targetCountry, consecutiveErrors, mapRef, zoomCountryMap]);

  useEffect(() => {
    // only start the timer when the game has started
    if (gameStarted) {
      // clear the timer when it reaches 0
      if (timer <= 0) {
        let mapElements = document.getElementsByClassName("mapElement");
        if (mapElements) {
          for (let i = 0; i < mapElements.length; i++) {
            mapElements[i].style.pointerEvents = "none";
          }
        }
        toast.info("Le temps est écoulé !");
        setConsecutiveErrors(0);
        return;
      }

      const id = setInterval(() => {
        setTimer((timer) => timer - 1);
      }, 1000);

      return () => clearInterval(id); // this will clear the interval on unmount or when gameStarted changes
    }
  }, [gameStarted, timer]); // this effect runs every time gameStarted or timer changes

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setTargetCountry(getRandomCountry(difficulty));
    setTimer(65);
  };

  const restart = () => {
    setGameStarted(false);
    setScore(0);
    setTimer(65);
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

  const seeCountry = () => {
    setConsecutiveErrors(0);
    const targetLayer = geoJsonRef.current
      .getLayers()
      .find(
        (layer) => layer.feature.properties.ADMIN === targetCountryRef.current
      );

    if (!targetLayer) {
      return;
    }

    targetLayer.setStyle({
      fillColor: "red",
      weight: 2,
      fillOpacity: 0.5,
    });

    const countryCenter = targetLayer.getBounds().getCenter();
    zoomCountryMap(countryCenter.lat, countryCenter.lng);

    setTimeout(() => {
      targetLayer.setStyle(countryStyle);
    }, 3000); // Change this to change the delay, in milliseconds

    // Change country
    changeCountry();
    decrementScore("Difficile");
  };

  const onCountryClick = (event) => {
    if (gameStarted) {
      let targetDifficulty = countries.features.find(
        (country) => country.properties.ADMIN === targetCountryRef.current
      ).properties.Difficulty;
      if (event.target.feature.properties.ADMIN === targetCountryRef.current) {
        toast.success(
          "Bravo ! " + targetCountryRef.current + " est la bonne réponse !"
        );
        changeCountry();
        if (consecutiveErrorsRef.current < 3) {
          incrementScore(targetDifficulty);
        }
        setConsecutiveErrors(0);
      } else {
        toast.error("Dommage ! Vous n'avez pas trouvé le bon pays.");
        decrementScore(targetDifficulty);
        setConsecutiveErrors((prevErrors) => prevErrors + 1);
      }
      setMarkerPosition(event.latlng);
    }
  };

  return (
    <div className="container">
      {!gameStarted && (
        <h1 className="app-title text-center my-4">Geo Country Placement</h1>
      )}

      {timer <= 0 && <Form finalScore={score} />}

      {!gameStarted && (
        <div className="center">
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
          <button className="btn btn-primary" onClick={startGame}>
            Start
          </button>
        </div>
      )}

      {!gameStarted && (
        <Router>
          <div className="app">
            <header className="app-header">
              <Link className="app-link" to="/scores">
                Voir les scores des joueurs
              </Link>
            </header>

            <Routes>
              <Route
                path="/"
                element={<> {/* Votre jeu et votre formulaire ici */} </>}
              />
              <Route path="/scores" element={<Scoreboard />} />
            </Routes>
          </div>
        </Router>
      )}

      {gameStarted && (
        <div
          className="gameButtons"
          style={{
            position: "relative",
            top: "10px",
            left: "10px",
            zIndex: 1000,
          }}
        >
          <button className="btn btn-danger" onClick={restart}>
            Revenir à l'accueil
          </button>
          <button className="btn btn-warning mapElement" onClick={seeCountry}>
            Voir le pays
          </button>
          <button
            className="btn btn-secondary mapElement"
            onClick={passCountry}
          >
            Passer le pays
          </button>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme="colored"
        hideProgressBar
      />

      {gameStarted && (
        <MapContainer
          ref={mapRef}
          className="mapElement"
          center={position}
          zoom={3}
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
            className="gameInfos"
          >
            <h2 className="textContainer targetCountry">
              Pays à trouver : {targetCountry}
            </h2>
            <h2 className="textContainer">Score : {score}</h2>
            <h2 className="textContainer">Temps restant : {timer}</h2>
          </div>
          {/* Toner Map */}
          <TileLayer
            className="mapElement"
            attribution="Stamen Toner"
            url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.png"
            noWrap={true}
            minZoom={2}
            maxZoom={20}
          />

          <GeoJSON
            className="mapElement"
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

          {/* {markerPosition && (
                <Marker position={markerPosition} icon={customIcon}></Marker>
              )} */}
        </MapContainer>
      )}
    </div>
  );
}
