// An image of a scroll (thumbnail or large map). The files are published separately from the app: while one is missing
// or fails to load, a parchment-colored placeholder takes its place, never the browser's broken-image icon.
import React, { useState } from 'react'
import { scrollImageUrl } from '../../utils/scrollCollectionData'
import './Scrolls.css'

export default function ScrollImage({ id, size = 'thumb', alt = '', className = '', onLoad, ...rest }) {
  const src = scrollImageUrl(id, size)
  const [failed, setFailed] = useState(null)
  const classes = `scroll-image ${className}`.trim()
  if (failed === src) return <span className={`${classes} scroll-image--placeholder`} data-testid="scroll-placeholder" aria-hidden="true" />
  return <img className={classes} src={src} alt={alt} loading="lazy" draggable={false} onError={() => setFailed(src)} onLoad={onLoad} {...rest} />
}
