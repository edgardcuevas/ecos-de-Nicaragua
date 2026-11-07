import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { Cargando } from './components/ui.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import Legend from './pages/Legend.jsx'
import NotFound from './pages/NotFound.jsx'
import { Login, Recuperar, Registro, Restablecer } from './pages/AuthPages.jsx'

// El mapa pesa más (geometría de 17 unidades), así que se carga solo cuando se necesita.
const MapPage = lazy(() => import('./pages/MapPage.jsx'))
const Locate = lazy(() => import('./pages/Locate.jsx'))
const TriviaList = lazy(() => import('./pages/TriviaList.jsx'))
const Trivia = lazy(() => import('./pages/Trivia.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const Plans = lazy(() => import('./pages/Plans.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="leyendas" element={<Library />} />
          <Route path="leyendas/:slug" element={<Legend />} />
          <Route path="mapa" element={<MapPage />} />
          <Route path="trivias" element={<TriviaList />} />
          <Route path="trivias/:slug" element={<Trivia />} />
          <Route path="ubica" element={<Locate />} />
          <Route path="planes" element={<Plans />} />
          <Route path="ingresar" element={<Login />} />
          <Route path="registro" element={<Registro />} />
          <Route path="recuperar" element={<Recuperar />} />
          <Route path="restablecer" element={<Restablecer />} />
          <Route path="cuenta" element={<Account />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
