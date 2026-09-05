import { Routes, Route } from 'react-router-dom';
import IndexPage from './pages/index/IndexPage';
import RoomPage from './pages/room/RoomPage';
import GamePage from './pages/game/GamePage';
import ResultPage from './pages/result/ResultPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/room" element={<RoomPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
