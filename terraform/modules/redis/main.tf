resource "aws_efs_access_point" "this" {
  file_system_id = var.efs_file_system_id

  posix_user {
    gid = 999
    uid = 999
  }

  root_directory {
    path = "/redis"

    creation_info {
      owner_gid   = 999
      owner_uid   = 999
      permissions = "0755"
    }
  }
}
