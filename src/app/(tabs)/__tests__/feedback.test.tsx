import React from 'react'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import FeedbackScreen from '../feedback'
import { useCreateFeedback } from '~/hooks/useFeedback'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}))

jest.mock('~/hooks/useFeedback', () => ({
  useCreateFeedback: jest.fn(),
}))

jest.mock('~/hooks/useSubscription', () => ({
  useSubscriptionStatus: jest.fn(() => ({ status: 'trialing' })),
}))

jest.mock('~/hooks/useScreenTracking', () => ({
  useScreenTracking: jest.fn(),
}))

const mockUseCreateFeedback = useCreateFeedback as jest.MockedFunction<typeof useCreateFeedback>

describe('FeedbackScreen', () => {
  const mutateAsync = jest.fn()

  beforeEach(() => {
    mutateAsync.mockResolvedValue({})
    mockUseCreateFeedback.mockReturnValue({
      mutateAsync,
    } as unknown as ReturnType<typeof useCreateFeedback>)
  })

  it('does not submit until a category and message are provided', () => {
    renderWithProviders(<FeedbackScreen />)

    fireEvent.press(screen.getByText('Send Feedback'))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText('Select a category to start')).toBeTruthy()
  })

  it('submits selected category and trimmed message when the form is valid', async () => {
    renderWithProviders(<FeedbackScreen />)

    fireEvent.press(screen.getByText('Bug Report'))
    fireEvent.changeText(
      screen.getByPlaceholderText('Describe the bug you encountered...'),
      '  The save button flickers  ',
    )
    fireEvent.press(screen.getByText('Send Feedback'))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        category: 'bug_report',
        message: 'The save button flickers',
      })
    })

    expect(
      await screen.findByText(
        "Thank you for sharing your thoughts! We've received your message and will review it soon. Your input helps us build a better Domani.",
      ),
    ).toBeTruthy()
    expect(screen.getByText('Submit More Feedback')).toBeTruthy()
  })
})
