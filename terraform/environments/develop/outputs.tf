output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = module.ecs_cluster.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = module.app_ecs.service_name
}

output "ecs_task_definition_arn" {
  description = "ECS task definition ARN."
  value       = module.app_ecs.task_definition_arn
}

output "migration_task_definition_arn" {
  description = "One-off Prisma migration task definition ARN."
  value       = module.app_ecs.migration_task_definition_arn
}

output "database_grants_task_definition_arn" {
  description = "One-off database grants task definition ARN."
  value       = module.app_ecs.database_grants_task_definition_arn
}

output "ecs_log_group_name" {
  description = "CloudWatch log group used by ECS containers."
  value       = module.app_ecs.log_group_name
}

output "public_subnet_ids" {
  description = "Public subnet IDs used by the internet-facing ALB."
  value       = values(aws_subnet.public)[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by ECS tasks and RDS."
  value       = values(aws_subnet.private)[*].id
}

output "ecs_task_security_group_id" {
  description = "ECS task security group ID."
  value       = aws_security_group.ecs_task.id
}

output "alb_security_group_id" {
  description = "Application load balancer security group ID."
  value       = aws_security_group.alb.id
}

output "alb_dns_name" {
  description = "Stable browser-facing DNS name of the application load balancer."
  value       = aws_lb.app.dns_name
}

output "web_url" {
  description = "Browser-facing web URL served by the application load balancer."
  value       = "http://${aws_lb.app.dns_name}"
}

output "api_url" {
  description = "Browser-facing API URL served by the application load balancer."
  value       = "http://${aws_lb.app.dns_name}:3000"
}

output "minio_url" {
  description = "Browser-facing MinIO API URL served by the application load balancer."
  value       = "http://${aws_lb.app.dns_name}:9000"
}

output "minio_console_url" {
  description = "Browser-facing MinIO console URL served by the application load balancer."
  value       = "http://${aws_lb.app.dns_name}:9001"
}

output "rds_endpoint" {
  description = "RDS endpoint including port."
  value       = module.rds.endpoint
}

output "ecr_web_repository_url" {
  description = "Web ECR repository URL."
  value       = module.ecr.repository_urls["web"]
}

output "ecr_api_repository_url" {
  description = "API ECR repository URL."
  value       = module.ecr.repository_urls["api"]
}

output "ecr_worker_repository_url" {
  description = "Worker ECR repository URL."
  value       = module.ecr.repository_urls["worker"]
}

output "ecr_postgres_client_repository_url" {
  description = "PostgreSQL client ECR repository URL used by database grants tasks."
  value       = module.ecr.repository_urls["postgres-client"]
}

output "ecr_redis_repository_url" {
  description = "Redis ECR repository URL."
  value       = module.ecr.repository_urls["redis"]
}

output "ecr_rabbitmq_repository_url" {
  description = "RabbitMQ ECR repository URL."
  value       = module.ecr.repository_urls["rabbitmq"]
}

output "ecr_minio_repository_url" {
  description = "MinIO ECR repository URL."
  value       = module.ecr.repository_urls["minio"]
}
