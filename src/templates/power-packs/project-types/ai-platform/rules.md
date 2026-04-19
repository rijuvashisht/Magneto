# AI Platform Power Pack Rules

## Prompt Validation
- Scan all prompt templates for injection attack vectors
- Validate system prompt separation from user input
- Check for proper input sanitization before prompt construction
- Verify prompt versioning and template management
- Detect prompts that exceed model context windows

## Retrieval (RAG) Checks
- Validate embedding model consistency (same model for indexing and querying)
- Check chunk size and overlap configuration
- Verify relevance scoring and threshold filtering
- Detect missing reranking step in retrieval pipeline
- Validate source attribution in generated responses
- Check for stale index detection and refresh mechanisms

## Model Safety
- Verify temperature settings for production (recommend < 0.5 for factual tasks)
- Check for proper stop sequence configuration
- Validate output parsing and structured output enforcement
- Detect missing content filtering on model outputs
- Verify rate limiting and retry logic for API calls

## Security
- Flag any hardcoded API keys or tokens
- Check for proper secret management (env vars, vault)
- Validate API key rotation mechanisms
- Detect PII leakage in prompts or logs
- Verify audit logging for all LLM interactions
