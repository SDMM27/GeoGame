import React from 'react'
import { useNavigate } from 'react-router-dom'
import './NavBar.css'

export default function NavBar() {
  const navigate = useNavigate()
  return (
    <nav className="navbar">
      <span className="navbar-logo" onClick={() => navigate('/')}>
        GEO<span className="navbar-logo-accent">GAME</span>
      </span>
    </nav>
  )
}
