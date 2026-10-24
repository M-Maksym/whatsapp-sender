# whatsapp-sender

Sends a WhatsApp message to the configured phone numbers every N minutes (60 by default), for as long as the program is running.
It logs in as a linked device of your WhatsApp account (the same way WhatsApp Web does), so you don't need any Meta/Business API account.

## Build the Windows .exe

Requires Node.js 20+ on the build machine only (the target PC needs nothing installed).

```sh
npm install
npm run build:win      # -> dist/whatsapp-sender.exe
```

You can build this on macOS, Linux or Windows; the result is always a Windows x64 exe.

## Use on the Windows PC

1. Copy `whatsapp-sender.exe` into its own folder, e.g. `C:\whatsapp-sender\`.
2. Double-click it once. It creates `config.json` next to itself and stops. Edit it:

   ```json
   {
     "recipients": ["380501234567"],
     "message": "Щогодинне нагадування ({time})",
     "intervalMinutes": 60,
     "sendOnStart": true
   }
   ```

   - `recipients`: full numbers with country code, digits only (no `+`, spaces or dashes needed).
   - `message`: `{time}` is replaced with the current date and time.
   - `sendOnStart`: also send once right after connecting, instead of waiting for the first interval.

3. Start it again. A QR code appears. On the phone that should send the messages: WhatsApp → Settings → Linked devices → Link a device, then scan it.
4. Leave the window open. The session is saved in `wa-session\`, so later starts won't ask for a QR code.

The log is also written to `whatsapp-sender.log`.

## Notes

- **Don't click inside the console window.** In Windows' "QuickEdit" mode a click selects text and pauses the program until you press Enter or Esc. To turn it off: right-click the title bar → Properties → uncheck "QuickEdit Mode".
- If the connection drops (network loss, PC sleep), the program reconnects by itself. A message that was due while offline is sent as soon as it reconnects.
- If you remove the linked device on the phone, the program deletes `wa-session\` and shows a new QR code.
- To start a fresh login, close the program and delete the `wa-session` folder.
- This uses an unofficial WhatsApp Web client (Baileys). Keep the volume low (a few messages per hour is fine); sending bulk or spam-like messages can get the number banned.
