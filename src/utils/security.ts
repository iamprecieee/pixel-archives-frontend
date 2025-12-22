export const maskSecret = (s: string, visibleChars: number = 3): string => {
  if (!s || s.length <= visibleChars) {
    return "****";
  }
  const visible = s.substring(0, visibleChars);
  return `${visible}****`;
};
