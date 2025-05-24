export default function generateTicketNumber() {
  const random = Math.random().toString().slice(2, 14).padEnd(12, '0'); // 12 digits
  return `SJDD${random}`;
} 