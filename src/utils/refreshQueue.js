/**
 * Single-refresh queue.
 *
 * When multiple requests hit a 401 simultaneously, only ONE refresh request fires.
 * All concurrent requests subscribe to that single promise and retry when it resolves.
 *
 * The queue is cleared on logout and on refresh failure (forcing all to reject).
 */

let isRefreshing = false;

const pendingRequests = [];

const processQueue = (error) => {
  pendingRequests.forEach((cb) => {
    if (error) {
      cb.reject(error);
    } else {
      cb.resolve();
    }
  });
  pendingRequests.length = 0;
};

export const getIsRefreshing = () => isRefreshing;

/**
 * Ensures only one refresh is in-flight at a time.
 *
 * @param {() => Promise<void>} refreshFn - the actual refresh call. Called only
 *   when no other refresh is currently running.
 * @returns {Promise<void>} resolves when the token has been refreshed; rejects
 *   on refresh failure.
 */
export const executeWithRefreshLock = (refreshFn) => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingRequests.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  return refreshFn()
    .then(() => {
      processQueue(null);
    })
    .catch((err) => {
      processQueue(err);
      throw err;
    })
    .finally(() => {
      isRefreshing = false;
    });
};

/**
 * Resets the queue state without resolving or rejecting pending requests.
 * Call this during logout to cancel all in-flight retry attempts.
 */
export const clearRefreshQueue = () => {
  pendingRequests.length = 0;
  isRefreshing = false;
};
