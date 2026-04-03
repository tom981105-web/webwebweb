export function getDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getWeekKey(timestamp: number) {
  const date = new Date(timestamp);
  const currentDay = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - currentDay + 1);
  monday.setHours(0, 0, 0, 0);
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}
