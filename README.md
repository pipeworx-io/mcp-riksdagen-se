# mcp-riksdagen-se

Riksdagen (Swedish Parliament) open data MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_documents` | Search Riksdagen documents (motions, propositions, committee reports, written questions). Filter by free-text query, document type, and date range. Results nest under dokumentlista.dokument[]. |
| `list_members` | List current members of the Riksdag (ledamöter), optionally filtered by party and/or constituency. Results nest under personlista.person[] with Swedish fields (parti, valkrets, efternamn, tilltalsnamn). |
| `list_votes` | List individual member votes (voteringar) for a parliamentary session and committee-report designation. Results nest under voteringlista.votering[]; each row has namn, parti, valkrets and rost (Ja/Nej/Avstår/Frånvarande). |
| `get_document` | Fetch a single document's full metadata by its id (e.g. "HD024189" or "hd024189"). Result nests under dokumentstatus.dokument. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "riksdagen-se": {
      "url": "https://gateway.pipeworx.io/riksdagen-se/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Riksdagen Se data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
