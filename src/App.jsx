import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/layout/Layout';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Cases from '@/pages/Cases';
import CaseDetail from '@/pages/CaseDetail';
import Ingestion from '@/pages/Ingestion';
import Entities from '@/pages/Entities';
import EntityDetail from '@/pages/EntityDetail';
import Documents from '@/pages/Documents';
import Graph from '@/pages/Graph';
import Relationships from '@/pages/Relationships';
import Patterns from '@/pages/Patterns';
import Timeline from '@/pages/Timeline';
import Evidence from '@/pages/Evidence';
import Reports from '@/pages/Reports';
import Audit from '@/pages/Audit';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  // Show loading spinner while checking app public settings
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
      </div>
    );
  }

  // Public demonstration: every route below is open, with no sign-in step
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:caseId" element={<CaseDetail />} />
        <Route path="/ingestion" element={<Ingestion />} />
        <Route path="/entities" element={<Entities />} />
        <Route path="/entities/:entityId" element={<EntityDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/graph" element={<Graph />} />
        <Route path="/relationships" element={<Relationships />} />
        <Route path="/patterns" element={<Patterns />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={<Audit />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App