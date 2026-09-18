export type CopyResult = { status: 'empty' } | { status: 'copied' } |
  { status: 'manual'; text: string; reason: 'unavailable' | 'rejected' };
export function copyPlainText(text: string, environment?: {
  isSecureContext?: boolean;
  navigator?: { clipboard?: { writeText(text: string): Promise<void> } };
}): Promise<CopyResult>;
