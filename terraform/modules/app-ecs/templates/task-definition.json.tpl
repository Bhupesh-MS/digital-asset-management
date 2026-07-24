[
  {
    "name": "redis",
    "image": "${redis_image}",
    "essential": true,
    "portMappings": [
      { "containerPort": 6379, "protocol": "tcp" }
    ],
    "mountPoints": [
      { "sourceVolume": "redis-data", "containerPath": "/data", "readOnly": false }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "redis-cli ping | grep PONG"],
      "interval": 10,
      "timeout": 5,
      "retries": 6,
      "startPeriod": 30
    },
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "rabbitmq",
    "image": "${rabbitmq_image}",
    "essential": true,
    "environment": ${rabbitmq_environment},
    "secrets": ${rabbitmq_secrets},
    "portMappings": [
      { "containerPort": 5672, "protocol": "tcp" },
      { "containerPort": 15672, "protocol": "tcp" }
    ],
    "mountPoints": [
      { "sourceVolume": "rabbitmq-data", "containerPath": "/var/lib/rabbitmq", "readOnly": false }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "rabbitmq-diagnostics -q ping"],
      "interval": 10,
      "timeout": 5,
      "retries": 10,
      "startPeriod": 60
    },
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "minio",
    "image": "${minio_image}",
    "essential": true,
    "command": ["server", "/data", "--console-address", ":9001"],
    "environment": ${minio_environment},
    "secrets": ${minio_secrets},
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
    "secrets": ${api_secrets},
    "portMappings": [
      { "containerPort": ${api_port}, "protocol": "tcp" }
    ],
    "dependsOn": [
      { "containerName": "redis", "condition": "HEALTHY" },
      { "containerName": "rabbitmq", "condition": "HEALTHY" },
      { "containerName": "minio", "condition": "START" }
    ],
    "logConfiguration": ${log_configuration}
  },
  {
    "name": "worker",
    "image": "${worker_image}",
    "essential": true,
    "environment": ${worker_environment},
    "secrets": ${worker_secrets},
    "dependsOn": [
      { "containerName": "rabbitmq", "condition": "HEALTHY" },
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
