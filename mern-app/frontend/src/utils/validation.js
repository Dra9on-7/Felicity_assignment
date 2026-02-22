/**
 * Form Validation Utilities
 * Provides comprehensive validation functions for all forms
 */

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim() === '') {
    return { valid: false, message: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  
  return { valid: true, message: '' };
};

// IIIT Email validation
export const isIIITEmail = (email) => {
  return email.endsWith('@iiit.ac.in') || email.endsWith('@students.iiit.ac.in');
};

// Password validation
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters' };
  }
  
  // Optional: Check for password strength
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { 
      valid: true, 
      message: '', 
      warning: 'For better security, use a mix of letters and numbers' 
    };
  }
  
  return { valid: true, message: '' };
};

// Phone number validation
export const validatePhone = (phone, required = true) => {
  if (!phone || phone.trim() === '') {
    if (required) {
      return { valid: false, message: 'Phone number is required' };
    }
    return { valid: true, message: '' };
  }
  
  // Remove spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check for valid Indian phone number (10 digits)
  const phoneRegex = /^[6-9]\d{9}$/;
  
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, message: 'Please enter a valid 10-digit Indian phone number' };
  }
  
  return { valid: true, message: '' };
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
  if (!name || name.trim() === '') {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, message: `${fieldName} must be at least 2 characters long` };
  }
  
  if (name.trim().length > 50) {
    return { valid: false, message: `${fieldName} must not exceed 50 characters` };
  }
  
  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { valid: true, message: '' };
};

// Required field validation
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true, message: '' };
};

// URL validation
export const validateURL = (url, required = false) => {
  if (!url || url.trim() === '') {
    if (required) {
      return { valid: false, message: 'URL is required' };
    }
    return { valid: true, message: '' };
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, message: 'URL must start with http:// or https://' };
    }
    return { valid: true, message: '' };
  } catch {
    return { valid: false, message: 'Please enter a valid URL' };
  }
};

// Date validation
export const validateDate = (dateString, fieldName = 'Date') => {
  if (!dateString) {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(date.getTime())) {
    return { valid: false, message: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  
  return { valid: true, message: '' };
};

// Future date validation
export const validateFutureDate = (dateString, fieldName = 'Date') => {
  const basicValidation = validateDate(dateString, fieldName);
  if (!basicValidation.valid) return basicValidation;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { valid: false, message: `${fieldName} must be in the future` };
  }
  
  return { valid: true, message: '' };
};

// Time validation
export const validateTime = (timeString, fieldName = 'Time') => {
  if (!timeString) {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(timeString)) {
    return { valid: false, message: `Please enter a valid ${fieldName.toLowerCase()} in HH:MM format` };
  }
  
  return { valid: true, message: '' };
};

// Number validation
export const validateNumber = (value, fieldName, options = {}) => {
  const { min, max, required = true, integer = false } = options;
  
  if (!value && value !== 0) {
    if (required) {
      return { valid: false, message: `${fieldName} is required` };
    }
    return { valid: true, message: '' };
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} must be a number` };
  }
  
  if (integer && !Number.isInteger(num)) {
    return { valid: false, message: `${fieldName} must be a whole number` };
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, message: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, message: `${fieldName} must not exceed ${max}` };
  }
  
  return { valid: true, message: '' };
};

// Text length validation
export const validateTextLength = (text, fieldName, options = {}) => {
  const { min, max, required = true } = options;
  
  if (!text || text.trim() === '') {
    if (required) {
      return { valid: false, message: `${fieldName} is required` };
    }
    return { valid: true, message: '' };
  }
  
  const length = text.trim().length;
  
  if (min && length < min) {
    return { valid: false, message: `${fieldName} must be at least ${min} characters` };
  }
  
  if (max && length > max) {
    return { valid: false, message: `${fieldName} must not exceed ${max} characters` };
  }
  
  return { valid: true, message: '' };
};

// Event form validation
export const validateEventForm = (formData) => {
  const errors = {};
  
  // Event name
  const nameValidation = validateTextLength(formData.eventName, 'Event name', { min: 3, max: 100 });
  if (!nameValidation.valid) errors.eventName = nameValidation.message;
  
  // Event date
  const dateValidation = validateFutureDate(formData.eventDate, 'Event date');
  if (!dateValidation.valid) errors.eventDate = dateValidation.message;
  
  // Start time
  const startTimeValidation = validateTime(formData.startTime, 'Start time');
  if (!startTimeValidation.valid) errors.startTime = startTimeValidation.message;
  
  // End time
  const endTimeValidation = validateTime(formData.endTime, 'End time');
  if (!endTimeValidation.valid) errors.endTime = endTimeValidation.message;
  
  // Validate end time is after start time
  if (startTimeValidation.valid && endTimeValidation.valid) {
    const [startHour, startMin] = formData.startTime.split(':').map(Number);
    const [endHour, endMin] = formData.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      errors.endTime = 'End time must be after start time';
    }
  }
  
  // Venue
  const venueValidation = validateTextLength(formData.venue, 'Venue', { min: 3, max: 200 });
  if (!venueValidation.valid) errors.venue = venueValidation.message;
  
  // Description
  const descValidation = validateTextLength(formData.description, 'Description', { min: 10, max: 2000 });
  if (!descValidation.valid) errors.description = descValidation.message;
  
  // Max capacity (if provided)
  if (formData.maxCapacity) {
    const capacityValidation = validateNumber(formData.maxCapacity, 'Max capacity', { 
      min: 1, 
      max: 10000, 
      integer: true,
      required: false 
    });
    if (!capacityValidation.valid) errors.maxCapacity = capacityValidation.message;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// Registration form validation
export const validateRegistrationForm = (formData) => {
  const errors = {};
  
  // Email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.valid) errors.email = emailValidation.message;
  
  // Password
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.valid) errors.password = passwordValidation.message;
  
  // Confirm password
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // First name
  const firstNameValidation = validateName(formData.firstName, 'First name');
  if (!firstNameValidation.valid) errors.firstName = firstNameValidation.message;
  
  // Last name
  const lastNameValidation = validateName(formData.lastName, 'Last name');
  if (!lastNameValidation.valid) errors.lastName = lastNameValidation.message;
  
  // Phone number
  const phoneValidation = validatePhone(formData.phoneNumber);
  if (!phoneValidation.valid) errors.phoneNumber = phoneValidation.message;
  
  // College name (for non-IIIT students)
  if (!isIIITEmail(formData.email)) {
    const collegeValidation = validateRequired(formData.collegeName, 'College/Organization name');
    if (!collegeValidation.valid) errors.collegeName = collegeValidation.message;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  validateEmail,
  isIIITEmail,
  validatePassword,
  validatePhone,
  validateName,
  validateRequired,
  validateURL,
  validateDate,
  validateFutureDate,
  validateTime,
  validateNumber,
  validateTextLength,
  validateEventForm,
  validateRegistrationForm,
};
