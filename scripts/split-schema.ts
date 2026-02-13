
import fs from 'fs';
import path from 'path';

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const CRM_SCHEMA_PATH = path.join(__dirname, '../prisma/schema.crm.prisma');
const TENANT_SCHEMA_PATH = path.join(__dirname, '../prisma/schema.tenant.prisma');

const CRM_MODELS = ['CrmUser', 'UserRole'];
const IGNORE_MODELS: string[] = [];

function extractHeader(content: string): string {
    // Pega generator e datasource
    // Assume que estão no início do arquivo antes do primeiro model/enum
    const match = content.match(/^[\s\S]*?(?=(model|enum)\s)/);
    return match ? match[0] : '';
}

function extractBlocks(content: string): { type: string, name: string, content: string }[] {
    const blocks: { type: string, name: string, content: string }[] = [];
    
    // Divide o conteúdo em tokens para facilitar a busca
    // Mas preserva o conteúdo original para extração
    
    let currentIndex = 0;
    
    while (currentIndex < content.length) {
        // Procura por 'model' ou 'enum'
        // Regex para encontrar o início de um bloco, ignorando comentários anteriores por enquanto
        const blockStartRegex = /(?:^|\s)(model|enum)\s+(\w+)\s*\{/g;
        blockStartRegex.lastIndex = currentIndex;
        
        const match = blockStartRegex.exec(content);
        
        if (!match) break;
        
        const type = match[1];
        const name = match[2];
        const startBraceIndex = blockStartRegex.lastIndex - 1; // Índice do '{'
        
        // Encontra o fim do bloco balanceando chaves
        let braceCount = 1;
        let endBraceIndex = -1;
        
        for (let i = startBraceIndex + 1; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            else if (content[i] === '}') braceCount--;
            
            if (braceCount === 0) {
                endBraceIndex = i;
                break;
            }
        }
        
        if (endBraceIndex === -1) {
            console.error(`❌ Bloco ${name} não foi fechado corretamente.`);
            break;
        }
        
        // Tenta capturar comentários de documentação (///) imediatamente antes
        // Procura para trás a partir do início do match
        let blockStartIndex = match.index;
        
        // Verifica linhas anteriores para ver se são comentários ///
        const beforeBlock = content.substring(0, blockStartIndex);
        const lines = beforeBlock.split('\n');
        
        // Simplesmente pega o bloco do início da palavra-chave até o fecha chaves
        // (Ignorando a complexidade de comentários por enquanto para garantir robustez)
        // Se quisermos comentários, teríamos que olhar linha a linha para trás.
        // O Prisma geralmente coloca comentários /// na linha anterior.
        
        // Vamos pegar o bloco exato
        const blockContent = content.substring(match.index, endBraceIndex + 1).trim();
        
        blocks.push({
            type,
            name,
            content: blockContent
        });
        
        currentIndex = endBraceIndex + 1;
    }
    
    return blocks;
}

function splitSchema() {
    console.log('🔄 Iniciando separação de schemas...');

    if (!fs.existsSync(SCHEMA_PATH)) {
        console.error('❌ Arquivo schema.prisma não encontrado!');
        process.exit(1);
    }

    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    
    const header = extractHeader(schemaContent);
    const blocks = extractBlocks(schemaContent);

    let crmBody = '';
    let tenantBody = '';

    blocks.forEach(block => {
        if (IGNORE_MODELS.includes(block.name)) return;

        // Lógica de distribuição
        if (CRM_MODELS.includes(block.name)) {
            crmBody += '\n' + block.content + '\n';
        } else {
            // Se for Tenant
            tenantBody += '\n' + block.content + '\n';
        }
    });

    const warning = `// ⚠️ ARQUIVO GERADO AUTOMATICAMENTE - NÃO EDITE
// Fonte: prisma/schema.prisma
// Comando: npm run db:split`;

    // Salvar CRM Schema
    const crmFinal = `${warning}\n\n${header}\n${crmBody}`;
    fs.writeFileSync(CRM_SCHEMA_PATH, crmFinal);
    console.log(`✅ CRM Schema: ${CRM_SCHEMA_PATH} (${blocks.filter(b => CRM_MODELS.includes(b.name)).length} models)`);

    // Salvar Tenant Schema
    const tenantFinal = `${warning}\n\n${header}\n${tenantBody}`;
    fs.writeFileSync(TENANT_SCHEMA_PATH, tenantFinal);
    console.log(`✅ Tenant Schema: ${TENANT_SCHEMA_PATH} (${blocks.filter(b => !CRM_MODELS.includes(b.name) && !IGNORE_MODELS.includes(b.name)).length} models)`);
}

splitSchema();
