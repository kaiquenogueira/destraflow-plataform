
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { splitSchema } from './split-schema';

const ROOT_DIR = path.join(__dirname, '..');
const CRM_SCHEMA_PATH = path.join(ROOT_DIR, 'prisma/schema.crm.prisma');
const TENANT_SCHEMA_PATH = path.join(ROOT_DIR, 'prisma/schema.tenant.prisma');

describe('Schema Split Script', () => {
    
    beforeAll(() => {
        // Executa o script de split
        splitSchema();
    });

    it('should create both schema files', () => {
        expect(fs.existsSync(CRM_SCHEMA_PATH)).toBe(true);
        expect(fs.existsSync(TENANT_SCHEMA_PATH)).toBe(true);
    });

    it('should contain CrmUser in CRM schema', () => {
        const content = fs.readFileSync(CRM_SCHEMA_PATH, 'utf-8');
        expect(content).toContain('model CrmUser');
        expect(content).toContain('enum UserRole');
    });

    it('should NOT contain Lead in CRM schema', () => {
        const content = fs.readFileSync(CRM_SCHEMA_PATH, 'utf-8');
        expect(content).not.toContain('model Lead');
        expect(content).not.toContain('model Campaign');
    });

    it('should contain Lead in Tenant schema', () => {
        const content = fs.readFileSync(TENANT_SCHEMA_PATH, 'utf-8');
        expect(content).toContain('model Lead');
        expect(content).toContain('model Campaign');
        expect(content).toContain('enum LeadTag');
    });

    it('should NOT contain CrmUser in Tenant schema', () => {
        const content = fs.readFileSync(TENANT_SCHEMA_PATH, 'utf-8');
        expect(content).not.toContain('model CrmUser');
        // UserRole pode ou não estar, dependendo da lógica, mas definimos que vai para CRM
        // Se for usado só no CrmUser, não deve estar no Tenant
        expect(content).not.toContain('enum UserRole');
    });
});
