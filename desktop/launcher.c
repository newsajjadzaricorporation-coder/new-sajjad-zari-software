#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define DEFAULT_APP_URL L"https://ais-dev-3oxekguhnsu7h6oxyvwguu-401532134839.asia-east1.run.app"
#define APP_NAME L"New Sajjad Zari Corporation"
#define APP_TITLE L"New Sajjad Zari Corporation - POS & Inventory System"

// Helper to check if file exists
static BOOL FileExistsW(const wchar_t* path) {
    DWORD dwAttrib = GetFileAttributesW(path);
    return (dwAttrib != INVALID_FILE_ATTRIBUTES && !(dwAttrib & FILE_ATTRIBUTE_DIRECTORY));
}

// Get the full path to url.txt in the same directory as the executable
static BOOL GetUrlConfigFilePath(wchar_t* outPath, DWORD maxLen) {
    if (GetModuleFileNameW(NULL, outPath, maxLen) == 0) return FALSE;
    wchar_t* lastSlash = wcsrchr(outPath, L'\\');
    if (!lastSlash) return FALSE;
    *(lastSlash + 1) = L'\0';
    if (wcslen(outPath) + 8 >= maxLen) return FALSE;
    wcscat(outPath, L"url.txt");
    return TRUE;
}

// Create default url.txt if missing
static void EnsureDefaultUrlConfigFile(const wchar_t* configPath) {
    if (FileExistsW(configPath)) return;
    FILE* f = _wfopen(configPath, L"wt, ccs=UTF-8");
    if (!f) return;
    fwprintf(f, L"# ========================================================\n");
    fwprintf(f, L"# NEW SAJJAD ZARI CORPORATION - POS APPLICATION URL CONFIG\n");
    fwprintf(f, L"# ========================================================\n");
    fwprintf(f, L"# Application URL:\n");
    fwprintf(f, L"%s\n", DEFAULT_APP_URL);
    fwprintf(f, L"#\n");
    fwprintf(f, L"# Or if running a local development server on this PC:\n");
    fwprintf(f, L"# http://localhost:3000\n");
    fclose(f);
}

// Read custom URL from url.txt ignoring comments
static BOOL GetConfiguredUrl(wchar_t* outUrl, DWORD maxLen) {
    wchar_t exePath[MAX_PATH];
    if (!GetUrlConfigFilePath(exePath, MAX_PATH)) return FALSE;
    
    EnsureDefaultUrlConfigFile(exePath);

    FILE* f = _wfopen(exePath, L"rt, ccs=UTF-8");
    if (!f) {
        f = _wfopen(exePath, L"rt");
    }
    if (!f) return FALSE;

    wchar_t line[2048];
    while (fgetws(line, 2048, f)) {
        wchar_t* p = line;
        while (*p == L' ' || *p == L'\t') p++;
        // Skip comment lines and empty lines
        if (*p == L'#' || (*p == L'/' && *(p + 1) == L'/') || *p == L'\r' || *p == L'\n' || *p == L'\0') {
            continue;
        }
        size_t len = wcslen(p);
        while (len > 0 && (p[len - 1] == L'\r' || p[len - 1] == L'\n' || p[len - 1] == L' ')) {
            p[len - 1] = L'\0';
            len--;
        }
        if (len > 5) {
            wcsncpy(outUrl, p, maxLen - 1);
            outUrl[maxLen - 1] = L'\0';
            fclose(f);
            return TRUE;
        }
    }
    fclose(f);
    return FALSE;
}

