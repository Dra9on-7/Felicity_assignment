import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../services/api';
import EventCard from '../components/EventCard';
import '../styles/Events.css';

const BrowseEvents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    eventType: searchParams.get('eventType') || '',
    organizer: searchParams.get('organizer') || '',
    sortBy: searchParams.get('sortBy') || 'startDateTime',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [searchParams]);

  const fetchFiltersData = async () => {
    try {
      const [categoriesRes, organizersRes] = await Promise.all([
        eventAPI.getCategories(),
        eventAPI.getOrganizers(),
      ]);
      setCategories(categoriesRes.data.data || []);
      setOrganizers(organizersRes.data.data || []);
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(searchParams.entries());
      const response = await eventAPI.getEvents(params);
      setEvents(response.data.data || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      eventType: '',
      organizer: '',
      sortBy: 'startDateTime',
      sortOrder: 'asc',
    });
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  return (
    <div className="browse-events-container">
      <div className="page-header">
        <h1>Browse Events</h1>
        <p>Discover exciting events happening at Felicity</p>
      </div>

      <div className="events-layout">
        <aside className="filters-sidebar">
          <div className="filters-header">
            <h3>Filters</h3>
            <button onClick={clearFilters} className="clear-btn">Clear All</button>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Event Type</label>
            <select
              value={filters.eventType}
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="normal">Normal Events</option>
              <option value="merchandise">Merchandise</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Organizer</label>
            <select
              value={filters.organizer}
              onChange={(e) => handleFilterChange('organizer', e.target.value)}
            >
              <option value="">All Organizers</option>
              {organizers.map(org => (
                <option key={org._id} value={org._id}>
                  {org.clubName || org.councilName || org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="startDateTime">Start Date</option>
              <option value="name">Name</option>
              <option value="createdAt">Recently Added</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <button onClick={applyFilters} className="apply-filters-btn">
            Apply Filters
          </button>
        </aside>

        <main className="events-content">
          {loading ? (
            <div className="loading">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="no-events">
              <h3>No events found</h3>
              <p>Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <>
              <div className="events-grid">
                {events.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default BrowseEvents;
