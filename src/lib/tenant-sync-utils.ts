export function isValidPostgresConnectionString(connectionString: string): boolean {
    return connectionString.startsWith("postgresql://") || connectionString.startsWith("postgres://");
}

export function buildTenantSyncCommand(connectionString: string) {
    return {
        file: "npx",
        args: [
            "prisma",
            "db",
            "push",
            "--schema=prisma/schema.tenant.prisma",
            `--url=${connectionString}`,
        ],
    };
}

export function buildTenantDiffCommand(connectionString: string) {
    return {
        file: "npx",
        args: [
            "prisma",
            "migrate",
            "diff",
            "--from-config-datasource",
            "--to-schema=prisma/schema.tenant.prisma",
            "--script",
        ],
    };
}

export function isDataLossError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("--accept-data-loss");
}

export function filterNonDestructiveSqlStatements(sqlScript: string): string[] {
    const statements = sqlScript
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);

    const destructivePatterns = [
        /\bDROP\s+TABLE\b/i,
        /\bDROP\s+VIEW\b/i,
        /\bDROP\s+TYPE\b/i,
        /\bDROP\s+SCHEMA\b/i,
        /\bDROP\s+COLUMN\b/i,
        /\bDROP\s+CONSTRAINT\b/i,
        /\bALTER\s+TABLE[\s\S]*\bDROP\b/i,
        /\bTRUNCATE\b/i,
        /\bDELETE\s+FROM\b/i,
    ];

    return statements.filter((statement) => {
        const normalized = statement.replace(/\s+/g, " ").trim();
        return !destructivePatterns.some((pattern) => pattern.test(normalized));
    });
}

export function sanitizeErrorDetails(details: string, connectionString?: string): string {
    let sanitized = details;

    if (connectionString) {
        sanitized = sanitized.split(connectionString).join("<redacted-connection-url>");
    }

    sanitized = sanitized.replace(
        /postgres(?:ql)?:\/\/([^:\s]+):([^@\s]+)@/gi,
        "postgresql://$1:<redacted-password>@",
    );

    return sanitized;
}
