import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SportsPage from './pages/SportsPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import BookingPage from './pages/BookingPage';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center py-32">
              <div className="text-6xl mb-4">404</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
              <Link to="/" className="text-primary-600 font-medium hover:underline">Go Home</Link>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
