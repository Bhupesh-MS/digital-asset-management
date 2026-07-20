locals {
  shared_app_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "DATABASE_URL", value = var.database_url },
    { name = "DATABASE_SSL", value = "true" },
    { name = "DATABASE_SSL_REJECT_UNAUTHORIZED", value = "false" },
    { name = "RABBITMQ_URL", value = var.rabbitmq_url },
    { name = "REDIS_URL", value = var.redis_url },
    { name = "MINIO_ENDPOINT", value = var.minio_endpoint },
    { name = "MINIO_PUBLIC_ENDPOINT", value = var.minio_public_endpoint },
    { name = "MINIO_PORT", value = tostring(var.minio_port) },
    { name = "MINIO_PUBLIC_PORT", value = tostring(var.minio_public_port) },
    { name = "MINIO_BUCKET", value = var.minio_bucket },
    { name = "MINIO_ACCESS_KEY", value = var.minio_access_key },
    { name = "MINIO_SECRET_KEY", value = var.minio_secret_key },
    { name = "JWT_SECRET", value = var.jwt_secret },
    { name = "CORS_ORIGIN", value = var.cors_origin },
    { name = "API_BASE_URL", value = var.api_base_url },
    { name = "API_PORT", value = tostring(var.api_port) },
    { name = "WEB_PORT", value = "5173" },
    { name = "DATABASE_CONNECT_ATTEMPTS", value = tostring(var.database_connect_attempts) },
    { name = "DATABASE_CONNECT_DELAY_MS", value = tostring(var.database_connect_delay_ms) },
    { name = "MAX_JSON_PAYLOAD_SIZE", value = var.max_json_payload_size },
    { name = "LOG_LEVEL", value = var.log_level },
    { name = "MINIO_USE_SSL", value = tostring(var.minio_use_ssl) },
    { name = "MINIO_REGION", value = var.minio_region },
    { name = "UPLOAD_TEMP_DIR", value = var.upload_temp_dir },
    { name = "MAX_ASSET_FILES", value = tostring(var.max_asset_files) },
    { name = "MAX_ASSET_FILE_SIZE_BYTES", value = tostring(var.max_asset_file_size_bytes) },
    { name = "UPLOAD_STREAM_CHUNK_SIZE_BYTES", value = tostring(var.upload_stream_chunk_size_bytes) }
  ]

  log_configuration = {
    logDriver = "awslogs"
    options = {
      awslogs-group         = aws_cloudwatch_log_group.this.name
      awslogs-region        = var.aws_region
      awslogs-stream-prefix = "ecs"
    }
  }
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name_prefix}"
  retention_in_days = 14
}

resource "aws_iam_role" "execution" {
  name = "${var.name_prefix}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${var.name_prefix}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.name_prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = templatefile("${path.module}/templates/task-definition.json.tpl", {
    web_image            = var.web_image
    api_image            = var.api_image
    worker_image         = var.worker_image
    web_port             = var.web_port
    api_port             = var.api_port
    api_environment      = jsonencode(local.shared_app_environment)
    worker_environment   = jsonencode(local.shared_app_environment)
    rabbitmq_environment = jsonencode([{ name = "RABBITMQ_DEFAULT_USER", value = var.rabbitmq_username }, { name = "RABBITMQ_DEFAULT_PASS", value = var.rabbitmq_password }])
    minio_environment    = jsonencode([{ name = "MINIO_ROOT_USER", value = var.minio_access_key }, { name = "MINIO_ROOT_PASSWORD", value = var.minio_secret_key }])
    log_configuration    = jsonencode(local.log_configuration)
  })

  volume {
    name = "redis-data"

    efs_volume_configuration {
      file_system_id     = var.efs_file_system_id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = var.redis_access_point_id
        iam             = "DISABLED"
      }
    }
  }

  volume {
    name = "rabbitmq-data"

    efs_volume_configuration {
      file_system_id     = var.efs_file_system_id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = var.rabbitmq_access_point_id
        iam             = "DISABLED"
      }
    }
  }

  volume {
    name = "minio-data"

    efs_volume_configuration {
      file_system_id     = var.efs_file_system_id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = var.minio_access_point_id
        iam             = "DISABLED"
      }
    }
  }
}

resource "aws_ecs_task_definition" "migration" {
  family                   = "${var.name_prefix}-migration"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name             = "migrate"
      image            = var.api_image
      essential        = true
      command          = ["pnpm", "exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]
      environment      = local.shared_app_environment
      portMappings     = []
      logConfiguration = local.log_configuration
    }
  ])
}

resource "aws_ecs_task_definition" "database_grants" {
  family                   = "${var.name_prefix}-database-grants"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "grant-db"
      image     = "postgres:16-alpine"
      essential = true
      command = [
        "sh",
        "-c",
        <<-EOT
cat > /tmp/grants.sql <<'SQL'
GRANT CONNECT ON DATABASE :"db_name" TO :"db_user";
GRANT USAGE, CREATE ON SCHEMA :"db_schema" TO :"db_user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA :"db_schema" TO :"db_user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA :"db_schema" TO :"db_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"db_schema" GRANT ALL ON TABLES TO :"db_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"db_schema" GRANT ALL ON SEQUENCES TO :"db_user";
SQL
psql -v ON_ERROR_STOP=1 -v db_name="$PGDATABASE" -v db_user="$PGUSER" -v db_schema="$DB_SCHEMA" -f /tmp/grants.sql
EOT
      ]
      environment = [
        { name = "PGHOST", value = var.database_host },
        { name = "PGPORT", value = tostring(var.database_port) },
        { name = "PGDATABASE", value = var.database_name },
        { name = "PGUSER", value = var.database_username },
        { name = "PGPASSWORD", value = var.database_password },
        { name = "PGCONNECT_TIMEOUT", value = "15" },
        { name = "PGSSLMODE", value = "require" },
        { name = "DB_SCHEMA", value = var.database_schema }
      ]
      portMappings     = []
      logConfiguration = local.log_configuration
    }
  ])
}

resource "aws_ecs_service" "this" {
  name            = "${var.name_prefix}-service"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  dynamic "load_balancer" {
    for_each = var.web_target_group_arn == null ? [] : [var.web_target_group_arn]

    content {
      target_group_arn = load_balancer.value
      container_name   = "web"
      container_port   = var.web_port
    }
  }

  dynamic "load_balancer" {
    for_each = var.api_target_group_arn == null ? [] : [var.api_target_group_arn]

    content {
      target_group_arn = load_balancer.value
      container_name   = "api"
      container_port   = var.api_port
    }
  }

  dynamic "load_balancer" {
    for_each = var.minio_target_group_arn == null ? [] : [var.minio_target_group_arn]

    content {
      target_group_arn = load_balancer.value
      container_name   = "minio"
      container_port   = var.minio_port
    }
  }

  health_check_grace_period_seconds = var.web_target_group_arn == null && var.api_target_group_arn == null && var.minio_target_group_arn == null ? null : 120

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = var.assign_public_ip
  }
}
