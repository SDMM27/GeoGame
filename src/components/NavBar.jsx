// src/components/NavBar.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import './NavBar.css'

export default function NavBar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        GEO<span className="navbar-logo-accent">GAME</span>
      </Link>
      <Link to="/multiplayer" className="navbar-mp-link">
        Multijoueur
      </Link>
    </nav>
  )
}
