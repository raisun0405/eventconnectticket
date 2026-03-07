import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  createReservation,
  getReservationGuestData,
  addReservationGuestData,
  createBooking,
  deleteReservation,
  formatPrice,
  formatDate,
  formatTime,
  getSportIcon,
} from '../api';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

const STEPS = ['Review', 'Reserve', 'Guest Info', 'Confirm'];

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { event, ticket, quantity } = location.state || {};

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reservation
  const [reservation, setReservation] = useState(null);
  const [reservationTimer, setReservationTimer] = useState(null);
  const reservationRef = useRef(null);

  // Guest data
  const [guestRequirements, setGuestRequirements] = useState(null);
  const [guestForms, setGuestForms] = useState([]);
  const [hasPreCheckout, setHasPreCheckout] = useState(false);

  // Booking
  const [bookingEmail, setBookingEmail] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [bookingResult, setBookingResult] = useState(null);

  // Timer countdown based on actual API valid_until
  useEffect(() => {
    if (!reservation?.valid_until || step >= 4) return;

    const calcRemaining = () => {
      const expiry = new Date(reservation.valid_until).getTime();
      return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    };

    setReservationTimer(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setReservationTimer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setError('Your reservation has expired. Please start over.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation?.valid_until, step]);

  // Cleanup reservation on unmount if not booked
  useEffect(() => {
    return () => {
      if (reservationRef.current && !bookingResult) {
        deleteReservation(reservationRef.current).catch(() => {});
      }
    };
  }, []);

  if (!event || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🎟️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No booking data</h2>
        <p className="text-gray-500 mb-6">Please select a ticket from an event page first.</p>
        <Link
          to="/events"
          className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
        >
          Browse Events
        </Link>
      </div>
    );
  }

  // Use EUR face value (matching official portal)
  const eurPrice = ticket?.local_rates?.face_value_eur || ticket?.local_rates?.net_rate_eur || ticket?.face_value || ticket?.net_rate || 0;
  const totalPrice = eurPrice * quantity;

  // Step 1: Create reservation
  async function handleCreateReservation() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        items: [
          {
            ticket_id: ticket.ticket_id,
            quantity: quantity,
            net_rate: ticket.net_rate,
            currency_code: ticket.currency_code,
          },
        ],
        booking_email: bookingEmail,
        notify_client: false,
        notify_me: false,
      };

      const res = await createReservation(payload);
      setReservation(res);
      reservationRef.current = res.reservation_id;

      // Fetch guest data requirements
      let requiresGuestData = false;
      try {
        const guestData = await getReservationGuestData(res.reservation_id, true);
        setGuestRequirements(guestData);

        // Parse guest data template - handle both flat and conditions formats
        if (guestData.items?.length > 0) {
          const item = guestData.items[0];
          const templateGuest = item.guests?.[0] || {};

          // Extract pre_checkout fields from the template
          const preCheckoutFields = [];
          Object.entries(templateGuest).forEach(([key, val]) => {
            if (key === 'lead_guest' || key === 'guest_id' || key === 'conditions') return;

            // When include_conditions=true, val is {value, condition, error}
            if (val && typeof val === 'object' && val.condition === 'pre_checkout') {
              preCheckoutFields.push(key);
            }
          });

          requiresGuestData = preCheckoutFields.length > 0;
          setHasPreCheckout(requiresGuestData);

          if (requiresGuestData) {
            // Create forms for each guest
            const forms = [];
            for (let i = 0; i < quantity; i++) {
              const form = {};
              preCheckoutFields.forEach((key) => {
                form[key] = '';
              });
              form.lead_guest = i === 0;
              forms.push(form);
            }
            setGuestForms(forms);
          }
        }
      } catch (guestErr) {
        // Guest data not required for all events
        console.warn('Guest data not available:', guestErr);
        setGuestForms([]);
        setHasPreCheckout(false);
      }

      setStep(2);
    } catch (err) {
      setError(err.message);
      setStep(0); // Go back to review on error
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit guest data
  async function handleSubmitGuestData() {
    if (!hasPreCheckout || guestForms.length === 0) {
      // No guest data required, go straight to confirm
      setStep(3);
      return;
    }

    // Validate required fields are filled
    const emptyFields = guestForms.some((form) =>
      Object.entries(form).some(([key, val]) => key !== 'lead_guest' && val === '')
    );
    if (emptyFields) {
      setError('Please fill in all required guest fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        items: [
          {
            ticket_id: ticket.ticket_id,
            quantity: quantity,
            guests: guestForms.map((form, i) => ({
              ...form,
              lead_guest: i === 0,
            })),
          },
        ],
      };

      await addReservationGuestData(reservation.reservation_id, payload);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Finalize booking
  async function handleFinalizeBooking() {
    setLoading(true);
    setError(null);
    try {
      const bookingReference = `BOOK-${Date.now()}`;
      const payload = {
        reservation_id: reservation.reservation_id,
        booking_email: bookingEmail,
        invoice_reference: invoiceRef || `INV-${Date.now()}`,
        booking_reference: bookingReference,
        payment_method: 'invoice',
        is_test_booking: false,
      };

      const result = await createBooking(payload);
      setBookingResult(result);
      reservationRef.current = null; // Prevent cleanup from deleting it
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateGuestForm(index, field, value) {
    setGuestForms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fieldLabels = {
    first_name: 'First Name',
    last_name: 'Last Name',
    contact_email: 'Email Address',
    contact_phone: 'Phone Number',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    country_of_residence: 'Country (ISO3)',
    passport_number: 'Passport Number',
    street_name: 'Street Address',
    city: 'City',
    zip: 'Zip Code',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/events" className="hover:text-gray-600">Events</Link>
        <span>›</span>
        <Link to={`/events/${event.event_id}`} className="hover:text-gray-600 truncate">{event.event_name}</Link>
        <span>›</span>
        <span className="text-gray-600">Booking</span>
      </nav>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
              i < step ? 'bg-green-500 text-white'
              : i === step ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              i <= step ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Reservation timer */}
      {reservation && step >= 2 && step < 4 && reservationTimer !== null && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          reservationTimer < 120 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Reservation expires in <strong>{formatTimer(reservationTimer)}</strong>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {/* Step 0: Review */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-600"></div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review Your Selection</h2>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <span className="text-3xl">{getSportIcon(event.sport_type)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{event.event_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(event.date_start)} • {formatTime(event.date_start)}
                  </p>
                  <p className="text-sm text-gray-500">{event.venue_name}, {event.city}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500">Ticket</div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {ticket.ticket_title || ticket.category_name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{ticket.type_ticket}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500">Quantity</div>
                  <div className="font-semibold text-gray-900 mt-1">{quantity} ticket{quantity > 1 ? 's' : ''}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatPrice(eurPrice, 'EUR')} each
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-primary-900">Total</span>
                <span className="text-2xl font-bold text-primary-700">
                  {formatPrice(totalPrice, 'EUR')}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <button
              onClick={() => {
                if (!bookingEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingEmail)) {
                  setError('Please enter a valid email address');
                  return;
                }
                setError(null);
                setStep(1);
                handleCreateReservation();
              }}
              disabled={loading || !bookingEmail}
              className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Reservation...' : 'Reserve Tickets'}
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Reserving (auto-transitions) */}
      {step === 1 && loading && <Loader text="Reserving your tickets..." />}

      {/* Step 2: Guest Information */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-600"></div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Guest Information</h2>
            <p className="text-sm text-gray-500 mb-6">
              {hasPreCheckout && guestForms.length > 0
                ? 'Please provide the required guest information for each ticket.'
                : 'No guest information is required for this event. You can proceed to confirm.'}
            </p>

            {hasPreCheckout && guestForms.length > 0 ? (
              <div className="space-y-6">
                {guestForms.map((form, idx) => (
                  <div key={idx} className="p-5 border border-gray-200 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      {idx === 0 ? '👤 Lead Guest' : `Guest ${idx + 1}`}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(form).filter(([k]) => k !== 'lead_guest').map(([field, value]) => (
                        <div key={field}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {fieldLabels[field] || field.replace(/_/g, ' ')}
                          </label>
                          {field === 'gender' ? (
                            <select
                              value={value}
                              onChange={(e) => updateGuestForm(idx, field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">Select...</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="unknown">Prefer not to say</option>
                            </select>
                          ) : field === 'date_of_birth' ? (
                            <input
                              type="date"
                              value={value}
                              onChange={(e) => updateGuestForm(idx, field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            <input
                              type={field === 'contact_email' ? 'email' : 'text'}
                              value={value}
                              onChange={(e) => updateGuestForm(idx, field, e.target.value)}
                              placeholder={fieldLabels[field] || field}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500">No additional information needed</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  // Going back means we need to cancel the reservation
                  if (reservation?.reservation_id) {
                    deleteReservation(reservation.reservation_id).catch(() => {});
                    setReservation(null);
                    reservationRef.current = null;
                    setReservationTimer(null);
                  }
                  setStep(0);
                }}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel & Go Back
              </button>
              <button
                onClick={handleSubmitGuestData}
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Continue to Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-600"></div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Confirm & Book</h2>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Event</h3>
                <p className="text-sm text-gray-600">{event.event_name}</p>
                <p className="text-xs text-gray-400">{formatDate(event.date_start)} • {event.venue_name}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Tickets</h3>
                <p className="text-sm text-gray-600">
                  {quantity}x {ticket.ticket_title || ticket.category_name}
                </p>
                <p className="text-xs text-gray-400">{ticket.type_ticket}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
                <p className="text-sm text-gray-600">{bookingEmail}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Reference (optional)
                </label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="Your reference number"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="p-4 bg-primary-50 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-primary-900">Total Payment</span>
                <span className="text-2xl font-bold text-primary-700">
                  {formatPrice(totalPrice, 'EUR')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinalizeBooking}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Finalizing...' : '✓ Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && bookingResult && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
            <p className="text-gray-500 mb-6">
              Your booking has been confirmed. A confirmation email will be sent to <strong>{bookingEmail}</strong>.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 inline-block">
                <div className="text-sm text-gray-500">Booking Code</div>
                <div className="font-mono font-bold text-lg text-primary-600">
                  {bookingResult.booking_code || bookingResult.booking_id}
                </div>
              </div>
              {bookingResult.booking_id && (
                <div className="bg-gray-50 rounded-xl p-4 inline-block">
                  <div className="text-sm text-gray-500">Booking ID</div>
                  <div className="font-mono font-bold text-gray-900 text-sm">{bookingResult.booking_id}</div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl text-left">
                <p className="text-sm"><strong>Event:</strong> {event.event_name}</p>
                <p className="text-sm"><strong>Date:</strong> {formatDate(event.date_start)}</p>
                <p className="text-sm"><strong>Tickets:</strong> {quantity}x {ticket.ticket_title || ticket.category_name}</p>
                <p className="text-sm"><strong>Total:</strong> {formatPrice(totalPrice, 'EUR')}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/events"
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Browse More Events
              </Link>
              <Link
                to="/"
                className="px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
