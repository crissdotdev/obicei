import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HabitListView from './components/HabitListView';
import HabitDetailView from './components/HabitDetailView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HabitListView />} />
        <Route path="/habit/:id" element={<HabitDetailView />} />
      </Routes>
    </BrowserRouter>
  );
}
