type LoggerMessage =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;
type ProcessedLoggerMessage = Array<string | number | boolean | null | undefined>;

const Logger = {
  log: (messages: LoggerMessage) => {
    const processedMessages: ProcessedLoggerMessage =
      typeof messages === "object" ? messages : [messages];

    Spicetify?.showNotification(`Spicy Logger: ${processedMessages.join(" ")}`, false, 5000);
    console.log(`Spicy Logger: ${processedMessages.join(" ")}`);
  },
  warn: (messages: LoggerMessage) => {
    const processedMessages: ProcessedLoggerMessage =
      typeof messages === "object" ? messages : [messages];

    Spicetify?.showNotification(`Spicy Logger: ${processedMessages.join(" ")}`, true, 5000);
    console.warn(`Spicy Logger: ${processedMessages.join(" ")}`);
  },
  error: (messages: LoggerMessage) => {
    const processedMessages: ProcessedLoggerMessage =
      typeof messages === "object" ? messages : [messages];

    Spicetify?.showNotification(`Spicy Logger: ${processedMessages.join(" ")}`, true, 5000);
    console.error(`Spicy Logger: ${processedMessages.join(" ")}`);
  },
};

export default Logger;
