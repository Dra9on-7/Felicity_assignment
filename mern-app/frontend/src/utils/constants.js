/**
 * Shared constants for the Felicity Event Management System
 * Single source of truth for categories, interests, and other shared values
 */

// Unified list of event categories AND participant interest areas
// These are used in: CreateEvent (category dropdown), BrowseEvents (filter),
// Onboarding (interest picker), Profile (interest picker)
export const EVENT_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Gaming',
  'Music',
  'Art & Design',
  'Photography',
  'Robotics',
  'AI/ML',
  'Web Development',
  'Entrepreneurship',
  'Film Making',
  'Dance',
  'Debate',
  'Quiz',
  'Social Service',
  'General',
  'Other',
];

// Interest options with icons (for Onboarding page)
export const INTEREST_OPTIONS = EVENT_CATEGORIES
  .filter(cat => cat !== 'General' && cat !== 'Other')
  .map(cat => {
    const icons = {
      'Technical': '💻',
      'Cultural': '🎭',
      'Sports': '⚽',
      'Literary': '📚',
      'Gaming': '🎮',
      'Music': '🎵',
      'Art & Design': '🎨',
      'Photography': '📷',
      'Robotics': '🤖',
      'AI/ML': '🧠',
      'Web Development': '🌐',
      'Entrepreneurship': '💼',
      'Film Making': '🎬',
      'Dance': '💃',
      'Debate': '🎤',
      'Quiz': '❓',
      'Social Service': '🤝',
    };
    return {
      id: cat.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: cat,
      icon: icons[cat] || '📌',
    };
  });

// Eligibility options for events
export const ELIGIBILITY_OPTIONS = [
  { value: 'all', label: 'All Participants' },
  { value: 'iiit', label: 'IIIT Students Only' },
  { value: 'non-iiit', label: 'Non-IIIT Only' },
];
