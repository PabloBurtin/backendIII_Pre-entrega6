export const pick = (source, allowedKeys) =>
    Object.fromEntries(
        Object.entries(source).filter(([key]) => allowedKeys.includes(key))
    );