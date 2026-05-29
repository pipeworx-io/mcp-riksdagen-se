interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Riksdagen (Swedish Parliament) open data MCP.
 *
 * Keyless API at https://data.riksdagen.se. Every request appends utformat=json.
 * Results nest under a top-level container per endpoint:
 *   - dokumentlista.dokument[]   (search_documents)
 *   - personlista.person[]       (list_members)
 *   - voteringlista.votering[]   (list_votes)
 *   - dokumentstatus.dokument    (get_document)
 *
 * Field names are Swedish. Common ones: parti (party), valkrets (constituency),
 * efternamn/tilltalsnamn (surname/first name), datum (date), titel/undertitel
 * (title/subtitle), beteckning (designation), rost (vote: Ja/Nej/Avstår/Frånvarande).
 *
 * doktyp codes: mot=motion, prop=government proposition, bet=committee report,
 * fr=written question, frs=answer to written question, ip=interpellation,
 * SFS=statute, prot=chamber protocol.
 */


const BASE = 'https://data.riksdagen.se';
const UA = 'pipeworx-mcp-riksdagen-se/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_documents',
    description:
      'Search Riksdagen documents (motions, propositions, committee reports, written questions). ' +
      'Filter by free-text query, document type, and date range. Results nest under dokumentlista.dokument[].',
    inputSchema: {
      type: 'object',
      properties: {
        sok: { type: 'string', description: 'Free-text search query (Swedish), e.g. "klimat".' },
        doktyp: {
          type: 'string',
          description:
            'Document type code: mot=motion, prop=government proposition, bet=committee report, ' +
            'fr=written question, frs=answer, ip=interpellation, SFS=statute, prot=protocol.',
        },
        from: { type: 'string', description: 'Earliest date, YYYY-MM-DD (maps to from).' },
        tom: { type: 'string', description: 'Latest date, YYYY-MM-DD (maps to tom).' },
        sz: { type: 'number', description: 'Number of results (default 20, max ~500).' },
      },
    },
  },
  {
    name: 'list_members',
    description:
      'List current members of the Riksdag (ledamöter), optionally filtered by party and/or constituency. ' +
      'Results nest under personlista.person[] with Swedish fields (parti, valkrets, efternamn, tilltalsnamn).',
    inputSchema: {
      type: 'object',
      properties: {
        parti: { type: 'string', description: 'Party abbreviation, e.g. S, M, SD, C, V, KD, L, MP.' },
        kn: { type: 'string', description: 'Constituency name (valkrets), e.g. "Stockholms län".' },
      },
    },
  },
  {
    name: 'list_votes',
    description:
      'List individual member votes (voteringar) for a parliamentary session and committee-report designation. ' +
      'Results nest under voteringlista.votering[]; each row has namn, parti, valkrets and rost (Ja/Nej/Avstår/Frånvarande).',
    inputSchema: {
      type: 'object',
      properties: {
        rm: { type: 'string', description: 'Session/riksmöte, e.g. "2023/24". Required.' },
        bet: { type: 'string', description: 'Designation (beteckning), e.g. "FiU1". Required.' },
        sz: { type: 'number', description: 'Number of vote rows (default 50).' },
      },
      required: ['rm', 'bet'],
    },
  },
  {
    name: 'get_document',
    description:
      'Fetch a single document\'s full metadata by its id (e.g. "HD024189" or "hd024189"). ' +
      'Result nests under dokumentstatus.dokument.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document id, e.g. "HD024189". Required.' },
      },
      required: ['id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_documents': {
      const q = new URLSearchParams({ utformat: 'json' });
      const sok = optStr(args, 'sok');
      if (sok) q.set('sok', sok);
      const doktyp = optStr(args, 'doktyp');
      if (doktyp) q.set('doktyp', doktyp);
      const from = optStr(args, 'from');
      if (from) q.set('from', from);
      const tom = optStr(args, 'tom');
      if (tom) q.set('tom', tom);
      const sz = optNum(args, 'sz');
      q.set('sz', String(sz ?? 20));
      return riksGet(`/dokumentlista/?${q.toString()}`);
    }
    case 'list_members': {
      const q = new URLSearchParams({ utformat: 'json' });
      const parti = optStr(args, 'parti');
      if (parti) q.set('parti', parti);
      const kn = optStr(args, 'kn');
      if (kn) q.set('kn', kn);
      return riksGet(`/personlista/?${q.toString()}`);
    }
    case 'list_votes': {
      const q = new URLSearchParams({ utformat: 'json' });
      q.set('rm', reqStr(args, 'rm', '"2023/24"'));
      q.set('bet', reqStr(args, 'bet', '"FiU1"'));
      const sz = optNum(args, 'sz');
      q.set('sz', String(sz ?? 50));
      return riksGet(`/voteringlista/?${q.toString()}`);
    }
    case 'get_document': {
      const id = reqStr(args, 'id', '"HD024189"').trim();
      return riksGet(`/dokument/${encodeURIComponent(id)}.json`);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function riksGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Riksdagen: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

function optStr(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function optNum(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
