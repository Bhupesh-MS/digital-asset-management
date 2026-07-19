locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  database_url = "postgresql://${var.database_username}:${urlencode(var.database_password)}@${module.rds.address}:${module.rds.port}/${var.database_name}?schema=${var.database_schema}"
  rabbitmq_url = "amqp://${var.rabbitmq_username}:${urlencode(var.rabbitmq_password)}@localhost:5672"
}
