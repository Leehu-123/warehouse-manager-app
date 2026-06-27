#!/bin/bash

# ==========================================
# SCRIPT SAO LƯU DỮ LIỆU DAFA WAREHOUSE
# (Dùng cho máy chủ Linux/Ubuntu VPS)
# ==========================================

# Thư mục gốc của dự án trên VPS
PROJECT_DIR="/var/www/dafa-warehouse"
# Thư mục chứa dữ liệu SQLite
DB_FILE="$PROJECT_DIR/server/prisma/dev.db"
# Thư mục chứa file đính kèm (nếu có)
UPLOADS_DIR="$PROJECT_DIR/server/uploads"

# Thư mục lưu file nén tạm thời trên VPS
BACKUP_TEMP_DIR="/tmp/dafa_backups"
mkdir -p "$BACKUP_TEMP_DIR"

# Tạo tên file theo ngày giờ: backup_20260617_005646.tar.gz
DATE_STR=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="backup_$DATE_STR.tar.gz"
BACKUP_FILEPATH="$BACKUP_TEMP_DIR/$BACKUP_FILENAME"

# 1. Nén file CSDL và thư mục uploads
echo "[$(date)] Bắt đầu nén dữ liệu..."
tar -czf "$BACKUP_FILEPATH" -C "$PROJECT_DIR/server" prisma/dev.db uploads/ 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[$(date)] Nén thành công: $BACKUP_FILEPATH"
else
    echo "[$(date)] Lỗi trong quá trình nén dữ liệu!"
    exit 1
fi

# 2. Tải lên Google Drive bằng Rclone
# (Lưu ý: "gdrive" là tên remote bạn đã cấu hình trong rclone, "DAFA_Backup" là tên thư mục trên Google Drive)
echo "[$(date)] Đang tải lên Google Drive..."
rclone copy "$BACKUP_FILEPATH" gdrive:DAFA_Backup

if [ $? -eq 0 ]; then
    echo "[$(date)] Tải lên Google Drive thành công!"
else
    echo "[$(date)] Lỗi khi tải lên Google Drive!"
    # Giữ lại file nếu lỗi
    exit 1
fi

# 3. Dọn dẹp file nén cục bộ để giải phóng dung lượng VPS
rm -f "$BACKUP_FILEPATH"
echo "[$(date)] Hoàn tất quá trình sao lưu."
