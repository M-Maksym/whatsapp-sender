# whatsapp-sender

[English](#english) | [Українська](#українська)

---

## English

Sends a WhatsApp message to the configured phone numbers every N minutes (60 by default) for as long as the program is running.

The program is distributed as a single Windows `.exe` with Node.js built in, so nothing has to be installed on the PC where it runs.

- [How it works](#how-it-works)
- [First run, step by step](#first-run-step-by-step)
- [Daily use](#daily-use)
- [Troubleshooting](#troubleshooting)
- [Building the .exe](#building-the-exe)
- [Important notes](#important-notes)

### How it works

#### Logging in

The program talks to WhatsApp's servers directly, using the same encrypted protocol that WhatsApp Web uses (via the [Baileys](https://github.com/WhiskeySockets/Baileys) library). No browser is involved.

On the first start the program shows a QR code. Scanning it with WhatsApp on the phone adds the program as a **linked device** of that WhatsApp account, just like linking WhatsApp Web or WhatsApp Desktop. From then on:

- Messages are sent **from the account of the phone that scanned the QR code**. They also appear in that phone's chat history.
- The phone does not need to be online or nearby. Linked devices work on their own.
- WhatsApp logs out linked devices if WhatsApp isn't opened on the main phone for about 14 days. Open WhatsApp on the phone from time to time.

The login keys are saved in the `wa-session` folder next to the exe, so the QR code is needed only once.

> ⚠️ `wa-session` gives full access to send messages as that WhatsApp account. Don't share it or send it to anyone.

#### Sending

At each scheduled time, for each number in `recipients`, the program:

1. Checks that the number is registered on WhatsApp (if not, it logs that and skips it).
2. Sends the text from `message`, replacing `{time}` with the current date and time.
3. Writes the result to the window and to `whatsapp-sender.log`.

#### Schedule

Each next message is scheduled **one interval after the previous send**, not after the program started. Example with `"intervalMinutes": 60` and `"sendOnStart": true`:

```
09:00:00  program started, QR code shown
09:02:30  QR scanned, connected  → message #1 sent
10:02:30                         → message #2
11:02:30                         → message #3
...
```

With `"sendOnStart": false`, the first message is sent one interval after the program starts.

#### Lost connection

- If the connection drops (no internet, Wi-Fi switched, PC woke from sleep), the program reconnects by itself after 3 seconds, and keeps retrying every 30 seconds if the servers can't be reached.
- If a message came due while there was no connection, it is sent as soon as the connection is back, and the next one is scheduled one interval after that.
- If the linked device is removed on the phone, the program deletes `wa-session` and shows a new QR code.

#### Files

All files live in the same folder as the exe:

| File | What it is |
|---|---|
| `whatsapp-sender.exe` | The program. Node.js and all libraries are inside. |
| `config.json` | Your settings: numbers, message text, interval. Created on the first run. |
| `wa-session\` | Saved WhatsApp login (many small files). Created after scanning the QR code. |
| `whatsapp-sender.log` | Log of everything shown in the window, with date and time. |

`config.json` is read only when the program starts. After editing it, close the program and start it again.

### First run, step by step

#### 1. Prepare a folder

Create a folder, e.g. `C:\whatsapp-sender\`, and copy **only** `whatsapp-sender.exe` into it. Don't put it on the Desktop or in Downloads together with other files, because the program creates its own files next to itself.

#### 2. Start the program for the first time

Double-click `whatsapp-sender.exe`.

If Windows shows **"Windows protected your PC"**, click **More info** → **Run anyway**. This appears because the exe isn't digitally signed.

A console window opens, creates `config.json`, and asks you to press Enter:

```
[24.10.2026 09:00:00] Створено файл C:\whatsapp-sender\config.json. Вкажіть у ньому номери отримувачів і текст повідомлення, потім запустіть програму знову.

Натисніть Enter, щоб закрити це вікно...
```

(Translation: "Created C:\whatsapp-sender\config.json. Fill in the recipients and message, then start the program again. Press Enter to close this window.")

Press Enter.

#### 3. Fill in config.json

Right-click `config.json` → **Open with** → **Notepad**. Change it, for example:

```json
{
  "recipients": ["380501234567"],
  "message": "Щогодинне нагадування ({time})",
  "intervalMinutes": 60,
  "sendOnStart": true
}
```

| Field | Meaning |
|---|---|
| `recipients` | Full phone numbers **with country code**, in quotes. Spaces, `+` and dashes are ignored. |
| `message` | Message text. `{time}` is replaced with the current date and time, e.g. `24.10.2026 10:02:30`. |
| `intervalMinutes` | Minutes between messages. |
| `sendOnStart` | `true`: send right after connecting. `false`: first message after one interval. |

Several recipients are separated with commas:

```json
"recipients": ["380501234567", "380671112233"],
```

Keep the JSON format: text in double quotes `"`, commas between fields, **no comma after the last field**. Save the file (Ctrl+S).

> Tip: for the first test, set `"intervalMinutes": 1` to see a message every minute. When everything works, change it to `60` and restart the program.

#### 4. Start the program again and scan the QR code

Start `whatsapp-sender.exe` again. You'll see:

```
[24.10.2026 09:01:00] Запуск. Повідомлення для 380501234567 надсилатимуться кожні 60 хв. Не закривайте це вікно: якщо його закрити, надсилання припиниться.
[24.10.2026 09:01:01] Відскануйте цей QR-код у WhatsApp на телефоні: Налаштування > Пов'язані пристрої > Прив'язати пристрій
█▀▀▀▀▀█ ▄▀▄ █▀▀▀▀▀█
█ ███ █ ▀█▄ █ ███ █
...
```

(Translation: "Starting. Messages to 380501234567 will be sent every 60 min. Don't close this window: closing it stops the sending." / "Scan this QR code in WhatsApp on your phone: Settings > Linked devices > Link a device".)

On the phone whose account should send the messages:

- **Android:** WhatsApp → ⋮ (top right) → **Linked devices** → **Link a device**.
- **iPhone:** WhatsApp → **Settings** → **Linked devices** → **Link a device**.

Point the camera at the QR code in the window.

- If the QR code doesn't fit in the window, maximize the window.
- The QR code is refreshed about every 20 seconds and a new one is printed below. Always scan the **latest** one (the lowest in the window).

#### 5. Check that it connected

After scanning, you'll see something like:

```
[24.10.2026 09:01:20] З'єднання закрито (Stream Errored (restart required)). Перепідключення...
[24.10.2026 09:01:24] Підключено до WhatsApp.
[24.10.2026 09:01:25] Надіслано на 380501234567: Щогодинне нагадування (24.10.2026 09:01:25)
```

The first line ("Connection closed (restart required). Reconnecting...") is **normal**: WhatsApp always asks for one reconnect right after linking a new device.

"Підключено до WhatsApp" means "Connected to WhatsApp", and "Надіслано на ..." means "Sent to ...". Check that the recipient got the message.

#### 6. Leave it running

Keep the window open (you can minimize it). Closing the window stops the sending. Next time you start the exe, it connects without a QR code.

### Daily use

- **Start:** double-click the exe. It connects with the saved login.
- **Stop:** close the window, or press Ctrl+C in it.
- **Change numbers, text or interval:** close the program, edit `config.json`, start it again.
- **Update the program:** replace only `whatsapp-sender.exe`. Keep `config.json` and `wa-session`.
- **Log in with a different WhatsApp account:** close the program, delete the `wa-session` folder, start it again and scan the QR code with the other phone.
- **Start automatically when Windows starts (optional):** press Win+R, type `shell:startup`, press Enter, and put a shortcut to `whatsapp-sender.exe` into the folder that opens.

### Troubleshooting

| What you see | What to do |
|---|---|
| `config.json: у "recipients" мають бути повні номери...` ("recipients must contain full numbers") | Write the numbers with country code, e.g. `"380501234567"`. |
| `config.json: "intervalMinutes" має бути додатним числом` ("must be a positive number") | Set a number greater than 0, without quotes, e.g. `60`. |
| `Не вдалося прочитати config.json: ...` ("Failed to read config.json") | The JSON is broken: check quotes, commas and brackets. Most often there's an extra comma after the last field. |
| `Номер ... не зареєстрований у WhatsApp, пропускаємо` ("not registered on WhatsApp, skipping") | Check the number and the country code. |
| `Зараз немає з'єднання...` ("No connection right now") | No internet. The message will be sent when the connection is back. |
| `З'єднання закрито ... Перепідключення...` repeats constantly | Check the internet. A company network or firewall may block WhatsApp. If the same `wa-session` is also running on another computer, stop it there. If nothing helps: close the program, delete `wa-session`, scan the QR code again. |
| `Пристрій відв'язано від WhatsApp...` ("Device unlinked") | The device was removed on the phone. Scan the new QR code. |
| The program seems frozen, nothing happens | Probably a click in the window paused it (QuickEdit). Press Esc. See [Important notes](#important-notes). |
| The window closes immediately | Open the folder, type `cmd` in the Explorer address bar and press Enter, then run `whatsapp-sender.exe` in that window to see the error. |
| The exe doesn't start at all / is deleted by antivirus | Company security policies block unknown programs. Ask the IT department. |

### Building the .exe

You need Node.js 20+ on the build machine only.

```sh
nvm use 22             # if your default Node is older than 20
npm install            # first time only
npm run build:win      # -> dist/whatsapp-sender.exe
```

`npm run build:win` always rebuilds from the current code and overwrites `dist/whatsapp-sender.exe`. It works on macOS, Linux or Windows; the result is always a Windows x64 exe. What it does:

1. **esbuild** combines `src/index.js` and all libraries from `node_modules` into one file, `dist/bundle.cjs`.
2. **pkg** (`@yao-pkg/pkg`) puts that file together with a Windows build of Node.js 22 into `dist/whatsapp-sender.exe`. That's why the exe is about 75 MB. The first build downloads Node.js for Windows; later builds use the cached copy.

To run without building (for development): `npm start`. It uses `config.json`, `wa-session` and the log in the current folder.

All the program logic is in `src/index.js`.

### Important notes

- **Don't click inside the console window.** In Windows' QuickEdit mode a click selects text and pauses the program until you press Enter or Esc. To turn it off: right-click the window title bar → **Properties** → uncheck **QuickEdit Mode**.
- **The PC must not sleep.** No messages are sent while it sleeps. Set Windows → Settings → System → Power → Sleep to "Never", or the program will catch up only after the PC wakes.
- **Don't copy `wa-session` between computers.** Scan a new QR code on each PC. If the same session runs on two computers at once, WhatsApp keeps disconnecting both.
- **Don't run two copies of the program from the same folder** at the same time, for the same reason.
- This uses an unofficial WhatsApp Web client. Keep the volume low (a few messages per hour is fine). Bulk or spam-like messaging can get the number banned.

---

## Українська

Надсилає повідомлення у WhatsApp на вказані номери кожні N хвилин (за замовчуванням 60), поки програма запущена.

Програма поширюється як один Windows `.exe` з вбудованим Node.js, тому на комп'ютері, де вона працює, нічого встановлювати не треба.

- [Як це працює](#як-це-працює)
- [Перший запуск, крок за кроком](#перший-запуск-крок-за-кроком)
- [Щоденне використання](#щоденне-використання)
- [Вирішення проблем](#вирішення-проблем)
- [Збірка .exe](#збірка-exe)
- [Важливо](#важливо)

### Як це працює

#### Вхід

Програма спілкується із серверами WhatsApp напряму, тим самим зашифрованим протоколом, що й WhatsApp Web (через бібліотеку [Baileys](https://github.com/WhiskeySockets/Baileys)). Браузер не використовується.

При першому запуску програма показує QR-код. Коли його сканують у WhatsApp на телефоні, програма додається як **пов'язаний пристрій** цього акаунта, так само як WhatsApp Web або WhatsApp Desktop. Після цього:

- Повідомлення надсилаються **з акаунта телефону, який сканував QR-код**. Вони також з'являються в історії чатів на цьому телефоні.
- Телефон не мусить бути онлайн чи поруч. Пов'язані пристрої працюють самостійно.
- WhatsApp від'єднує пов'язані пристрої, якщо на основному телефоні WhatsApp не відкривали приблизно 14 днів. Час від часу відкривайте WhatsApp на телефоні.

Ключі входу зберігаються в папці `wa-session` поруч з exe, тому QR-код потрібен лише один раз.

> ⚠️ `wa-session` дає повний доступ до надсилання повідомлень від імені цього акаунта WhatsApp. Нікому її не передавайте.

#### Надсилання

У кожен запланований момент для кожного номера з `recipients` програма:

1. Перевіряє, що номер зареєстрований у WhatsApp (якщо ні, пише про це і пропускає його).
2. Надсилає текст з `message`, замінюючи `{time}` на поточні дату й час.
3. Записує результат у вікно та у `whatsapp-sender.log`.

#### Розклад

Кожне наступне повідомлення надсилається **через один інтервал після попереднього**, а не від запуску програми. Приклад для `"intervalMinutes": 60` і `"sendOnStart": true`:

```
09:00:00  програму запущено, показано QR-код
09:02:30  QR відскановано, підключено  → повідомлення №1
10:02:30                               → повідомлення №2
11:02:30                               → повідомлення №3
...
```

Якщо `"sendOnStart": false`, перше повідомлення надсилається через один інтервал після запуску програми.

#### Втрата з'єднання

- Якщо з'єднання пропало (немає інтернету, змінилась Wi-Fi мережа, ПК прокинувся зі сну), програма сама перепідключається через 3 секунди, а якщо сервери недоступні, пробує знову кожні 30 секунд.
- Якщо повідомлення мало піти, поки не було з'єднання, воно надсилається одразу після відновлення, а наступне планується через один інтервал після нього.
- Якщо на телефоні видалити пов'язаний пристрій, програма видаляє `wa-session` і показує новий QR-код.

#### Файли

Усі файли лежать у тій самій папці, що й exe:

| Файл | Що це |
|---|---|
| `whatsapp-sender.exe` | Сама програма. Node.js і всі бібліотеки всередині. |
| `config.json` | Налаштування: номери, текст, інтервал. Створюється при першому запуску. |
| `wa-session\` | Збережений вхід у WhatsApp (багато дрібних файлів). Створюється після сканування QR-коду. |
| `whatsapp-sender.log` | Журнал усього, що показується у вікні, з датою і часом. |

`config.json` читається тільки під час запуску програми. Після змін закрийте програму і запустіть знову.

### Перший запуск, крок за кроком

#### 1. Підготуйте папку

Створіть папку, наприклад `C:\whatsapp-sender\`, і скопіюйте туди **тільки** `whatsapp-sender.exe`. Не запускайте його з Робочого столу чи Завантажень серед інших файлів, бо програма створює свої файли поруч із собою.

#### 2. Перший запуск програми

Двічі клікніть `whatsapp-sender.exe`.

Якщо Windows покаже **"Windows захистив ваш ПК"**, натисніть **Докладніше** → **Усе одно запустити**. Це з'являється, бо exe не має цифрового підпису.

Відкриється вікно консолі, програма створить `config.json` і попросить натиснути Enter:

```
[24.10.2026 09:00:00] Створено файл C:\whatsapp-sender\config.json. Вкажіть у ньому номери отримувачів і текст повідомлення, потім запустіть програму знову.

Натисніть Enter, щоб закрити це вікно...
```

Натисніть Enter.

#### 3. Заповніть config.json

Правою кнопкою на `config.json` → **Відкрити за допомогою** → **Блокнот**. Змініть, наприклад, так:

```json
{
  "recipients": ["380501234567"],
  "message": "Щогодинне нагадування ({time})",
  "intervalMinutes": 60,
  "sendOnStart": true
}
```

| Поле | Значення |
|---|---|
| `recipients` | Повні номери телефонів **з кодом країни**, у лапках. Пробіли, `+` і дефіси ігноруються. |
| `message` | Текст повідомлення. `{time}` замінюється на поточні дату й час, наприклад `24.10.2026 10:02:30`. |
| `intervalMinutes` | Інтервал між повідомленнями у хвилинах. |
| `sendOnStart` | `true`: надіслати одразу після підключення. `false`: перше повідомлення через один інтервал. |

Кілька номерів пишуться через кому:

```json
"recipients": ["380501234567", "380671112233"],
```

Дотримуйтесь формату JSON: текст у подвійних лапках `"`, коми між полями, **без коми після останнього поля**. Збережіть файл (Ctrl+S).

> Порада: для першої перевірки поставте `"intervalMinutes": 1`, щоб побачити повідомлення щохвилини. Коли все працює, змініть на `60` і перезапустіть програму.

#### 4. Запустіть програму знову і відскануйте QR-код

Знову запустіть `whatsapp-sender.exe`. Ви побачите:

```
[24.10.2026 09:01:00] Запуск. Повідомлення для 380501234567 надсилатимуться кожні 60 хв. Не закривайте це вікно: якщо його закрити, надсилання припиниться.
[24.10.2026 09:01:01] Відскануйте цей QR-код у WhatsApp на телефоні: Налаштування > Пов'язані пристрої > Прив'язати пристрій
█▀▀▀▀▀█ ▄▀▄ █▀▀▀▀▀█
█ ███ █ ▀█▄ █ ███ █
...
```

На телефоні, з акаунта якого мають іти повідомлення:

- **Android:** WhatsApp → ⋮ (угорі праворуч) → **Пов'язані пристрої** → **Прив'язати пристрій**.
- **iPhone:** WhatsApp → **Налаштування** → **Пов'язані пристрої** → **Прив'язати пристрій**.

Наведіть камеру на QR-код у вікні.

- Якщо QR-код не вміщається у вікно, розгорніть вікно на весь екран.
- QR-код оновлюється приблизно кожні 20 секунд, новий друкується нижче. Скануйте завжди **останній** (найнижчий у вікні).

#### 5. Перевірте, що підключилось

Після сканування з'явиться приблизно таке:

```
[24.10.2026 09:01:20] З'єднання закрито (Stream Errored (restart required)). Перепідключення...
[24.10.2026 09:01:24] Підключено до WhatsApp.
[24.10.2026 09:01:25] Надіслано на 380501234567: Щогодинне нагадування (24.10.2026 09:01:25)
```

Перший рядок ("З'єднання закрито (restart required)") це **нормально**: WhatsApp завжди просить одне перепідключення одразу після прив'язки нового пристрою.

Перевірте, що отримувач отримав повідомлення.

#### 6. Залиште програму працювати

Не закривайте вікно (згорнути можна). Якщо закрити вікно, надсилання припиниться. Наступного разу exe підключиться без QR-коду.

### Щоденне використання

- **Запустити:** двічі клікнути exe. Він підключиться зі збереженим входом.
- **Зупинити:** закрити вікно або натиснути в ньому Ctrl+C.
- **Змінити номери, текст чи інтервал:** закрити програму, відредагувати `config.json`, запустити знову.
- **Оновити програму:** замінити тільки `whatsapp-sender.exe`. `config.json` і `wa-session` залишити.
- **Увійти з іншого акаунта WhatsApp:** закрити програму, видалити папку `wa-session`, запустити знову і відсканувати QR-код іншим телефоном.
- **Автозапуск разом з Windows (за бажанням):** натисніть Win+R, введіть `shell:startup`, натисніть Enter і покладіть у відкриту папку ярлик на `whatsapp-sender.exe`.

### Вирішення проблем

| Що ви бачите | Що робити |
|---|---|
| `config.json: у "recipients" мають бути повні номери...` | Впишіть номери з кодом країни, наприклад `"380501234567"`. |
| `config.json: "intervalMinutes" має бути додатним числом` | Вкажіть число більше 0, без лапок, наприклад `60`. |
| `Не вдалося прочитати config.json: ...` | Зламаний JSON: перевірте лапки, коми й дужки. Найчастіше зайва кома після останнього поля. |
| `Номер ... не зареєстрований у WhatsApp, пропускаємо` | Перевірте номер і код країни. |
| `Зараз немає з'єднання...` | Немає інтернету. Повідомлення піде, щойно з'єднання відновиться. |
| `З'єднання закрито ... Перепідключення...` повторюється постійно | Перевірте інтернет. Корпоративна мережа чи файрвол можуть блокувати WhatsApp. Якщо та сама `wa-session` працює ще на іншому комп'ютері, зупиніть її там. Якщо нічого не допомагає: закрийте програму, видаліть `wa-session`, відскануйте QR-код знову. |
| `Пристрій відв'язано від WhatsApp...` | Пристрій видалили на телефоні. Відскануйте новий QR-код. |
| Програма ніби зависла, нічого не відбувається | Найімовірніше, клік у вікні поставив її на паузу (QuickEdit). Натисніть Esc. Див. [Важливо](#важливо). |
| Вікно одразу закривається | Відкрийте папку, введіть `cmd` в адресному рядку Провідника і натисніть Enter, потім запустіть у цьому вікні `whatsapp-sender.exe`, щоб побачити помилку. |
| Exe взагалі не запускається / його видаляє антивірус | Політики безпеки компанії блокують невідомі програми. Зверніться до IT-відділу. |

### Збірка .exe

Node.js 20+ потрібен тільки на комп'ютері, де збирається exe.

```sh
nvm use 22             # якщо за замовчуванням Node старіший за 20
npm install            # тільки перший раз
npm run build:win      # -> dist/whatsapp-sender.exe
```

`npm run build:win` щоразу збирає exe заново з поточного коду і перезаписує `dist/whatsapp-sender.exe`. Збирати можна на macOS, Linux або Windows; результат завжди Windows x64 exe. Що відбувається:

1. **esbuild** об'єднує `src/index.js` і всі бібліотеки з `node_modules` в один файл `dist/bundle.cjs`.
2. **pkg** (`@yao-pkg/pkg`) пакує цей файл разом з Node.js 22 для Windows у `dist/whatsapp-sender.exe`. Тому exe важить близько 75 МБ. Перша збірка завантажує Node.js для Windows, наступні беруть його з кешу.

Запуск без збірки (для розробки): `npm start`. Використовує `config.json`, `wa-session` і лог у поточній папці.

Уся логіка програми в `src/index.js`.

### Важливо

- **Не клікайте всередині вікна консолі.** У режимі QuickEdit клік виділяє текст і ставить програму на паузу, поки не натиснете Enter або Esc. Як вимкнути: правою кнопкою на заголовку вікна → **Властивості** → зняти **Режим швидкого редагування** (QuickEdit Mode).
- **Комп'ютер не має засинати.** Поки ПК спить, повідомлення не надсилаються. Поставте у Windows → Параметри → Система → Живлення → Сон значення "Ніколи", інакше програма надішле пропущене тільки після пробудження.
- **Не копіюйте `wa-session` між комп'ютерами.** На кожному ПК скануйте новий QR-код. Якщо одна сесія працює на двох комп'ютерах одночасно, WhatsApp постійно роз'єднує обидва.
- **Не запускайте дві копії програми з однієї папки** одночасно, з тієї ж причини.
- Використовується неофіційний клієнт WhatsApp Web. Не надсилайте багато повідомлень (кілька на годину нормально). Масові розсилки чи спам можуть призвести до блокування номера.
