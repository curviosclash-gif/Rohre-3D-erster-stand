import process from 'node:process';
import { runPlaywrightProfile } from './playwright-run-profile.mjs';

runPlaywrightProfile('dev-runtime', process.argv.slice(2));
