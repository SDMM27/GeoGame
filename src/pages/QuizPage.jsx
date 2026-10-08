// src/pages/QuizPage.jsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import { resolveMode } from '../utils/challenge'
import PracticeQuiz from './quiz/PracticeQuiz'
import DailyQuiz from './quiz/DailyQuiz'
import './QuizPage.css'

export { PracticeQuiz }

export default function QuizPage() {
  const location = useLocation()
  // Comme les autres jeux du jour : sans mode explicite, on arrive sur la question du jour
  return resolveMode(location, 'daily') === 'infinite' ? <PracticeQuiz /> : <DailyQuiz />
}
