function countByType(fields) {
    const result = {
        number: 0,
        boolean: 0,
        string: 0,
        json: 0,
    };
    for (const field of fields) {
        const type = String(field?.type || 'json');
        if (!(type in result)) {
            result.json += 1;
            continue;
        }
        result[type] += 1;
    }
    return result;
}

export function renderDraftSummary(draft, schema) {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    const typeCounts = countByType(fields);
    const topLevel = draft && typeof draft === 'object'
        ? Object.keys(draft).filter((key) => key !== 'limitOverrides')
        : [];

    return [
        `schemaVersion: ${String(draft?.schemaVersion || '')}`,
        `sourceSchemaVersion: ${String(draft?.sourceSchemaVersion || '')}`,
        `language: ${String(draft?.language || '')}`,
        '',
        `Top-level sections (${topLevel.length}):`,
        ...topLevel.map((entry) => `- ${entry}`),
        '',
        `Field registry: ${fields.length}`,
        `- number: ${typeCounts.number}`,
        `- boolean: ${typeCounts.boolean}`,
        `- string: ${typeCounts.string}`,
        `- json: ${typeCounts.json}`,
    ].join('\n');
}
