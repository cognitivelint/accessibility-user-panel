/**
 * Versioned finding contract. Reports and CI consumers should pin to schemaVersion.
 * 1.1.0 adds livedMoment and habit so developer feedback stays humane.
 */
export const FINDING_SCHEMA_VERSION = "1.1.0" as const;
export const REPORT_SCHEMA_VERSION = "1.1.0" as const;
