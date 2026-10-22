# Installing the Prerequisites (Python & Node.js)

Before you run **`setup.bat`**, the device needs two free tools installed:
**Python** (runs the backend) and **Node.js** (runs the frontend).

You only have to do this **once per device**. These steps are for **Windows**.

---

## 1. Install Python

1. Open a web browser and go to **https://www.python.org/downloads/**
2. Click the big yellow button that says **“Download Python 3.12.x”**
   (any 3.11, 3.12, or 3.13 version is fine — avoid very old 2.x versions).
3. When the file finishes downloading, **double-click it** to run the installer.
4. **⚠️ VERY IMPORTANT — on the first installer screen:**
   - Tick the box at the bottom that says **“Add python.exe to PATH”**.
   - If you skip this, `setup.bat` will not find Python.
5. Click **“Install Now”** and wait for it to finish.
6. If you see an option **“Disable path length limit”** at the end, click it, then **Close**.

### Check it worked
1. Press the **Windows key**, type **cmd**, and open **Command Prompt**.
2. Type this and press Enter:
   ```
   python --version
   ```
3. You should see something like `Python 3.12.4`. ✅
   - If you instead get *“'python' is not recognized…”*, Python was installed
     without PATH. Re-run the installer, choose **Modify**, and make sure
     **“Add Python to environment variables”** is ticked — or simply reinstall
     and tick **“Add python.exe to PATH”** this time.

---

## 2. Install Node.js

1. Go to **https://nodejs.org/**
2. Click the button on the **left** labeled **“LTS”**
   (it says *“Recommended For Most Users”*). **Do not** pick the “Current” one.
3. **Double-click** the downloaded file to run the installer.
4. Click **Next** through the screens, accepting the defaults:
   - Accept the license agreement → **Next**
   - Keep the default install location → **Next**
   - Keep the default features (npm is included) → **Next**
   - If you see **“Tools for Native Modules”**, you can **leave it unchecked** →
     **Next**
5. Click **Install** (approve the Windows permission prompt if it appears),
   then **Finish**.

### Check it worked
1. **Close any open Command Prompt window, then open a NEW one**
   (so it picks up the new settings).
2. Type each line and press Enter:
   ```
   node --version
   npm --version
   ```
3. You should see version numbers like `v20.11.1` and `10.2.4`. ✅

---

## 3. Run the project setup

Once both checks above show version numbers:

1. Open the project folder (**Student Portal**).
2. **Double-click `setup.bat`** — it installs all the project’s dependencies
   automatically (this can take a few minutes the first time).
3. When it says **“Setup complete”**, **double-click `start.bat`** to launch:
   - Backend: http://localhost:8000
   - Frontend: http://localhost:5173

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `'python' is not recognized` | Reinstall Python and tick **“Add python.exe to PATH”**, then open a new Command Prompt. |
| `'node'` or `'npm' is not recognized` | Close every Command Prompt window and open a new one. If it still fails, reinstall Node.js (LTS). |
| `setup.bat` flashes and closes instantly | Right-click `setup.bat` → **Edit** is NOT needed; instead open Command Prompt, drag `setup.bat` into it, press Enter — the error will stay on screen. |
| Installer blocked by Windows SmartScreen | Click **“More info” → “Run anyway”** (both installers are the official ones from python.org and nodejs.org). |
| It worked on one PC but not another | Each device needs its own one-time install of Python and Node.js. |

---

*After the first setup, you only need `start.bat` to run the app — you won’t
need to reinstall anything unless you move to a new device.*
