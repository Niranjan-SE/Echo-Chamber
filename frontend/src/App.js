import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EchoChamber    from './EchoChamber';
import AnalysisPage   from './AnalysisPage';
import CommunityPage  from './CommunityPage';
import LeaderboardPage from './LeaderboardPage';
import URLResultPage  from './URLResultPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<EchoChamber />}     />
        <Route path="/analysis/:id"  element={<AnalysisPage />}    />
        <Route path="/result/:id"    element={<URLResultPage />}   />
        <Route path="/community"     element={<CommunityPage />}   />
        <Route path="/leaderboard"   element={<LeaderboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;