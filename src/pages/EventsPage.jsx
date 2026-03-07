import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getEvents, getSports, getTournaments, getSportLabel, getSportIcon } from '../api';
import EventCard from '../components/EventCard';
import Pagination from '../components/Pagination';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedSport = searchParams.get('sport') || '';
  const selectedTournament = searchParams.get('tournament') || '';
  const selectedStatus = searchParams.get('status') || 'notstarted';
  const page = parseInt(searchParams.get('page')) || 1;
  const query = searchParams.get('q') || '';

  useEffect(() => {
    getSports().then(setSports).catch(() => {});
  }, []);

  // Load tournaments when sport changes
  useEffect(() => {
    if (selectedSport) {
      getTournaments({ sport_type: selectedSport, page_size: 50 })
        .then((data) => setTournaments(data.tournaments || []))
        .catch(() => setTournaments([]));
    } else {
      setTournaments([]);
    }
  }, [selectedSport]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: 12,
        sorting: 'date_start:asc',
      };
      if (selectedSport) params.sport_type = selectedSport;
      if (selectedTournament) params.tournament_id = selectedTournament;
      if (selectedStatus) params.event_status = selectedStatus;
      if (query) params.event_name = query;

      const data = await getEvents(params);
      setEvents(data.events || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedSport, selectedTournament, selectedStatus, page, query]);

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    // Clear tournament when sport changes
    if (key === 'sport') params.delete('tournament');
    setSearchParams(params);
  }

  function handlePageChange(newPage) {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSearch(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const q = form.get('search')?.trim();
    const params = new URLSearchParams(searchParams);
    if (q) {
      params.set('q', q);
    } else {
      params.delete('q');
    }
    params.delete('page');
    setSearchParams(params);
  }

  const statusOptions = [
    { value: 'notstarted', label: 'On Sale' },
    { value: '', label: 'All Status' },
    { value: 'soldout', label: 'Sold Out' },
    { value: 'postponed', label: 'Postponed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {selectedSport ? (
            <span className="flex items-center gap-2">
              <span>{getSportIcon(selectedSport)}</span>
              {getSportLabel(selectedSport)} Events
            </span>
          ) : (
            'All Events'
          )}
        </h1>
        <p className="text-gray-500 mt-2">
          Browse upcoming sports events and book your tickets
          {pagination?.total ? ` • ${pagination.total} events found` : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="search"
                type="text"
                defaultValue={query}
                key={query} // Reset input when query changes externally
                placeholder="Search events by name..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateParam('status', opt.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedStatus === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sport filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParam('sport', '')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              !selectedSport
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Sports
          </button>
          {sports.map((sport) => (
            <button
              key={sport.sport_id}
              onClick={() => updateParam('sport', sport.sport_id.toLowerCase())}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedSport === sport.sport_id.toLowerCase()
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getSportIcon(sport.sport_id)} {getSportLabel(sport.sport_id)}
            </button>
          ))}
        </div>

        {/* Tournament filter (when sport selected) */}
        {tournaments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400 self-center mr-1">Tournament:</span>
            <button
              onClick={() => updateParam('tournament', '')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !selectedTournament
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {tournaments.slice(0, 15).map((t) => (
              <button
                key={t.tournament_id}
                onClick={() => updateParam('tournament', t.tournament_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTournament === t.tournament_id
                    ? 'bg-accent-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.tournament_name}
              </button>
            ))}
          </div>
        )}

        {/* Active filters display */}
        {(query || selectedSport || selectedTournament) && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Active filters:</span>
            {query && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                "{query}"
                <button onClick={() => updateParam('q', '')} className="ml-0.5 hover:text-primary-900">×</button>
              </span>
            )}
            {selectedSport && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                {getSportIcon(selectedSport)} {getSportLabel(selectedSport)}
                <button onClick={() => updateParam('sport', '')} className="ml-0.5 hover:text-primary-900">×</button>
              </span>
            )}
            {selectedTournament && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                {tournaments.find((t) => t.tournament_id === selectedTournament)?.tournament_name || selectedTournament}
                <button onClick={() => updateParam('tournament', '')} className="ml-0.5 hover:text-primary-900">×</button>
              </span>
            )}
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-red-500 hover:text-red-700 ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading && <Loader text="Loading events..." />}
      {error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No events found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or search query</p>
          <button
            onClick={() => setSearchParams({})}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            Reset Filters
          </button>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>
          <Pagination pagination={pagination} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}
