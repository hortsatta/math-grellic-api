import { stripHtml as stringStripHtml } from 'string-strip-html';

export function stripHtml(
  html: string,
  onEmpty?: () => void,
  onInvalidImage?: () => void,
): string {
  const { result } = stringStripHtml(html || '', {
    cb: ({ tag, deleteFrom, deleteTo, insert, rangesArr }) => {
      if (tag) {
        switch (tag.name) {
          case 'span': {
            let value = insert;

            const isInlineMath = tag.attributes.some(
              (attr) =>
                attr.name === 'data-type' && attr.value === 'inline-math',
            );

            if (isInlineMath) {
              value = tag.attributes.find(
                (attr) => attr.name === 'value',
              )?.value;
            }

            rangesArr.push(deleteFrom || 0, deleteTo || undefined, value);
            break;
          }
          case 'img': {
            const src = tag.attributes.find((attr) => attr.name === 'src');

            if (!src?.value.trim().length) {
              onInvalidImage && onInvalidImage();
            }

            rangesArr.push(deleteFrom || 0, deleteTo || undefined, 'img');
            break;
          }
          default:
            rangesArr.push(deleteFrom || 0, deleteTo || undefined, insert);
            break;
        }
      } else {
        // default action which does nothing different from normal, non-callback operation
        rangesArr.push(deleteFrom || 0, deleteTo || undefined, insert);
      }
    },
  });

  if (!result.trim().length) {
    onEmpty && onEmpty();
  }

  return result;
}
