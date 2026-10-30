// A section whose header folds its content away; the choice is kept per `id` (hooks/useSectionOpen.js).
// `summary` stays visible next to the title, folded or not. The content is not rendered while folded.
import React, { useId } from 'react'
import useSectionOpen from '../hooks/useSectionOpen'
import './CollapsibleSection.css'

export default function CollapsibleSection({ id, title, summary, defaultOpen = false, children }) {
  const [open, toggle] = useSectionOpen(id, defaultOpen)
  const panelId = useId()
  const summaryId = useId()
  return (
    <section className="collapsible">
      <div className="collapsible-head">
        <h2>
          <button
            type="button"
            className="collapsible-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            aria-describedby={summary ? summaryId : undefined}
            onClick={toggle}
          >
            <span className="collapsible-chevron" aria-hidden="true" />
            {title}
          </button>
        </h2>
        {summary && <div id={summaryId} className="collapsible-summary">{summary}</div>}
      </div>
      {open && (
        <div id={panelId} className="collapsible-body">
          {children}
        </div>
      )}
    </section>
  )
}
