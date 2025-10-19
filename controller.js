import { createRabbitMqConnection } from "./helper/connection.js";
import {
  docker_config_exchange_name,
  docker_config_exchange_type,
  docker_config_queue_name,
  docker_updates_queue_name,
  MAX_VALID_CLUSTER,
} from "./helper/constant.js";

export const onDemandLogs = async (req, res) => {
  try {
    const { channel } = await createRabbitMqConnection();

    await channel.assertExchange(docker_config_exchange_name, docker_config_exchange_type, { durable: true });
    await channel.assertQueue(docker_updates_queue_name, { durable: true });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    channel.consume(docker_updates_queue_name, (msg) => {
      const messageContent = msg.content.toString();
      res.write(`data: ${messageContent}\n\n`);
      channel.ack(msg);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err, status: false });
  }
};

export const onDemandContainerSpinner = async (req, res) => {
  try {
    const { imageName, requiredCluster, containerPort } = req.body;

    // Validation
    if (!imageName || !requiredCluster || !containerPort) {
      return res.status(400).json({
        message: "imageName, requiredCluster  , containerPort are required",
      });
    }

    if (
      typeof imageName !== "string" ||
      typeof requiredCluster !== "number" ||
      typeof containerPort !== "number"
    ) {
      return res.status(400).json({ message: "Invalid data types" });
    }

    if (requiredCluster < 1 || requiredCluster > MAX_VALID_CLUSTER) {
      return res
        .status(400)
        .json({ message: "requiredCluster must be between 1 and 5" });
    }

    // RabbitMQ connection
    const { channel } = await createRabbitMqConnection();

    await channel.assertExchange(
      docker_config_exchange_name,
      docker_config_exchange_type,
      { durable: true }
    );

    const message = {
      imageName,
      requiredCluster,
      containerPort,
      requestedOn: new Date().toISOString(),
    };

    await channel.publish(
      docker_config_exchange_name,
      "cluster.config",
      Buffer.from(JSON.stringify(message))
    );

    return res.status(200).json({ message: "Request received successfully" });
  } catch (err) {
    console.error("Error in onDemandContainerSpinner:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
