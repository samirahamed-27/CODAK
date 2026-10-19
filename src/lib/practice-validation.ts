export function validateProofUrl(url?: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { valid: false, error: 'A valid solution proof URL is required.' };
  }
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Proof URL must use http or https protocol.' };
    }
    const host = parsed.hostname.toLowerCase();
    const allowedDomains = [
      'leetcode.com',
      'hackerrank.com',
      'codeforces.com',
      'github.com',
      'atcoder.jp',
      'kaggle.com',
      'geeksforgeeks.org',
    ];
    const isAllowed = allowedDomains.some((d) => host === d || host.endsWith('.' + d));
    if (!isAllowed) {
      return {
        valid: false,
        error:
          'Proof URL must be hosted on an authorized coding platform (LeetCode, HackerRank, Codeforces, GitHub, AtCoder, Kaggle, GeeksForGeeks).',
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Malformed proof URL provided.' };
  }
}
