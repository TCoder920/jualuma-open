import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '../ProtectedRoute'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when the user is present but the profile is unavailable', async () => {
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
      <MemoryRouter initialEntries={['/dashboard?tab=overview']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login Page')).toBeTruthy()
  })
})
