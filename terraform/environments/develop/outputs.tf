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

output "public_subnet_ids" {
  description = "Public subnet IDs used by ECS."
  value       = values(aws_subnet.public)[*].id
}

output "ecs_task_security_group_id" {
  description = "ECS task security group ID."
  value       = aws_security_group.ecs_task.id
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

output "ecs_public_ip_lookup_command" {
  description = "Command to find the currently running ECS task public IP."
  value       = "aws ecs list-tasks --cluster ${module.ecs_cluster.name} --service-name ${module.app_ecs.service_name} --query 'taskArns[0]' --output text"
}
