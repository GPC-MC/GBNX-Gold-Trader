import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PriceProvider } from './contexts/PriceContext';
import { router } from './app/router';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { bootstrapRequested } from './store/slices/appSlice';
import styles from './App.module.scss';

function App() {
  const dispatch = useAppDispatch();
  const bootstrapping = useAppSelector((state) => state.app.bootstrapping);
  const bootstrapError = useAppSelector((state) => state.app.error);

  useEffect(() => {
    dispatch(bootstrapRequested());
  }, [dispatch]);

  return (
    <AuthProvider>
      <PriceProvider>
        <div className={styles.appRoot}>
          <RouterProvider router={router} />

          {bootstrapping && (
            <div className={styles.bootstrapOverlay} role="status" aria-live="polite">
              <div className={styles.bootstrapPanel}>
                <p className={styles.bootstrapTitle}>Application Init</p>
                <p className={styles.bootstrapText}>Bootstrapping trading workspace...</p>
                <p className={styles.bootstrapSubtle}>Redux Toolkit + redux-saga flow active</p>
              </div>
            </div>
          )}

          {bootstrapError && !bootstrapping && (
            <div className={styles.bootstrapOverlay} role="alert" aria-live="assertive">
              <div className={styles.bootstrapPanel}>
                <p className={styles.bootstrapTitle}>Bootstrap Error</p>
                <p className={styles.bootstrapText}>{bootstrapError}</p>
                <p className={styles.bootstrapSubtle}>Reload to retry initialization</p>
              </div>
            </div>
          )}
        </div>
      </PriceProvider>
    </AuthProvider>
  );
}

export default App;
