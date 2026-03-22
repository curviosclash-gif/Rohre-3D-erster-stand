#!/usr/bin/env node
import { forwardLegacyScriptAndExit } from './_forward-legacy-script.mjs';

await forwardLegacyScriptAndExit('training-e2e.mjs');
