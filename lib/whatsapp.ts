export type WhatsAppMessage = {
  timestamp: Date | null;
  author: string | null;
  message: string;
  isSystem: boolean;
};

const headerRegex =
  /^([0-3]\d\/[0-1]\d\/[0-9]{2,4}),\s([0-2]\d:[0-5]\d)\s-\s(.+)$/;

function parseDate(datePart: string, timePart: string) {
  const [day, month, yearRaw] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const date = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseWhatsAppExport(text: string): WhatsAppMessage[] {
  const lines = text.split(/\r?\n/);
  const messages: WhatsAppMessage[] = [];
  let current: WhatsAppMessage | null = null;

  for (const line of lines) {
    const match = headerRegex.exec(line);
    if (match) {
      if (current) {
        messages.push(current);
      }
      const [, datePart, timePart, rest] = match;
      const systemMessage = !rest.includes(":");
      const [authorPart, ...messageParts] = rest.split(":");
      const message = systemMessage ? rest : messageParts.join(":").trim();
      const timestamp = parseDate(datePart, timePart);
      current = {
        timestamp,
        author: systemMessage ? null : authorPart.trim(),
        message,
        isSystem: systemMessage
      };
    } else if (current) {
      current.message = `${current.message}\n${line}`.trim();
    }
  }

  if (current) {
    messages.push(current);
  }

  return messages;
}
