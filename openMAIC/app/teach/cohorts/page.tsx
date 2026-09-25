'use client';

/**
 * Instructor Cohort Management Dashboard
 * View and manage student cohorts
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('CohortManagement');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Cohort {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  created_at: string;
  is_active: boolean;
}

interface CohortFormData {
  name: string;
  description: string;
}

export default function CohortManagementPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CohortFormData>({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCohorts();
  }, []);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/instructor/cohorts');
      if (!response.ok) {
        throw new Error('Failed to load cohorts');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load cohorts');
      }

      setCohorts(data.data.cohorts || []);
    } catch (err) {
      log.error('Failed to load cohorts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cohorts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Cohort name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      };

      const response = await fetch('/api/instructor/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create cohort');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create cohort');
      }

      setSuccessMessage(`Cohort "${formData.name}" created successfully!`);
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);

      // Reload cohorts
      await loadCohorts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      log.error('Failed to create cohort:', err);
      setError(err instanceof Error ? err.message : 'Failed to create cohort');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCohort = async (cohortId: string, cohortName: string) => {
    if (!confirm(`Are you sure you want to delete "${cohortName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(cohortId);
      setError(null);

      const response = await fetch(`/api/instructor/cohorts/${cohortId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete cohort');
      }

      setSuccessMessage(`Cohort "${cohortName}" deleted successfully!`);
      await loadCohorts();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      log.error('Failed to delete cohort:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete cohort');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BRAND_COLORS.white }}>
      {/* Header */}
      <div style={{ backgroundColor: BRAND_COLORS.navy, color: BRAND_COLORS.white, padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            Student Cohorts
          </h1>
          <p style={{ color: BRAND_COLORS.light, marginTop: '0.5rem' }}>
            Organize students into groups for easy assignment management
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Messages */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: `1px solid ${BRAND_COLORS.border}`,
            }}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: `1px solid ${BRAND_COLORS.border}`,
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* Create Cohort Section */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            padding: '1.5rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            border: `1px solid ${BRAND_COLORS.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: 0 }}>
              Create New Cohort
            </h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                backgroundColor: showCreateForm ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {showCreateForm ? 'Cancel' : '+ Add Cohort'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateCohort} style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: BRAND_COLORS.navy }}>
                  Cohort Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Q4 2026 Cohort"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: BRAND_COLORS.navy }}>
                  Description
                </label>
                <textarea
                  placeholder="e.g., Q4 2026 AI Engineering Course Cohort"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: submitting ? BRAND_COLORS.gray : BRAND_COLORS.orange,
                  color: BRAND_COLORS.white,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Creating...' : 'Create Cohort'}
              </button>
            </form>
          )}
        </div>

        {/* Cohorts List */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '1rem' }}>
            Your Cohorts ({cohorts.length})
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: BRAND_COLORS.gray }}>
              Loading cohorts...
            </div>
          ) : cohorts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                backgroundColor: BRAND_COLORS.light,
                borderRadius: '0.5rem',
                color: BRAND_COLORS.gray,
              }}
            >
              <p>No cohorts yet. Create one to get started!</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {cohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  style={{
                    backgroundColor: BRAND_COLORS.white,
                    border: `2px solid ${BRAND_COLORS.border}`,
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onClick={() => router.push(`/teach/cohorts/${cohort.id}`)}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 0.5rem 0' }}>
                    {cohort.name}
                  </h3>

                  {cohort.description && (
                    <p style={{ color: BRAND_COLORS.gray, fontSize: '0.875rem', margin: '0.5rem 0' }}>
                      {cohort.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: `1px solid ${BRAND_COLORS.border}`,
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: BRAND_COLORS.gray, fontSize: '0.875rem' }}>
                        {cohort.member_count} {cohort.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCohort(cohort.id, cohort.name);
                      }}
                      disabled={deletingId === cohort.id}
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: deletingId === cohort.id ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        opacity: deletingId === cohort.id ? 0.6 : 1,
                      }}
                    >
                      {deletingId === cohort.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
