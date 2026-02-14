const ABSOLUTE_PATH_REGEX = /^(https?:|data:|blob:)/i;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export const media = (path: string): string => {
  if (!path) {
    return '';
  }

  if (ABSOLUTE_PATH_REGEX.test(path)) {
    return path;
  }

  const normalizedPath = trimSlashes(path);
  const base = (import.meta.env.VITE_MEDIA_BASE_URL as string | undefined)?.trim() || '';

  if (!base) {
    return `/${normalizedPath}`;
  }

  return `${base.replace(/\/+$/, '')}/${normalizedPath}`;
};
