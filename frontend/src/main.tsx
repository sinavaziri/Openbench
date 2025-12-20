import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import NewRun from './pages/NewRun'
import RunDetail from './pages/RunDetail'
import EvalViewer from './pages/EvalViewer'
import Compare from './pages/Compare'
import Login from './pages/Login'
import Settings from './pages/Settings'
import './index.css'

// Root layout component that wraps all routes with AuthProvider
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

// Create router with RootLayout wrapper
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <NewRun /> },
      { path: '/history', element: <Dashboard /> },
      { path: '/runs/:id', element: <RunDetail /> },
      { path: '/runs/:id/eval/*', element: <EvalViewer /> },
      { path: '/compare', element: <Compare /> },
      { path: '/login', element: <Login /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

