import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

export default function RightClickDrag() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    let isDragging = false, lastX = 0, lastY = 0
    const onMouseDown = (e) => { if (e.button !== 2) return; isDragging = true; lastX = e.clientX; lastY = e.clientY; container.style.cursor = 'grabbing'; e.preventDefault() }
    const onMouseMove = (e) => { if (!isDragging) return; const dx = lastX - e.clientX; const dy = lastY - e.clientY; lastX = e.clientX; lastY = e.clientY; map._rawPanBy(L.point(dx, dy)) }
    const onMouseUp = (e) => { if (e.button !== 2) return; isDragging = false; container.style.cursor = ''; map.fire('moveend') }
    const onContextMenu = (e) => e.preventDefault()
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('contextmenu', onContextMenu)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('contextmenu', onContextMenu)
    }
  }, [map])
  return null
}
