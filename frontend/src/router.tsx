import { createBrowserRouter } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewRun from './pages/NewRun'
import RunDetail from './pages/RunDetail'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/runs/new',
    element: <NewRun />,
  },
  {
    path: '/runs/:id',
    element: <RunDetail />,
  },
])

