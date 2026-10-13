import { useEffect, useState } from 'react'
import {
  apiRequest,
  clearTokens,
  getAccessToken,
  saveTokens,
} from './api.js'

const emptyRegistration = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
}

function App() {
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState(getAccessToken() ? 'loading' : 'login')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(emptyRegistration)
  const [profileForm, setProfileForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  useEffect(() => {
    if (page !== 'loading') return

    let active = true
    apiRequest('/auth/profile/')
      .then((data) => {
        if (active) showProfile(data)
      })
      .catch(() => {
        clearTokens()
        if (active) setPage('login')
      })

    return () => {
      active = false
    }
  }, [page])

  function showProfile(data) {
    setProfile(data)
    setProfileForm({
      email: data.email || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
    })
    setPage('dashboard')
  }

  function updateAuthField(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  async function submitAuth(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (authMode === 'register') {
        await apiRequest('/auth/register/', {
          method: 'POST',
          body: authForm,
          authenticated: false,
        })
        setAuthMode('login')
        setAuthForm((current) => ({
          ...emptyRegistration,
          email: current.email,
        }))
        setNotice('Account created. Log in to open your dashboard.')
        return
      }

      const tokens = await apiRequest('/auth/login/', {
        method: 'POST',
        body: {
          email: authForm.email,
          password: authForm.password,
        },
        authenticated: false,
      })
      saveTokens(tokens)
      const data = await apiRequest('/auth/profile/')
      showProfile(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const body = new FormData()
      body.append('email', profileForm.email)
      body.append('first_name', profileForm.first_name)
      body.append('last_name', profileForm.last_name)
      if (imageFile) body.append('image', imageFile)
      const updatedProfile = await apiRequest('/auth/profile/', {
        method: 'PATCH',
        body,
      })
      setImageFile(null)
      showProfile(updatedProfile)
      setNotice('Your profile has been updated.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest('/auth/change-password/', {
        method: 'POST',
        body: passwordForm,
      })
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      })
      setNotice('Password changed successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    clearTokens()
    setProfile(null)
    setAuthForm(emptyRegistration)
    setAuthMode('login')
    setError('')
    setNotice('')
    setPage('login')
  }

  if (page === 'loading') {
    return (
      <main className="page">
        <div className="loading-card" role="status">Loading your dashboard…</div>
      </main>
    )
  }

  if (page === 'dashboard') {
    const displayName = profile.first_name || profile.username
    const avatarUrl = imagePreview || profile.image

    return (
      <main className="dashboard-page">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Workspace home">
            <span className="brand-mark">D</span>
            <span>Dayboard</span>
          </a>
          <button className="button button-quiet" type="button" onClick={logout}>
            Sign out
          </button>
        </header>

        <section className="dashboard-heading">
          <p className="eyebrow">Your workspace</p>
          <h1>Welcome back, {displayName}.</h1>
          <p>Manage your profile and account settings.</p>
        </section>

        {error && <div className="message message-error" role="alert">{error}</div>}
        {notice && <div className="message message-success" role="status">{notice}</div>}

        <div className="dashboard-grid">
          <section className="panel profile-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Your profile</h2>
              </div>
            </div>

            <form className="profile-form" onSubmit={saveProfile}>
              <div className="avatar-row">
                <div className="avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={`${displayName}'s profile`} />
                  ) : (
                    <span>{displayName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <label className="upload-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                  />
                  Upload photo
                </label>
                <span className="field-hint">PNG or JPG, max 5 MB</span>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>First name</span>
                  <input
                    autoComplete="given-name"
                    name="first_name"
                    value={profileForm.first_name}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, first_name: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input
                    autoComplete="family-name"
                    name="last_name"
                    value={profileForm.last_name}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, last_name: event.target.value })
                    }
                  />
                </label>
              </div>

              <label className="field">
                <span>Email address</span>
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, email: event.target.value })
                  }
                />
              </label>

              <button className="button button-primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </section>

          <section className="panel security-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Security</p>
                <h2>Change password</h2>
              </div>
              <span className="security-icon" aria-hidden="true">↗</span>
            </div>

            <form className="profile-form" onSubmit={changePassword}>
              <label className="field">
                <span>Current password</span>
                <input
                  autoComplete="current-password"
                  name="current_password"
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      current_password: event.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>New password</span>
                <input
                  autoComplete="new-password"
                  name="new_password"
                  type="password"
                  minLength="8"
                  required
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      new_password: event.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Confirm new password</span>
                <input
                  autoComplete="new-password"
                  name="new_password_confirm"
                  type="password"
                  minLength="8"
                  required
                  value={passwordForm.new_password_confirm}
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      new_password_confirm: event.target.value,
                    })
                  }
                />
              </label>
              <button className="button button-secondary" type="submit" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <a className="brand brand-light" href="/" aria-label="Dayboard home">
          <span className="brand-mark">D</span>
          <span>Dayboard</span>
        </a>
        <div className="aside-copy">
          <span className="aside-orbit orbit-one" />
          <span className="aside-orbit orbit-two" />
          <p className="eyebrow">A little more clarity</p>
          <h1>Your day,<br />in good order.</h1>
          <p>Sign in to pick up where you left off and keep your work moving.</p>
          <div className="aside-note">
            <span className="note-check">✓</span>
            Your workspace is ready when you are.
          </div>
        </div>
        <span className="aside-footer">A calm space for your next big thing.</span>
      </section>

      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark">D</span>
            Dayboard
          </div>
          <p className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Get started'}</p>
          <h2>{authMode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
          <p className="auth-description">
            {authMode === 'login'
              ? 'Enter your details below to continue to your workspace.'
              : 'A few details and your workspace is ready.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              onClick={() => {
                setAuthMode('login')
                setError('')
                setNotice('')
              }}
            >
              Sign in
            </button>
            <button
              className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              onClick={() => {
                setAuthMode('register')
                setError('')
                setNotice('')
              }}
            >
              Create account
            </button>
          </div>

          {error && <div className="message message-error" role="alert">{error}</div>}
          {notice && <div className="message message-success" role="status">{notice}</div>}

          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <label className="field">
                  <span>Username</span>
                  <input
                    autoComplete="username"
                    name="username"
                    required
                    value={authForm.username}
                    onChange={updateAuthField}
                    placeholder="Choose a username"
                  />
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span>First name</span>
                    <input
                      autoComplete="given-name"
                      name="first_name"
                      value={authForm.first_name}
                      onChange={updateAuthField}
                      placeholder="Jane"
                    />
                  </label>
                  <label className="field">
                    <span>Last name</span>
                    <input
                      autoComplete="family-name"
                      name="last_name"
                      value={authForm.last_name}
                      onChange={updateAuthField}
                      placeholder="Doe"
                    />
                  </label>
                </div>
              </>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="email"
                name="email"
                type="email"
                required
                value={authForm.email}
                onChange={updateAuthField}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                name="password"
                type="password"
                minLength="8"
                required
                value={authForm.password}
                onChange={updateAuthField}
                placeholder="At least 8 characters"
              />
            </label>
            {authMode === 'register' && (
              <label className="field">
                <span>Confirm password</span>
                <input
                  autoComplete="new-password"
                  name="password_confirm"
                  type="password"
                  minLength="8"
                  required
                  value={authForm.password_confirm}
                  onChange={updateAuthField}
                  placeholder="Enter your password again"
                />
              </label>
            )}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>
              {busy
                ? 'Please wait…'
                : authMode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-footnote">
            {authMode === 'login' ? 'New to Dayboard?' : 'Already have an account?'}{' '}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setError('')
                setNotice('')
              }}
            >
              {authMode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
