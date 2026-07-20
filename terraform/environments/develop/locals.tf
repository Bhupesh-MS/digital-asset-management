locals {
  name_prefix             = "${var.project_name}-${var.environment}"
  alb_name                = "${substr(local.name_prefix, 0, 28)}-alb"
  tg_prefix               = substr(local.name_prefix, 0, 26)
  minio_console_tg_prefix = substr(local.name_prefix, 0, 17)

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  database_url = "postgresql://${var.database_username}:${urlencode(var.database_password)}@${module.rds.address}:${module.rds.port}/${var.database_name}?schema=${var.database_schema}&sslmode=require&uselibpqcompat=true"
  rabbitmq_url = "amqp://${var.rabbitmq_username}:${urlencode(var.rabbitmq_password)}@localhost:5672"
}
