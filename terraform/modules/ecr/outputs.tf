output "repository_urls" {
  description = "Map of image name to ECR repository URL."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "repository_names" {
  description = "Map of image name to ECR repository name."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.name }
}
