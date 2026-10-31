// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import YYC3Homepage from './components/homepage/YYC3-首页实现';
import AIProgrammingPage from './pages/AIProgrammingPage';
import LongTextChatPage from './pages/LongTextChatPage';
import LearningCenterPage from './pages/LearningCenterPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<YYC3Homepage />} />
        <Route path="/ai-programming" element={<AIProgrammingPage />} />
        <Route path="/long-text-chat" element={<LongTextChatPage />} />
        <Route path="/learning-center" element={<LearningCenterPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
