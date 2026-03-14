// XS2Event API Service
// Uses Vite proxy to avoid CORS issues: /api -> https://api.xs2event.com

const BASE_URL = 'https://api.xs2event.com/v1';
const API_KEY = import.meta.env.VITE_API_KEY || '356baf5f18e8401aadbf0efc6459c53f';

const headers = {
  'X-Api-Key': API_KEY,
  'Accept': 'application/json',
};

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.title || `API Error: ${res.status}`);
  }

  // Handle 204 No Content
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Sports ────────────────────────────────────────────────────────────────
export async function getSports() {
  const data = await apiFetch('/sports?page_size=50');
  return data.sports || [];
}

// ─── Events ────────────────────────────────────────────────────────────────
export async function getEvents(params = {}) {
  const query = new URLSearchParams();

  // All supported API query params
  const directParams = [
    'sport_type', 'date_stop', 'date_start', 'tournament_id', 'event_status',
    'city', 'country', 'popular_events', 'page', 'page_size', 'sorting',
    'event_name', 'tournament_name', 'venue_id', 'event_id', 'team_id',
    'hometeam_id', 'visitingteam_id', 'location_id', 'tournament_type',
    'tickets_available', 'ticket_price_eur', 'slug', 'season',
  ];
  directParams.forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.set(key, params[key]);
    }
  });

  // Default: future events only
  if (!params.date_stop) {
    query.set('date_stop', `ge:${new Date().toISOString().split('T')[0]}`);
  }

  const qs = query.toString();
  const data = await apiFetch(`/events${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getEvent(eventId) {
  const data = await apiFetch(`/events/${eventId}`);
  return data;
}

// ─── Tickets ───────────────────────────────────────────────────────────────
export async function getTickets(params = {}) {
  const query = new URLSearchParams();

  const directParams = [
    'event_id', 'ticket_status', 'stock', 'page', 'page_size', 'sorting',
    'category_id', 'sub_category', 'category_type', 'ticket_type',
    'venue_id', 'city', 'supplier_type', 'supplier_id', 'organiser_id',
    'ticket_source', 'ticket_validity', 'vat_category', 'face_value',
    'ticket_validfrom', 'ticket_validuntil',
  ];
  directParams.forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.set(key, params[key]);
    }
  });

  const qs = query.toString();
  const data = await apiFetch(`/tickets${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getTicket(ticketId) {
  const data = await apiFetch(`/tickets/${ticketId}`);
  return data;
}

// ─── Categories ────────────────────────────────────────────────────────────
export async function getCategories(params = {}) {
  const query = new URLSearchParams();

  const directParams = ['event_id', 'category_id', 'venue_id', 'page_size', 'page'];
  directParams.forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.set(key, params[key]);
    }
  });

  const qs = query.toString();
  const data = await apiFetch(`/categories${qs ? `?${qs}` : ''}`);
  return data;
}

// ─── Tournaments ───────────────────────────────────────────────────────────
export async function getTournaments(params = {}) {
  const query = new URLSearchParams();

  const directParams = ['sport_type', 'date_stop', 'page', 'page_size', 'tournament_type'];
  directParams.forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.set(key, params[key]);
    }
  });

  if (!params.date_stop) {
    query.set('date_stop', `ge:${new Date().toISOString().split('T')[0]}`);
  }

  const qs = query.toString();
  const data = await apiFetch(`/tournaments${qs ? `?${qs}` : ''}`);
  return data;
}

// ─── Teams ─────────────────────────────────────────────────────────────────
export async function getTeams(params = {}) {
  const query = new URLSearchParams();

  const directParams = ['sport_type', 'page', 'page_size'];
  directParams.forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.set(key, params[key]);
    }
  });

  const qs = query.toString();
  const data = await apiFetch(`/teams${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getTeam(teamId) {
  const data = await apiFetch(`/teams/${teamId}`);
  return data;
}

// ─── Venues ────────────────────────────────────────────────────────────────
export async function getVenues(params = {}) {
  const query = new URLSearchParams();

  if (params.venue_id) query.set('venue_id', params.venue_id);
  if (params.page) query.set('page', params.page);
  if (params.page_size) query.set('page_size', params.page_size);

  const qs = query.toString();
  const data = await apiFetch(`/venues${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getVenue(venueId) {
  const data = await apiFetch(`/venues/${venueId}`);
  return data;
}

// ─── Reservations ──────────────────────────────────────────────────────────
export async function createReservation(payload) {
  const data = await apiFetch('/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data;
}

export async function getReservation(reservationId) {
  const data = await apiFetch(`/reservations/${reservationId}`);
  return data;
}

export async function updateReservation(reservationId, payload) {
  const data = await apiFetch(`/reservations/${reservationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deleteReservation(reservationId) {
  const data = await apiFetch(`/reservations/${reservationId}`, {
    method: 'DELETE',
  });
  return data;
}

// ─── Guest Data ────────────────────────────────────────────────────────────
export async function getEventGuestData(eventId) {
  const data = await apiFetch(`/events/${eventId}/guestdata`);
  return data;
}

export async function getReservationGuestData(reservationId, includeConditions = true) {
  const qs = includeConditions ? '?include_conditions=true' : '';
  const data = await apiFetch(`/reservations/${reservationId}/guestdata${qs}`);
  return data;
}

export async function addReservationGuestData(reservationId, payload) {
  const data = await apiFetch(`/reservations/${reservationId}/guestdata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data;
}

// ─── Bookings ──────────────────────────────────────────────────────────────
export async function createBooking(payload) {
  const data = await apiFetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
export function formatPrice(cents, currencyCode = 'EUR') {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SPORT_ICONS = {
  soccer: '⚽',
  football: '⚽',
  formula1: '🏎️',
  motorsport: '🏁',
  motogp: '🏍️',
  tennis: '🎾',
  rugby: '🏉',
  cricket: '🏏',
  basketball: '🏀',
  nba: '🏀',
  boxing: '🥊',
  combatsport: '🥊',
  darts: '🎯',
  horseracing: '🐎',
  icehockey: '🏒',
  nfl: '🏈',
  mlb: '⚾',
  golf: '⛳',
  handball: '🤾',
  padel: '🏓',
  watersport: '🚣',
  rowing: '🚣',
  dtm: '🏎️',
  indycar: '🏎️',
  superbike: '🏍️',
  other: '🏆',
};

export function getSportIcon(sportType) {
  return SPORT_ICONS[sportType?.toLowerCase()] || '🏆';
}

export function getSportLabel(sportId) {
  const labels = {
    soccer: 'Soccer',
    formula1: 'Formula 1',
    motorsport: 'Motorsport',
    motogp: 'MotoGP',
    tennis: 'Tennis',
    rugby: 'Rugby',
    cricket: 'Cricket',
    basketball: 'Basketball',
    nba: 'NBA',
    boxing: 'Boxing',
    combatsport: 'Combat Sports',
    darts: 'Darts',
    horseracing: 'Horse Racing',
    icehockey: 'Ice Hockey',
    nfl: 'NFL',
    mlb: 'MLB',
    golf: 'Golf',
    handball: 'Handball',
    padel: 'Padel',
    watersport: 'Water Sports',
    rowing: 'Rowing',
    dtm: 'DTM',
    indycar: 'IndyCar',
    superbike: 'Superbike',
    other: 'Other',
  };
  return labels[sportId?.toLowerCase()] || sportId;
}
