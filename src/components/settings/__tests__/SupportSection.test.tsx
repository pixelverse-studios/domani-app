import React from 'react'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { SupportSection } from '../SupportSection'

describe('SupportSection', () => {
  it('exposes the Settings replay tutorial action', () => {
    const onReplayTutorial = jest.fn()

    renderWithProviders(<SupportSection onReplayTutorial={onReplayTutorial} />)

    fireEvent.press(screen.getByText('Replay Tutorial'))

    expect(onReplayTutorial).toHaveBeenCalledTimes(1)
  })
})
