import * as path from 'path';
import { MCPToolResult } from '../server';
import { readJson, listFiles } from '../../utils/fs';
import { mergeResults } from '../../core/merge-results';
import { logger } from '../../utils/logger';

export async function handleMergeResults(
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const outputDir = args.outputDir as string;

  if (!outputDir) {
    return { success: false, data: null, error: 'outputDir is required' };
  }

  try {
    const fullDir = path.resolve(outputDir);
    const resultFiles = listFiles(fullDir, /\.json$/);

    if (resultFiles.length === 0) {
      return { success: false, data: null, error: 'No JSON result files found' };
    }

    const outputs: any[] = [];
    for (const file of resultFiles) {
      try {
        const data = readJson(path.join(fullDir, file));
        outputs.push(data);
      } catch {
        logger.warn(`Skipping invalid file: ${file}`);
      }
    }

    const merged = mergeResults(outputs);

    logger.debug(`Merged ${outputs.length} results`);
    return { success: true, data: merged };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}
