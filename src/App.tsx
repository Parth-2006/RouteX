import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Visualizer } from './pages/Visualizer';
import { MapDemo } from './pages/MapDemo';
import { Guide } from './pages/Guide';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/visualizer" element={<Visualizer />} />
          <Route path="/map" element={<MapDemo />} />
          <Route path="/guide" element={<Guide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
