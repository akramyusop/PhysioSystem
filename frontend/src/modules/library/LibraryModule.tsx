import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { Exercise, AuthUser } from '../../types';

export interface LibraryModuleProps {
  currentUser?: AuthUser | null;
  onNavigateToGame?: () => void;
  onNavigateToPrescription?: () => void;
}

export const LibraryModule: React.FC<LibraryModuleProps> = ({
  currentUser,
  onNavigateToGame,
  onNavigateToPrescription,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalExercise, setActiveModalExercise] = useState<Exercise | null>(null);

  const isPatient = currentUser?.role === 'patient';

  // Exercises known to be prescribed to John Doe (Phase 1 ACL: Quad Isometric & Heel Slides)
  const prescribedExerciseIds = useMemo(() => {
    if (isPatient && (currentUser?.patient_profile_id === 1 || currentUser?.full_name?.toLowerCase().includes('john'))) {
      return [1, 2]; // Quadriceps Isometric & Heel Slides
    }
    return [];
  }, [isPatient, currentUser]);

  useEffect(() => {
    setLoading(true);
    api.getExercises()
      .then(res => {
        if (res && res.length > 0) {
          setExercises(res);
        } else {
          setExercises([
            {
              id: 1,
              name: 'Quadriceps Isometric Set',
              description: 'Tighten your thigh muscles while keeping your leg straight on the mat. Hold for 5 seconds.',
              target_body_part: 'Knee / Quadriceps',
              difficulty: 'easy',
              recommended_frequency: '3x daily',
              media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              media_type: 'video',
              thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
            },
            {
              id: 2,
              name: 'Heel Slides with Strap',
              description: 'Slowly slide your heel toward your buttocks, bending your knee as far as comfortable.',
              target_body_part: 'Knee / Hamstring',
              difficulty: 'medium',
              recommended_frequency: '2x daily',
              media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
              media_type: 'video',
              thumbnail_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
            },
            {
              id: 3,
              name: 'Shoulder Pendulum Swing',
              description: 'Lean forward holding a table with your good arm. Let your injured arm hang and gently swing in circles.',
              target_body_part: 'Shoulder',
              difficulty: 'easy',
              recommended_frequency: '3x daily',
              media_url: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600',
              media_type: 'diagram',
              thumbnail_url: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400',
            },
            {
              id: 4,
              name: 'Wall Angels',
              description: 'Stand with back and elbows against the wall, slide arms upward maintaining contact.',
              target_body_part: 'Upper Back & Shoulder',
              difficulty: 'medium',
              recommended_frequency: '1x daily',
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || ex.name.toLowerCase().includes(q) || ex.target_body_part.toLowerCase().includes(q) || ex.description.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'prescribed') return prescribedExerciseIds.includes(ex.id);
      if (selectedCategory === 'knee') return ex.target_body_part.toLowerCase().includes('knee');
      if (selectedCategory === 'shoulder') return ex.target_body_part.toLowerCase().includes('shoulder');
      if (selectedCategory === 'back') return ex.target_body_part.toLowerCase().includes('back') || ex.target_body_part.toLowerCase().includes('spine');

      return true;
    });
  }, [exercises, searchQuery, selectedCategory, prescribedExerciseIds]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: '12px',
          padding: '1.75rem 2rem',
          color: 'white',
          marginBottom: '2rem',
          boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Module 3 • Exercise Library & Guides
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Clinical Video Demonstrations & Biomechanics
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Physiotherapy Exercise & Video Library
          </h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.95rem', maxWidth: '680px' }}>
            {isPatient
              ? `Welcome ${currentUser?.full_name || 'Patient'}! Browse verified physical therapy techniques, view step-by-step videos, and study proper form for your rehabilitation.`
              : 'Explore verified clinical movement patterns, multimedia tutorials, and patient guidance protocols.'}
          </p>
        </div>

        {isPatient && onNavigateToPrescription && (
          <button
            onClick={onNavigateToPrescription}
            style={{
              backgroundColor: '#ffffff',
              color: '#0284c7',
              border: 'none',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            📋 View My Prescribed Regimen (Module 2)
          </button>
        )}
      </div>

      {/* SEARCH AND CATEGORY FILTERS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid ' + (selectedCategory === 'all' ? '#0284c7' : '#cbd5e1'),
              background: selectedCategory === 'all' ? '#0284c7' : '#ffffff',
              color: selectedCategory === 'all' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            All Movements ({exercises.length})
          </button>

          {isPatient && (
            <button
              onClick={() => setSelectedCategory('prescribed')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid ' + (selectedCategory === 'prescribed' ? '#16a34a' : '#86efac'),
                background: selectedCategory === 'prescribed' ? '#16a34a' : '#f0fdf4',
                color: selectedCategory === 'prescribed' ? '#ffffff' : '#166534',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              ⭐ Prescribed to Me ({prescribedExerciseIds.length})
            </button>
          )}

          <button
            onClick={() => setSelectedCategory('knee')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid ' + (selectedCategory === 'knee' ? '#0284c7' : '#cbd5e1'),
              background: selectedCategory === 'knee' ? '#0284c7' : '#ffffff',
              color: selectedCategory === 'knee' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🦵 Knee & Lower Limb
          </button>

          <button
            onClick={() => setSelectedCategory('shoulder')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid ' + (selectedCategory === 'shoulder' ? '#0284c7' : '#cbd5e1'),
              background: selectedCategory === 'shoulder' ? '#0284c7' : '#ffffff',
              color: selectedCategory === 'shoulder' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            💪 Shoulder & Upper Limb
          </button>

          <button
            onClick={() => setSelectedCategory('back')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid ' + (selectedCategory === 'back' ? '#0284c7' : '#cbd5e1'),
              background: selectedCategory === 'back' ? '#0284c7' : '#ffffff',
              color: selectedCategory === 'back' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🧘 Back & Core
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 Search movements or body parts..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            width: '260px',
            outline: 'none',
          }}
        />
      </div>

      {/* EXERCISES GRID */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading clinical exercise library...
        </div>
      ) : filteredExercises.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
            No exercises match your search query or filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredExercises.map(ex => {
            const isPrescribed = prescribedExerciseIds.includes(ex.id);

            return (
              <div
                key={ex.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: isPrescribed ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  boxShadow: isPrescribed
                    ? '0 4px 12px rgba(22, 163, 74, 0.12)'
                    : '0 2px 6px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Media Preview Box */}
                <div
                  style={{
                    position: 'relative',
                    height: '180px',
                    backgroundColor: '#0f172a',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => setActiveModalExercise(ex)}
                >
                  {ex.thumbnail_url ? (
                    <img
                      src={ex.thumbnail_url}
                      alt={ex.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.85,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ fontSize: '3rem' }}>🏃</span>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(2, 132, 199, 0.9)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    }}
                  >
                    ▶
                  </div>

                  {isPrescribed && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      ⭐ In Your Prescription (Phase 1 ACL)
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      color: 'white',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {ex.media_type ? ex.media_type.toUpperCase() : 'GUIDE'}
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {ex.name}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor:
                          ex.difficulty === 'easy'
                            ? '#dcfce7'
                            : ex.difficulty === 'medium'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          ex.difficulty === 'easy'
                            ? '#166534'
                            : ex.difficulty === 'medium'
                            ? '#b45309'
                            : '#991b1b',
                      }}
                    >
                      {ex.difficulty}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 700, marginBottom: '0.6rem' }}>
                    🎯 Target: {ex.target_body_part}
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', margin: '0 0 1rem', flex: 1 }}>
                    {ex.description}
                  </p>

                  <div
                    style={{
                      padding: '0.65rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#334155',
                      marginBottom: '1rem',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    ⏰ <strong>Recommended Frequency:</strong> {ex.recommended_frequency || '2-3x daily'}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setActiveModalExercise(ex)}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #0284c7',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      ▶️ Tutorial & Steps
                    </button>

                    {onNavigateToGame && (
                      <button
                        onClick={onNavigateToGame}
                        title="Practice this movement with Webcam Motion Tracking in Module 4"
                        style={{
                          padding: '0.6rem 0.85rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        🎮 Rehab Game
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED TUTORIAL & VIDEO MODAL */}
      {activeModalExercise && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setActiveModalExercise(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#0284c7',
                    textTransform: 'uppercase',
                  }}
                >
                  Clinical Movement Breakdown
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem', color: '#0f172a' }}>
                  {activeModalExercise.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalExercise(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                ✕
              </button>
            </div>

            {/* Video Player or Diagram */}
            <div style={{ backgroundColor: '#0f172a', position: 'relative' }}>
              {activeModalExercise.media_type === 'video' && activeModalExercise.media_url ? (
                <video
                  controls
                  autoPlay
                  src={activeModalExercise.media_url}
                  poster={activeModalExercise.thumbnail_url || undefined}
                  style={{ width: '100%', maxHeight: '340px', display: 'block' }}
                />
              ) : activeModalExercise.media_url ? (
                <img
                  src={activeModalExercise.media_url}
                  alt={activeModalExercise.name}
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  }}
                >
                  <span style={{ fontSize: '3rem' }}>🏃</span>
                  <p style={{ margin: '0.5rem 0 0' }}>Biomechanic Simulation Mode</p>
                </div>
              )}
            </div>

            {/* Instructions Body */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span className="tag" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                  Target: {activeModalExercise.target_body_part}
                </span>
                <span className="tag" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                  Difficulty: {activeModalExercise.difficulty}
                </span>
                <span className="tag" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                  Daily: {activeModalExercise.recommended_frequency || '2x daily'}
                </span>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                Clinical Instructions & Proper Technique:
              </h4>
              <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                {activeModalExercise.description}
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>
                  Step-by-Step Repetition Protocol:
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569', lineHeight: '1.7' }}>
                  <li>Assume a stable neutral position ensuring spinal alignment.</li>
                  <li>Initiate muscle activation slowly without sudden jerking or hyper-flexion.</li>
                  <li>Hold the peak contraction steadily while maintaining regular breathing.</li>
                  <li>Release tension smoothly over a 2-second count back to starting position.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveModalExercise(null)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close Guide
                </button>

                {onNavigateToGame && (
                  <button
                    onClick={() => {
                      setActiveModalExercise(null);
                      onNavigateToGame();
                    }}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    🎮 Start in Rehab Engine (Module 4)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};