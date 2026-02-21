import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ClinicalScribe } from './pages/ClinicalScribe';
import { PatientExplainer } from './pages/PatientExplainer';
import { DiagnosticsLab } from './pages/DiagnosticsLab';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scribe" element={<ClinicalScribe />} />
          <Route path="/patient" element={<PatientExplainer />} />
          <Route path="/diagnostics" element={<DiagnosticsLab />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
