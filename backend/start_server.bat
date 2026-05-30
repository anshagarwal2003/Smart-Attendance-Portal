@echo off
title Smart Attendance Server
cd /d "C:\Users\Welcome\Downloads\ansh data\SmartAttendanceWeb\backend"
call venv\Scripts\activate.bat
echo Starting Smart Attendance System...
echo.
echo Laptop URL: http://127.0.0.1:8000
echo Same Wi-Fi Phone URL will appear in Flask terminal.
echo.
python app.py
pause