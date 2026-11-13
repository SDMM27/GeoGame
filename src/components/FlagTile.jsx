// A flag shown whole in a square tile: most flags are 2:1, so cropping them to the square lost half of them (the canton
// of the US, the stars of Australia...). The empty bands above and below are filled with a blurred copy of the same flag,
// so the tile stays full of its colors. `blur` in px, about a tenth of the tile. Used by the avatar, the leaderboard
// names and the flag picker.
import React from 'react'
import { flagImagePath } from '../utils/decorations'
import './FlagTile.css'

export default function FlagTile({ iso, blur = 6, className = '', title, onError }) {
  const src = flagImagePath(iso)
  return (
    <span className={`flag-tile ${className}`} style={{ '--flag-blur': `${blur}px` }} title={title}>
      <img className="flag-tile__bg" src={src} alt="" aria-hidden="true" loading="lazy" draggable={false} onError={onError} />
      <img className="flag-tile__fg" src={src} alt="" loading="lazy" draggable={false} onError={onError} />
    </span>
  )
}
