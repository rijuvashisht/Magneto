# Azure Cloud Power Pack Rules

## Infrastructure Reasoning
- Validate Bicep/ARM template syntax and best practices
- Check resource dependency ordering
- Verify proper use of parameters vs hardcoded values
- Detect resource sprawl and unused resources
- Validate tagging strategy for cost management

## Security
- Verify managed identity usage over service principal secrets
- Check for least-privilege RBAC assignments
- Validate Key Vault access policies
- Detect publicly accessible storage accounts
- Verify private endpoint configuration for PaaS services
- Check for proper TLS configuration

## Networking
- Validate VNet peering and subnet design
- Check NSG rules for overly permissive access
- Verify Application Gateway / Front Door WAF configuration
- Detect open management ports (RDP, SSH) to internet

## Deployment
- Validate deployment slot configuration for zero-downtime
- Check for proper health check endpoints
- Verify auto-scaling rules and thresholds
- Validate backup and disaster recovery configuration
