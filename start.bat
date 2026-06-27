@echo off
echo ===================================================
echo      KHOI DONG DAFA WAREHOUSE (SERVER & CLIENT)
echo ===================================================

echo.
echo [1] Dang khoi dong may chu Backend...
start "DAFA Backend" cmd /k "cd server && npm run dev"

echo.
echo [2] Dang khoi dong giao dien Frontend...
start "DAFA Frontend" cmd /k "cd client && npm run dev"

echo.
echo ===================================================
echo Khoi dong hoan tat! 
echo. 
echo 2 cua so mau den moi da duoc mo de chay ung dung.
echo Vui long KHONG tat 2 cua so nay trong qua trinh su dung.
echo De tat ung dung, ban co the tat 2 cua so do.
echo ===================================================
pause
