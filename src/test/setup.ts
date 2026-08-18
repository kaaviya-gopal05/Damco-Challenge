import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Not using vitest's `globals: true` mode, so @testing-library/react's automatic
// afterEach(cleanup) registration never fires on its own — wire it up explicitly,
// otherwise a component rendered in one test stays mounted in jsdom for the next.
afterEach(() => {
  cleanup();
});
