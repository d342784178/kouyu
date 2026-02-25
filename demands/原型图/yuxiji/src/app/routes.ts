import { createBrowserRouter } from 'react-router';
import Home from './pages/Home';
import Phrases from './pages/Phrases';
import Scenes from './pages/Scenes';
import SceneDetail from './pages/SceneDetail';
import Test from './pages/Test';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/phrases',
    Component: Phrases,
  },
  {
    path: '/scenes',
    Component: Scenes,
  },
  {
    path: '/scenes/:id',
    Component: SceneDetail,
  },
  {
    path: '/test/:sceneId',
    Component: Test,
  },
  {
    path: '/profile',
    Component: Profile,
  },
  {
    path: '*',
    Component: NotFound,
  },
]);