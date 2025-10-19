import Dockerode from "dockerode";
import { createRabbitMqConnection } from "./connection.js";
import {
  docker_config_exchange_name,
  docker_config_exchange_type,
  docker_updates_queue_name,
} from "./constant.js";

const docker = new Dockerode();

export const processDockerConfiguration = async (message) => {
  const { imageName, requiredCluster, containerPort } = message;
  // Lets publish this to a fanout exchange
  const { channel } = await createRabbitMqConnection();

  await channel.assertExchange(
    docker_config_exchange_name,
    docker_config_exchange_type,
    { durable: true }
  );
  await channel.assertQueue(docker_updates_queue_name, { durable: true });

  await channel.bindQueue(
    docker_updates_queue_name,
    docker_config_exchange_name,
    "cluster.updates"
  );

  // List all containers for this app
  const containers = await docker.listContainers({ all: false });
  const appContainers = containers.filter((c) =>
    c.Names[0].includes(imageName)
  );
  const runningCount = appContainers.length;
  console.log(
    `Current running containers for 🐬🐬🐬🐬 ${imageName}: ${runningCount}`
  );

  //if no running container then send error message
  if (runningCount == 0) {
    const msg = `No running container ${imageName}. Try to build and run once before request scalling`;
    await channel.publish(
      docker_config_exchange_name,
      "cluster.updates",
      Buffer.from(msg)
    );
  }
  if (runningCount < requiredCluster) {
    // Need to scale UP
    const toStart = requiredCluster - runningCount;

    for (let i = 0; i < toStart; i++) {
      const msg = await startContainer(imageName, imageName, containerPort);
      console.log(msg);
      await channel.publish(
        docker_config_exchange_name,
        "cluster.updates",
        Buffer.from(msg)
      );
    }
  } else if (runningCount > requiredCluster) {
    // Need to scale DOWN
    const toStop = runningCount - requiredCluster;
    for (let i = 0; i < toStop; i++) {
      const msg = await stopContainer(appContainers[i].Id);
      console.log(msg);
      await channel.publish(
        docker_config_exchange_name,
        "cluster.updates",
        Buffer.from(msg)
      );
    }
  } else {
    const msg = `Already running desired cluster of ${requiredCluster} for ${imageName}`;
    await channel.publish(
      docker_config_exchange_name,
      "cluster.updates",
      Buffer.from(msg)
    );
    console.log(msg);
  }
};

async function startContainer(appName, image, containerPort) {
  const envArray = Object.entries(process.env).map(
    ([key, value]) => `${key}=${value}`
  );

  const container = await docker.createContainer({
    Image: image,
    name: `${appName}-${Date.now()}`,
    Labels: { appName },
    HostConfig: {
      CpuShares: 512,
      Memory: 256 * 1024 * 1024,
      PortBindings: {
        [`${containerPort}/tcp`]: [{ HostPort: "" }],
      },
      RestartPolicy: { Name: "always" },
    },
    Env: envArray,
  });

  await container.start();
  const containerInfo = await container.inspect();
  const port =
    containerInfo.NetworkSettings.Ports[`${containerPort}/tcp`][0].HostPort;
  return `Started container ${container.id} for ${appName} at ${port}`;
}

async function stopContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.stop();
  await container.remove();
  return `Stopped container ${containerId}`;
}
