import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RootBootstrapRoute } from '../App'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('RootBootstrapRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when bootstrap finishes without a profile', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' } as never,
      profile: null,
      loading: false,
      profileLoading: false,
      error: null,
      signup: vi.fn(),
      login: vi.fn(),
      completeLoginMfa: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      refetchProfile: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RootBootstrapRoute />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login Page')).toBeTruthy()
  })
})
