export const contentDateTime = (value: string) => value.slice(0, 16).replace('T', ' ').replaceAll('-', '.')
