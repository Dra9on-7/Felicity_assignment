import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ParticipantDashboard from './pages/ParticipantDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';

// New Pages
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import MyEvents from './pages/MyEvents';
import Clubs from './pages/Clubs';
import ClubDetails from './pages/ClubDetails';
import CreateEvent from './pages/CreateEvent';
import OrganizerEventDetails from './pages/OrganizerEventDetails';
import OrganizerProfile from './pages/OrganizerProfile';
import AdminOrganizerManagement from './pages/AdminOrganizerManagement';
import AdminParticipants from './pages/AdminParticipants';
import AdminEvents from './pages/AdminEvents';
import OrganizerOngoingEvents from './pages/OrganizerOngoingEvents';
import AdminPasswordResets from './pages/AdminPasswordResets';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route path="/events" element={<BrowseEvents />} />
              <Route path="/events/:eventId" element={<EventDetails />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/clubs/:clubId" element={<ClubDetails />} />
              
              {/* Auth Routes (public only - redirect if logged in) */}
              <Route 
                path="/login" 
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicOnlyRoute>
                    <Register />
                  </PublicOnlyRoute>
                } 
              />

              {/* Participant Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute roles={['participant']}>
                    <ParticipantDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute roles={['participant']}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/onboarding" 
                element={
                  <ProtectedRoute roles={['participant']}>
                    <Onboarding />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-events" 
                element={
                  <ProtectedRoute roles={['participant']}>
                    <MyEvents />
                  </ProtectedRoute>
                } 
              />

              {/* Organizer Routes */}
              <Route 
                path="/organizer/dashboard" 
                element={
                  <ProtectedRoute roles={['organizer']}>
                    <OrganizerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/events/create" 
                element={
                  <ProtectedRoute roles={['organizer']}>
                    <CreateEvent />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/events/:eventId" 
                element={
                  <ProtectedRoute roles={['organizer']}>
                    <OrganizerEventDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/profile" 
                element={
                  <ProtectedRoute roles={['organizer']}>
                    <OrganizerProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/ongoing-events" 
                element={
                  <ProtectedRoute roles={['organizer']}>
                    <OrganizerOngoingEvents />
                  </ProtectedRoute>
                } 
              />

              {/* Admin Routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/organizers" 
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminOrganizerManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/participants" 
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminParticipants />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/events" 
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminEvents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/password-resets" 
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminPasswordResets />
                  </ProtectedRoute>
                } 
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/events" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
