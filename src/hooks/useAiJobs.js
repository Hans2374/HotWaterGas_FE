import { useContext } from 'react';
import { AiJobContext } from '../context/aiJobContextObject';

/**
 * The consumer hook for the AI generation job state.
 *
 * It mirrors `hooks/useAuth.js`: the context owns the state, and this
 * hook is the only way a component reads it.
 *
 * @returns {object} The job state and the job actions.
 */
export const useAiJobs = () => {
  const context = useContext(AiJobContext);

  if (!context) {
    throw new Error('useAiJobs must be used within an AiJobProvider');
  }

  return context;
};
