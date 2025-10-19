- **ondemand_container_spinner (topic)**  
  This project demonstrates how we can spin up multiple containers using rabbit mq topic exchange and a simple api for configuration. This can be a go to tool if you have to manage your own containers as per the incoming load and dont want to rely on giants like kubernetes. Also more features like container event streams and DLQ is also there.

- **🚀 Building an On-Demand Docker Container Spinner with Real-Time Monitoring using RabbitMQ & Node.js**

    Here’s the overview:

    Problem

    In many microservice environments, scaling services dynamically is crucial. I wanted a system where:

    Users can request a specific number of containers for a service.

    The system ensures the requested number of containers are running.

    Any failures are logged, and failed jobs are safely sent to a Dead Letter Queue (DLQ).

    Users can monitor updates in real-time.

    Tech Stack

    Node.js – Backend API and Docker control

    Docker & Dockerode – Container management

    RabbitMQ – Message queue for orchestrating container operations

    SSE (Server-Sent Events) – Real-time streaming updates to clients