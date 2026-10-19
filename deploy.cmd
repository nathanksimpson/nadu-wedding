@echo off
cd /d "%~dp0"
echo == 1/3 Installing wrangler ==
call npm install || goto fail
echo == 2/3 Deploying nadu-wedding to Cloudflare (a browser window may ask you to authorize) ==
call npx wrangler deploy || goto fail
echo == 3/3 Type the invite code you will share with Duyeon, then press Enter ==
call npx wrangler secret put INVITE_CODE || goto fail
echo.
echo Done. Open the workers.dev address printed above.
pause
exit /b 0
:fail
echo.
echo Something went wrong. Copy the messages above into the chat with Claude.
pause
exit /b 1
