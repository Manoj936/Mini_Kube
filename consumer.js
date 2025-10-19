import { createRabbitMqConnection } from "./helper/connection.js";
import { docker_config_exchange_name, docker_config_exchange_type, docker_config_queue_name, docker_dlq_exchange, docker_dlq_exchange_type, docker_dlq_queue } from "./helper/constant.js";
import { processDockerConfiguration } from "./helper/dockerHelper.js";

const consumer = async () => {
  console.log("consumer waiting to receive messages...");

  const { channel } = await createRabbitMqConnection();

  // 1️⃣ DLQ exchange & queue
  await channel.assertExchange(docker_dlq_exchange, docker_dlq_exchange_type, { durable: true });
  await channel.assertQueue(docker_dlq_queue, { durable: true });
  await channel.bindQueue(docker_dlq_queue, docker_dlq_exchange, "dlq");

  // 2️⃣ Main exchange & queue with DLX configured
  await channel.assertExchange(docker_config_exchange_name, docker_config_exchange_type, { durable: true });
  await channel.assertQueue(docker_config_queue_name, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": docker_dlq_exchange,
      "x-dead-letter-routing-key": "dlq"
    }
  });
  await channel.bindQueue(docker_config_queue_name, docker_config_exchange_name, 'cluster.config');

  // 3️⃣ Consumer
  channel.consume(
    docker_config_queue_name,
    async (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        try {
          await processDockerConfiguration(JSON.parse(messageContent));
          await channel.ack(msg);
        } catch (err) {
          console.error(`unexpected error ${JSON.stringify(err)}`);
          channel.nack(msg, false, false); // message goes to DLQ
        }
      }
    },
    { noAck: false }
  );
};

consumer();
