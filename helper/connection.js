import amqplib from "amqplib";

let connection;
let channel;

export const createRabbitMqConnection = async () => {
  if (connection) return { connection, channel };

  connection = await amqplib.connect("amqp://admin:admin123@localhost");
  channel = await connection.createChannel();

  connection.on("error", (err) => {
    console.error("Connection error:", err);
    connection = null;
    channel = null;

    // Retry connection after 5 seconds
    setTimeout(() => createRabbitMqConnection(), 5000);
  });

  return { connection, channel };
};
