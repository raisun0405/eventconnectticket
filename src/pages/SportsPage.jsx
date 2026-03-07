import { useEffect, useState } from 'react';
import { getSports } from '../api';
import SportCard from '../components/SportCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

export default function SportsPage() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSports();
      setSports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Sports</h1>
        <p className="text-gray-500 mt-2">Choose a sport to browse upcoming events and available tickets</p>
      </div>

      {loading && <Loader text="Loading sports..." />}
      {error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sports.map((sport) => (
            <SportCard key={sport.sport_id} sport={sport} />
          ))}
        </div>
      )}

      {!loading && !error && sports.length === 0 && (
        <p className="text-center text-gray-400 py-16">No sports available at the moment.</p>
      )}
    </div>
  );
}
