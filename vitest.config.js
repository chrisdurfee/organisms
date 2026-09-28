import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration.
 *
 * The organisms are browser UI components built on the base framework,
 * so every suite runs against a jsdom document. Framework singletons
 * probe for `window`/`document` when they are first imported, so the DOM
 * has to exist before any framework module is loaded.
 */
export default defineConfig({
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: {
				url: 'http://localhost/'
			}
		},
		include: ['tests/**/*.test.js'],
		setupFiles: ['./tests/setup.js'],
		restoreMocks: true,

		/**
		 * Standing up a jsdom document costs a few seconds per file, so
		 * the files run sequentially in one forked process (matching the
		 * base framework setup). Module isolation per file is still on.
		 */
		pool: 'forks',
		maxWorkers: 1,
		minWorkers: 1,
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 30000
	}
});
