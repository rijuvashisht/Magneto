# AWS Cloud Power Pack Rules

## IAM — Least Privilege
- **Never** write `Action: "*"` with `Resource: "*"` — this is effectively root
- Avoid attaching `AdministratorAccess` managed policy — craft scoped inline policies
- Use **IAM Access Analyzer** to identify overly permissive roles
- **Cross-account trust**: always scope with `aws:PrincipalOrgID` or ExternalId condition
- Prefer **IAM Roles** with STS AssumeRole over long-lived IAM users
- **Service accounts** (EKS): use IRSA (IAM Roles for Service Accounts), not node instance profile
- Enable MFA for all human users; require it via IAM policy `aws:MultiFactorAuthPresent`
- Rotate access keys regularly; disable unused keys detected by IAM credential reports

## S3 — Block Everything Public By Default
- Enable **Block Public Access** at the account level — not just per bucket
- Set `acl = "private"` explicitly; public-read and public-read-write are red flags
- Every bucket should have `aws_s3_bucket_public_access_block` resource
- **Encryption**: SSE-KMS for sensitive data, SSE-S3 minimum for everything else
- **Versioning**: enable for production buckets; pair with MFA Delete
- **Logging**: S3 access logs or CloudTrail data events for audit
- **Lifecycle policies**: transition to IA/Glacier, expire old versions
- Use **presigned URLs** for time-boxed sharing instead of public ACLs

## Networking — Security Groups & VPC
- **Never** `0.0.0.0/0` on 22 (SSH), 3389 (RDP), or DB ports (3306/5432/1433/27017/6379)
- Use **bastion hosts** or **SSM Session Manager** — prefer SSM (no inbound port required)
- Egress rules: restrict when possible, especially from private subnets
- **VPC Endpoints** for S3/DynamoDB/ECR — keep traffic off the public internet
- **Flow Logs** on production VPCs for forensic analysis
- **Network ACLs** as a secondary layer — they're stateless, SGs are stateful
- **WAF** in front of ALB/CloudFront/API Gateway for OWASP Top 10 protection

## Encryption
- **At rest**: RDS `storage_encrypted = true`, EBS `encrypted = true`, DynamoDB SSE enabled, Secrets Manager, Parameter Store (SecureString)
- **In transit**: TLS 1.2+ everywhere; disable older protocols on ALB/CloudFront
- **KMS**: customer-managed keys for sensitive workloads; key policies scoped to specific principals
- Rotate KMS keys annually (`enable_key_rotation = true`)
- Never pass plaintext secrets via environment variables in Lambda — use Secrets Manager with `aws_lambda_function.environment` pointing to parameter names

## Secrets Management
- **Never** hardcode `AKIA...` access keys or secret access keys — detect via git-secrets pre-commit
- **Secrets Manager** for auto-rotating DB passwords, API keys
- **SSM Parameter Store** (SecureString) for config secrets — cheaper than Secrets Manager
- Lambda/ECS: retrieve secrets at startup, cache in memory; avoid per-request calls
- Never log secrets; redact in structured logs

## Lambda
- Set explicit **`timeout`** (3s default is rarely enough) and **`memory_size`** — CPU scales with memory
- **Log retention**: create `aws_cloudwatch_log_group` with `retention_in_days` — otherwise logs are kept forever
- **Reserved concurrency** for critical functions; **provisioned concurrency** for latency-sensitive ones
- **VPC config** only when needed — cold starts are slower in a VPC
- **Layers** for shared dependencies; keep deployment package lean
- **Dead letter queues** (DLQ) for async invocations
- **X-Ray tracing** for distributed debugging
- **ARM/Graviton2** runtime is ~20% cheaper and often faster

## RDS / Databases
- `storage_encrypted = true`, `backup_retention_period >= 7`, `deletion_protection = true` in prod
- **Multi-AZ** for production
- **Parameter groups**: disable public accessibility, enforce SSL (`rds.force_ssl = 1` for Postgres)
- **Performance Insights** enabled for query-level visibility
- **Automated snapshots** + manual snapshots before major deploys
- **Aurora Serverless v2** for bursty workloads; avoid v1 (deprecated patterns)
- IAM database authentication over password auth where supported

## Cost & Governance
- **Tagging strategy**: `Environment`, `Owner`, `CostCenter`, `Project` on every resource
- **AWS Budgets** + CloudWatch alarms for spend anomalies
- **AWS Config** rules for compliance (encryption enabled, MFA enabled, etc.)
- **Trusted Advisor** checks: idle instances, unused EBS volumes, low-util RDS
- **Savings Plans / Reserved Instances** for steady-state workloads (1-year no-upfront = ~30% savings)
- **Spot** for fault-tolerant batch workloads
- **S3 Intelligent-Tiering** for unpredictable access patterns

## Observability
- **CloudWatch Logs** with structured JSON; use `aws-embedded-metrics` for metrics-in-logs
- **CloudWatch Metrics** at 1-min granularity for critical resources; 5-min is lossy
- **X-Ray** for distributed tracing across Lambda/ECS/EKS/API Gateway
- **EventBridge** for cross-service events — beats polling
- **CloudTrail** in all regions with log file validation, multi-region trail, S3 logging
- **GuardDuty** for threat detection (malware, crypto mining, reconnaissance)
- Ship logs to central account / SIEM (Splunk, Datadog, ELK) via Kinesis Firehose

## Terraform Best Practices
- **Remote state** in S3 with DynamoDB table for locking — never commit `.tfstate`
- **State encryption** enabled; bucket versioning on for state bucket
- **Module structure**: reusable modules in separate repos with semantic versioning
- **Workspaces** or separate state files per environment (dev/staging/prod)
- **`terraform plan`** in CI on PRs; require human approval before `apply`
- **`tflint`** + **`tfsec`** / **`checkov`** in pre-commit and CI
- Pin provider versions: `required_providers { aws = "~> 5.0" }`
- Use `for_each` over `count` — stable identity when list reorders
- **Variables** with validation blocks; mark secrets `sensitive = true`

## CDK Best Practices
- **Typed constructs** — use L2 constructs over raw CloudFormation
- **Aspects** for cross-cutting concerns (tagging, encryption enforcement)
- **CDK-nag** for security/compliance rule enforcement
- **Stack boundaries** match blast radius — not one mega-stack
- Use **context** values for environment-specific config; avoid hardcoded account IDs

## Incident Response
- **Runbooks** for common incidents (elevated error rate, latency spike, cost spike)
- **Break-glass** IAM roles with MFA + CloudTrail alerting on use
- **Backup / restore drills** — untested backups don't exist
- **Chaos engineering** for critical paths (AWS Fault Injection Simulator)
- Multi-region DR plan for tier-1 services
