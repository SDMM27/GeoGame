// A folded section shows its title and summary only; the click opens it and the choice is kept.
import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CollapsibleSection from './CollapsibleSection'

const section = (props) => (
  <CollapsibleSection id="test.section" title="Titre" summary={<span>résumé</span>} {...props}>
    <p>contenu</p>
  </CollapsibleSection>
)

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('CollapsibleSection', () => {
  it('is folded by default, with the summary visible and no content', () => {
    render(section())
    const toggle = screen.getByRole('button', { name: 'Titre' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('résumé')).toBeInTheDocument()
    expect(screen.queryByText('contenu')).not.toBeInTheDocument()
  })

  it('opens and folds on click, keeping the summary', () => {
    render(section())
    const toggle = screen.getByRole('button', { name: 'Titre' })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', screen.getByText('contenu').parentElement.id)
    expect(screen.getByText('résumé')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.queryByText('contenu')).not.toBeInTheDocument()
  })

  it('starts open with defaultOpen, and remembers the choice after a remount', () => {
    const view = render(section({ defaultOpen: true }))
    expect(screen.getByText('contenu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Titre' }))
    view.unmount()
    render(section({ defaultOpen: true }))
    expect(screen.getByRole('button', { name: 'Titre' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('contenu')).not.toBeInTheDocument()
  })

  it('keeps sections with another id independent', () => {
    render(section({ defaultOpen: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Titre' }))
    cleanup()
    render(section({ id: 'other.section', defaultOpen: true }))
    expect(screen.getByText('contenu')).toBeInTheDocument()
  })
})
