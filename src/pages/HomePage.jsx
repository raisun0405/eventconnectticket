import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSports, getEvents, getSportIcon, getSportLabel } from '../api';
import SportCard from '../components/SportCard';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';

export default function HomePage() {
  const [sports, setSports] = useState([]);
  const [popularEvents, setPopularEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sportsData, upcomingData, popularData] = await Promise.all([
          getSports(),
          getEvents({ page_size: 8, sorting: 'date_start:asc', event_status: 'notstarted' }),
          getEvents({ page_size: 4, popular_events: true, event_status: 'notstarted' }),
        ]);
        setSports(sportsData);
        // Prefer popular events if available, fall back to upcoming
        const popular = popularData.events || [];
        const upcoming = upcomingData.events || [];
        setPopularEvents(popular.length > 0 ? popular : upcoming.slice(0, 4));
        // Use remaining upcoming events
        const popularIds = new Set(popular.map((e) => e.event_id));
        const filteredUpcoming = upcoming.filter((e) => !popularIds.has(e.event_id));
        setUpcomingEvents(filteredUpcoming.length > 0 ? filteredUpcoming : upcoming);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loader text="Loading EventTix..." />;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-[200px] leading-none">⚽</div>
          <div className="absolute bottom-10 right-10 text-[150px] leading-none">🏎️</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px]">🎾</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Your Seat to the <span className="text-primary-200">Best Events</span> Worldwide
            </h1>
            <p className="text-lg text-primary-100 mb-8 leading-relaxed">
              Book tickets for soccer, Formula 1, tennis, rugby, and many more sports events.
              Real-time availability, secure booking, instant confirmation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/events"
                className="px-6 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors shadow-lg"
              >
                Browse All Events
              </Link>
              <Link
                to="/sports"
                className="px-6 py-3 bg-primary-500/30 text-white font-semibold rounded-xl hover:bg-primary-500/50 transition-colors border border-white/20"
              >
                Explore Sports
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse by Sport</h2>
            <p className="text-gray-500 mt-1">Choose your favorite sport to see upcoming events</p>
          </div>
          <Link to="/sports" className="text-primary-600 font-semibold text-sm hover:text-primary-700">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sports.slice(0, 10).map((sport) => (
            <SportCard key={sport.sport_id} sport={sport} />
          ))}
        </div>
      </section>

      {/* Popular Events */}
      {popularEvents.length > 0 && (
        <section className="bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">🔥 Popular Events</h2>
                <p className="text-gray-500 mt-1">Hot tickets everyone's looking for</p>
              </div>
              <Link to="/events" className="text-primary-600 font-semibold text-sm hover:text-primary-700">
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {popularEvents.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section className={popularEvents.length === 0 ? 'bg-gray-50 border-y border-gray-100' : ''}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
              <p className="text-gray-500 mt-1">Don't miss these upcoming sports events</p>
            </div>
            <Link to="/events" className="text-primary-600 font-semibold text-sm hover:text-primary-700">
              View all →
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No upcoming events found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {upcomingEvents.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="text-4xl font-bold text-primary-600 mb-2">{sports.length}+</div>
            <div className="text-gray-500 font-medium">Sports Available</div>
          </div>
          <div className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="text-4xl font-bold text-primary-600 mb-2">🌍</div>
            <div className="text-gray-500 font-medium">Worldwide Events</div>
          </div>
          <div className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="text-4xl font-bold text-primary-600 mb-2">⚡</div>
            <div className="text-gray-500 font-medium">Real-time Booking</div>
          </div>
        </div>
      </section>
    </div>
  );
}
