import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import './scoreboard.css';
import { firestore } from '../Firebase';

export default function Scoreboard() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      const scoresCollection = collection(firestore, 'scores');
      const scoresSnapshot = await getDocs(scoresCollection);
      const scoresList = scoresSnapshot.docs.map(doc => doc.data());

      // Sort scores in descending order
      scoresList.sort((a, b) => b.score - a.score);
      
      setScores(scoresList);
    }

    fetchScores();
  }, []);

  return (
    <div className='scoreboard'>
      <h1>Tableau des scores</h1>
      {scores.map((score, index) => (
        <div key={index}>
          <h2>{score.name}</h2>
          <p>{score.score}</p>
        </div>
      ))}
    </div>
  );
}
