output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "Current task definition ARN."
  value       = aws_ecs_task_definition.this.arn
}

output "migration_task_definition_arn" {
  description = "One-off Prisma migration task definition ARN."
  value       = aws_ecs_task_definition.migration.arn
}

output "database_grants_task_definition_arn" {
  description = "One-off database grants task definition ARN."
  value       = aws_ecs_task_definition.database_grants.arn
}

output "execution_role_arn" {
  description = "ECS task execution role ARN."
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "ECS task role ARN."
  value       = aws_iam_role.task.arn
}
