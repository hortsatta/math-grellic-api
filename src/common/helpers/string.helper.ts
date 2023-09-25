import slugify from 'slugify';

export function generateSlug(value: string) {
  return slugify(value, { lower: true, strict: true });
}

export function capitalize(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
