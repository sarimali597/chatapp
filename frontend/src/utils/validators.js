export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 3 && trimmed.length <= 20 && USERNAME_REGEX.test(trimmed);
}

export function usernameError(username) {
  const trimmed = (username || '').trim();
  if (trimmed.length === 0) return 'Enter a username to continue.';
  if (trimmed.length < 3) return 'Usernames must be at least 3 characters.';
  if (trimmed.length > 20) return 'Usernames must be 20 characters or fewer.';
  if (!USERNAME_REGEX.test(trimmed)) return 'Only letters, numbers, and underscores are allowed.';
  return null;
}

export function isValidMessageText(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.trim().length <= 2000;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_MB = 5;

export function validateImageFile(file) {
  if (!file) return 'No file selected.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPG, PNG, and WEBP images are supported.';
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `Images must be under ${MAX_FILE_SIZE_MB}MB.`;
  return null;
}
