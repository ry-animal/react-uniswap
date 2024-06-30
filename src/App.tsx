import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import AppLayout from './layouts/app-layout';
import Landing from './pages/landing';
import { config } from './lib/config';
//import Widget from './pages/widget';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Landing /> },
      //{ path: '/', element: <Widget /> },
    ],
  },
]);

const queryClient = new QueryClient();

const App = () => {
  const customTheme = darkTheme({
    accentColor: 'rgb(188, 230, 53)',
    accentColorForeground: 'black',
    borderRadius: 'small',
  });

  const themeWithCustomFont = {
    ...customTheme,
    fonts: {
      body: 'Chakra',
    },
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={themeWithCustomFont}>
          <RouterProvider router={router} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
