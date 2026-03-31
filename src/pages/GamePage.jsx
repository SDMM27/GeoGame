import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { toast, ToastContainer } from "react-toastify";
import countries from "../data/countriesWithDifficulty_FR.json";
import Form from "./form";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";
import "./GamePage.css";

const countryStyle = {
  fillColor: "transparent",
  color: "#334155",
  fillOpacity: 1,
  weight: 0.85,
};

let alreadyChosenCountries = [];

const getTimerColor = (time) => {
  if (time > 30) return "var(--accent-cyan)";
  if (time > 15) return "var(--warning)";
  return "var(--danger)";
};

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { difficulty, isTraining } = location.state || {};

  const [targetCountry, setTargetCountry] = useState(null);
  const targetCountryRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const consecutiveErrorsRef = useRef(0);
  const geoJsonRef = useRef(null);
  const [mapRef, setMapRef] = useState(null);
  const [timer, setTimer] = useState(isTraining ? 99999 : 60);
  const timerRef = useRef(isTraining ? 99999 : 60);
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false);
  const clickOnSeeCountryRef = useRef(false);

  // Redirect if no difficulty (direct URL navigation)
  useEffect(() => {
    if (!difficulty) {
      navigate("/");
    }
  }, [difficulty, navigate]);

  const getRandomCountry = useCallback((diff) => {
    const difficulties = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];
    const selectedDifficultyIndex = difficulties.indexOf(diff);
    let availableDifficulties;
    if (diff === "Hardcore") {
      availableDifficulties = ["Impossible"];
    } else {
      availableDifficulties = difficulties.slice(0, selectedDifficultyIndex + 1);
    }

    const filteredCountries = countries.features.filter(
      (country) =>
        availableDifficulties.includes(country.properties.Difficulty) &&
        !alreadyChosenCountries.includes(country.properties.ADMIN)
    );

    if (filteredCountries.length === 0) {
      setScore((prevScore) => prevScore + timerRef.current);
      setTimer(0);
      toast.success(
        "Bravo ! Vous avez trouvé tous les pays ! Votre temps restant a été ajouté au score.",
        { containerId: "centerToast" }
      );
      return null;
    }

    const randomIndex = Math.floor(Math.random() * filteredCountries.length);
    return filteredCountries[randomIndex].properties.ADMIN;
  }, []);

  const zoomCountryMap = useCallback(
    (lat, lng) => {
      if (!mapRef) return;
      const targetDifficulty = countries.features.find(
        (country) => country.properties.ADMIN === targetCountryRef.current
      )?.properties.Difficulty;

      if (targetCountryRef.current === "Vatican") {
        mapRef.setView([lat, lng], 20);
      } else if (targetDifficulty === "Difficile") {
        mapRef.setView([lat, lng], 7);
      } else if (targetDifficulty === "Impossible") {
        mapRef.setView([lat, lng], 9);
      } else {
        mapRef.setView([lat, lng], 4);
      }
    },
    [mapRef]
  );

  // Start game on mount
  useEffect(() => {
    if (!difficulty) return;
    alreadyChosenCountries = [];
    const firstCountry = getRandomCountry(difficulty);
    if (firstCountry) {
      alreadyChosenCountries.push(firstCountry);
      setTargetCountry(firstCountry);
      gameStartedRef.current = true;
      setGameStarted(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync refs + handle 3 consecutive errors
  useEffect(() => {
    targetCountryRef.current = targetCountry;
    consecutiveErrorsRef.current = consecutiveErrors;

    if (consecutiveErrors >= 3) {
      toast.error(
        "Dommage ! C'est ici que se trouvait " + targetCountryRef.current,
        { containerId: "topRightToast" }
      );

      if (geoJsonRef.current) {
        const targetLayer = geoJsonRef.current
          .getLayers()
          .find(
            (layer) => layer.feature.properties.ADMIN === targetCountryRef.current
          );
        if (targetLayer) {
          targetLayer.setStyle({ fillColor: "#ff4d4d", weight: 2, fillOpacity: 0.5 });
          const countryCenter = targetLayer.getBounds().getCenter();
          zoomCountryMap(countryCenter.lat, countryCenter.lng);
        }
      }

      decrementScore(
        countries.features.find(
          (c) => c.properties.ADMIN === targetCountryRef.current
        )?.properties.Difficulty || "Difficile"
      );
    }
  }, [targetCountry, consecutiveErrors, zoomCountryMap]);

  // Timer
  useEffect(() => {
    clickOnSeeCountryRef.current = clickOnSeeCountry;
    if (!gameStarted) return;

    if (timer <= 0) {
      toast.info("Le temps est écoulé !", { containerId: "centerToast" });
      setConsecutiveErrors(0);
      return;
    }

    const id = setInterval(() => {
      setTimer((t) => {
        timerRef.current = t - 1;
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [gameStarted, timer, clickOnSeeCountry]);

  const decrementScore = (diff) => {
    const amounts = { Facile: 3, Moyen: 2, Difficile: 1, Impossible: 0.5 };
    const amount = amounts[diff] ?? 1;
    setScore((prev) => Math.max(0, prev - amount));
  };

  const incrementScore = (diff) => {
    const amounts = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 4 };
    const amount = amounts[diff] ?? 1;
    setScore((prev) => prev + amount);
  };

  const changeCountry = useCallback(() => {
    const newCountry = getRandomCountry(difficulty);
    if (newCountry) {
      alreadyChosenCountries.push(newCountry);
      setTargetCountry(newCountry);
    }
  }, [difficulty, getRandomCountry]);

  const onCountryMouseOver = (event) => {
    const layer = event.target;
    if (layer.options.fillColor === "#4ade80") return;
    layer.setStyle({ fillColor: "#7b2ff7", weight: 2, fillOpacity: 0.4 });
  };

  const onCountryMouseOut = (event) => {
    const layer = event.target;
    if (layer.options.fillColor === "#4ade80") return;
    layer.setStyle(countryStyle);
  };

  const onCountryClick = (event) => {
    if (!gameStartedRef.current) return;
    const clickedName = event.target.feature.properties.ADMIN;
    const targetDifficulty = countries.features.find(
      (c) => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty;

    if (clickedName === targetCountryRef.current) {
      if (consecutiveErrorsRef.current < 3) {
        toast.success("Bravo ! " + targetCountryRef.current + " !", {
          containerId: "topRightToast",
        });
      }
      event.target.setStyle({ fillColor: "#4ade80", weight: 2, fillOpacity: 0.5 });
      changeCountry();
      if (consecutiveErrorsRef.current < 3 && !clickOnSeeCountryRef.current) {
        incrementScore(targetDifficulty);
      }
      setConsecutiveErrors(0);
      setClickOnSeeCountry(false);
    } else {
      toast.error("Dommage !", { containerId: "topRightToast" });
      setConsecutiveErrors((prev) => prev + 1);
    }
  };

  const seeCountry = () => {
    setClickOnSeeCountry(true);
    clickOnSeeCountryRef.current = true;
    if (!geoJsonRef.current) return;
    const targetLayer = geoJsonRef.current
      .getLayers()
      .find((layer) => layer.feature.properties.ADMIN === targetCountryRef.current);
    if (!targetLayer) return;
    targetLayer.setStyle({ fillColor: "#ff4d4d", weight: 2, fillOpacity: 0.5 });
    const center = targetLayer.getBounds().getCenter();
    zoomCountryMap(center.lat, center.lng);
    decrementScore("Difficile");
  };

  const restartGame = () => {
    alreadyChosenCountries = [];
    setScore(0);
    setConsecutiveErrors(0);
    setClickOnSeeCountry(false);
    clickOnSeeCountryRef.current = false;
    if (geoJsonRef.current) {
      geoJsonRef.current.getLayers().forEach((layer) => layer.setStyle(countryStyle));
    }
    const newTimer = isTraining ? 99999 : 60;
    setTimer(newTimer);
    timerRef.current = newTimer;
    changeCountry();
  };

  const goHome = () => {
    alreadyChosenCountries = [];
    navigate("/");
  };

  const isGameOver = timer <= 0 && !isTraining;
  const displayTimer = isTraining ? "∞" : timer;

  return (
    <div className="game-page">
      {/* Floating HUD */}
      <div className="hud-score">
        <span className="hud-value" style={{ color: "var(--accent-cyan)" }}>
          {score}
        </span>
        <span className="hud-label">SCORE</span>
      </div>

      <div className="hud-target">
        <span className="hud-target-label">Pays à trouver</span>
        <span className="hud-target-name">{targetCountry}</span>
      </div>

      <div className="hud-timer">
        <span
          className="hud-value"
          style={{
            color: isTraining ? "var(--accent-cyan)" : getTimerColor(timer),
            animation: !isTraining && timer < 15 && timer > 0 ? "pulse 1s infinite" : "none",
          }}
        >
          {displayTimer}
        </span>
        <span className="hud-label">TEMPS</span>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>
          ← Accueil
        </button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry}>
          👁 Voir
        </button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>
          ↺ Recommencer
        </button>
      </div>

      {/* Score save form shown when timer reaches 0 */}
      {isGameOver && (
        <div className="game-over-overlay">
          <Form finalScore={score} difficulty={difficulty} />
        </div>
      )}

      <ToastContainer
        enableMultiContainer
        containerId="centerToast"
        position="bottom-center"
        autoClose={3000}
        theme="dark"
        hideProgressBar
      />
      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        zoomControl={false}
        dragging
        doubleClickZoom={false}
        maxBounds={[[90, -180], [-90, 180]]}
        style={{ width: "100%", height: "100vh" }}
        whenReady={({ target }) => {
          setMapRef(target);
          target.getContainer().style.background = "var(--bg-primary)";
          setTimeout(() => target.invalidateSize(), 100);
        }}
      >
        <TileLayer
          attribution="Stamen Toner"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png"
          noWrap
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
      </MapContainer>
    </div>
  );
}
