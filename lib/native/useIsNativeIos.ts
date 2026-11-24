'use client';

import { useSyncExternalStore } from 'react';
import { isNativeIos } from './platform';

const noop = () => () => {};

/** React view of isNativeIos(): false on the server and in every browser. */
export function useIsNativeIos(): boolean {
  return useSyncExternalStore(noop, isNativeIos, () => false);
}
