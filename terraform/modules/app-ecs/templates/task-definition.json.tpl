[
  {
    "name": "redis",
    "image": "redis:7-alpine",
    "essential": true,
    "portMappings": [
      { "containerPort": 6379, "protocol": "tcp" }
    ],
    "mountPoints": [
      { "sourceVolume": "redis-data", "containerPath": "/data", "readOnly": false }
    ],
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "rabbitmq",
    "image": "rabbitmq:3-management-alpine",
    "essential": true,
    "environment": ${rabbitmq_environment},
    "portMappings": [
      { "containerPort": 5672, "protocol": "tcp" },
      { "containerPort": 15672, "protocol": "tcp" }
    ],
    "mountPoints": [
      { "sourceVolume": "rabbitmq-data", "containerPath": "/var/lib/rabbitmq", "readOnly": false }
    ],
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "minio",
    "image": "minio/minio:RELEASE.2024-12-18T13-15-44Z",
    "essential": true,
    "command": ["server", "/data", "--console-address", ":9001"],
    "environment": ${minio_environment},
    "portMappings": [
      { "containerPort": 9000, "protocol": "tcp" },
      { "containerPort": 9001, "protocol": "tcp" }
    ],
    "mountPoints": [
      { "sourceVolume": "minio-data", "containerPath": "/data", "readOnly": false }
    ],
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "api",
    "image": "${api_image}",
    "essential": true,
    "environment": ${api_environment},
    "portMappings": [
      { "containerPort": ${api_port}, "protocol": "tcp" }
    ],
    "dependsOn": [
      { "containerName": "redis", "condition": "START" },
      { "containerName": "rabbitmq", "condition": "START" },
      { "containerName": "minio", "condition": "START" }
    ],
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "worker",
    "image": "${worker_image}",
    "essential": true,
    "environment": ${worker_environment},
    "dependsOn": [
      { "containerName": "rabbitmq", "condition": "START" },
      { "containerName": "minio", "condition": "START" }
    ],
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "web",
    "image": "${web_image}",
    "essential": true,
    "portMappings": [
      { "containerPort": ${web_port}, "protocol": "tcp" }
    ],
    "dependsOn": [
      { "containerName": "api", "condition": "START" }
    ],
    "logConfiguration": ${log_configuration}
  }
]
