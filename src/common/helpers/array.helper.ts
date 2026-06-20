export function shuffleArray<T>(array: T[]): T[] {
  const arrayCopy = [...array];

  for (let i = arrayCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
  }

  return arrayCopy;
}

export function countNonNull(value) {
  if (Array.isArray(value)) {
    return value.length;
  }
  return value != null ? 1 : 0;
}
