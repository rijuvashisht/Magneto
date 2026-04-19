import { evaluateSecurity } from '../../src/core/security-engine';

describe('SecurityEngine', () => {
  describe('evaluateSecurity', () => {
    it('should return low risk for a simple task', () => {
      const task = {
        id: 'test-001',
        title: 'Add a button component',
        description: 'Create a new reusable button component',
        type: 'feature-implementation',
      };

      const result = evaluateSecurity(task);
      expect(result.securityRisk).toBe('low');
      expect(result.approvalRequired).toBe(false);
      expect(result.telepathyLevel).toBeGreaterThanOrEqual(1);
      expect(result.blockedActions).toHaveLength(0);
    });

    it('should return high risk when blocked actions are detected', () => {
      const task = {
        id: 'test-002',
        title: 'Clean up old data',
        description: 'Run rm -rf on the temp directory and drop-table for legacy data',
        type: 'maintenance',
      };

      const result = evaluateSecurity(task);
      expect(result.securityRisk).toBe('high');
      expect(result.approvalRequired).toBe(true);
      expect(result.telepathyLevel).toBe(0);
      expect(result.blockedActions.length).toBeGreaterThan(0);
    });

    it('should flag protected paths accessed', () => {
      const task = {
        id: 'test-003',
        title: 'Update configuration',
        description: 'Modify environment settings',
        type: 'config',
        scope: ['.env', 'src/config.ts'],
      };

      const result = evaluateSecurity(task);
      expect(result.protectedPathsAccessed).toContain('.env');
      expect(result.securityRisk).not.toBe('low');
    });

    it('should require approval for deploy tasks', () => {
      const task = {
        id: 'test-004',
        title: 'Deploy to production',
        description: 'Deploy the latest build to production environment',
        type: 'deploy',
      };

      const result = evaluateSecurity(task);
      expect(result.approvalRequired).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should detect auth-related changes', () => {
      const task = {
        id: 'test-005',
        title: 'Update auth middleware',
        description: 'Change permission levels and token validation',
        type: 'feature',
      };

      const result = evaluateSecurity(task);
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('authentication'),
        ])
      );
    });

    it('should respect custom security config from context', () => {
      const task = {
        id: 'test-006',
        title: 'Simple refactor',
        description: 'Rename variables',
        type: 'refactor',
        scope: ['secrets/api.json'],
      };

      const context = {
        config: {
          security: {
            protectedPaths: ['secrets/**'],
            blockedActions: [],
            approvalRequired: [],
            maxTelepathyLevel: 3,
          },
        },
        relevantFiles: ['secrets/api.json'],
      };

      const result = evaluateSecurity(task, context);
      expect(result.protectedPathsAccessed.length).toBeGreaterThan(0);
    });

    it('should set telepathyLevel to 0 for high-risk tasks', () => {
      const task = {
        id: 'test-007',
        title: 'Database cleanup',
        description: 'delete-database and rm -rf old backups',
        type: 'maintenance',
      };

      const result = evaluateSecurity(task);
      expect(result.securityRisk).toBe('high');
      expect(result.telepathyLevel).toBe(0);
    });
  });
});
