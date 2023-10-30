import slugify from 'slugify';

export function generateSlug(value: string) {
  return slugify(value, { lower: true, strict: true });
}

export function capitalize(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function generateFullName(
  firstName: string,
  lastName: string,
  middleName?: string,
) {
  if (!middleName) {
    return `${lastName}, ${firstName}`;
  } else {
    const middleInitial = middleName[0].toUpperCase();
    return `${lastName}, ${firstName} ${middleInitial}.`;
  }
}
