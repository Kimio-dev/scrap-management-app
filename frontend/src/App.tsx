import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import List from './pages/List';
import Analytics from './pages/analytics';
// import Create from './pages/Create';

function App() {
  return (
    <>
      {/* 全画面共通のコンポーネント */}
      <Navbar />

      {/* URLに応じて中身を切り替える */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/list" element={<List />} />
        <Route path="/analystic" element={<Analytics />} /> 
      </Routes>
    </>
  );
}

export default App;