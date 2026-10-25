import { createRequire } from 'node:module';

// Reuse Member 2's dependency versions without maintaining a second install.
const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));
const localRequire = createRequire(import.meta.url);

export function dependency(name) {
  let resolved;
  try {
    resolved = serverRequire.resolve(name);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    try {
      resolved = localRequire.resolve(name);
    } catch {
      throw new Error(`Required dependency "${name}" is missing. Install the backend's approved dependencies in server/.`);
    }
  }
  return localRequire(resolved);
}

export const mongoose = dependency('mongoose');
