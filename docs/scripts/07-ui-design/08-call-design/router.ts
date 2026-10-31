import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'customers',
        element: <CustomerManagement />,
        children: [
          {
            index: true,
            element: <CustomerList />,
          },
          {
            path: ':id',
            element: <CustomerDetail />,
          },
        ],
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
