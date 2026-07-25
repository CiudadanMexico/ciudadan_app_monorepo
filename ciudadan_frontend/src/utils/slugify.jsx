export const slugify = (str = '') => !str ? str :
  str.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const generateTempSlug = () => `tmp-${crypto.randomUUID()}`;

export function generateSlug(name, id) {
  const slug = slugify(name);

  const random = crypto.randomUUID().slice(0, 6);

  return `${slug}-${id}-${random}`;
}
