import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizerAPI } from '../services/api';
import { EVENT_CATEGORIES, ELIGIBILITY_OPTIONS } from '../utils/constants';
import '../styles/Dashboard.css';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    eventName: '',
    eventDescription: '',
    eventType: 'normal',
    category: '',
    eligibility: 'all',
    eventStartDate: '',
    eventEndDate: '',
    registrationDeadline: '',
    venue: '',
    registrationLimit: '',
    registrationFee: 0,
    eventTags: '',
    image: '',
    // Merchandise items
    merchandiseItems: [],
    // Custom form fields
    customFormFields: [],
  });

  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    required: false,
    options: '',
    placeholder: '',
  });

  const [newMerchItem, setNewMerchItem] = useState({
    name: '',
    size: '',
    color: '',
    price: 0,
    stock: 0,
    purchaseLimit: 1,
  });

  const categories = EVENT_CATEGORIES;

  const eligibilityOptions = ELIGIBILITY_OPTIONS;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Custom form field management
  const handleAddField = () => {
    if (!newField.label.trim()) {
      alert('Please enter a field label');
      return;
    }

    const field = {
      id: Date.now(),
      ...newField,
      options: (newField.type === 'select') 
        ? newField.options.split(',').map(o => o.trim()).filter(Boolean)
        : [],
    };

    setFormData(prev => ({
      ...prev,
      customFormFields: [...prev.customFormFields, field]
    }));

    setNewField({ label: '', type: 'text', required: false, options: '', placeholder: '' });
  };

  const handleRemoveField = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      customFormFields: prev.customFormFields.filter(f => f.id !== fieldId)
    }));
  };

  // Merchandise item management
  const handleAddMerchItem = () => {
    if (!newMerchItem.name.trim()) {
      alert('Please enter an item name');
      return;
    }

    setFormData(prev => ({
      ...prev,
      merchandiseItems: [...prev.merchandiseItems, { ...newMerchItem, id: Date.now() }]
    }));

    setNewMerchItem({ name: '', size: '', color: '', price: 0, stock: 0, purchaseLimit: 1 });
  };

  const handleRemoveMerchItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      merchandiseItems: prev.merchandiseItems.filter(i => i.id !== itemId)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.eventName.trim()) return 'Event name is required';
        if (!formData.eventDescription.trim()) return 'Description is required';
        if (!formData.eventType) return 'Event type is required';
        break;
      case 2:
        if (!formData.eventStartDate) return 'Event start date is required';
        if (!formData.eventEndDate) return 'Event end date is required';
        if (!formData.registrationDeadline) return 'Registration deadline is required';
        if (new Date(formData.eventStartDate) < new Date()) {
          return 'Event start date cannot be in the past';
        }
        if (new Date(formData.eventEndDate) < new Date()) {
          return 'Event end date cannot be in the past';
        }
        if (new Date(formData.eventEndDate) < new Date(formData.eventStartDate)) {
          return 'Event end date must be after start date';
        }
        if (new Date(formData.registrationDeadline) < new Date()) {
          return 'Registration deadline cannot be in the past';
        }
        if (new Date(formData.registrationDeadline) > new Date(formData.eventStartDate)) {
          return 'Registration deadline must be before event starts';
        }
        break;
      default:
        return null;
    }
    return null;
  };

  const handleNextStep = () => {
    const stepError = validateStep(currentStep);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (status = 'draft') => {
    try {
      setLoading(true);
      setError('');

      const eventData = {
        eventName: formData.eventName,
        eventDescription: formData.eventDescription,
        eventType: formData.eventType,
        category: formData.category || 'General',
        eligibility: formData.eligibility,
        eventStartDate: formData.eventStartDate,
        eventEndDate: formData.eventEndDate,
        registrationDeadline: formData.registrationDeadline,
        venue: formData.venue,
        registrationLimit: formData.registrationLimit ? parseInt(formData.registrationLimit) : undefined,
        registrationFee: parseFloat(formData.registrationFee) || 0,
        eventTags: formData.eventTags.split(',').map(t => t.trim()).filter(Boolean),
        status,
        // Custom form for normal events
        registrationFormFields: formData.eventType === 'normal' 
          ? formData.customFormFields.map(f => f.label) 
          : [],
        customFormFields: formData.eventType === 'normal'
          ? formData.customFormFields.map(({ id, ...field }) => field)
          : [],
        // Merchandise items
        merchandiseDetails: formData.eventType === 'merchandise'
          ? formData.merchandiseItems.map(({ id, ...item }) => item)
          : [],
      };

      await organizerAPI.createEvent(eventData);
      navigate('/organizer/dashboard', { 
        state: { message: `Event ${status === 'published' ? 'published' : 'saved as draft'} successfully!` }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = formData.eventType === 'merchandise' ? 5 : 5;

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3, 4, 5].map(step => (
        <div key={step} className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
          <span className="step-number">{step}</span>
          <span className="step-label">
            {step === 1 && 'Basic Info'}
            {step === 2 && 'Schedule'}
            {step === 3 && 'Venue & Limits'}
            {step === 4 && (formData.eventType === 'merchandise' ? 'Merchandise' : 'Custom Form')}
            {step === 5 && 'Review'}
          </span>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step">
      <h2>Basic Information</h2>
      
      <div className="form-group">
        <label>Event Name *</label>
        <input
          type="text"
          name="eventName"
          value={formData.eventName}
          onChange={handleChange}
          placeholder="Enter event name"
        />
      </div>

      <div className="form-group">
        <label>Description *</label>
        <textarea
          name="eventDescription"
          value={formData.eventDescription}
          onChange={handleChange}
          placeholder="Detailed description of the event"
          rows={5}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Event Type *</label>
          <select name="eventType" value={formData.eventType} onChange={handleChange}>
            <option value="normal">Normal Event</option>
            <option value="merchandise">Merchandise Event</option>
          </select>
        </div>

        <div className="form-group">
          <label>Category</label>
          <select name="category" value={formData.category} onChange={handleChange}>
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Eligibility</label>
          <select name="eligibility" value={formData.eligibility} onChange={handleChange}>
            {eligibilityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input
            type="text"
            name="eventTags"
            value={formData.eventTags}
            onChange={handleChange}
            placeholder="e.g., coding, AI, workshop"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h2>Schedule</h2>

      <div className="form-row">
        <div className="form-group">
          <label>Event Start Date & Time *</label>
          <input
            type="datetime-local"
            name="eventStartDate"
            value={formData.eventStartDate}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Event End Date & Time *</label>
          <input
            type="datetime-local"
            name="eventEndDate"
            value={formData.eventEndDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Registration Deadline *</label>
        <input
          type="datetime-local"
          name="registrationDeadline"
          value={formData.registrationDeadline}
          onChange={handleChange}
        />
        <small className="help-text">Registrations will close at this date/time</small>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h2>Venue & Participation Limits</h2>

      <div className="form-group">
        <label>Venue</label>
        <input
          type="text"
          name="venue"
          value={formData.venue}
          onChange={handleChange}
          placeholder="e.g., Himalaya Auditorium, Online"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Registration Limit</label>
          <input
            type="number"
            name="registrationLimit"
            value={formData.registrationLimit}
            onChange={handleChange}
            placeholder="Leave empty for unlimited"
            min={1}
          />
        </div>

        <div className="form-group">
          <label>Registration Fee (₹)</label>
          <input
            type="number"
            name="registrationFee"
            value={formData.registrationFee}
            onChange={handleChange}
            min={0}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Event Image URL</label>
        <input
          type="url"
          name="image"
          value={formData.image}
          onChange={handleChange}
          placeholder="https://example.com/image.jpg"
        />
      </div>
    </div>
  );

  const renderStep4 = () => {
    if (formData.eventType === 'merchandise') {
      return (
        <div className="form-step">
          <h2>Merchandise Items</h2>
          <p className="step-description">
            Add items available for purchase (T-shirts, hoodies, kits, etc.)
          </p>

          <div className="custom-field-builder">
            <div className="form-row">
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  value={newMerchItem.name}
                  onChange={(e) => setNewMerchItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Felicity T-Shirt"
                />
              </div>
              <div className="form-group">
                <label>Size</label>
                <input
                  type="text"
                  value={newMerchItem.size}
                  onChange={(e) => setNewMerchItem(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g., XL"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Color</label>
                <input
                  type="text"
                  value={newMerchItem.color}
                  onChange={(e) => setNewMerchItem(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="e.g., Black"
                />
              </div>
              <div className="form-group">
                <label>Price (₹) *</label>
                <input
                  type="number"
                  value={newMerchItem.price}
                  onChange={(e) => setNewMerchItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Stock Quantity *</label>
                <input
                  type="number"
                  value={newMerchItem.stock}
                  onChange={(e) => setNewMerchItem(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
              <div className="form-group">
                <label>Purchase Limit per Person</label>
                <input
                  type="number"
                  value={newMerchItem.purchaseLimit}
                  onChange={(e) => setNewMerchItem(prev => ({ ...prev, purchaseLimit: parseInt(e.target.value) || 1 }))}
                  min={1}
                />
              </div>
            </div>

            <button type="button" className="btn-secondary" onClick={handleAddMerchItem}>
              + Add Item
            </button>
          </div>

          {formData.merchandiseItems.length > 0 && (
            <div className="custom-fields-list">
              <h3>Added Items ({formData.merchandiseItems.length})</h3>
              {formData.merchandiseItems.map(item => (
                <div key={item.id} className="custom-field-item">
                  <div className="field-info">
                    <span className="field-name">{item.name}</span>
                    {item.size && <span className="field-type">Size: {item.size}</span>}
                    {item.color && <span className="field-type">Color: {item.color}</span>}
                    <span className="field-type">₹{item.price}</span>
                    <span className="field-type">Stock: {item.stock}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveMerchItem(item.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Normal event: Custom form builder
    return (
      <div className="form-step">
        <h2>Custom Registration Form</h2>
        <p className="step-description">
          Add custom fields to collect additional information from participants during registration.
        </p>

        <div className="custom-field-builder">
          <div className="form-row">
            <div className="form-group">
              <label>Field Label</label>
              <input
                type="text"
                value={newField.label}
                onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., College Name"
              />
            </div>

            <div className="form-group">
              <label>Field Type</label>
              <select
                value={newField.type}
                onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="textarea">Long Text</option>
                <option value="select">Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="file">File Upload</option>
              </select>
            </div>
          </div>

          {newField.type === 'select' && (
            <div className="form-group">
              <label>Options (comma-separated)</label>
              <input
                type="text"
                value={newField.options}
                onChange={(e) => setNewField(prev => ({ ...prev, options: e.target.value }))}
                placeholder="e.g., Small, Medium, Large, XL"
              />
            </div>
          )}

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={newField.required}
                onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
              />
              Required field
            </label>
          </div>

          <button type="button" className="btn-secondary" onClick={handleAddField}>
            + Add Field
          </button>
        </div>

        {formData.customFormFields.length > 0 && (
          <div className="custom-fields-list">
            <h3>Added Fields</h3>
            {formData.customFormFields.map(field => (
              <div key={field.id} className="custom-field-item">
                <div className="field-info">
                  <span className="field-name">{field.label}</span>
                  <span className="field-type">{field.type}</span>
                  {field.required && <span className="field-required">Required</span>}
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => handleRemoveField(field.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="form-step">
      <h2>Review & Submit</h2>
      
      <div className="event-info-grid">
        <div className="info-card">
          <h3>Basic Info</h3>
          <div className="info-row">
            <span className="label">Name</span>
            <span className="value">{formData.eventName}</span>
          </div>
          <div className="info-row">
            <span className="label">Type</span>
            <span className="value">{formData.eventType}</span>
          </div>
          <div className="info-row">
            <span className="label">Category</span>
            <span className="value">{formData.category || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Eligibility</span>
            <span className="value">{formData.eligibility}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>Schedule</h3>
          <div className="info-row">
            <span className="label">Start</span>
            <span className="value">{formData.eventStartDate ? new Date(formData.eventStartDate).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">End</span>
            <span className="value">{formData.eventEndDate ? new Date(formData.eventEndDate).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Deadline</span>
            <span className="value">{formData.registrationDeadline ? new Date(formData.registrationDeadline).toLocaleString() : 'N/A'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>Details</h3>
          <div className="info-row">
            <span className="label">Venue</span>
            <span className="value">{formData.venue || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Limit</span>
            <span className="value">{formData.registrationLimit || 'Unlimited'}</span>
          </div>
          <div className="info-row">
            <span className="label">Fee</span>
            <span className="value">₹{formData.registrationFee || 0}</span>
          </div>
        </div>
      </div>

      <div className="description-section">
        <h3>Description</h3>
        <p>{formData.eventDescription}</p>
      </div>

      {formData.eventType === 'merchandise' && formData.merchandiseItems.length > 0 && (
        <div className="info-card">
          <h3>Merchandise Items ({formData.merchandiseItems.length})</h3>
          {formData.merchandiseItems.map((item, i) => (
            <div key={i} className="info-row">
              <span className="label">{item.name} {item.size && `(${item.size})`}</span>
              <span className="value">₹{item.price} × {item.stock} stock</span>
            </div>
          ))}
        </div>
      )}

      {formData.customFormFields.length > 0 && (
        <div className="info-card">
          <h3>Custom Fields ({formData.customFormFields.length})</h3>
          {formData.customFormFields.map((field, i) => (
            <div key={i} className="info-row">
              <span className="label">{field.label}</span>
              <span className="value">{field.type} {field.required ? '(required)' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="create-event-container">
      <div className="page-header">
        <h1>Create New Event</h1>
        <p>Set up your event and start accepting registrations</p>
      </div>

      {renderStepIndicator()}

      {error && <div className="error-message">{error}</div>}

      <form className="create-event-form" onSubmit={(e) => e.preventDefault()}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}

        <div className="form-actions">
          {currentStep > 1 && (
            <button type="button" className="btn-secondary" onClick={handlePrevStep}>
              ← Previous
            </button>
          )}
          
          {currentStep < 5 ? (
            <button type="button" className="btn-primary" onClick={handleNextStep}>
              Next →
            </button>
          ) : (
            <div className="final-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => handleSubmit('draft')}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => handleSubmit('published')}
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Event'}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;
