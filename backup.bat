@echo off
setlocal
chcp 65001 >nul

echo =========================================
echo   SAO LUU DU LIEU DAFA WAREHOUSE
echo =========================================

:: Đường dẫn thư mục Google Drive của bạn (Thay đổi nếu cần)
set "GDRIVE_DIR=G:\My Drive\DAFA_Backup"

:: Kiểm tra và tạo thư mục nếu chưa có
if not exist "%GDRIVE_DIR%" (
    mkdir "%GDRIVE_DIR%"
)

:: Lấy thời gian hiện tại để làm tên file
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "DATE_STR=%datetime:~0,8%_%datetime:~8,6%"
set "BACKUP_FILE=%GDRIVE_DIR%\backup_%DATE_STR%.zip"

echo Dang nen va sao luu du lieu vao Google Drive...

:: Đường dẫn đến dữ liệu
set "DB_FILE=%~dp0server\prisma\dev.db"
set "UPLOADS_DIR=%~dp0server\uploads"

:: Tạo thư mục uploads tạm nếu chưa có để tránh lỗi
if not exist "%UPLOADS_DIR%" mkdir "%UPLOADS_DIR%"

:: Dùng PowerShell để nén file
powershell.exe -NoProfile -Command "Compress-Archive -Path '%DB_FILE%', '%UPLOADS_DIR%' -DestinationPath '%BACKUP_FILE%' -Force"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [THANH CONG] Da luu ban sao luu vao: %BACKUP_FILE%
) else (
    echo.
    echo [LOI] Co loi xay ra trong qua trinh sao luu!
)

echo.
pause
