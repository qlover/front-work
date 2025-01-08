import './styles/css/index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createFeReactRoutes } from './pages';
import { I18nService } from '@/services';
import { pageProcesser } from './container';
import { useMemo } from 'react';
import appRouterConfig from '@config/app.router.json';

I18nService.init();
pageProcesser.init();

function App() {
  const routerBase = useMemo(() => {
    return createBrowserRouter(createFeReactRoutes(appRouterConfig.base));
  }, []);

  return <RouterProvider router={routerBase} />;
}

export default App;
