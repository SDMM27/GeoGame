// Whether the browser tab is visible.
import { useEffect, useState } from 'react'

const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

export default function usePageVisible() {
  const [visible, setVisible] = useState(isVisible)
  useEffect(() => {
    const onChange = () => setVisible(isVisible())
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}