// Find Microsoft Edge executable path
static BOOL FindEdge(wchar_t* outPath, DWORD maxLen) {
    // 1. Check registry App Paths
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        DWORD dwType = 0;
        DWORD cbData = maxLen * sizeof(wchar_t);
        if (RegQueryValueExW(hKey, NULL, NULL, &dwType, (LPBYTE)outPath, &cbData) == ERROR_SUCCESS) {
            RegCloseKey(hKey);
            if (FileExistsW(outPath)) return TRUE;
        }
        RegCloseKey(hKey);
    }

    // 2. Check standard ProgramFiles(x86)
    wchar_t progFiles86[MAX_PATH];
    if (GetEnvironmentVariableW(L"ProgramFiles(x86)", progFiles86, MAX_PATH) > 0) {
        _snwprintf(outPath, maxLen, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", progFiles86);
        if (FileExistsW(outPath)) return TRUE;
    }

    // 3. Check standard ProgramFiles
    wchar_t progFiles[MAX_PATH];
    if (GetEnvironmentVariableW(L"ProgramFiles", progFiles, MAX_PATH) > 0) {
        _snwprintf(outPath, maxLen, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", progFiles);
        if (FileExistsW(outPath)) return TRUE;
    }

    // 4. Check Local AppData
    wchar_t localApp[MAX_PATH];
    if (GetEnvironmentVariableW(L"LocalAppData", localApp, MAX_PATH) > 0) {
        _snwprintf(outPath, maxLen, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", localApp);
        if (FileExistsW(outPath)) return TRUE;
    }

    return FALSE;
}

// Find Google Chrome executable path
static BOOL FindChrome(wchar_t* outPath, DWORD maxLen) {
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        DWORD dwType = 0;
        DWORD cbData = maxLen * sizeof(wchar_t);
        if (RegQueryValueExW(hKey, NULL, NULL, &dwType, (LPBYTE)outPath, &cbData) == ERROR_SUCCESS) {
            RegCloseKey(hKey);
            if (FileExistsW(outPath)) return TRUE;
        }
        RegCloseKey(hKey);
    }

    wchar_t progFiles[MAX_PATH];
    if (GetEnvironmentVariableW(L"ProgramFiles", progFiles, MAX_PATH) > 0) {
        _snwprintf(outPath, maxLen, L"%s\\Google\\Chrome\\Application\\chrome.exe", progFiles);
        if (FileExistsW(outPath)) return TRUE;
    }

    wchar_t progFiles86[MAX_PATH];
    if (GetEnvironmentVariableW(L"ProgramFiles(x86)", progFiles86, MAX_PATH) > 0) {
        _snwprintf(outPath, maxLen, L"%s\\Google\\Chrome\\Application\\chrome.exe", progFiles86);
        if (FileExistsW(outPath)) return TRUE;
    }

    wchar_t localApp[MAX_PATH];
    if (GetEnvironmentVariableW(L"LocalAppData", localApp, MAX_PATH) > 0) {
        _snwprintf(outPath, maxLen, L"%s\\Google\\Chrome\\Application\\chrome.exe", localApp);
        if (FileExistsW(outPath)) return TRUE;
    }

    return FALSE;
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    wchar_t targetUrl[2048];
    wcscpy(targetUrl, DEFAULT_APP_URL);

    // 1. Check if command line argument provided custom URL
    int argc = 0;
    LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (argv && argc >= 2) {
        if (wcsncmp(argv[1], L"http://", 7) == 0 || wcsncmp(argv[1], L"https://", 8) == 0) {
            wcsncpy(targetUrl, argv[1], 2047);
        }
    }
    if (argv) {
        LocalFree(argv);
    }

    // 2. Check if local url.txt file provided custom URL
    wchar_t customUrl[2048];
    if (GetConfiguredUrl(customUrl, 2048)) {
        wcsncpy(targetUrl, customUrl, 2047);
    }

    // 3. Check if Shift key held down: allow user to open url.txt in Notepad
    if ((GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0) {
        wchar_t configPath[MAX_PATH];
        if (GetUrlConfigFilePath(configPath, MAX_PATH)) {
            int editChoice = MessageBoxW(
                NULL,
                L"Shift key detected.\n\nWould you like to open 'url.txt' in Notepad to check or modify the application URL?",
                APP_TITLE,
                MB_YESNO | MB_ICONQUESTION
            );
            if (editChoice == IDYES) {
                ShellExecuteW(NULL, L"open", L"notepad.exe", configPath, NULL, SW_SHOWNORMAL);
                return 0;
            }
        }
    }

    // 4. Try to launch Microsoft Edge in standalone app window
    wchar_t browserPath[MAX_PATH];
    BOOL launched = FALSE;

    if (FindEdge(browserPath, MAX_PATH)) {
        wchar_t cmdLine[4096];
        _snwprintf(cmdLine, 4096, L"\"%s\" --app=\"%s\" --window-size=1366,768", browserPath, targetUrl);

        STARTUPINFOW si;
        PROCESS_INFORMATION pi;
        ZeroMemory(&si, sizeof(si));
        si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));

        if (CreateProcessW(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
            launched = TRUE;
        }
    }

    // 6. Try Google Chrome in app window if Edge not launched
    if (!launched && FindChrome(browserPath, MAX_PATH)) {
        wchar_t cmdLine[4096];
        _snwprintf(cmdLine, 4096, L"\"%s\" --app=\"%s\" --window-size=1366,768", browserPath, targetUrl);

        STARTUPINFOW si;
        PROCESS_INFORMATION pi;
        ZeroMemory(&si, sizeof(si));
        si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));

        if (CreateProcessW(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
            launched = TRUE;
        }
    }

    // 7. Fallback to system default browser
    if (!launched) {
        HINSTANCE res = ShellExecuteW(NULL, L"open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)res > 32) {
            launched = TRUE;
        }
    }

    if (!launched) {
        MessageBoxW(
            NULL,
            L"Unable to launch web browser.\nPlease ensure Microsoft Edge, Google Chrome, or a modern browser is installed.\n\nYou can also open:\n" DEFAULT_APP_URL,
            APP_TITLE,
            MB_ICONERROR | MB_OK
        );
        return 1;
    }

    return 0;
}
