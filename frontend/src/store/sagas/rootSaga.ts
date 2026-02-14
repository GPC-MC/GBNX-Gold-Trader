import { all, fork } from 'redux-saga/effects';
import { watchAppBootstrap } from './appSaga';

export function* rootSaga() {
  yield all([fork(watchAppBootstrap)]);
}
