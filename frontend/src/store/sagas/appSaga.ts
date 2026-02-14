import { delay, put, takeLatest } from 'redux-saga/effects';
import {
  bootstrapFailed,
  bootstrapRequested,
  bootstrapSucceeded,
  setGlobalLoading,
} from '../slices/appSlice';

function* bootstrapFlow() {
  try {
    yield put(setGlobalLoading(true));

    // Reserve this saga for async app bootstrapping tasks.
    yield delay(250);

    yield put(bootstrapSucceeded());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    yield put(bootstrapFailed(message));
  } finally {
    yield put(setGlobalLoading(false));
  }
}

export function* watchAppBootstrap() {
  yield takeLatest(bootstrapRequested.type, bootstrapFlow);
}
