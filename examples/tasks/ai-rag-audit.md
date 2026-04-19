---
id: ai-rag-audit-001
title: RAG Pipeline Security and Quality Audit
type: security-audit
scope:
  - src/rag/pipeline.ts
  - src/rag/embeddings.ts
  - src/rag/retrieval.ts
  - src/rag/generation.ts
  - src/rag/guardrails.ts
  - src/api/chat.ts
tags:
  - security
  - ai
  - rag
  - audit
  - prompt-injection
  - retrieval
constraints:
  - Must not modify the production embedding index
  - Must validate all user-facing prompt templates
  - Must check for PII leakage in logs
  - Report must include confidence scores for each finding
---

Perform a comprehensive audit of the RAG (Retrieval-Augmented Generation) pipeline.

The system uses **OpenAI embeddings** with **Pinecone vector store** and **GPT-4o**
for generation.

## Audit Areas

### Prompt Injection
- Can user input escape the system prompt?
- Are retrieved documents sanitized before injection into the prompt?
- Is there a content filter on generated output?

### Retrieval Quality
- Is the relevance scoring threshold appropriate?
- Are there stale or duplicate documents in the index?
- Does the embedding model match the query model?

### Guardrails
- Are generated outputs checked for hallucination indicators?
- Is PII filtered from both input and output?
- Are there token limits to prevent context window abuse?
