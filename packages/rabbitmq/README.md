# @dam/rabbitmq

RabbitMQ messaging package for the DAM platform.

This package provides a wrapper around amqplib to handle connection management, publishing messages, and subscribing to queues.

## Setup

Requires a running RabbitMQ instance. Configure the connection via the `RABBITMQ_URL` environment variable.

## Usage

Use the provided publisher and consumer utilities to interact with RabbitMQ queues.
