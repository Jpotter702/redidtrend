import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RedditTrends from './pages/RedditTrends';
import ScriptGenerator from './pages/ScriptGenerator';
import VoiceGenerator from './pages/VoiceGenerator';
import VideoCreator from './pages/VideoCreator';
import YouTubeUploader from './pages/YouTubeUploader';
import Analytics from './pages/Analytics';
import CreatePipeline from './pages/CreatePipeline';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="reddit" element={<RedditTrends />} />
        <Route path="script" element={<ScriptGenerator />} />
        <Route path="voice" element={<VoiceGenerator />} />
        <Route path="video" element={<VideoCreator />} />
        <Route path="youtube" element={<YouTubeUploader />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="create" element={<CreatePipeline />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;