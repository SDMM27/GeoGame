// src/pages/QuizPage.jsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isGameHidden } from '../utils/gameAvailability'
import { GAME_TYPES } from '../utils/gameTypes'
import { resolveMode } from '../utils/challenge'
import PracticeQuiz from './quiz/PracticeQuiz'
import DailyQuiz from './quiz/DailyQuiz'
import './QuizPage.css'

export { PracticeQuiz }

export default function QuizPage() {
  const location = useLocation()
  // Hidden quiz (history theme included): old links go to the Country of the Day
  if (isGameHidden(GAME_TYPES.QUIZ)) return <Navigate to="/country-of-the-day" replace />
  // Comme les autres jeux du jour : sans mode explicite, on arrive sur la question du jour
  return resolveMode(location, 'daily') === 'infinite' ? <PracticeQuiz /> : <DailyQuiz />
}
