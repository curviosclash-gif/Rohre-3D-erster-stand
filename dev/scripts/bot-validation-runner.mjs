#!/usr/bin/env node
import { forwardLegacyScriptAndExit } from './_forward-legacy-script.mjs';

await forwardLegacyScriptAndExit('bot-validation-runner.mjs');
