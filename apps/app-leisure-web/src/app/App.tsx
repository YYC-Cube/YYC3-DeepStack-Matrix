/**
 * 应用根:挂载 hash router
 */
import { RouterProvider } from 'react-router'
import { router } from './routes'

export default function App() {
  return <RouterProvider router={router} />
}
