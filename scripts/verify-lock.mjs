import fs from 'fs';
import path from 'path';

// Parse AGENTS.md rule logic regarding Umsetzungsplan.md lock
const masterPlanPath = path.resolve('docs', 'Umsetzungsplan.md');

try {
    const content = fs.readFileSync(masterPlanPath, 'utf-8');
    
    // Find all locks and filter out "frei"
    const lockRegex = /<!--\s*LOCK:\s*(.+?)\s*-->/gi;
    const matches = [...content.matchAll(lockRegex)];
    const activeLocks = matches.map(m => m[1].trim()).filter(lock => lock !== 'frei');
    
    if (activeLocks.length === 0) {
        console.error('❌ FEHLER: Du hast keinen Block im Umsetzungsplan (docs/Umsetzungsplan.md) geclaimed!');
        console.error('Um Konflikte zu vermeiden, setze bitte einen Lock (z.B. <!-- LOCK: [DeinName] -->) im Bereich, an dem du arbeitest.');
        console.error('Mehr Infos in der AGENTS.md unter "Lock-Protokoll".');
        process.exit(1);
    }
    
    console.log(`✅ Lock-Protokoll eingehalten (Gefundene aktive Locks: ${activeLocks.join(', ')}).`);
    process.exit(0);

} catch (err) {
    if (err.code === 'ENOENT') {
        console.log('⚠️ Umsetzungsplan nicht gefunden, überspringe Lock-Prüfung.');
        process.exit(0);
    }
    console.error('Unerwarteter Fehler bei der Lock-Prüfung:', err);
    process.exit(1);
}
