import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireGuest } from '@/components/aula/require-guest';
import { AnalisisLayout } from '@/layouts/analisis-layout';
import { HomeLayout } from '@/layouts/home-layout';
import { RootLayout } from '@/layouts/root-layout';
import { AccesoPage } from '@/pages/acceso-page';
import { AdaptarPage } from '@/pages/analisis/adaptar-page';
import { AnalizarPage } from '@/pages/analisis/analizar-page';
import { CargarPage } from '@/pages/analisis/cargar-page';
import { DetallePage } from '@/pages/analisis/detalle-page';
import { ResultadoPage } from '@/pages/analisis/resultado-page';
import { RevisarPage } from '@/pages/analisis/revisar-page';
import { AyudaPage } from '@/pages/ayuda-page';
import { ConfiguracionPage } from '@/pages/configuracion-page';
import { HomePage } from '@/pages/home-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<AccesoPage />} />
          <Route path="acceso" element={<Navigate to="/" replace />} />
          <Route
            element={
              <RequireGuest>
                <HomeLayout />
              </RequireGuest>
            }
          >
            <Route path="inicio" element={<HomePage />} />
            <Route path="ayuda" element={<AyudaPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
          </Route>
          <Route
            path="analisis"
            element={
              <RequireGuest>
                <AnalisisLayout />
              </RequireGuest>
            }
          >
            <Route index element={<Navigate to="cargar" replace />} />
            <Route path="cargar" element={<CargarPage />} />
            <Route path="analizar" element={<AnalizarPage />} />
            <Route path="revisar" element={<RevisarPage />} />
            <Route path="adaptar" element={<AdaptarPage />} />
            <Route path="detalle" element={<DetallePage />} />
            <Route path="resultado" element={<ResultadoPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
