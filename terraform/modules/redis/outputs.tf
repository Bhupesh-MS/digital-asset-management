output "access_point_id" {
  description = "Redis EFS access point ID."
  value       = aws_efs_access_point.this.id
}
