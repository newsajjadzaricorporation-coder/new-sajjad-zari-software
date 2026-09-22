/**
 * Safe clipboard writer with robust iframe / unfocused document fallbacks.
 * Prevents "Failed to execute 'writeText' on 'Clipboard': Document is not focused" errors.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Try modern Clipboard API first if focused and supported
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API writeText failed, attempting legacy textarea fallback:', err);
    }
  }

  // Fallback: execCommand('copy') via dynamic off-screen textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Position fixed and off-screen to avoid scroll jumping
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('Legacy copy fallback failed:', fallbackErr);
    return false;
  }
}
