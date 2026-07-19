data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  for_each = { for index, cidr in var.public_subnet_cidrs : tostring(index) => cidr }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value
  availability_zone       = data.aws_availability_zones.available.names[tonumber(each.key)]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${tonumber(each.key) + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "ecs_task" {
  name        = "${local.name_prefix}-ecs-task"
  description = "Public access for DAM web and API containers"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "Web"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_public_cidr_blocks
  }

  ingress {
    description = "API"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.allowed_public_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds"
  description = "PostgreSQL access from ECS tasks"
  vpc_id      = aws_vpc.this.id

  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_task.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "efs" {
  name        = "${local.name_prefix}-efs"
  description = "EFS access from ECS tasks"
  vpc_id      = aws_vpc.this.id

  ingress {
    description     = "NFS from ECS"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_task.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_efs_file_system" "this" {
  creation_token  = "${local.name_prefix}-efs"
  encrypted       = true
  throughput_mode = "bursting"

  tags = {
    Name = "${local.name_prefix}-efs"
  }
}

resource "aws_efs_mount_target" "public" {
  for_each = aws_subnet.public

  file_system_id  = aws_efs_file_system.this.id
  subnet_id       = each.value.id
  security_groups = [aws_security_group.efs.id]
}

module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  name = "${local.name_prefix}-cluster"
}

module "redis" {
  source = "../../modules/redis"

  name_prefix        = local.name_prefix
  efs_file_system_id = aws_efs_file_system.this.id
}

module "rabbitmq" {
  source = "../../modules/rabbitmq"

  name_prefix        = local.name_prefix
  efs_file_system_id = aws_efs_file_system.this.id
}

module "minio" {
  source = "../../modules/minio"

  name_prefix        = local.name_prefix
  efs_file_system_id = aws_efs_file_system.this.id
}

module "rds" {
  source = "../../modules/rds"

  name_prefix         = local.name_prefix
  subnet_ids          = values(aws_subnet.public)[*].id
  security_group_ids  = [aws_security_group.rds.id]
  database_name       = var.database_name
  database_username   = var.database_username
  database_password   = var.database_password
  instance_class      = var.rds_instance_class
  allocated_storage   = var.rds_allocated_storage
  skip_final_snapshot = var.rds_skip_final_snapshot
}

module "app_ecs" {
  source = "../../modules/app-ecs"

  name_prefix                    = local.name_prefix
  aws_region                     = var.aws_region
  cluster_id                     = module.ecs_cluster.id
  subnet_ids                     = values(aws_subnet.public)[*].id
  security_group_ids             = [aws_security_group.ecs_task.id]
  task_cpu                       = var.task_cpu
  task_memory                    = var.task_memory
  desired_count                  = var.desired_count
  web_image                      = var.web_image
  api_image                      = var.api_image
  worker_image                   = var.worker_image
  database_url                   = local.database_url
  rabbitmq_url                   = local.rabbitmq_url
  redis_url                      = "redis://localhost:6379"
  minio_endpoint                 = "localhost"
  minio_public_endpoint          = var.minio_public_endpoint
  minio_port                     = 9000
  minio_public_port              = var.minio_public_port
  minio_bucket                   = var.minio_bucket
  minio_access_key               = var.minio_access_key
  minio_secret_key               = var.minio_secret_key
  jwt_secret                     = var.jwt_secret
  cors_origin                    = var.cors_origin
  api_base_url                   = var.api_base_url
  database_connect_attempts      = var.database_connect_attempts
  database_connect_delay_ms      = var.database_connect_delay_ms
  max_json_payload_size          = var.max_json_payload_size
  log_level                      = var.log_level
  minio_use_ssl                  = var.minio_use_ssl
  minio_region                   = var.minio_region
  upload_temp_dir                = var.upload_temp_dir
  max_asset_files                = var.max_asset_files
  max_asset_file_size_bytes      = var.max_asset_file_size_bytes
  upload_stream_chunk_size_bytes = var.upload_stream_chunk_size_bytes
  efs_file_system_id             = aws_efs_file_system.this.id
  redis_access_point_id          = module.redis.access_point_id
  rabbitmq_access_point_id       = module.rabbitmq.access_point_id
  minio_access_point_id          = module.minio.access_point_id
  rabbitmq_username              = var.rabbitmq_username
  rabbitmq_password              = var.rabbitmq_password

  depends_on = [aws_efs_mount_target.public]
}
