// Test-only: lets Node's test runner import the app's extensionless TypeScript modules ('./metrics', '@/lib/x').
import { register } from 'node:module';

register('./resolve-ts.mjs', import.meta.url);
